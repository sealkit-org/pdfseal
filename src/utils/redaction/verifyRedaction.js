/**
 * 输出验证（防伪脱敏的最后一道防线）：
 * 用 pdf.js 重新打开产物，断言脱敏矩形区域内不存在任何可提取文本。
 *
 * 判定与删除同规则（shouldRemoveOp）：文本 bbox 与脱敏区重叠 ≥50% 或中心点在内。
 */
import { textItemToUserBBox, shouldRemoveOp } from './coords.js';

/**
 * @param {Uint8Array} outputBytes redactPdf 产物
 * @param {Object} spec 同 redactPdf 的 spec
 * @param {{password?: string, verifyLoader?: Function, ignoreTexts?: string[]}} [opts]
 *        ignoreTexts：有意保留的可见文字（如 stamp 样式的 [REDACTED]），不计入残留
 * @returns {Promise<{ok: boolean, leftovers: Array<{pageIndex:number, text:string}>, leftoverPages: number[]}>}
 */
export async function verifyRedaction(outputBytes, spec, opts = {}) {
  const leftovers = [];
  const pageIndexes = Object.keys(spec.pages)
    .map(Number)
    .filter((i) => Array.isArray(spec.pages[i]?.rects) && spec.pages[i].rects.length > 0);

  if (!pageIndexes.length) return { ok: true, leftovers: [], leftoverPages: [] };

  const ignore = new Set(
    (Array.isArray(opts.ignoreTexts) ? opts.ignoreTexts : []).map((s) => String(s).trim())
  );

  let pdf;
  if (typeof opts.verifyLoader === 'function') {
    pdf = await opts.verifyLoader(outputBytes, opts.password || '');
  } else {
    pdf = await defaultLoader(outputBytes, opts.password || '');
  }

  try {
    for (const pageIndex of pageIndexes) {
      const page = await pdf.getPage(pageIndex + 1);
      const tc = await page.getTextContent();
      for (const item of tc.items) {
        if (!item.str || !item.str.trim()) continue;
        if (ignore.has(item.str.trim())) continue; // 遮罩戳记等有意文字
        const bbox = textItemToUserBBox(item);
        if (bbox.w <= 0 && bbox.h <= 0) continue;
        if (shouldRemoveOp(bbox, spec.pages[pageIndex].rects)) {
          leftovers.push({ pageIndex, text: item.str.slice(0, 40) });
        }
      }
    }
  } finally {
    try { await pdf.destroy(); } catch { /* ignore */ }
  }

  return {
    ok: leftovers.length === 0,
    leftovers,
    leftoverPages: [...new Set(leftovers.map((l) => l.pageIndex))]
  };
}

async function defaultLoader(bytes, password) {
  const pdfjs = await import('pdfjs-dist');
  const isNode = typeof window === 'undefined';
  const params = {
    data: bytes instanceof Uint8Array ? bytes.slice() : new Uint8Array(bytes).slice(),
    isEvalSupported: false,
    disableFontFace: true
  };
  if (password) params.password = password;
  if (isNode) {
    // Node（Vitest）：标准字体从本地文件系统取（尾斜杠必需，path.resolve 会吞掉尾斜杠）
    const { pathToFileURL } = await import('node:url');
    const { resolve } = await import('node:path');
    let fontUrl = pathToFileURL(
      resolve(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts')
    ).href;
    if (!fontUrl.endsWith('/')) fontUrl += '/';
    params.standardFontDataUrl = fontUrl;
  } else {
    params.standardFontDataUrl = window.location.origin + '/standard_fonts/';
  }
  const task = pdfjs.getDocument(params);
  return task.promise;
}
