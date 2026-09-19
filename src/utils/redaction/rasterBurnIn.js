/**
 * Rasterization burn-in fallback path (for scanned documents and image intersections).
 *
 * Browser: high-DPI rendering via pdf.js (max edge <= 4000px) -> burns masks on canvas -> re-encodes to JPEG.
 * Node unit tests: mocks renderPage (returns deterministic JPEG bytes);
 *                  the engine-side replacement (Contents / Resources / Annots) remains completely identical.
 */
import { userRectToCanvas } from './coords.js';

const MAX_EDGE_PX = 4000;

/**
 * @param {ArrayBuffer|Uint8Array} originalBytes Original document bytes (rasterization renders directly
 *        from original file to guarantee what-you-see-is-what-you-get)
 * @param {number} pageIndex Zero-based page index
 * @param {Array<{x,y,w,h}>} rects User-space redaction rectangles
 * @param {'black'|'white'|'stamp'} style
 * @param {{password?: string, dpi?: number, jpegQuality?: number, renderPage?: Function}} opts
 * @returns {Promise<{jpegBytes: Uint8Array, widthPt: number, heightPt: number}>}
 *          widthPt/heightPt = viewport(scale=1) dimensions (rotation baked in)
 */
export async function rasterBurnPage(originalBytes, pageIndex, rects, style, opts = {}) {
  if (typeof opts.renderPage === 'function') {
    // Injected renderer (for unit tests / headless environments)
    return opts.renderPage(originalBytes, pageIndex, rects, style, opts);
  }
  return browserRender(originalBytes, pageIndex, rects, style, opts);
}

function resolveFillColor(style, customColor) {
  if (style === 'white') return '#ffffff';
  if (style === 'gray') return '#334155';
  if (style === 'custom') return customColor || '#000000';
  return '#000000';
}

function isLightHex(hex) {
  if (!hex || typeof hex !== 'string') return false;
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) clean = clean.split('').map((c) => c + c).join('');
  if (clean.length !== 6) return false;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return (r * 0.299 + g * 0.587 + b * 0.114) > 0.65;
}

async function browserRender(originalBytes, pageIndex, rects, style, opts) {
  const pdfjs = await import('pdfjs-dist');
  const loadingTask = pdfjs.getDocument({
    data: originalBytes instanceof Uint8Array ? originalBytes.slice() : new Uint8Array(originalBytes).slice(),
    password: opts.password || undefined,
    cMapUrl: (typeof window !== 'undefined' ? window.location.origin : '') + '/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: (typeof window !== 'undefined' ? window.location.origin : '') + '/standard_fonts/'
  });
  const pdf = await loadingTask.promise;
  try {
    const page = await pdf.getPage(pageIndex + 1);
    const base = page.getViewport({ scale: 1 });
    let scale = (opts.dpi || 192) / 72;
    const longest = Math.max(base.width, base.height) * scale;
    if (longest > MAX_EDGE_PX) scale *= MAX_EDGE_PX / longest; // Memory safeguard for large pages

    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport, intent: 'display' }).promise;

    // Burn redaction masks (user space -> canvas space; viewport handles /Rotate)
    const fillColor = resolveFillColor(style, opts.customColor);
    for (const r of rects) {
      const c = userRectToCanvas(r, viewport);
      if (style === 'stamp') {
        const text = (opts.stampText && typeof opts.stampText === 'string' && opts.stampText.trim())
          ? opts.stampText.trim()
          : '[REDACTED]';
        const stampBg = opts.customColor || '#000000';
        ctx.fillStyle = stampBg;
        ctx.fillRect(c.x, c.y, c.w, c.h);
        const charLen = Math.max(text.length, 6);
        const size = Math.max(6, Math.min(c.h * 0.5, (c.w * 0.85) / charLen));
        ctx.fillStyle = isLightHex(stampBg) ? '#000000' : '#ffffff';
        ctx.font = `bold ${size}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, c.x + c.w / 2, c.y + c.h / 2);
      } else {
        ctx.fillStyle = fillColor;
        ctx.fillRect(c.x, c.y, c.w, c.h);
      }
    }

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', opts.jpegQuality || 0.85));
    const jpegBytes = new Uint8Array(await blob.arrayBuffer());
    canvas.width = 0; // Release canvas memory immediately
    canvas.height = 0;
    return { jpegBytes, widthPt: base.width, heightPt: base.height };
  } finally {
    try { await pdf.destroy(); } catch { /* ignore */ }
  }
}
