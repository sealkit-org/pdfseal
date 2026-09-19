/**
 * Output verification (the final defense line against fake/incomplete redaction):
 * Re-opens the generated PDF using pdf.js and asserts that zero extractable text exists
 * within any specified redaction rectangles.
 *
 * Evaluation shares the exact same rule as text removal (shouldRemoveOp): text bbox overlap >= 50%
 * or center point falls inside redaction rectangle.
 */
import { textItemToUserBBox, shouldRemoveOp } from './coords.js';

/**
 * @param {Uint8Array} outputBytes Resulting bytes from redactPdf
 * @param {Object} spec Same specification structure as passed to redactPdf
 * @param {{password?: string, verifyLoader?: Function, ignoreTexts?: string[]}} [opts]
 *        ignoreTexts: intentionally kept text (e.g. stamp overlay '[REDACTED]'), excluded from residual check
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
        if (ignore.has(item.str.trim())) continue; // Intentionally placed overlay / stamp text
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
    // Node environment (Vitest): load standard fonts from local filesystem (trailing slash required)
    const modUrl = 'node:url';
    const modPath = 'node:path';
    const { pathToFileURL } = await import(/* @vite-ignore */ modUrl);
    const { resolve } = await import(/* @vite-ignore */ modPath);
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
