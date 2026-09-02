import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, PDFName } from 'pdf-lib';
import { logger } from './logger';
import { loadCleanPdfDocument } from './pdfSecurity';

/**
 * Automatically inspects a PDF to determine if it is a text-heavy vector document
 * or a scanned/image-based document.
 * 
 * @param {ArrayBuffer|Uint8Array} arrayBuffer 
 * @param {string} [password='']
 * @returns {Promise<{ type: 'vector' | 'scanned', confidence: number, textCount: number, imageCount: number }>}
 */
export async function detectDocumentType(arrayBuffer, password = '') {
  try {
    const pdfData = new Uint8Array(arrayBuffer.slice ? arrayBuffer.slice(0) : arrayBuffer);
    const loadingTask = pdfjsLib.getDocument({
      data: pdfData,
      password: password || undefined,
      cMapUrl: typeof window !== 'undefined' ? (window.location.origin + '/cmaps/') : '/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: typeof window !== 'undefined' ? (window.location.origin + '/standard_fonts/') : '/standard_fonts/'
    });

    const pdf = await loadingTask.promise;
    const pagesToCheck = Math.min(pdf.numPages, 3);
    let totalTextChars = 0;
    let totalImageOps = 0;

    for (let i = 1; i <= pagesToCheck; i++) {
      const page = await pdf.getPage(i);
      
      // 1. Measure text density
      try {
        const textContent = await page.getTextContent();
        const textStr = textContent.items.map(item => item.str || '').join('').trim();
        totalTextChars += textStr.length;
      } catch (e) {}

      // 2. Measure image operator presence
      try {
        const ops = await page.getOperatorList();
        const paintImageOpCode = pdfjsLib.OPS ? (pdfjsLib.OPS.paintImageXObject || 85) : 85;
        const paintInlineImageOpCode = pdfjsLib.OPS ? (pdfjsLib.OPS.paintInlineImageXObject || 86) : 86;
        for (let k = 0; k < ops.fnArray.length; k++) {
          if (ops.fnArray[k] === paintImageOpCode || ops.fnArray[k] === paintInlineImageOpCode) {
            totalImageOps++;
          }
        }
      } catch (e) {}
    }

    const avgTextPerPage = totalTextChars / pagesToCheck;
    logger.info('COMPRESS_DETECT', `Document analysis: ${pdf.numPages} pages, avgTextPerPage=${avgTextPerPage.toFixed(0)}, totalImageOps=${totalImageOps}`);

    // If zero images or good text density with minimal images -> Vector document (Mode A)
    if (totalImageOps === 0 || (avgTextPerPage >= 40 && totalImageOps <= pagesToCheck * 2)) {
      return {
        type: 'vector',
        confidence: totalImageOps === 0 ? 0.95 : Math.min(0.95, 0.6 + avgTextPerPage / 300),
        textCount: totalTextChars,
        imageCount: totalImageOps
      };
    }

    // Otherwise -> Scanned document / Picture document (Mode B)
    return {
      type: 'scanned',
      confidence: Math.min(0.95, 0.7 + totalImageOps * 0.1),
      textCount: totalTextChars,
      imageCount: totalImageOps
    };
  } catch (err) {
    logger.warn('COMPRESS_DETECT', `Failed to detect document type: ${err.message}, defaulting to vector`);
    return {
      type: 'vector',
      confidence: 0.5,
      textCount: 0,
      imageCount: 0
    };
  }
}

/**
 * Mode A: Lossless structural compression
 * Repacks PDF with cross-reference object streams and strips orphan objects.
 * 100% Vector clarity preserved.
 * 
 * @param {ArrayBuffer|Uint8Array} arrayBuffer 
 * @param {string} [password='']
 * @returns {Promise<Uint8Array>}
 */
export async function compressPdfLossless(arrayBuffer, password = '') {
  logger.info('COMPRESS', `[Lossless Mode] Executing structural object stream compression`);
  const origBytes = new Uint8Array(arrayBuffer.slice ? arrayBuffer.slice(0) : arrayBuffer);

  try {
    const cleanDoc = await loadCleanPdfDocument(arrayBuffer, password);

    // 1. Strip document-level private application overhead & XMP metadata
    if (cleanDoc.catalog) {
      cleanDoc.catalog.delete(PDFName.of('PieceInfo'));
      cleanDoc.catalog.delete(PDFName.of('Metadata'));
    }

    // 2. Strip embedded legacy page thumbnail images
    const pages = cleanDoc.getPages();
    for (const p of pages) {
      if (p.node) {
        p.node.delete(PDFName.of('Thumb'));
      }
    }

    const outBytes = await cleanDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
      updateMetadata: false
    });

    // Size Guard: Never allow the file to grow!
    if (outBytes.byteLength >= origBytes.byteLength) {
      logger.info('COMPRESS', `[Lossless Mode] Optimized file (${outBytes.byteLength} B) is not smaller than original (${origBytes.byteLength} B). Keeping original file.`);
      return origBytes;
    }

    return outBytes;
  } catch (err) {
    logger.warn('COMPRESS', `Lossless optimization failed: ${err.message}, keeping original file.`);
    return origBytes;
  }
}

/**
 * Mode B: Intelligent Raster Downsampling Compression
 * Re-samples scanned pages via Canvas with configurable DPI and JPEG quality.
 * Ideal for multi-megabyte scanned contracts and photo PDFs.
 * 
 * @param {ArrayBuffer|Uint8Array} arrayBuffer 
 * @param {Object} options
 * @param {number} [options.scale=1.25] - Rendering scale (1.0 = ~72-90 DPI, 1.3 = ~100-120 DPI, 1.6 = ~120-150 DPI)
 * @param {number} [options.quality=0.7] - JPEG quality factor (0.5 to 0.85)
 * @param {string} [options.password='']
 * @param {Function} [onProgress] - Callback (current, total)
 * @returns {Promise<Uint8Array>}
 */
export async function compressPdfRaster(arrayBuffer, options = {}, onProgress = null) {
  const { scale = 1.25, quality = 0.7, password = '' } = options;
  logger.info('COMPRESS', `[Raster Mode] Executing image downsampling (scale=${scale}, quality=${quality})`);

  if (typeof document === 'undefined') {
    // Fallback in headless environment without DOM canvas
    return await compressPdfLossless(arrayBuffer, password);
  }

  const pdfData = new Uint8Array(arrayBuffer.slice ? arrayBuffer.slice(0) : arrayBuffer);
  const loadingTask = pdfjsLib.getDocument({
    data: pdfData,
    password: password || undefined,
    cMapUrl: typeof window !== 'undefined' ? (window.location.origin + '/cmaps/') : '/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: typeof window !== 'undefined' ? (window.location.origin + '/standard_fonts/') : '/standard_fonts/'
  });

  const pdf = await loadingTask.promise;
  const newPdf = await PDFDocument.create();

  for (let i = 1; i <= pdf.numPages; i++) {
    if (onProgress) {
      onProgress(i, pdf.numPages);
    }

    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    // Fill white background for scanned documents with transparent margins
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport
    }).promise;

    // Encode to optimized JPEG
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    const base64Data = dataUrl.split(',')[1];
    const binaryStr = atob(base64Data);
    const imgBytes = new Uint8Array(binaryStr.length);
    for (let k = 0; k < binaryStr.length; k++) {
      imgBytes[k] = binaryStr.charCodeAt(k);
    }

    const embeddedJpg = await newPdf.embedJpg(imgBytes);
    const origViewport = page.getViewport({ scale: 1.0 });
    const newPage = newPdf.addPage([origViewport.width, origViewport.height]);
    newPage.drawImage(embeddedJpg, {
      x: 0,
      y: 0,
      width: origViewport.width,
      height: origViewport.height
    });
  }

  const outBytes = await newPdf.save({ useObjectStreams: true });
  logger.info('COMPRESS', `[Raster Mode] Completed (${pdf.numPages} pages compressed to ${(outBytes.byteLength / 1024).toFixed(1)} KB)`);
  return outBytes;
}

/**
 * Universal Compression Pipeline Dispatcher
 * 
 * @param {ArrayBuffer|Uint8Array} arrayBuffer 
 * @param {'extreme' | 'balanced' | 'lossless'} level 
 * @param {Object} [options={}]
 * @param {Function} [onProgress]
 * @returns {Promise<Uint8Array>}
 */
export async function compressPdf(arrayBuffer, level = 'balanced', options = {}, onProgress = null) {
  const password = options.password || '';
  const origBytes = new Uint8Array(arrayBuffer.slice ? arrayBuffer.slice(0) : arrayBuffer);

  let result;
  if (level === 'lossless') {
    result = await compressPdfLossless(arrayBuffer, password);
  } else if (level === 'extreme') {
    // 120-150 DPI (scale 2.0), JPEG quality 0.65: guarantees crisp readable text while conquering strict 2MB-5MB limits
    result = await compressPdfRaster(arrayBuffer, { scale: 2.0, quality: 0.65, password }, onProgress);
  } else {
    // 'balanced' default: 200-300 DPI (scale 3.0), JPEG quality 0.80: print-grade clarity, crisp detail with email-ready size
    result = await compressPdfRaster(arrayBuffer, { scale: 3.0, quality: 0.80, password }, onProgress);
  }

  // Universal Size Guard: Never allow output to be larger than original input!
  if (result && result.byteLength >= origBytes.byteLength) {
    logger.info('COMPRESS', `Compressed output (${result.byteLength} B) >= original (${origBytes.byteLength} B). Returning original bytes.`);
    return origBytes;
  }

  return result;
}
