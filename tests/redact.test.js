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
