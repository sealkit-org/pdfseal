/**
 * Redaction Engine Orchestration Entry.
 *
 * Anti-leak / True Stream Redaction Standards:
 *  - Vector text: physically strips show-text operators at the byte level of content streams (underneath the blackout box is pure void).
 *  - Pages intersecting with images: full-page rasterization fallback (original text layers and image objects are physically removed).
 *
 * Coordinate convention: spec.rects are strictly in PDF user space (matching pdf.js convertToPdfRectangle output
 * and content stream coordinates; /Rotate is handled by pdf.js viewport on the UI side).
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

/** Formats PDF numbers (avoids JS floating point drift entering content stream) */
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

/** Decodes a single content stream (PDFRawStream decodes via filter; PDFContentStream gets raw bytes) */
function decodeStream(stream) {
  if (stream instanceof PDFRawStream) {
    return decodePDFRawStream(stream).decode(); // Unsupported filter throws -> page upgrades to rasterization
  }
  if (stream && typeof stream.getContents === 'function') {
    return stream.getContents();
  }
  throw new Error('unsupported content stream type');
}

/** Retrieves all content stream bytes for a page (concatenated per PDF semantics); exported for test assertions */
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

/** Reconstructs byte stream according to removed byte ranges (concatenates preserved slices) */
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
 * Stream object dictionary helper:
 * In pdf-lib, PDFStream does not inherit PDFDict (dictionary is stored in .dict property),
 * so `stream instanceof PDFDict` is always false. All stream dictionary lookups must use this helper.
 */
function asStreamDict(obj) {
  if (obj instanceof PDFRawStream) return obj.dict;
  if (obj instanceof PDFDict) return obj;
  return null;
}

/** Collects all indirect references for page Contents */
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

/** Collects all indirect references in page Annots array */
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
 * Physically deletes old objects that are no longer referenced by this page (prevents orphan streams from leaking redacted text).
 * Only deleted if no other pages reference the same ref (cross-page sharing of Contents/Annots is extremely rare; conservative check).
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
      try { context.delete(ref); } catch { /* ignore */ }
    }
  }
}

/** Counts occurrences of a Form ref across all page XObject resource dictionaries (>1 = shared across pages/names) */
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

/** Page MediaBox (number[4]) */
function getMediaBox(pageNode) {
  const mb = pageNode.lookupMaybe(PDFName.of('MediaBox'), PDFArray);
  if (mb && mb.size() === 4) {
    return [0, 1, 2, 3].map((i) => mb.lookup(i, PDFNumber).asNumber());
  }
  return [0, 0, 612, 792];
}

/**
 * Processes a content stream (page main contents or Form XObject):
 * Parse -> Simulate -> Delete targeted show-text operators; returns { newBytes|null, imageHits, parseError }
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
    newBytes: spans.length ? rebuildBytes(bytes, spans) : null, // null = no rewrite needed
    removedOps: removed.size,
    showTextCount: sim.showText.length,
    xobjectPlacements: sim.xobjects,
    inlineImageSpans,
    parseError: null
  };
}

/**
 * Main redaction entry.
 * @param {ArrayBuffer|Uint8Array} bytes Original PDF bytes
 * @param {{pages: Record<number, {rects: Array<{x,y,w,h}>}>, style: 'black'|'white'|'stamp', dpi?: number, jpegQuality?: number}} spec
 * @param {{password?: string, onProgress?: Function, renderPage?: Function, verifyLoader?: Function, verify?: boolean}} [opts]
 *        renderPage can be injected (mock renderer for Node unit tests); defaults to browser rasterBurnIn
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

  // Mode 1 Vector loading (default Clean Mode rasterizes the entire page destroying text layer; must not use default)
  const pdfDoc = await loadCleanPdfDocument(bytes, { password, preserveWatermarks: true });
  const context = pdfDoc.context;

  /** Pages requiring rasterization (image intersection / parse failure / verify leftover retry) */
  const rasterSet = new Set();
  /** Page-level processing reports */
  const pageReports = new Map();

  // ---------- Pass 1: Vector path analysis + rewriting ----------
  for (let n = 0; n < pageIndexes.length; n++) {
    const pageIndex = pageIndexes[n];
    const rects = spec.pages[pageIndex].rects;
    const page = pdfDoc.getPage(pageIndex);
    const pageNode = page.node;
    const pr = { index: pageIndex, path: 'vector', removedOps: 0, removedAnnots: 0, reason: '' };

    // Verification retry: pages that failed complete vector text removal are forced to rasterize
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
      // Parsing failure: fallback to page rasterization, never fail silently
      pr.reason = `parse-error: ${analysis.parseError}`;
      rasterSet.add(pageIndex);
      pageReports.set(pageIndex, pr);
      onProgress(0.05 + (0.45 * (n + 1)) / pageIndexes.length, 'analyzing');
      continue;
    }

    // Image intersection: if an XObject referenced by Do is an Image and its placement intersects with redaction rect -> rasterize
    const imageHit = detectImageHits(context, pageNode, analysis.xobjectPlacements, rects);
    // Inline images (BI...EI) have unknown geometry: conservatively treat as hit (favor security over vector purity)
    const inlineHit = analysis.inlineImageSpans.length > 0;
    if (imageHit || inlineHit) {
      pr.reason = imageHit ? 'image-under-redaction' : 'inline-image-on-page';
      rasterSet.add(pageIndex);
      pageReports.set(pageIndex, pr);
      onProgress(0.05 + (0.45 * (n + 1)) / pageIndexes.length, 'analyzing');
      continue;
    }

    // ---- Form XObject recursive analysis (analysis-only without mutation; hazards trigger full page rasterization) ----
    const pageRes = pageNode.Resources();
    const formResult = redactFormXObjects(context, pdfDoc, pageRes, analysis.xobjectPlacements, rects);
    if (formResult.needRaster) {
      pr.reason = 'form-xobject-hazard'; // Shared Form / unsupported filter / parsing error
      rasterSet.add(pageIndex);
      pageReports.set(pageIndex, pr);
      onProgress(0.05 + (0.45 * (n + 1)) / pageIndexes.length, 'analyzing');
      continue;
    }

    // ---- Vector rewrite: main content stream ----
    if (analysis.newBytes) {
      const oldRefs = contentRefsOf(pageNode);
      const newStream = context.flateStream(analysis.newBytes);
      pageNode.set(PDFName.of('Contents'), context.register(newStream));
      deleteOrphanedRefs(context, pdfDoc, pageIndex, oldRefs, contentRefsOf);
    }

    // ---- Apply in-place Form rewrites (takes effect consistently across references, no orphan objects) ----
    for (const p of formResult.pending) {
      if (p.dict.get(PDFName.of('Filter')) === PDFName.of('FlateDecode')) {
        p.stream.contents = context.flateStream(p.newBytes).contents;
      } else {
        p.stream.contents = p.newBytes; // Raw uncompressed stream
      }
    }
    pr.removedOps = analysis.removedOps + formResult.removed;

    // ---- Annotation cleanup (delete Annots whose /Rect intersects with redaction rects) ----
    pr.removedAnnots = removeIntersectingAnnots(context, pdfDoc, pageIndex, pageNode, rects);

    pageReports.set(pageIndex, pr);
    onProgress(0.05 + (0.45 * (n + 1)) / pageIndexes.length, 'vector');
  }

  // ---------- Mask appearance (vector pages): appended directly into new content stream ----
  for (const pageIndex of pageIndexes) {
    if (rasterSet.has(pageIndex)) continue;
    await drawMasks(pdfDoc, pageIndex, spec.pages[pageIndex].rects, style, spec);
  }

  // ---------- Pass 2: Rasterization replacement ----------
  if (rasterSet.size) {
    let done = 0;
    for (const pageIndex of rasterSet) {
      const rects = spec.pages[pageIndex].rects;
      const rendered = await rasterBurnPage(bytes, pageIndex, rects, style, {
        password,
        dpi: spec.dpi || 192,
        jpegQuality: spec.jpegQuality || 0.85,
        customColor: spec.customColor,
        stampText: spec.stampText,
        renderPage: opts.renderPage // Injected in Node tests
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

  // ---------- Output verification: assert zero extractable text remains in redaction zones ----------
  if (verify) {
    onProgress(0.95, 'verify');
    const v = await verifyRedaction(outBytes, spec, {
      password,
      verifyLoader: opts.verifyLoader,
      // Stamp text is an intentional visible marker, not considered a residual leak
      ignoreTexts: style === 'stamp'
        ? (spec.stampText?.trim() ? [spec.stampText.trim(), STAMP_TEXT] : [STAMP_TEXT])
        : undefined
    });
    report.verify = v;

    // Automatic rasterization retry for pages with residual text
    if (!v.ok && v.leftoverPages?.length) {
      const retrySpec = { ...spec, pages: {} };
      for (const p of v.leftoverPages) retrySpec.pages[p] = spec.pages[p];
      const retry = await redactPdf(outBytes, retrySpec, {
        ...opts,
        verify: false,
        // Force leftover pages to rasterize (vector removal proven incomplete)
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

/** forceRaster support (used for verification retry): skips vector analysis and forces rasterization */

/** detectImageHits: Do placement -> Resources/XObject lookup /Subtype /Image -> rect intersection test */
function detectImageHits(context, pageNode, placements, rects) {
  if (!placements?.length) return false;
  const xobjs = pageNode.lookupMaybe(PDFName.of('Resources'), PDFDict)
    ?.lookupMaybe(PDFName.of('XObject'), PDFDict);
  if (!xobjs) return false;
  for (const p of placements) {
    let obj = xobjs.get(PDFName.of(p.name));
    if (obj instanceof PDFRef) obj = context.lookup(obj);
    const dict = asStreamDict(obj); // Stream object does not inherit PDFDict; dictionary is in .dict
    if (!dict) continue;
    if (dict.get(PDFName.of('Subtype')) !== PDFName.of('Image')) continue;
    if (rects.some((r) => rectsIntersect(p.bbox, r))) return true;
  }
  return false;
}

/**
 * Form XObject recursive redaction (BFS traversal with ref de-duplication to prevent cycles).
 * Effective Form CTM = Form /Matrix * CTM at Do invocation.
 *
 * Two phases: full analysis first (no mutations), and in-place rewriting only when no hazards are found:
 *  - In-place mutation: takes effect across all referencing sites consistently, preventing orphan leaks.
 *  - Hazard signals (needRaster -> triggers full-page rasterization fallback):
 *      a) Top-level Form shared across multiple pages/names (mutating would silently delete text on other pages without masks).
 *      b) Unsupported filter / DecodeParms (LZW, multi-stage filters, Predictors).
 *      c) Form stream parse failure.
 *  - Known boundary: nested Form sharing is protected by in-place mutation consistency without dangling refs.
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
  /** Completed analyses pending in-place rewrite: { stream, dict, newBytes } */
  const pending = [];

  /** Enqueues Form named `name` from parent XObject dictionary (top-level checks sharing) */
  const tryEnqueue = (parentXobjs, name, doCtm, isTopLevel) => {
    const maybe = parentXobjs.get(PDFName.of(name));
    let ref = maybe instanceof PDFRef ? maybe : null;
    let stream = maybe instanceof PDFRef ? context.lookup(maybe) : maybe;
    if (!(stream instanceof PDFRawStream)) return; // Not a Form stream (or bare dictionary)
    const dict = stream.dict;
    if (dict.get(PDFName.of('Subtype')) !== PDFName.of('Form')) return;
    if (isTopLevel && ref && countFormRefUsage(pdfDoc, ref) > 1) {
      needRaster = true; // Shared Form: mutation would affect other pages -> full page rasterization
      return;
    }
    const filter = dict.get(PDFName.of('Filter'));
    if (filter !== undefined && filter !== PDFName.of('FlateDecode')) {
      needRaster = true; // Unsupported/multi-stage filter: cannot re-encode safely
      return;
    }
    if (dict.get(PDFName.of('DecodeParms')) !== undefined) {
      needRaster = true; // Incompatible parameters such as Predictor
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
        needRaster = true; // Form parsing failed -> page rasterization fallback (never fail silently)
        break;
      }
      if (res.newBytes) {
        pending.push({ stream: item.stream, dict: item.dict, newBytes: res.newBytes });
        removedTotal += res.removedOps;
      }
      // Nested Do inside Form -> continue recursion
      if (res.xobjectPlacements?.length) {
        const innerXobjs = item.resources.lookupMaybe(PDFName.of('XObject'), PDFDict);
        if (innerXobjs) {
          for (const p of res.xobjectPlacements) tryEnqueue(innerXobjs, p.name, p.ctm, false);
        }
      }
    } catch {
      needRaster = true; // Exception processing Form -> page rasterization fallback
      break;
    }
  }

  // Hazard signal: perform zero mutations (preserve original semantics), caller will rasterize the page
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

/** Deletes annotations whose /Rect intersects with redaction rects (physically deleting annot objects); returns count */
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
    // Physically delete annotation object itself (sensitive text in /Contents must not remain as orphan in file)
    deleteOrphanedRefs(context, pdfDoc, pageIndex, removedRefs, annotRefsOf);
  }
  return removed;
}

function hexToRgb01(hex) {
  if (!hex || typeof hex !== 'string') return { r: 0, g: 0, b: 0 };
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  if (clean.length !== 6) return { r: 0, g: 0, b: 0 };
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return {
    r: isNaN(r) ? 0 : r,
    g: isNaN(g) ? 0 : g,
    b: isNaN(b) ? 0 : b
  };
}

function resolveFillColor(style, customColor) {
  if (style === 'white') return { r: 1, g: 1, b: 1 };
  if (style === 'gray') return hexToRgb01('#334155');
  if (style === 'custom') return hexToRgb01(customColor || '#000000');
  return { r: 0, g: 0, b: 0 }; // black & default
}

function canWinAnsi(str) {
  if (typeof str !== 'string') return true;
  for (let i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) > 255) return false;
  }
  return true;
}

function isLightRgb(r, g, b) {
  return (r * 0.299 + g * 0.587 + b * 0.114) > 0.65;
}

async function renderStampPng(text, bgColor = '#000000', textColor = '#ffffff') {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') return null;
  const canvas = document.createElement('canvas');
  const dpr = 2;
  const h = 48 * dpr;
  const ctx = canvas.getContext('2d');
  ctx.font = `bold ${22 * dpr}px sans-serif`;
  const metrics = ctx.measureText(text);
  const w = Math.max(120 * dpr, Math.ceil(metrics.width + 32 * dpr));
  canvas.width = w;
  canvas.height = h;

  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, w, h);

  // Text
  ctx.fillStyle = textColor;
  ctx.font = `bold ${22 * dpr}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  canvas.width = 0;
  canvas.height = 0;
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Vector page mask appearance (blackout/whiteout/gray/custom appends 're f'; stamp uses pdf-lib text/PNG badge API).
 * Note: The mask is an intentional visible indicator; underlying text has already been physically excised.
 */
async function drawMasks(pdfDoc, pageIndex, rects, style, spec = {}) {
  const page = pdfDoc.getPage(pageIndex);
  if (style === 'stamp') {
    const text = (spec.stampText && typeof spec.stampText === 'string' && spec.stampText.trim())
      ? spec.stampText.trim()
      : STAMP_TEXT;
    const bg = hexToRgb01(spec.customColor || '#000000');
    const pdfBgColor = rgb(bg.r, bg.g, bg.b);
    const isLight = isLightRgb(bg.r, bg.g, bg.b);
    const textColor = isLight ? rgb(0, 0, 0) : rgb(1, 1, 1);

    if (canWinAnsi(text)) {
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      for (const r of rects) {
        page.drawRectangle({ x: r.x, y: r.y, width: r.w, height: r.h, color: pdfBgColor });
        const charLen = Math.max(text.length, 6);
        const size = Math.max(4, Math.min(r.h * 0.6, (r.w * 0.85) / (charLen * 0.6)));
        page.drawText(text, {
          x: r.x + (r.w - text.length * size * 0.6) / 2,
          y: r.y + (r.h - size * 0.72) / 2,
          size,
          font,
          color: textColor
        });
      }
    } else {
      let pngBytes = null;
      try {
        pngBytes = await renderStampPng(text, spec.customColor || '#000000', isLight ? '#000000' : '#ffffff');
      } catch {
        pngBytes = null;
      }
      if (pngBytes) {
        const embeddedImg = await pdfDoc.embedPng(pngBytes);
        for (const r of rects) {
          page.drawImage(embeddedImg, { x: r.x, y: r.y, width: r.w, height: r.h });
        }
      } else {
        for (const r of rects) {
          page.drawRectangle({ x: r.x, y: r.y, width: r.w, height: r.h, color: pdfBgColor });
        }
      }
    }
    return;
  }

  // black / white / gray / custom: append path fills
  const color = resolveFillColor(style, spec.customColor);
  let fill;
  if (style === 'white') {
    fill = '1 1 1 rg';
  } else if (style === 'black') {
    fill = '0 0 0 rg';
  } else {
    fill = `${fmt(color.r)} ${fmt(color.g)} ${fmt(color.b)} rg`;
  }

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
    // Physically delete merged old content streams if no longer referenced
    deleteOrphanedRefs(pdfDoc.context, pdfDoc, pageIndex, oldRefs, contentRefsOf);
  }
}

/** Merges extra operators into existing Contents (concatenates into a single fresh stream) */
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
 * Rasterized page replacement: replaces page with image + purges original Resources/Annots/Image objects.
 * rendered = { jpegBytes, widthPt, heightPt } (viewport rotation baked into image)
 */
async function replacePageWithImage(pdfDoc, pageIndex, rendered) {
  const page = pdfDoc.getPage(pageIndex);
  const node = page.node;
  const context = pdfDoc.context;
  const img = await pdfDoc.embedJpg(rendered.jpegBytes);

  // Track image XObject references in old Resources (deleted later if unreferenced elsewhere)
  const oldRefs = collectXObjectRefs(context, node);
  // Old content streams / annotation references (orphaned after replacement, physically deleted)
  const oldContentRefs = contentRefsOf(node);
  const oldAnnotRefs = annotRefsOf(node);

  // New content stream: q W 0 0 H 0 0 cm /X0 Do Q
  const ops = `q ${fmt(rendered.widthPt)} 0 0 ${fmt(rendered.heightPt)} 0 0 cm /X0 Do Q`;
  const streamRef = context.register(context.flateStream(new TextEncoder().encode(ops)));

  // Fresh Resources: contains only the new image (explicitly constructed)
  const xobjDict = PDFDict.withContext(context);
  xobjDict.set(PDFName.of('X0'), img.ref);
  const newResources = PDFDict.withContext(context);
  newResources.set(PDFName.of('XObject'), xobjDict);

  node.set(PDFName.of('Contents'), streamRef);
  node.set(PDFName.of('Resources'), newResources);
  node.delete(PDFName.of('Annots'));
  node.delete(PDFName.of('Rotate')); // Rotation is already baked in; prevent double rotation
  const [x0, y0] = getMediaBox(node);
  const mediaBox = context.obj([x0, y0, x0 + rendered.widthPt, y0 + rendered.heightPt]);
  node.set(PDFName.of('MediaBox'), mediaBox);

  // Clean up old image objects referenced only by this page (prevents file bloat)
  const others = new Set();
  for (let i = 0; i < pdfDoc.getPageCount(); i++) {
    if (i === pageIndex) continue;
    for (const ref of collectXObjectRefs(context, pdfDoc.getPage(i).node)) others.add(ref.toString());
  }
  for (const ref of oldRefs) {
    if (!others.has(ref.toString())) {
      try { context.delete(ref); } catch { /* ignore */ }
    }
  }
  // Physical cleanup of old content streams and annotation objects
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
