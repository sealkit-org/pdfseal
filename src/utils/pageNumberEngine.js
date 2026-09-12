import { StandardFonts, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { loadCleanPdfDocument } from './pdfSecurity';
import { logger } from './logger';

/**
 * Detects the dominant background color from a rendered page canvas or context.
 * Samples along top, bottom, and side margins to avoid foreground text,
 * filters out low-luminance (dark text) and highly saturated pixels (stamps/logos),
 * and quantizes light pixels to find the background tone.
 * 
 * @param {HTMLCanvasElement|CanvasRenderingContext2D|Object} canvasOrCtx
 * @returns {string} hex color string e.g. '#ffffff' or '#fbf9f4'
 */
export function detectDominantBackgroundColor(canvasOrCtx) {
  if (!canvasOrCtx) return '#ffffff';

  let ctx = null;
  let w = 0;
  let h = 0;

  if (typeof canvasOrCtx.getContext === 'function') {
    ctx = canvasOrCtx.getContext('2d');
    w = canvasOrCtx.width || 0;
    h = canvasOrCtx.height || 0;
  } else if (canvasOrCtx.canvas) {
    ctx = canvasOrCtx;
    w = ctx.canvas.width || 0;
    h = ctx.canvas.height || 0;
  } else if (typeof canvasOrCtx.getImageData === 'function') {
    ctx = canvasOrCtx;
    w = canvasOrCtx.width || 595;
    h = canvasOrCtx.height || 842;
  }

  if (!ctx || !w || !h) return '#ffffff';

  const samplePoints = [];
  const numSamplesPerEdge = 16;

  // Bottom edge samples (where page numbers most often go)
  for (let i = 1; i <= numSamplesPerEdge; i++) {
    const x = Math.round((i / (numSamplesPerEdge + 1)) * w);
    samplePoints.push({ x, y: Math.max(0, Math.min(h - 1, Math.round(h * 0.96))) });
    samplePoints.push({ x, y: Math.max(0, Math.min(h - 1, Math.round(h * 0.93))) });
  }

  // Top edge samples
  for (let i = 1; i <= numSamplesPerEdge; i++) {
    const x = Math.round((i / (numSamplesPerEdge + 1)) * w);
    samplePoints.push({ x, y: Math.max(0, Math.min(h - 1, Math.round(h * 0.04))) });
    samplePoints.push({ x, y: Math.max(0, Math.min(h - 1, Math.round(h * 0.07))) });
  }

  // Left & Right margin samples
  for (let i = 1; i <= 8; i++) {
    const y = Math.max(0, Math.min(h - 1, Math.round((i / 9) * h)));
    samplePoints.push({ x: Math.max(0, Math.min(w - 1, Math.round(w * 0.04))), y });
    samplePoints.push({ x: Math.max(0, Math.min(w - 1, Math.round(w * 0.96))), y });
  }

  const colorBuckets = new Map();

  for (const pt of samplePoints) {
    try {
      const pixel = ctx.getImageData(pt.x, pt.y, 1, 1).data;
      const a = pixel[3];
      if (a < 50) {
        // Transparent is treated as white
        colorBuckets.set('255,255,255', (colorBuckets.get('255,255,255') || 0) + 1);
        continue;
      }

      const r = pixel[0];
      const g = pixel[1];
      const b = pixel[2];

      // Relative luminance (standard Rec. 709)
      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      if (lum < 0.65) continue; // Filter out dark text, lines, borders

      // Filter out high-saturation colors (red stamps, blue logos)
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const saturation = maxC === 0 ? 0 : (maxC - minC) / maxC;
      if (saturation > 0.35) continue;

      // Quantize to step of 6
      const qr = Math.min(255, Math.round(r / 6) * 6);
      const qg = Math.min(255, Math.round(g / 6) * 6);
      const qb = Math.min(255, Math.round(b / 6) * 6);
      const key = `${qr},${qg},${qb}`;
      colorBuckets.set(key, (colorBuckets.get(key) || 0) + 1);
    } catch {
      // Ignore sampling errors
    }
  }

  if (colorBuckets.size === 0) return '#ffffff';

  let bestKey = '255,255,255';
  let maxCount = -1;
  for (const [key, count] of colorBuckets) {
    if (count > maxCount) {
      maxCount = count;
      bestKey = key;
    }
  }

  const [br, bg, bb] = bestKey.split(',').map(Number);
  const hexR = br.toString(16).padStart(2, '0');
  const hexG = bg.toString(16).padStart(2, '0');
  const hexB = bb.toString(16).padStart(2, '0');

  return `#${hexR}${hexG}${hexB}`;
}

/**
 * Converts a hex color string (#rrggbb or #rgb) to pdf-lib rgb(r, g, b) normalized [0, 1].
 * @param {string} hex 
 * @returns {{ r: number, g: number, b: number }}
 */
export function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return { r: 1, g: 1, b: 1 };
  let clean = hex.replace(/^#/, '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  if (clean.length !== 6) return { r: 1, g: 1, b: 1 };
  const num = parseInt(clean, 16);
  if (isNaN(num)) return { r: 1, g: 1, b: 1 };
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255
  };
}

/**
 * Checks if a string contains purely ASCII printable characters (32..126).
 * @param {string} str 
 * @returns {boolean}
 */
export function isPureAscii(str) {
  return /^[\x20-\x7E]*$/.test(str);
}

/**
 * Interpolates format macros for a given page.
 * Supported tokens:
 *  - {n}: current page number taking offset and skipCover into account
 *  - {total}: total numbered pages
 *  - {doc_total}: total raw pages in document
 * 
 * @param {string} formatTemplate - e.g. "Page {n} of {total}" or "第 {n} 页，共 {total} 页"
 * @param {number} pageIndex - 0-based page index in the document
 * @param {number} totalPages - total number of pages in the document
 * @param {Object} [options]
 * @param {number} [options.startNumber=1] - starting number for the first numbered page
 * @param {boolean} [options.skipCover=false] - if true, pageIndex 0 is skipped (returns null)
 * @returns {string|null} - interpolated string, or null if page is skipped
 */
export function interpolatePageNumber(formatTemplate, pageIndex, totalPages, options = {}) {
  const skipCover = !!options.skipCover;
  const startNumber = options.startNumber !== undefined ? Number(options.startNumber) : 1;
  const template = formatTemplate || 'Page {n} of {total}';

  if (skipCover && pageIndex === 0) {
    return null; // Cover page skipped
  }

  // Calculate current page display number
  const currentNum = skipCover 
    ? startNumber + (pageIndex - 1)
    : startNumber + pageIndex;

  // Calculate total count
  const numberedTotal = skipCover ? Math.max(1, totalPages - 1) : totalPages;

  return template
    .replace(/\{n\}/g, String(currentNum))
    .replace(/\{total\}/g, String(numberedTotal))
    .replace(/\{doc_total\}/g, String(totalPages));
}

/**
 * Calculates coordinates and dimensions for text and masking shapes.
 * 
 * @param {Object} params
 * @param {number} params.pageWidth
 * @param {number} params.pageHeight
 * @param {number} params.textWidth
 * @param {number} params.fontSize
 * @param {string} params.position - 'bottom_center' | 'bottom_right' | 'bottom_left' | 'top_center' | 'top_right' | 'top_left'
 * @param {number} params.margin
 * @param {string} params.maskMode - 'full_ribbon' | 'local_box' | 'none'
 * @returns {Object} geometry details
 */
export function calculatePageNumberGeometry({
  pageWidth,
  pageHeight,
  textWidth,
  fontSize,
  position = 'bottom_center',
  margin = 24,
  maskMode = 'full_ribbon'
}) {
  const isTop = position.startsWith('top');
  const isCenter = position.endsWith('center');
  const isRight = position.endsWith('right');
  const isLeft = position.endsWith('left');

  // Text Y position
  let textY = 0;
  if (isTop) {
    textY = pageHeight - margin - fontSize;
  } else {
    textY = margin;
  }

  // Text X position
  let textX = 0;
  if (isCenter) {
    textX = (pageWidth - textWidth) / 2;
  } else if (isRight) {
    textX = pageWidth - margin - textWidth;
  } else {
    // isLeft
    textX = margin;
  }

  // Mask Rectangle Geometry
  let maskRect = null;
  if (maskMode === 'full_ribbon') {
    const ribbonHeight = Math.max(34, margin * 1.8);
    maskRect = {
      x: 0,
      y: isTop ? (pageHeight - ribbonHeight) : 0,
      width: pageWidth,
      height: ribbonHeight
    };
  } else if (maskMode === 'local_box') {
    const padX = 14;
    const padY = 5;
    const boxWidth = Math.max(textWidth + padX * 2, 60);
    const boxHeight = fontSize + padY * 2;
    maskRect = {
      x: isCenter ? (pageWidth - boxWidth) / 2 : (isRight ? pageWidth - margin - boxWidth : margin - padX / 2),
      y: textY - padY,
      width: boxWidth,
      height: boxHeight
    };
  }

  return {
    textX,
    textY,
    isTop,
    isCenter,
    isRight,
    isLeft,
    maskRect
  };
}

/**
 * Headless Page Numbering Execution Engine.
 * 
 * @param {ArrayBuffer|Uint8Array} docBytes - Raw PDF bytes
 * @param {Object} options
 * @param {string} [options.format='Page {n} of {total}'] - Page number macro template
 * @param {string} [options.position='bottom_center'] - 6-anchor position
 * @param {number} [options.startNumber=1] - Starting page number
 * @param {boolean} [options.skipCover=false] - Skip page 1
 * @param {number} [options.fontSize=10] - Font size in points
 * @param {string} [options.textColor='#334155'] - Text color hex
 * @param {string} [options.maskMode='full_ribbon'] - 'full_ribbon' | 'local_box' | 'none'
 * @param {string} [options.maskColor='#ffffff'] - Background whiteout color hex
 * @param {number} [options.margin=24] - Edge margin in points
 * @param {string} [options.password=''] - PDF password if encrypted
 * @param {boolean} [options.preserveWatermarks=true] - Security option
 * @returns {Promise<{ outBytes: Uint8Array, pageCount: number }>}
 */
export async function applyPageNumbers(docBytes, options = {}) {
  const {
    format = 'Page {n} of {total}',
    position = 'bottom_center',
    startNumber = 1,
    skipCover = false,
    fontSize = 10,
    textColor = '#334155',
    maskMode = 'full_ribbon',
    maskColor = '#ffffff',
    margin = 24,
    password = '',
    preserveWatermarks = true
  } = options;

  logger.info('PAGE_NUMBER', `Applying page numbers with format="${format}", position=${position}, skipCover=${skipCover}`);

  const pdfDoc = await loadCleanPdfDocument(docBytes, {
    password,
    preserveWatermarks
  });

  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const textRgb = hexToRgb(textColor);

  let effectiveMaskColor = maskColor;
  if (effectiveMaskColor === 'auto') {
    effectiveMaskColor = '#ffffff';
    if (typeof document !== 'undefined' && typeof document.createElement === 'function' && typeof pdfjsLib !== 'undefined' && pdfjsLib.getDocument) {
      try {
        const rawData = docBytes instanceof Uint8Array ? docBytes : new Uint8Array(docBytes);
        const loadingTask = pdfjsLib.getDocument({
          data: rawData.slice(0),
          password: password || undefined,
          cMapUrl: '/cmaps/',
          cMapPacked: true,
          standardFontDataUrl: '/standard_fonts/'
        });
        const doc = await loadingTask.promise;
        const pageIdxToSample = (skipCover && doc.numPages > 1) ? 2 : 1;
        const pdfPage = await doc.getPage(pageIdxToSample);
        const viewport = pdfPage.getViewport({ scale: 0.5 });
        const sampleCanvas = document.createElement('canvas');
        sampleCanvas.width = viewport.width;
        sampleCanvas.height = viewport.height;
        const sctx = sampleCanvas.getContext('2d');
        await pdfPage.render({ canvasContext: sctx, viewport }).promise;
        effectiveMaskColor = detectDominantBackgroundColor(sampleCanvas);
        logger.info('PAGE_NUMBER', `Auto-detected background mask color: ${effectiveMaskColor}`);
      } catch (err) {
        logger.warn('PAGE_NUMBER', `Failed to auto-detect background color: ${err.message}, falling back to #ffffff`);
        effectiveMaskColor = '#ffffff';
      }
    }
  }

  const maskRgb = hexToRgb(effectiveMaskColor);
  const hasCanvas = typeof document !== 'undefined' && typeof document.createElement === 'function';

  for (let i = 0; i < totalPages; i++) {
    const page = pages[i];
    const text = interpolatePageNumber(format, i, totalPages, { startNumber, skipCover });

    // If page is skipped (e.g. cover page), do not draw mask or text
    if (!text) continue;

    const { width: pageWidth, height: pageHeight } = page.getSize();

    // Approximate text width
    let textWidth = 0;
    if (isPureAscii(text)) {
      textWidth = font.widthOfTextAtSize(text, fontSize);
    } else {
      // CJK characters take roughly 1 em (fontSize) each
      textWidth = Array.from(text).reduce((acc, char) => {
        return acc + (char.charCodeAt(0) > 127 ? fontSize : fontSize * 0.55);
      }, 0);
    }

    const geometry = calculatePageNumberGeometry({
      pageWidth,
      pageHeight,
      textWidth,
      fontSize,
      position,
      margin,
      maskMode
    });

    // 1. Draw Background Mask Rectangle (Whiteout / Background matching)
    if (geometry.maskRect) {
      page.drawRectangle({
        x: geometry.maskRect.x,
        y: geometry.maskRect.y,
        width: geometry.maskRect.width,
        height: geometry.maskRect.height,
        color: rgb(maskRgb.r, maskRgb.g, maskRgb.b)
      });
    }

    // 2. Draw Page Number Text
    if (isPureAscii(text) || !hasCanvas) {
      // Pure ASCII or Node.js test environment -> Crisp Native Vector Text
      page.drawText(text, {
        x: geometry.textX,
        y: geometry.textY,
        size: fontSize,
        font,
        color: rgb(textRgb.r, textRgb.g, textRgb.b)
      });
    } else {
      // Non-ASCII (Chinese / CJK / Accents) in Browser -> High-DPI Canvas PNG embedding
      const scale = 2.5; // High-DPI 250% for razor-sharp typography
      const badgeCanvas = document.createElement('canvas');
      const pad = 4;
      badgeCanvas.width = Math.ceil((textWidth + pad * 2) * scale);
      badgeCanvas.height = Math.ceil((fontSize * 1.5 + pad * 2) * scale);
      const bctx = badgeCanvas.getContext('2d');

      bctx.scale(scale, scale);
      bctx.font = `${fontSize}px "PingFang SC", "Microsoft YaHei", "Segoe UI", -apple-system, sans-serif`;
      bctx.fillStyle = textColor;
      bctx.textBaseline = 'middle';
      bctx.fillText(text, pad, (fontSize * 1.5) / 2 + pad);

      const blob = await new Promise(res => badgeCanvas.toBlob(res, 'image/png'));
      const buffer = await blob.arrayBuffer();
      const pngImage = await pdfDoc.embedPng(buffer);

      page.drawImage(pngImage, {
        x: geometry.textX - pad,
        y: geometry.textY - pad,
        width: textWidth + pad * 2,
        height: fontSize * 1.5 + pad * 2
      });
    }
  }

  const outBytes = await pdfDoc.save({ useObjectStreams: true });
  return { outBytes, pageCount: totalPages };
}
