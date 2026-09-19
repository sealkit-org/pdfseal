/**
 * Font width extraction: used for geometric simulation of content stream text operators.
 *
 * Priority: actual /Widths (simple font) or /W (Type0/CID) -> fallback to 0.5em.
 * All results are cached per font resource name inside FontWidthResolver instances.
 */
import { PDFDict, PDFArray, PDFNumber, PDFName, PDFRef } from 'pdf-lib';

/** Safely extract numeric value from pdf-lib object */
function asNumber(obj) {
  return obj instanceof PDFNumber ? obj.asNumber() : null;
}

/**
 * Parses /W array of Type0 fonts (CID widths).
 * Format: c [w1 w2 ...] | c1 c2 w
 * @returns {Map<number, number>} cid -> width
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
   * @param {import('pdf-lib').PDFContext} context pdf-lib context (for dereferencing)
   * @param {import('pdf-lib').PDFDict} pageResources Page /Resources dictionary
   */
  constructor(context, pageResources) {
    this.context = context;
    this.pageResources = pageResources;
    /** @type {Map<string, {widths:Map<number,number>|null, defaultWidth:number}>} Cache by font resource name (/F1) */
    this.cache = new Map();
  }

  /**
   * Returns glyph width for given font resource name (e.g. 'F1') and glyph code.
   * @param {string} fontKey Font resource name in Tf operator
   * @param {number} code Character code (simple font) or CID (Type0)
   * @returns {number} Font design space width (glyph units = 1000 base); returns NaN if font unknown
   */
  getWidth(fontKey, code) {
    const entry = this.resolve(fontKey);
    if (!entry) return NaN;
    if (entry.widths && entry.widths.has(code)) return entry.widths.get(code);
    return entry.defaultWidth;
  }

  /** Checks whether font exists in resources (width availability handled separately) */
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
      let defaultWidth = 1000; // Default DW is 1000 per PDF specification
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
        /* Malformed font dictionary fallback: use DW default */
      }
      return { widths: wMap, defaultWidth };
    }

    // Simple font: /Widths + /FirstChar (glyph index = code - FirstChar)
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
