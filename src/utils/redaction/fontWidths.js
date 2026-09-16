/**
 * 字体宽度提取：用于内容流文本算子的几何模拟。
 *
 * 优先级：真实 /Widths（simple font）或 /W（Type0/CID）→ fallback 0.5em。
 * 所有结果按 glyph code 缓存在 FontWidthResolver 实例内。
 */
import { PDFDict, PDFArray, PDFNumber, PDFName, PDFRef } from 'pdf-lib';

/** pdf-lib 对象安全取 number */
function asNumber(obj) {
  return obj instanceof PDFNumber ? obj.asNumber() : null;
}

/**
 * 解析 Type0 字体的 /W 数组（CID 宽度）。
 * 格式：c [w1 w2 ...] | c1 c2 w
 * @returns {Map<number, number>} cid → width
 */
function parseCIDWidths(arr) {
  const map = new Map();
  let i = 0;
  const readNum = (idx) => asNumber(arr.get ? arr.get(idx) : arr[idx]);
  const length = arr.size ? arr.size() : arr.length;
  while (i < length) {
    const c = readNum(i);
    if (c === null) break;
    const next = arr.get ? arr.get(i + 1) : arr[i + 1];
    if (next instanceof PDFArray) {
      // c [w...]
      const list = next;
      const n = list.size();
      for (let k = 0; k < n; k++) {
        const w = asNumber(list.get(k));
        if (w !== null) map.set(c + k, w);
      }
      i += 2;
    } else {
      // c1 c2 w
      const c2 = readNum(i + 1);
      const w = readNum(i + 2);
      if (c2 === null || w === null) break;
      for (let k = c; k <= c2; k++) map.set(k, w);
      i += 3;
    }
  }
  return map;
}

export class FontWidthResolver {
  /**
   * @param {import('pdf-lib').PDFContext} context pdf-lib context（用于解引用）
   * @param {import('pdf-lib').PDFDict} pageResources 页面 /Resources
   */
  constructor(context, pageResources) {
    this.context = context;
    this.pageResources = pageResources;
    /** @type {Map<string, {widths:Map<number,number>|null, defaultWidth:number}>} 按资源名（/F1）缓存 */
    this.cache = new Map();
  }

  /**
   * 取资源名（如 'F1'）对应字体的指定 glyph code 宽度。
   * @param {string} fontKey Tf 操作符的字体资源名
   * @param {number} code 字符码（simple font）或 CID（Type0）
   * @returns {number} 字体设计空间宽度（glyph units = 1000 制）；未知字体返回 NaN
   */
  getWidth(fontKey, code) {
    const entry = this.resolve(fontKey);
    if (!entry) return NaN;
    if (entry.widths && entry.widths.has(code)) return entry.widths.get(code);
    return entry.defaultWidth;
  }

  /** 判断字体是否存在（宽度可不可用单独看返回值） */
  hasFont(fontKey) {
    return this.resolve(fontKey) !== null;
  }

  resolve(fontKey) {
    if (this.cache.has(fontKey)) return this.cache.get(fontKey);
    let entry = null;
    try {
      const fontsDict = this.pageResources?.lookup(PDFName.of('Font'), PDFDict);
      if (fontsDict) {
        let fontObj = fontsDict.get(PDFName.of(fontKey));
        if (fontObj instanceof PDFRef) fontObj = this.context.lookup(fontObj);
        if (fontObj instanceof PDFDict) {
          entry = this.buildEntry(fontObj);
        }
      }
    } catch {
      entry = null;
    }
    this.cache.set(fontKey, entry);
    return entry;
  }

  buildEntry(fontDict) {
    const subtype = fontDict.get(PDFName.of('Subtype'));
    const isType0 = subtype === PDFName.of('Type0');

    if (isType0) {
      // DescendantFonts[0].W + DW
      let wMap = null;
      let defaultWidth = 1000; // DW 缺省即 1000
      try {
        const dfArr = fontDict.lookupMaybe(PDFName.of('DescendantFonts'), PDFArray);
        if (dfArr && dfArr.size() > 0) {
          let df = dfArr.get(0);
          if (df instanceof PDFRef) df = this.context.lookup(df);
          if (df instanceof PDFDict) {
            const dw = df.lookupMaybe(PDFName.of('DW'), PDFNumber);
            if (dw) defaultWidth = dw.asNumber();
            const wArr = df.lookupMaybe(PDFName.of('W'), PDFArray);
            if (wArr) wMap = parseCIDWidths(wArr);
          }
        }
      } catch {
        /* 部分畸形字体字典：使用 DW 缺省 */
      }
      return { widths: wMap, defaultWidth };
    }

    // Simple font：/Widths + /FirstChar（glyph index = code - FirstChar）
    let widths = null;
    const firstChar = fontDict.lookupMaybe(PDFName.of('FirstChar'), PDFNumber);
    const wArr = fontDict.lookupMaybe(PDFName.of('Widths'), PDFArray);
    if (wArr && firstChar) {
      widths = new Map();
      const fc = firstChar.asNumber();
      const n = wArr.size();
      for (let i = 0; i < n; i++) {
        const w = asNumber(wArr.get(i));
        if (w !== null) widths.set(fc + i, w);
      }
    }
    return { widths, defaultWidth: 500 }; // 0.5em fallback
  }
}
