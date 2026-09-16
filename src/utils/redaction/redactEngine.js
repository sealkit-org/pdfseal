/**
 * Redaction 引擎编排入口。
 *
 * 防伪标准（True Stream Redaction）：
 *  - 矢量文字：从内容流字节层面删除 show-text 操作符（黑块下面是真空）
 *  - 命中图像的页面：整页栅格化替换（原文字层/图像对象物理清除）
 *
 * 坐标约定：spec.rects 一律为 PDF 用户空间（pdf.js convertToPdfRectangle 输出口径，
 * 与内容流坐标一致；/Rotate 由 pdf.js viewport 在 UI 侧处理）。
 *
 * @example
 * const { bytes, report } = await redactPdf(fileBytes, {
 *   pages: { 0: { rects: [{ x: 72, y: 690, w: 200, h: 14 }] } },
 *   style: 'black',
 *   dpi: 192,
 *   jpegQuality: 0.85
 * });
 */
import {
  PDFDocument, PDFName, PDFArray, PDFDict, PDFNumber, PDFRawStream, PDFRef,
  StandardFonts, rgb, decodePDFRawStream
} from 'pdf-lib';
import { loadCleanPdfDocument } from '../pdfSecurity.js';
import { parseContentStream } from './contentStreamParser.js';
import { simulateOps, selectRemovedOps } from './textState.js';
import { FontWidthResolver } from './fontWidths.js';
import { rectsIntersect } from './coords.js';
import { verifyRedaction } from './verifyRedaction.js';
import { rasterBurnPage } from './rasterBurnIn.js';

const STAMP_TEXT = '[REDACTED]';

/** PDF 数值格式化（避免 JS 浮点尾差进入内容流） */
function fmt(n) {
  const r = Math.round(n * 10000) / 10000;
  return String(r);
}

function concatBytes(chunks) {
  let len = 0;
  for (const c of chunks) len += c.length;
  const out = new Uint8Array(len);
  let pos = 0;
  for (const c of chunks) { out.set(c, pos); pos += c.length; }
  return out;
}

/** 解码单条内容流（PDFRawStream 走 filter 解码；PDFContentStream 直接取字节） */
function decodeStream(stream) {
  if (stream instanceof PDFRawStream) {
    return decodePDFRawStream(stream).decode(); // 不支持的 filter 会 throw → 上层转栅格
  }
  if (stream && typeof stream.getContents === 'function') {
    return stream.getContents();
  }
  throw new Error('unsupported content stream type');
}

/** 取页面全部内容流字节（多条流按 PDF 语义拼接为一条）；导出供测试断言 */
export function getPageContentBytes(pageNode, context) {
  let contents = pageNode.get(PDFName.of('Contents'));
  if (contents instanceof PDFRef) contents = context.lookup(contents);
  if (!contents) return new Uint8Array(0);
  if (contents instanceof PDFArray) {
    const parts = [];
    for (let i = 0; i < contents.size(); i++) {
      let s = contents.get(i);
      if (s instanceof PDFRef) s = context.lookup(s);
      parts.push(decodeStream(s));
    }
    return concatBytes(parts);
  }
  return decodeStream(contents);
}

/** 按删除区间重建字节流（保留切片拼接） */
export function rebuildBytes(bytes, spansToRemove) {
  if (!spansToRemove.length) return bytes;
  const sorted = [...spansToRemove].sort((a, b) => a.start - b.start);
  const chunks = [];
  let pos = 0;
  for (const s of sorted) {
    if (s.start > pos) chunks.push(bytes.subarray(pos, s.start));
    pos = Math.max(pos, s.end);
  }
  if (pos < bytes.length) chunks.push(bytes.subarray(pos));
  return concatBytes(chunks);
}

/**
 * 流对象的字典：pdf-lib 的 PDFStream 不继承 PDFDict（dict 存于 .dict 属性），
 * `stream instanceof PDFDict` 恒为 false——所有流字典访问必须经此帮助函数。
 */
function asStreamDict(obj) {
  if (obj instanceof PDFRawStream) return obj.dict;
  if (obj instanceof PDFDict) return obj;
  return null;
}

/** 页面 Contents 的全部间接引用 */
function contentRefsOf(pageNode) {
  const out = [];
  const contents = pageNode.get(PDFName.of('Contents'));
  if (contents instanceof PDFArray) {
    for (let i = 0; i < contents.size(); i++) {
      const v = contents.get(i);
      if (v instanceof PDFRef) out.push(v);
    }
  } else if (contents instanceof PDFRef) {
    out.push(contents);
  }
  return out;
}

/** 页面 Annots 数组中的全部间接引用 */
function annotRefsOf(pageNode) {
  const out = [];
  const arr = pageNode.get(PDFName.of('Annots'));
  if (arr instanceof PDFArray) {
    for (let i = 0; i < arr.size(); i++) {
      const v = arr.get(i);
      if (v instanceof PDFRef) out.push(v);
    }
  }
  return out;
}

/**
 * 物理删除已不再被本页引用的旧对象（防孤儿流在文件字节中残留被删文本）。
 * 仅当没有其他页面引用同一 ref 时才删（Contents/Annots 跨页共享极罕见，保守判定）。
 */
function deleteOrphanedRefs(context, pdfDoc, exceptPageIndex, refs, refsOf) {
  for (const ref of refs) {
    if (!(ref instanceof PDFRef)) continue;
    const key = ref.toString();
    let usedElsewhere = false;
    for (let i = 0; i < pdfDoc.getPageCount() && !usedElsewhere; i++) {
      if (i === exceptPageIndex) continue;
      if (refsOf(pdfDoc.getPage(i).node).some((r) => r.toString() === key)) usedElsewhere = true;
    }
    if (!usedElsewhere) {
      try { context.delete(ref); } catch { /* 忽略 */ }
    }
  }
}

/** 某 Form ref 在全部页面 XObject 资源字典中的出现次数（>1 = 跨页/跨名共享） */
function countFormRefUsage(pdfDoc, ref) {
  let count = 0;
  const key = ref.toString();
  for (let i = 0; i < pdfDoc.getPageCount(); i++) {
    const xobjs = pdfDoc.getPage(i).node.lookupMaybe(PDFName.of('Resources'), PDFDict)
      ?.lookupMaybe(PDFName.of('XObject'), PDFDict);
    if (!xobjs) continue;
    for (const [, val] of xobjs.entries()) {
      if (val instanceof PDFRef && val.toString() === key) count++;
    }
  }
  return count;
}

/** 页面 MediaBox（number[4]） */
function getMediaBox(pageNode) {
  const mb = pageNode.lookupMaybe(PDFName.of('MediaBox'), PDFArray);
  if (mb && mb.size() === 4) {
    return [0, 1, 2, 3].map((i) => mb.lookup(i, PDFNumber).asNumber());
  }
  return [0, 0, 612, 792];
}

/**
 * 处理一条内容流（页面主内容或 Form XObject）：
 * 解析 → 模拟 → 删除选中 show-text；返回 { newBytes|null, imageHits, parseError }
 * @param {Uint8Array} bytes
 * @param {{rects:Array, fonts:FontWidthResolver, initialCtm?:number[]}} opts
 */
function processStream(bytes, { rects, fonts, initialCtm }) {
  const { ops, inlineImageSpans, parseError } = parseContentStream(bytes);
  if (parseError) return { parseError };

  const sim = simulateOps(ops, { fonts, initialCtm });
  const removed = selectRemovedOps(sim.showText, rects);
  const spans = removed.size
    ? [...removed].map((opIndex) => ({ start: ops[opIndex].start, end: ops[opIndex].end }))
    : [];

  return {
    newBytes: spans.length ? rebuildBytes(bytes, spans) : null, // null = 无需重写
    removedOps: removed.size,
    showTextCount: sim.showText.length,
    xobjectPlacements: sim.xobjects,
    inlineImageSpans,
    parseError: null
  };
}

/**
 * 主入口。
 * @param {ArrayBuffer|Uint8Array} bytes 原始 PDF
 * @param {{pages: Record<number, {rects: Array<{x,y,w,h}>}>, style: 'black'|'white'|'stamp', dpi?: number, jpegQuality?: number}} spec
 * @param {{password?: string, onProgress?: Function, renderPage?: Function, verifyLoader?: Function, verify?: boolean}} [opts]
 *        renderPage 可注入（Node 单测用假渲染器）；默认走 rasterBurnIn 浏览器渲染
 * @returns {Promise<{bytes: Uint8Array, report: Object}>}
 */
export async function redactPdf(bytes, spec, opts = {}) {
  const { password = '', onProgress = () => {}, verify = true } = opts;
  const style = spec.style || 'black';
  const pageIndexes = Object.keys(spec.pages)
    .map(Number)
    .filter((i) => Number.isInteger(i) && Array.isArray(spec.pages[i]?.rects) && spec.pages[i].rects.length > 0)
    .sort((a, b) => a - b);

  const report = {
    ok: false,
    style,
    pages: [],
    rasterPages: [],
    verify: { ok: true, leftovers: [] }
  };
  if (!pageIndexes.length) {
    return { bytes: bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), report };
  }

  onProgress(0.05, 'analyzing');

  // Mode 1 矢量加载（默认 Clean Mode 会整页栅格化摧毁文本层，绝不可用默认值）
  const pdfDoc = await loadCleanPdfDocument(bytes, { password, preserveWatermarks: true });
  const context = pdfDoc.context;

  /** 需要栅格化的页面（图像命中/解析失败/验证残留重试） */
  const rasterSet = new Set();
  /** 页面级处理记录 */
  const pageReports = new Map();

  // ---------- 第一遍：矢量路径分析 + 重写 ----------
  for (let n = 0; n < pageIndexes.length; n++) {
    const pageIndex = pageIndexes[n];
    const rects = spec.pages[pageIndex].rects;
    const page = pdfDoc.getPage(pageIndex);
    const pageNode = page.node;
    const pr = { index: pageIndex, path: 'vector', removedOps: 0, removedAnnots: 0, reason: '' };

    // 验证重试：矢量已证明删不干净的页强制栅格
    if (Array.isArray(opts.forceRaster) && opts.forceRaster.includes(pageIndex)) {
      pr.reason = 'verify-retry-force-raster';
      rasterSet.add(pageIndex);
      pageReports.set(pageIndex, pr);
      continue;
    }

    let contentBytes;
    let analysis;
    try {
      contentBytes = getPageContentBytes(pageNode, context);
      const resources = pageNode.Resources() || context.obj({});
      const fonts = new FontWidthResolver(context, resources);
      analysis = processStream(contentBytes, { rects, fonts });
    } catch (e) {
      analysis = { parseError: String(e?.message || e) };
    }

    if (analysis.parseError) {
      // 解析失败：该页降级栅格化，绝不静默
      pr.reason = `parse-error: ${analysis.parseError}`;
      rasterSet.add(pageIndex);
      pageReports.set(pageIndex, pr);
      onProgress(0.05 + (0.45 * (n + 1)) / pageIndexes.length, 'analyzing');
      continue;
    }

    // 图像命中：Do 引用的 XObject 若为 Image 且放置与矩形相交 → 栅格化
    const imageHit = detectImageHits(context, pageNode, analysis.xobjectPlacements, rects);
    // 内联图（BI...EI）几何未知：保守视为命中（脱敏页宁可栅格，不可漏）
    const inlineHit = analysis.inlineImageSpans.length > 0;
    if (imageHit || inlineHit) {
      pr.reason = imageHit ? 'image-under-redaction' : 'inline-image-on-page';
      rasterSet.add(pageIndex);
      pageReports.set(pageIndex, pr);
      onProgress(0.05 + (0.45 * (n + 1)) / pageIndexes.length, 'analyzing');
      continue;
    }

    // ---- Form XObject 递归分析（只分析不改写；危险信号 → 整页栅格兜底） ----
    const pageRes = pageNode.Resources();
    const formResult = redactFormXObjects(context, pdfDoc, pageRes, analysis.xobjectPlacements, rects);
    if (formResult.needRaster) {
      pr.reason = 'form-xobject-hazard'; // 共享 Form/异种 filter/解析失败
      rasterSet.add(pageIndex);
      pageReports.set(pageIndex, pr);
      onProgress(0.05 + (0.45 * (n + 1)) / pageIndexes.length, 'analyzing');
      continue;
    }

    // ---- 矢量重写：主内容流 ----
    if (analysis.newBytes) {
      const oldRefs = contentRefsOf(pageNode);
      const newStream = context.flateStream(analysis.newBytes);
      pageNode.set(PDFName.of('Contents'), context.register(newStream));
      deleteOrphanedRefs(context, pdfDoc, pageIndex, oldRefs, contentRefsOf);
    }

    // ---- 应用 Form 原地改写（所有引用处一致生效，无孤儿对象） ----
    for (const p of formResult.pending) {
      if (p.dict.get(PDFName.of('Filter')) === PDFName.of('FlateDecode')) {
        p.stream.contents = context.flateStream(p.newBytes).contents;
      } else {
        p.stream.contents = p.newBytes; // 无 filter 的裸流
      }
    }
    pr.removedOps = analysis.removedOps + formResult.removed;

    // ---- 注释清理（/Rect 与脱敏区相交的 Annot 删除） ----
    pr.removedAnnots = removeIntersectingAnnots(context, pdfDoc, pageIndex, pageNode, rects);

    pageReports.set(pageIndex, pr);
    onProgress(0.05 + (0.45 * (n + 1)) / pageIndexes.length, 'vector');
  }

  // ---------- 遮罩外观（矢量页）：直接追加进新内容流，杜绝伪脱敏嫌疑 ----
  for (const pageIndex of pageIndexes) {
    if (rasterSet.has(pageIndex)) continue;
    await drawMasks(pdfDoc, pageIndex, spec.pages[pageIndex].rects, style);
  }

  // ---------- 第二遍：栅格化替换 ----------
  if (rasterSet.size) {
    let done = 0;
    for (const pageIndex of rasterSet) {
      const rects = spec.pages[pageIndex].rects;
      const rendered = await rasterBurnPage(bytes, pageIndex, rects, style, {
        password,
        dpi: spec.dpi || 192,
        jpegQuality: spec.jpegQuality || 0.85,
        renderPage: opts.renderPage // Node 单测注入
      });
      await replacePageWithImage(pdfDoc, pageIndex, rendered);
      const pr = pageReports.get(pageIndex) || { index: pageIndex };
      pr.path = 'raster';
      pr.rasterized = true;
      pageReports.set(pageIndex, pr);
      done++;
      onProgress(0.5 + (0.35 * done) / rasterSet.size, 'raster');
    }
  }

  onProgress(0.9, 'saving');

  const outBytes = await pdfDoc.save({ useObjectStreams: false });

  // ---------- 输出验证：脱敏区不得残留可提取文本 ----------
  if (verify) {
    onProgress(0.95, 'verify');
    const v = await verifyRedaction(outBytes, spec, {
      password,
      verifyLoader: opts.verifyLoader,
      // stamp 样式的 [REDACTED] 是有意保留的可见文字，不算残留
      ignoreTexts: style === 'stamp' ? [STAMP_TEXT] : undefined
    });
    report.verify = v;

    // 残留页自动栅格化重试一次
    if (!v.ok && v.leftoverPages?.length) {
      const retrySpec = { ...spec, pages: {} };
      for (const p of v.leftoverPages) retrySpec.pages[p] = spec.pages[p];
      const retry = await redactPdf(outBytes, retrySpec, {
        ...opts,
        verify: false,
        // 强制残留页全走栅格（矢量已证明删不干净）
        forceRaster: v.leftoverPages
      });
      if (retry.report.verify.ok !== false) {
        report.verify = { ok: true, leftovers: [], retried: v.leftoverPages };
        report.pages = [...pageReports.values()];
        report.rasterPages = [...rasterSet, ...v.leftoverPages];
        report.ok = true;
        onProgress(1, 'done');
        return { bytes: retry.bytes, report };
      }
      report.verify.ok = false;
    }
  }

  report.pages = [...pageReports.values()];
  report.rasterPages = [...rasterSet];
  report.ok = report.verify.ok;
  onProgress(1, 'done');
  return { bytes: outBytes, report };
}

/** forceRaster 支持（验证重试用）：跳过矢量路径直接栅格 */

/** Do 放置 → Resources/XObject 查 /Subtype /Image → 与矩形相交判定 */
function detectImageHits(context, pageNode, placements, rects) {
  if (!placements?.length) return false;
  const xobjs = pageNode.lookupMaybe(PDFName.of('Resources'), PDFDict)
    ?.lookupMaybe(PDFName.of('XObject'), PDFDict);
  if (!xobjs) return false;
  for (const p of placements) {
    let obj = xobjs.get(PDFName.of(p.name));
    if (obj instanceof PDFRef) obj = context.lookup(obj);
    const dict = asStreamDict(obj); // 流对象不继承 PDFDict，dict 在 .dict
    if (!dict) continue;
    if (dict.get(PDFName.of('Subtype')) !== PDFName.of('Image')) continue;
    if (rects.some((r) => rectsIntersect(p.bbox, r))) return true;
  }
  return false;
}

/**
 * Form XObject 递归脱敏（BFS，按 ref 去重防环）。
 * Form 有效 CTM = form /Matrix × Do 时刻 CTM。
 *
 * 两阶段：先全量分析（不改写），无危险信号后再原地改写流内容——
 *  - 原地改写：所有引用处（含未遍历的嵌套引用）一致生效，不产生含密孤儿对象
 *  - 危险信号（needRaster → 调用方整页栅格）：
 *      a) 顶层 Form 被多页/多名共享（改写会让其他页无遮罩静默丢字）
 *      b) 异种 filter / DecodeParms（LZW、多级过滤、Predictor——无法安全重编码）
 *      c) Form 流解析失败
 *  - 已知局限：嵌套 Form 的共享（引用藏在另一 Form 的资源里）无法免解码检测，
 *    由原地改写的"全引用一致生效"特性兜底（不会产生 dangling ref）。
 *
 * @returns {{removed: number, needRaster: boolean, pending: Array<{stream: PDFRawStream, dict: PDFDict, newBytes: Uint8Array}>}}
 */
function redactFormXObjects(context, pdfDoc, pageResources, placements, rects) {
  const empty = { removed: 0, needRaster: false, pending: [] };
  if (!placements?.length || !(pageResources instanceof PDFDict)) return empty;

  const xobjs = pageResources.lookupMaybe(PDFName.of('XObject'), PDFDict);
  if (!xobjs) return empty;

  let removedTotal = 0;
  let needRaster = false;
  const visited = new Set();
  /** @type {Array<{stream: PDFRawStream, dict: PDFDict, ctm: number[], resources: PDFDict}>} */
  const queue = [];
  /** 分析完成待改写：{ stream, dict, newBytes } */
  const pending = [];

  /** 把 XObject 资源字典中名为 name 的 Form 入队（顶层做共享检测） */
  const tryEnqueue = (parentXobjs, name, doCtm, isTopLevel) => {
    const maybe = parentXobjs.get(PDFName.of(name));
    let ref = maybe instanceof PDFRef ? maybe : null;
    let stream = maybe instanceof PDFRef ? context.lookup(maybe) : maybe;
    if (!(stream instanceof PDFRawStream)) return; // 非 Form 流（或直接 dict，罕见）
    const dict = stream.dict;
    if (dict.get(PDFName.of('Subtype')) !== PDFName.of('Form')) return;
    if (isTopLevel && ref && countFormRefUsage(pdfDoc, ref) > 1) {
      needRaster = true; // 共享 Form：改写会波及其他页 → 整页栅格
      return;
    }
    const filter = dict.get(PDFName.of('Filter'));
    if (filter !== undefined && filter !== PDFName.of('FlateDecode')) {
      needRaster = true; // 异种/多级 filter：无法安全重编码
      return;
    }
    if (dict.get(PDFName.of('DecodeParms')) !== undefined) {
      needRaster = true; // Predictor 等参数与重编码不兼容
      return;
    }
    if (ref) {
      const rk = ref.toString();
      if (visited.has(rk)) return;
      visited.add(rk);
    }
    const matrixArr = dict.lookupMaybe(PDFName.of('Matrix'), PDFArray);
    const matrix = matrixArr && matrixArr.size() === 6
      ? [0, 1, 2, 3, 4, 5].map((i) => matrixArr.lookup(i, PDFNumber).asNumber())
      : [1, 0, 0, 1, 0, 0];
    const formRes = dict.lookupMaybe(PDFName.of('Resources'), PDFDict) || pageResources;
    queue.push({ stream, dict, ctm: mulMatrix(matrix, doCtm), resources: formRes });
  };

  for (const p of placements) tryEnqueue(xobjs, p.name, p.ctm, true);

  while (queue.length && !needRaster) {
    const item = queue.shift();
    try {
      const bytes = decodeStream(item.stream);
      const fonts = new FontWidthResolver(context, item.resources);
      const res = processStream(bytes, { rects, fonts, initialCtm: item.ctm });
      if (res.parseError) {
        needRaster = true; // Form 解析失败 → 页面栅格兜底（绝不静默）
        break;
      }
      if (res.newBytes) {
        pending.push({ stream: item.stream, dict: item.dict, newBytes: res.newBytes });
        removedTotal += res.removedOps;
      }
      // Form 内嵌套 Do → 继续递归
      if (res.xobjectPlacements?.length) {
        const innerXobjs = item.resources.lookupMaybe(PDFName.of('XObject'), PDFDict);
        if (innerXobjs) {
          for (const p of res.xobjectPlacements) tryEnqueue(innerXobjs, p.name, p.ctm, false);
        }
      }
    } catch {
      needRaster = true; // 单个 Form 处理异常 → 页面栅格兜底
      break;
    }
  }

  // 危险信号：不做任何改写（保持原件语义），由调用方栅格化该页
  if (needRaster) return { removed: 0, needRaster: true, pending: [] };
  return { removed: removedTotal, needRaster: false, pending };
}

function mulMatrix(m1, m2) {
  return [
    m1[0] * m2[0] + m1[1] * m2[2],
    m1[0] * m2[1] + m1[1] * m2[3],
    m1[2] * m2[0] + m1[3] * m2[2],
    m1[2] * m2[1] + m1[3] * m2[3],
    m1[4] * m2[0] + m1[5] * m2[2] + m2[4],
    m1[4] * m2[1] + m1[5] * m2[3] + m2[5]
  ];
}

/** 删除 /Rect 与脱敏区相交的注释（含注释对象本体的物理删除）；返回删除数 */
function removeIntersectingAnnots(context, pdfDoc, pageIndex, pageNode, rects) {
  const annotsArr = pageNode.lookupMaybe(PDFName.of('Annots'), PDFArray);
  if (!annotsArr) return 0;
  const keep = [];
  const removedRefs = [];
  let removed = 0;
  for (let i = 0; i < annotsArr.size(); i++) {
    const ref = annotsArr.get(i);
    const dict = ref instanceof PDFRef ? context.lookup(ref) : ref;
    let hit = false;
    if (dict instanceof PDFDict) {
      const rectArr = dict.lookupMaybe(PDFName.of('Rect'), PDFArray);
      if (rectArr && rectArr.size() === 4) {
        const [x1, y1, x2, y2] = [0, 1, 2, 3].map((k) => {
          const num = rectArr.lookup(k, PDFNumber);
          return num ? num.asNumber() : 0;
        });
        const ar = { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) };
        hit = rects.some((r) => rectsIntersect(ar, r));
      }
    }
    if (hit) {
      removed++;
      if (ref instanceof PDFRef) removedRefs.push(ref);
    } else {
      keep.push(ref);
    }
  }
  if (removed > 0) {
    if (keep.length === 0) pageNode.delete(PDFName.of('Annots'));
    else {
      const arr = PDFArray.withContext(context);
      keep.forEach((r) => arr.push(r));
      pageNode.set(PDFName.of('Annots'), arr);
    }
    // 注释对象本体也删（/Contents 里的隐私文本不得以孤儿对象留在文件字节中）
    deleteOrphanedRefs(context, pdfDoc, pageIndex, removedRefs, annotRefsOf);
  }
  return removed;
}

/**
 * 矢量页遮罩外观（blackout/whiteout 追加 re f；stamp 用 pdf-lib 文本 API）。
 * 注意：遮罩是"有意的可见标记"，其下文本已被物理删除——不构成伪脱敏。
 */
async function drawMasks(pdfDoc, pageIndex, rects, style) {
  const page = pdfDoc.getPage(pageIndex);
  if (style === 'stamp') {
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    for (const r of rects) {
      page.drawRectangle({ x: r.x, y: r.y, width: r.w, height: r.h, color: rgb(0, 0, 0) });
      const size = Math.max(4, Math.min(r.h * 0.6, (r.w * 0.85) / (STAMP_TEXT.length * 0.6)));
      page.drawText(STAMP_TEXT, {
        x: r.x + (r.w - STAMP_TEXT.length * size * 0.6) / 2,
        y: r.y + (r.h - size * 0.72) / 2,
        size,
        font,
        color: rgb(1, 1, 1)
      });
    }
    return;
  }
  // black / white：追加路径填充（无字体资源依赖，直接拼内容流尾部）
  const fill = style === 'white' ? '1 1 1 rg' : '0 0 0 rg';
  const parts = [];
  for (const r of rects) {
    parts.push(`q ${fill} ${fmt(r.x)} ${fmt(r.y)} ${fmt(r.w)} ${fmt(r.h)} re f Q`);
  }
  if (!parts.length) return;
  const node = page.node;
  const oldRefs = contentRefsOf(node);
  const tail = contextAppend(pdfDoc, page, parts.join('\n'));
  if (tail) {
    node.set(PDFName.of('Contents'), tail);
    // 被合并的旧内容流若已无引用（含本轮中间产物）→ 物理删除
    deleteOrphanedRefs(pdfDoc.context, pdfDoc, pageIndex, oldRefs, contentRefsOf);
  }
}

/** 将追加操作并入现有 Contents（多流拼接为单一新流，避免依赖 pdf-lib 页面 API 状态） */
function contextAppend(pdfDoc, page, extraOps) {
  const context = pdfDoc.context;
  try {
    const existing = getPageContentBytes(page.node, context);
    const merged = concatBytes([existing, new TextEncoder().encode(`\n${extraOps}\n`)]);
    return context.register(context.flateStream(merged));
  } catch {
    return null;
  }
}

/**
 * 栅格页替换：整页图像化 + 原 Resources/Annots/图像对象清除。
 * rendered = { jpegBytes, widthPt, heightPt }（viewport 旋转已烘焙进图像）
 */
async function replacePageWithImage(pdfDoc, pageIndex, rendered) {
  const page = pdfDoc.getPage(pageIndex);
  const node = page.node;
  const context = pdfDoc.context;
  const img = await pdfDoc.embedJpg(rendered.jpegBytes);

  // 记录旧 Resources 里的图像 XObject 引用（稍后未被其他页引用时删除）
  const oldRefs = collectXObjectRefs(context, node);
  // 旧内容流 / 注释引用（替换后成为孤儿，同样物理删除防字节残留）
  const oldContentRefs = contentRefsOf(node);
  const oldAnnotRefs = annotRefsOf(node);

  // 新内容流：q W 0 0 H 0 0 cm /X0 Do Q
  const ops = `q ${fmt(rendered.widthPt)} 0 0 ${fmt(rendered.heightPt)} 0 0 cm /X0 Do Q`;
  const streamRef = context.register(context.flateStream(new TextEncoder().encode(ops)));

  // 全新 Resources：只含新图像（显式构建，避免 obj 映射歧义）
  const xobjDict = PDFDict.withContext(context);
  xobjDict.set(PDFName.of('X0'), img.ref);
  const newResources = PDFDict.withContext(context);
  newResources.set(PDFName.of('XObject'), xobjDict);

  node.set(PDFName.of('Contents'), streamRef);
  node.set(PDFName.of('Resources'), newResources);
  node.delete(PDFName.of('Annots'));
  node.delete(PDFName.of('Rotate')); // 旋转已烘焙，防止二次旋转
  const [x0, y0] = getMediaBox(node);
  const mediaBox = context.obj([x0, y0, x0 + rendered.widthPt, y0 + rendered.heightPt]);
  node.set(PDFName.of('MediaBox'), mediaBox);

  // 清理仅被本页引用的旧图像对象（防体积膨胀）
  const others = new Set();
  for (let i = 0; i < pdfDoc.getPageCount(); i++) {
    if (i === pageIndex) continue;
    for (const ref of collectXObjectRefs(context, pdfDoc.getPage(i).node)) others.add(ref.toString());
  }
  for (const ref of oldRefs) {
    if (!others.has(ref.toString())) {
      try { context.delete(ref); } catch { /* 忽略 */ }
    }
  }
  // 旧内容流与注释对象的本体清理
  deleteOrphanedRefs(context, pdfDoc, pageIndex, oldContentRefs, contentRefsOf);
  deleteOrphanedRefs(context, pdfDoc, pageIndex, oldAnnotRefs, annotRefsOf);
}

function collectXObjectRefs(context, pageNode) {
  const refs = [];
  const xobjs = pageNode.lookupMaybe(PDFName.of('Resources'), PDFDict)
    ?.lookupMaybe(PDFName.of('XObject'), PDFDict);
  if (xobjs) {
    for (const [, val] of xobjs.entries()) {
      if (val instanceof PDFRef) refs.push(val);
    }
  }
  return refs;
}
