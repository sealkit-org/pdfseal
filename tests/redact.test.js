/**
 * RedactTool 引擎单测（True Stream Redaction 防伪标准验证）。
 *
 * 策略：fixture 全部 pdf-lib 程序化生成；脱敏矩形从 pdf.js 文本提取的
 * 精确 bbox 派生（与 UI 吸附同源），从而验证"自有模拟器几何 vs pdf.js 几何"一致性。
 * 删除后重新提取断言：目标行消失、兄弟行保留、验证器通过。
 */
import { describe, it, expect } from 'vitest';
import {
  PDFDocument, StandardFonts, rgb, PDFName, PDFDict, PDFArray, PDFNumber
} from 'pdf-lib';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { redactPdf, getPageContentBytes } from '../src/utils/redaction/redactEngine.js';
import { parseContentStream } from '../src/utils/redaction/contentStreamParser.js';
import { simulateOps } from '../src/utils/redaction/textState.js';
import { FontWidthResolver } from '../src/utils/redaction/fontWidths.js';
import { verifyRedaction } from '../src/utils/redaction/verifyRedaction.js';
import { textItemToUserBBox } from '../src/utils/redaction/coords.js';
import { UNIVERSAL_DATE_REGEX, getLocalizedPiiPresets, PII_PRESETS, matchRules } from '../src/utils/redaction/ruleMatcher.js';

// ---------- 工具 ----------

/** 经典 1x1 JPEG（base64），用于图像 fixture 与栅格注入 */
const TINY_JPEG = Uint8Array.from(
  atob(
    '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwcJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPDs0NDT/wAALCAABAAEBAREA/8QAFAABAQAAAAAAAAAAAAAAAAAAAAv/2gAIAQEAAD8A0s8g/9k='
  ),
  (c) => c.charCodeAt(0)
);

let pdfjsModule = null;
async function getPdfjs() {
  if (!pdfjsModule) pdfjsModule = await import('pdfjs-dist');
  return pdfjsModule;
}

async function extractText(bytes) {
  const pdfjs = await getPdfjs();
  let fontUrl = pathToFileURL(
    resolve(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts')
  ).href;
  if (!fontUrl.endsWith('/')) fontUrl += '/';
  const task = pdfjs.getDocument({
    data: bytes instanceof Uint8Array ? bytes.slice() : new Uint8Array(bytes).slice(),
    isEvalSupported: false,
    disableFontFace: true,
    standardFontDataUrl: fontUrl
  });
  const pdf = await task.promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    pages.push(tc.items.map((it) => ({ str: it.str, item: it })));
  }
  await pdf.destroy();
  return pages;
}

/** 从提取结果中按子串找文本项，返回用户空间 bbox（±0.5pt 容差外扩） */
function findBBox(pages, pageIndex, needle) {
  const items = pages[pageIndex];
  const hit = items.find((e) => e.str.includes(needle));
  if (!hit) throw new Error(`needle not found on page ${pageIndex}: ${needle}`);
  const b = textItemToUserBBox(hit.item);
  return { x: b.x - 0.5, y: b.y - 0.5, w: b.w + 1, h: b.h + 1 };
}

// ---------- Fixture ----------

async function makeTextPdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595.28, 841.89]);
  page.drawText('Line One Alpha', { x: 72, y: 720, size: 12, font });
  page.drawText('SECRET-CONTENT-42', { x: 72, y: 690, size: 12, font });
  page.drawText('Line Three Gamma', { x: 72, y: 660, size: 12, font });
  // 一条覆盖第 2 行区域的注释（验证 Annots 清理）
  const ctx = doc.context;
  const annotRef = ctx.register(ctx.obj({
    Type: 'Annot', Subtype: 'Text',
    Rect: [65, 683, 290, 700], Contents: 'sticky secret'
  }));
  const arr = PDFArray.withContext(ctx);
  arr.push(annotRef);
  page.node.set(PDFName.of('Annots'), arr);
  return doc.save();
}

async function makeManualStreamPdf(contentOps) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const ctx = doc.context;
  const streamRef = ctx.register(ctx.flateStream(new TextEncoder().encode(contentOps)));
  page.node.set(PDFName.of('Contents'), streamRef);
  // 非嵌入字体带 /Widths：pdf.js 与 FontWidthResolver 均尊重该表，宽度口径一致
  const widths = PDFArray.withContext(ctx);
  for (let i = 0; i < 100; i++) widths.push(PDFNumber.of(600));
  const fontRef = ctx.register(ctx.obj({
    Type: 'Font', Subtype: 'Type1', BaseFont: 'Helvetica',
    FirstChar: 32, Widths: widths
  }));
  const fontsDict = PDFDict.withContext(ctx);
  fontsDict.set(PDFName.of('F1'), fontRef);
  const res = PDFDict.withContext(ctx);
  res.set(PDFName.of('Font'), fontsDict);
  page.node.set(PDFName.of('Resources'), res);
  return doc.save();
}

async function makeImagePdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const img = await doc.embedJpg(TINY_JPEG);
  const page = doc.addPage([595.28, 841.89]);
  page.drawImage(img, { x: 72, y: 400, width: 200, height: 150 });
  page.drawText('Text Near Image 777', { x: 72, y: 690, size: 12, font });
  return doc.save();
}

async function makeFormPdf() {
  // doc A：被嵌入的源页（含敏感词）
  const docA = await PDFDocument.create();
  const fontA = await docA.embedFont(StandardFonts.Helvetica);
  const pA = docA.addPage([300, 300]);
  pA.drawText('FORMSECRET-99', { x: 10, y: 150, size: 12, font: fontA });
  // doc B：以 Form XObject 形式绘制 A 页
  const docB = await PDFDocument.create();
  const fontB = await docB.embedFont(StandardFonts.Helvetica);
  const page = docB.addPage([595.28, 841.89]);
  const embedded = await docB.embedPage(pA);
  page.drawPage(embedded, { x: 200, y: 500, width: 300, height: 300 });
  page.drawText('Outer Plain Text', { x: 72, y: 720, size: 12, font: fontB });
  return docB.save();
}

// ---------- 用例 ----------

describe('redactEngine: True Stream Redaction', () => {
  it('① 矢量删除：目标行物理消失，兄弟行保留，注释清理，验证通过', async () => {
    const bytes = await makeTextPdf();
    const before = await extractText(bytes);
    const rect = findBBox(before, 0, 'SECRET-CONTENT-42');

    const { bytes: out, report } = await redactPdf(bytes, {
      pages: { 0: { rects: [rect] } },
      style: 'black'
    });

    const after = await extractText(out);
    const pageText = after[0].map((e) => e.str).join(' ');
    expect(pageText).toContain('Line One Alpha');
    expect(pageText).toContain('Line Three Gamma');
    expect(pageText).not.toContain('SECRET-CONTENT-42');
    expect(pageText).not.toContain('42'); // 零残留

    expect(report.pages[0].removedOps).toBeGreaterThanOrEqual(1);
    expect(report.pages[0].removedAnnots).toBe(1);
    expect(report.verify.ok).toBe(true);
    expect(report.ok).toBe(true);

    // 产物里注释对象已删
    const outDoc = await PDFDocument.load(out);
    const annots = outDoc.getPage(0).node.Annots();
    expect(annots).toBeUndefined();
  }, 60000);

  it('② 三种遮罩样式：black/white 填充色、stamp 含 [REDACTED]', async () => {
    const bytes = await makeTextPdf();
    const before = await extractText(bytes);
    const rect = findBBox(before, 0, 'SECRET-CONTENT-42');

    for (const style of ['black', 'white', 'stamp']) {
      const { bytes: out } = await redactPdf(bytes, { pages: { 0: { rects: [rect] } }, style });
      const doc = await PDFDocument.load(out);
      const content = new TextDecoder('latin1').decode(getPageContentBytes(doc.getPage(0).node, doc.context));
      if (style === 'black') {
        expect(content).toContain('0 0 0 rg');
        expect(content).toMatch(/re\s+f/);
      } else if (style === 'white') {
        expect(content).toContain('1 1 1 rg');
      } else {
        // pdf-lib drawText 输出十六进制编码文本，内容流搜不到明文 → 从文本层断言戳记
        const after = await extractText(out);
        expect(after[0].map((e) => e.str).join(' ')).toContain('[REDACTED]');
      }
      expect(content).not.toContain('SECRET-CONTENT-42');
    }
  }, 60000);

  it('②-b 扩展遮罩样式：gray/custom 颜色与自定义 stampText', async () => {
    const bytes = await makeTextPdf();
    const before = await extractText(bytes);
    const rect = findBBox(before, 0, 'SECRET-CONTENT-42');

    // 1. Gray style
    const { bytes: outGray } = await redactPdf(bytes, { pages: { 0: { rects: [rect] } }, style: 'gray' });
    const docGray = await PDFDocument.load(outGray);
    const contentGray = new TextDecoder('latin1').decode(getPageContentBytes(docGray.getPage(0).node, docGray.context));
    expect(contentGray).toContain('rg');
    expect(contentGray).not.toContain('SECRET-CONTENT-42');

    // 2. Custom color style
    const { bytes: outCustom } = await redactPdf(bytes, {
      pages: { 0: { rects: [rect] } },
      style: 'custom',
      customColor: '#1e3a8a'
    });
    const docCustom = await PDFDocument.load(outCustom);
    const contentCustom = new TextDecoder('latin1').decode(getPageContentBytes(docCustom.getPage(0).node, docCustom.context));
    expect(contentCustom).toContain('0.1176 0.2275 0.5412 rg');
    expect(contentCustom).not.toContain('SECRET-CONTENT-42');

    // 3. Custom stampText & customColor (Red Stamp)
    const { bytes: outStamp } = await redactPdf(bytes, {
      pages: { 0: { rects: [rect] } },
      style: 'stamp',
      customColor: '#b91c1c',
      stampText: '[CONFIDENTIAL]'
    });
    const afterStamp = await extractText(outStamp);
    expect(afterStamp[0].map((e) => e.str).join(' ')).toContain('[CONFIDENTIAL]');

    // 4. Custom stamp with light background (#ffffff) -> black text contrast
    const { bytes: outLightStamp } = await redactPdf(bytes, {
      pages: { 0: { rects: [rect] } },
      style: 'stamp',
      customColor: '#ffffff',
      stampText: '[LIGHT_STAMP]'
    });
    const afterLightStamp = await extractText(outLightStamp);
    expect(afterLightStamp[0].map((e) => e.str).join(' ')).toContain('[LIGHT_STAMP]');
  }, 60000);

  it('③ 十六进制字符串 <4849> 几何删除', async () => {
    const bytes = await makeManualStreamPdf('BT /F1 12 Tf 1 0 0 1 72 700 Tm <4849> Tj ET');
    const before = await extractText(bytes);
    expect(before[0].map((e) => e.str).join('')).toContain('HI');
    const rect = findBBox(before, 0, 'HI');

    const { bytes: out, report } = await redactPdf(bytes, { pages: { 0: { rects: [rect] } }, style: 'black' });
    const after = await extractText(out);
    expect(after[0].map((e) => e.str).join('')).not.toContain('HI');
    expect(report.verify.ok).toBe(true);
  }, 60000);

  it('④ 旋转文本（Tm 0 1 -1 0）几何删除', async () => {
    const bytes = await makeManualStreamPdf('BT /F1 12 Tf 0 1 -1 0 72 500 Tm (ROTATED-TARGET) Tj ET');
    const before = await extractText(bytes);
    expect(before[0].map((e) => e.str).join('')).toContain('ROTATED-TARGET');
    const rect = findBBox(before, 0, 'ROTATED-TARGET');

    const { bytes: out, report } = await redactPdf(bytes, { pages: { 0: { rects: [rect] } }, style: 'black' });
    const after = await extractText(out);
    expect(after[0].map((e) => e.str).join('')).not.toContain('ROTATED-TARGET');
    expect(report.verify.ok).toBe(true);
  }, 60000);

  it('⑤ 图像命中：整页栅格化替换，文本层物理清除', async () => {
    const bytes = await makeImagePdf();
    const before = await extractText(bytes);
    expect(before[0].map((e) => e.str).join(' ')).toContain('Text Near Image 777');

    // 脱敏框盖住图像区域 → 页面必须走栅格路径
    const rect = { x: 72, y: 400, w: 200, h: 150 };
    const { bytes: out, report } = await redactPdf(bytes, {
      pages: { 0: { rects: [rect] } },
      style: 'black'
    }, {
      // Node 环境注入假渲染器：返回 1x1 JPEG + 页面原始尺寸
      renderPage: async () => ({ jpegBytes: TINY_JPEG, widthPt: 595.28, heightPt: 841.89 })
    });

    expect(report.pages[0].path).toBe('raster');
    expect(report.rasterPages).toContain(0);
    const after = await extractText(out);
    expect(after[0].length).toBe(0); // 栅格页无任何文本层
    expect(report.verify.ok).toBe(true);

    // 产物：单图像内容流 + 新 Resources
    const doc = await PDFDocument.load(out);
    const content = new TextDecoder('latin1').decode(getPageContentBytes(doc.getPage(0).node, doc.context));
    expect(content).toContain('/X0 Do');
  }, 60000);

  it('⑥ 输出验证器：干净产物 ok，手工构造残留则报 leftover', async () => {
    const bytes = await makeTextPdf();
    const v = await verifyRedaction(bytes, {
      pages: { 0: { rects: [{ x: 60, y: 680, w: 240, h: 20 }] } } // 盖住第 2 行但未脱敏
    });
    expect(v.ok).toBe(false);
    expect(v.leftoverPages).toContain(0);

    const before = await extractText(bytes);
    const rect = findBBox(before, 0, 'SECRET-CONTENT-42');
    const { bytes: out } = await redactPdf(bytes, { pages: { 0: { rects: [rect] } }, style: 'black' });
    const v2 = await verifyRedaction(out, { pages: { 0: { rects: [rect] } } });
    expect(v2.ok).toBe(true);
  }, 60000);

  it('⑦ Form XObject 内文本递归删除', async () => {
    const bytes = await makeFormPdf();
    const before = await extractText(bytes);
    const allText = before[0].map((e) => e.str).join(' ');
    expect(allText).toContain('FORMSECRET-99');
    expect(allText).toContain('Outer Plain Text');

    const rect = findBBox(before, 0, 'FORMSECRET-99');
    const { bytes: out, report } = await redactPdf(bytes, { pages: { 0: { rects: [rect] } }, style: 'black' });

    const after = await extractText(out);
    const afterText = after[0].map((e) => e.str).join(' ');
    expect(afterText).not.toContain('FORMSECRET-99');
    expect(afterText).toContain('Outer Plain Text');
    expect(report.pages[0].removedOps).toBeGreaterThanOrEqual(1);
    expect(report.verify.ok).toBe(true);
  }, 60000);

  it('⑧ 工具注册：路由与 5 语 i18n key 完整', async () => {
    const { TOOL_ROUTES } = await import('../src/router/toolRoutes.js');
    expect(TOOL_ROUTES['redact']).toBe('/redact-pdf');

    const en = (await import('../src/locales/en.json')).default;
    const zh = (await import('../src/locales/zh.json')).default;
    const de = (await import('../src/locales/de.json')).default;
    const es = (await import('../src/locales/es.json')).default;
    const fr = (await import('../src/locales/fr.json')).default;

    // en（master）里所有 redact_ / seo_*_redact / result_*_redact / next_action_redact / tab_redact keys
    const redactKeys = Object.keys(en).filter((k) =>
      k === 'tab_redact' || k === 'next_action_redact' ||
      k.endsWith('_redact') || k.startsWith('redact_')
    );
    expect(redactKeys.length).toBeGreaterThanOrEqual(45);

    for (const dict of [zh, de, es, fr]) {
      const missing = redactKeys.filter((k) => !dict[k]);
      expect(missing).toEqual([]);
    }
    // zh / en 术语改名全面断言：sanitize = 元数据清理 (Scrub Metadata)，redact = 敏感信息脱敏 (Redact Content)
    expect(zh['tab_sanitize']).toBe('元数据清理');
    expect(zh['tab_redact']).toBe('敏感信息脱敏');
    expect(zh['sanitize_title']).toBe('PDF 元数据清理');
    expect(zh['redact_title']).toBe('PDF 敏感信息脱敏');
    expect(zh['sanitize_and_download']).toBe('一键清理元数据并下载干净文件');
    expect(zh['result_success_sanitize']).toBe('元数据清理完成！');
    expect(zh['result_success_redact']).toBe('敏感信息脱敏完成 · 验证通过！');
    expect(zh['next_action_sanitize']).toBe('清元数据');
    expect(zh['next_action_redact']).toBe('去脱敏');

    expect(en['tab_sanitize']).toBe('Scrub Metadata');
    expect(en['tab_redact']).toBe('Redact Content');
    expect(en['sanitize_title']).toBe('Scrub PDF Metadata');
    expect(en['redact_title']).toBe('Redact Sensitive Content');
    expect(en['sanitize_and_download']).toBe('Scrub & Download Clean PDF');
    expect(en['result_success_sanitize']).toBe('PDF Metadata Scrubbed Successfully!');
    expect(en['result_success_redact']).toBe('PDF Redacted Successfully - Verified!');
    expect(en['next_action_sanitize']).toBe('Scrub');
    expect(en['next_action_redact']).toBe('Redact');
  }, 30000);
});

describe('contentStreamParser: lexer', () => {
  it('解析基础操作符与字节范围', () => {
    const src = 'BT /F1 12 Tf 1 0 0 1 72 700 Tm (Hello) Tj ET';
    const bytes = new TextEncoder().encode(src);
    const { ops, parseError } = parseContentStream(bytes);
    expect(parseError).toBeNull();
    const names = ops.map((o) => o.op);
    expect(names).toEqual(['BT', 'Tf', 'Tm', 'Tj', 'ET']);
    const tj = ops[3];
    expect(tj.args[0]).toBe('Hello');
    // span 完整性：切片还原 == 原文对应段
    const slice = new TextDecoder().decode(bytes.subarray(tj.start, tj.end));
    expect(slice.replace(/\s+/g, '')).toBe('(Hello)Tj');
  });

  it('字符串转义与嵌套括号', () => {
    const src = '(a\\(b\\)c\\065) Tj';
    const { ops } = parseContentStream(new TextEncoder().encode(src));
    expect(ops[0].args[0]).toBe('a(b)c5'); // \\065 八进制 = '5'
  });

  it('TJ 数组与负数字距', () => {
    const src = '[(A) -120 (BC)] TJ';
    const { ops } = parseContentStream(new TextEncoder().encode(src));
    expect(ops[0].op).toBe('TJ');
    expect(ops[0].args[0][0]).toBe('A');
    expect(ops[0].args[0][1]).toBe(-120);
  });

  it('内联图 BI/ID/EI 整段跳过且重建保留', () => {
    const src = 'q BI /W 2 /H 2 /BPC 8 /CS /G ID ' + 'AAAA' + ' EI Q 1 0 0 1 5 5 cm';
    const bytes = new TextEncoder().encode(src);
    const { ops, inlineImageSpans, parseError } = parseContentStream(bytes);
    expect(parseError).toBeNull();
    expect(inlineImageSpans.length).toBe(1);
    expect(ops.map((o) => o.op)).toEqual(['q', 'Q', 'cm']); // BI..EI 不产生 op
  });

  it('未知操作符（BDC/EMC）与 dict 操作数安全通过', () => {
    const src = '/OC << /Type /OCG /Name (Layer1) >> BDC (Visible) Tj EMC';
    const { ops, parseError } = parseContentStream(new TextEncoder().encode(src));
    expect(parseError).toBeNull();
    expect(ops.map((o) => o.op)).toEqual(['BDC', 'Tj', 'EMC']);
  });
});

describe('textState: simulateOps', () => {
  it('Tm + Tj 的 bbox 与 pdf.js 提取一致（x ≤2pt，y ≤5pt 因模拟器含下降部，宽 ≤3pt）', async () => {
    const bytes = await makeManualStreamPdf('BT /F1 12 Tf 1 0 0 1 72 700 Tm (XYPOSITION) Tj ET');
    const pages = await extractText(bytes);
    const pdfjsBBox = textItemToUserBBox(pages[0][0].item);

    const doc = await PDFDocument.load(bytes);
    const ctx = doc.context;
    const page = doc.getPage(0);
    const content = getPageContentBytes(page.node, ctx);
    const { ops } = parseContentStream(content);
    const fonts = new FontWidthResolver(ctx, page.node.Resources());
    const sim = simulateOps(ops, { fonts });
    expect(sim.showText.length).toBe(1);
    const b = sim.showText[0].bbox;
    expect(Math.abs(b.x - pdfjsBBox.x)).toBeLessThanOrEqual(2);
    // 模拟器 bbox 有意包含下降部（基线 - 0.25×字号），pdf.js item.height 仅字体竖直尺寸
    expect(Math.abs(b.y - pdfjsBBox.y)).toBeLessThanOrEqual(5);
    expect(Math.abs((b.x + b.w) - (pdfjsBBox.x + pdfjsBBox.w))).toBeLessThanOrEqual(3);
  }, 30000);
});

describe('fontWidths: FontWidthResolver', () => {
  it('simple font /Widths + FirstChar', async () => {
    const doc = await PDFDocument.create();
    const ctx = doc.context;
    const widthArr = PDFArray.withContext(ctx);
    [600, 700, 800].forEach((w) => widthArr.push(PDFNumber.of(w)));
    const fontRef = ctx.register(ctx.obj({
      Type: 'Font', Subtype: 'Type1', BaseFont: 'Test',
      FirstChar: 65, Widths: widthArr
    }));
    const fontsDict = PDFDict.withContext(ctx);
    fontsDict.set(PDFName.of('F1'), fontRef);
    const res = PDFDict.withContext(ctx);
    res.set(PDFName.of('Font'), fontsDict);

    const r = new FontWidthResolver(ctx, res);
    expect(r.getWidth('F1', 65)).toBe(600); // 'A'
    expect(r.getWidth('F1', 66)).toBe(700);
    expect(r.getWidth('F1', 67)).toBe(800);
    expect(r.getWidth('F1', 200)).toBe(500); // 越界 → 0.5em fallback
    expect(r.hasFont('F1')).toBe(true);
    expect(r.hasFont('F9')).toBe(false);
  });

  it('Type0 /W 与 /DW', async () => {
    const doc = await PDFDocument.create();
    const ctx = doc.context;
    const wArr = PDFArray.withContext(ctx);
    wArr.push(PDFNumber.of(10)); // cid 10 起
    const inner = PDFArray.withContext(ctx);
    [500, 600].forEach((w) => inner.push(PDFNumber.of(w)));
    wArr.push(inner); // cid10=500, cid11=600
    wArr.push(PDFNumber.of(20));
    wArr.push(PDFNumber.of(22));
    wArr.push(PDFNumber.of(900)); // cid20..22 = 900
    const dfRef = ctx.register(ctx.obj({ Type: 'Font', Subtype: 'CIDFontType0', W: wArr, DW: PDFNumber.of(700) }));
    const dfArr = PDFArray.withContext(ctx);
    dfArr.push(dfRef);
    const t0Ref = ctx.register(ctx.obj({
      Type: 'Font', Subtype: 'Type0', DescendantFonts: dfArr
    }));
    const fontsDict = PDFDict.withContext(ctx);
    fontsDict.set(PDFName.of('F1'), t0Ref);
    const res = PDFDict.withContext(ctx);
    res.set(PDFName.of('Font'), fontsDict);

    const r = new FontWidthResolver(ctx, res);
    expect(r.getWidth('F1', 10)).toBe(500);
    expect(r.getWidth('F1', 11)).toBe(600);
    expect(r.getWidth('F1', 21)).toBe(900);
    expect(r.getWidth('F1', 99)).toBe(700); // DW
  });
});

describe('ruleMatcher: Universal Date & Localized Presets', () => {
  it('全能日期正则：命中 ISO、中文、美国、欧洲多国日期格式，不误报常规数字', () => {
    const re = new RegExp(UNIVERSAL_DATE_REGEX, 'g');
    const validCases = [
      '2026-09-17',
      '2026/09/17',
      '2026.09.17',
      '2026年9月17日',
      '2026年09月17日',
      '09/17/2026', // US
      '17/09/2026', // UK/EU
      '17.09.2026', // DE
      '17-09-2026'
    ];
    for (const vc of validCases) {
      const match = vc.match(re);
      expect(match).not.toBeNull();
      expect(match[0]).toBe(vc);
    }

    const invalidCases = [
      'Total: 100/200 items',
      '192.168.1.1',
      'Version 1.2.3'
    ];
    for (const ic of invalidCases) {
      const match = ic.match(re);
      expect(match).toBeNull();
    }
  });

  it('getLocalizedPiiPresets: 中文返回身份证与大陆手机号，英文返回 SSN 与国际电话', () => {
    const zhPresets = getLocalizedPiiPresets('zh');
    const enPresets = getLocalizedPiiPresets('en');

    const zhId = zhPresets.find((p) => p.id === 'id');
    const enId = enPresets.find((p) => p.id === 'id');
    expect(zhId.labelKey).toBe('node_redact_preset_id');
    expect(zhId.value).toContain('[1-9]');

    expect(enId.labelKey).toBe('node_redact_preset_ssn');
    expect(enId.value).toBe('\\b\\d{3}-\\d{2}-\\d{4}\\b');

    const zhDate = zhPresets.find((p) => p.id === 'date');
    const enDate = enPresets.find((p) => p.id === 'date');
    expect(zhDate.value).toBe(UNIVERSAL_DATE_REGEX);
    expect(enDate.value).toBe(UNIVERSAL_DATE_REGEX);
  });

  it('matchRules: 支持 item.bbox 输入并在单行相邻合并中完整保留 snapped 文本', () => {
    const items = [
      { str: 'Confidential', bbox: { x: 50, y: 700, w: 60, h: 12 } },
      { str: 'Document', bbox: { x: 115, y: 700, w: 50, h: 12 } },
      { str: 'PublicInfo', bbox: { x: 50, y: 600, w: 80, h: 12 } }
    ];

    const rule = { type: 'keyword', value: 'Confidential', caseSensitive: false };
    const res = matchRules(items, [rule]);
    expect(res.totalHits).toBe(1);
    expect(res.rects.length).toBe(1);
    expect(res.rects[0].snapped).toBe('Confidential');
    expect(res.rects[0].x).toBe(50);
    expect(res.rects[0].w).toBe(60);

    // 正则多项匹配与同行合并
    const ruleMulti = { type: 'regex', value: '(?:Confidential|Document)', caseSensitive: false };
    const resMulti = matchRules(items, [ruleMulti]);
    expect(resMulti.totalHits).toBe(2);
    expect(resMulti.rects.length).toBe(1); // 间距 5pt <= 12pt 合并为单个矩形
    expect(resMulti.rects[0].snapped).toContain('Confidential');
    expect(resMulti.rects[0].snapped).toContain('Document');
  });

  it('Smart Search & Redact 集成模拟：模拟页面多项 PII 检索、去重与快照撤销', () => {
    const pageItems = [
      { str: 'Contact: alice@example.com', bbox: { x: 50, y: 720, w: 180, h: 12 } },
      { str: 'Date: 2026-09-17', bbox: { x: 50, y: 700, w: 100, h: 12 } },
      { str: 'ID: 110101199003072345', bbox: { x: 50, y: 680, w: 150, h: 12 } },
      { str: 'Safe Normal Text', bbox: { x: 50, y: 660, w: 90, h: 12 } }
    ];

    const presets = getLocalizedPiiPresets('zh');
    const emailPreset = presets.find((p) => p.id === 'email');
    const datePreset = presets.find((p) => p.id === 'date');
    const idPreset = presets.find((p) => p.id === 'id');

    // 1. 匹配邮箱
    const emailRes = matchRules(pageItems, [{ type: emailPreset.type, value: emailPreset.value, caseSensitive: false }]);
    expect(emailRes.totalHits).toBe(1);
    expect(emailRes.rects[0].snapped).toBe('Contact: alice@example.com');

    // 2. 匹配日期
    const dateRes = matchRules(pageItems, [{ type: datePreset.type, value: datePreset.value, caseSensitive: false }]);
    expect(dateRes.totalHits).toBe(1);
    expect(dateRes.rects[0].snapped).toBe('Date: 2026-09-17');

    // 3. 匹配身份证
    const idRes = matchRules(pageItems, [{ type: idPreset.type, value: idPreset.value, caseSensitive: false }]);
    expect(idRes.totalHits).toBe(1);
    expect(idRes.rects[0].snapped).toBe('ID: 110101199003072345');

    // 4. 重复搜索去重逻辑验证
    const existingList = [
      { id: 'r1', x: 50, y: 720, w: 180, h: 12, snapped: 'Contact: alice@example.com' }
    ];
    const newRect = emailRes.rects[0];
    const isDuplicate = existingList.some((ex) => {
      const interW = Math.min(ex.x + ex.w, newRect.x + newRect.w) - Math.max(ex.x, newRect.x);
      const interH = Math.min(ex.y + ex.h, newRect.y + newRect.h) - Math.max(ex.y, newRect.y);
      if (interW <= 0 || interH <= 0) return false;
      const interArea = interW * interH;
      const minArea = Math.min(ex.w * ex.h, newRect.w * newRect.h);
      return minArea > 0 && (interArea / minArea) > 0.7;
    });
    expect(isDuplicate).toBe(true);
  });
});
