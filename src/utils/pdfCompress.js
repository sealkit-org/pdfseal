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
 * Maps a normalized quality index t in [0.0, 1.0] monotonically to Canvas scale and JPEG quality.
 * 
 * - t = 1.0 (Maximum quality): scale = 2.50 (~180-200 DPI), quality = 0.85
 * - t = 0.5 (Balanced quality): scale = 1.85 (~130-150 DPI), quality = 0.70
 * - t = 0.0 (Extreme compact): scale = 0.75 (~54-72 DPI), quality = 0.35
 * 
 * Both scale and quality are strictly monotonic increasing with t, guaranteeing mathematical
 * convergence in bisection search.
 * 
 * @param {number} t - Normalized index in [0, 1]
 * @returns {{ scale: number, quality: number }}
 */
export function paramFromQualityIndex(t) {
  const clamped = Math.max(0, Math.min(1, Number(t) || 0));
  const scale = Number((0.75 + 1.75 * Math.pow(clamped, 0.65)).toFixed(2));
  const quality = Number((0.35 + 0.50 * Math.pow(clamped, 0.5)).toFixed(2));
  return { scale, quality };
}

/**
 * Render a single PDF page into a high-DPI Image Data URL (for thumbnail & diff preview).
 * 
 * @param {ArrayBuffer|Uint8Array} arrayBuffer 
 * @param {number} [pageNumber=1] 
 * @param {number} [scale=1.5] 
 * @param {string} [password=''] 
 * @returns {Promise<string>} Data URL (image/jpeg)
 */
export async function renderPdfPagePreview(arrayBuffer, pageNumber = 1, scale = 1.5, password = '') {
  if (typeof document === 'undefined') return '';
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
    const targetPageNum = Math.max(1, Math.min(pageNumber, pdf.numPages));
    const page = await pdf.getPage(targetPageNum);

    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch (err) {
    logger.warn('COMPRESS_PREVIEW', `Failed to render preview: ${err.message}`);
    return '';
  }
}

/**
 * Target Size Bisection Optimization (二分法目标逼近压缩)
 * 
 * Approaches target file size (e.g., 2.0 MB for visas, university thesis, or gov submissions)
 * by iteratively tuning Canvas rendering scale and JPEG quality along a monotonic curve,
 * strictly staying below target limit while maximizing visual clarity.
 * 
 * @param {ArrayBuffer|Uint8Array} arrayBuffer 
 * @param {number} [targetSizeMb=2.0] - Target file size limit in MB
 * @param {Object} [options={}]
 * @param {Function} [onProgress] - Callback (percent, statusMessage)
 * @returns {Promise<Uint8Array>}
 */
export async function compressPdfToTargetSize(arrayBuffer, targetSizeMb = 2.0, options = {}, onProgress = null) {
  const password = options.password || '';
  const origBytes = new Uint8Array(arrayBuffer.slice ? arrayBuffer.slice(0) : arrayBuffer);
  const targetBytes = Math.round(Number(targetSizeMb) * 1024 * 1024);
  const effectiveTargetBytes = Math.round(targetBytes * 0.98); // 2% safety cushion for PDF serialization

  logger.info('COMPRESS_TARGET', `Starting target-size compression: target=${targetSizeMb} MB (${targetBytes} B), orig=${(origBytes.byteLength / 1048576).toFixed(2)} MB`);

  // Guard: If original file is already smaller than or equal to target size,
  // we do NOT downsample raster images! We perform lossless optimization to preserve 100% vector fidelity.
  if (origBytes.byteLength <= targetBytes) {
    logger.info('COMPRESS_TARGET', `Original size (${origBytes.byteLength} B) <= target (${targetBytes} B). Applying lossless optimization without lossy downsampling.`);
    if (onProgress) onProgress(50, '原文件已符合体积上限，正在执行无损保真优化...');
    const losslessBytes = await compressPdfLossless(arrayBuffer, password);
    if (onProgress) onProgress(100, '完成优化');
    return losslessBytes;
  }

  // Fallback in headless environment without DOM canvas
  if (typeof document === 'undefined') {
    logger.warn('COMPRESS_TARGET', `Headless environment detected; falling back to lossless compression.`);
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
  const numPages = pdf.numPages;

  // Phase 1: Heuristic Sample Probing
  // Choose representative sample pages to keep search fast and responsive
  const sampleIndices = numPages <= 3 
    ? Array.from({ length: numPages }, (_, i) => i + 1)
    : [1, Math.ceil(numPages / 2), numPages];

  const loadedSamplePages = [];
  for (const pIndex of sampleIndices) {
    loadedSamplePages.push(await pdf.getPage(pIndex));
  }

  const probeSampleBytes = async (t) => {
    const { scale, quality } = paramFromQualityIndex(t);
    let sampleJpgTotal = 0;

    for (const page of loadedSamplePages) {
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;

      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const base64Data = dataUrl.split(',')[1] || '';
      // Approximate byte size from base64 length
      sampleJpgTotal += Math.round(base64Data.length * 0.75);
    }

    // Estimate total document size: (sampleJpg / sampleCount) * numPages + container overhead
    const estimatedTotal = Math.round(
      (sampleJpgTotal / loadedSamplePages.length) * numPages + (2048 + 512 * numPages)
    );
    return estimatedTotal;
  };

  // Run 4 bisection iterations on sample pages
  let tLow = 0.0;
  let tHigh = 1.0;
  const maxIterations = 4;

  for (let iter = 0; iter < maxIterations; iter++) {
    const pct = Math.round(10 + (iter / maxIterations) * 20);
    if (onProgress) onProgress(pct, `智能二分算法探测中 [第 ${iter + 1}/${maxIterations} 轮]...`);

    const tMid = (tLow + tHigh) / 2;
    const estBytes = await probeSampleBytes(tMid);
    logger.info('COMPRESS_TARGET', `Bisection iter ${iter + 1}: t=${tMid.toFixed(3)}, estBytes=${(estBytes / 1048576).toFixed(2)} MB vs effectiveTarget=${(effectiveTargetBytes / 1048576).toFixed(2)} MB`);

    if (estBytes > effectiveTargetBytes) {
      tHigh = tMid;
    } else {
      tLow = tMid;
    }
  }

  // Selected optimal parameter candidate
  let optimalT = tLow;
  let currentParams = paramFromQualityIndex(optimalT);
  logger.info('COMPRESS_TARGET', `Bisection completed candidate t=${optimalT.toFixed(3)} (scale=${currentParams.scale}, quality=${currentParams.quality})`);

  // Phase 2: Full Document Rendering with Selected Optimal Parameters
  const renderFullDoc = async (scale, quality, progressOffset = 30, progressSpan = 60) => {
    const newPdf = await PDFDocument.create();

    for (let i = 1; i <= numPages; i++) {
      if (onProgress) {
        const stepPct = Math.round(progressOffset + ((i - 1) / numPages) * progressSpan);
        onProgress(stepPct, `正在以最佳清晰度重采样生成文档 (${i}/${numPages})...`);
      }

      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;

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

    return await newPdf.save({ useObjectStreams: true });
  };

  let outBytes = await renderFullDoc(currentParams.scale, currentParams.quality, 30, 60);

  // Phase 3: Fine-Tuning Verification
  // If actual full document unexpectedly exceeded targetBytes due to complex non-sample pages:
  if (outBytes.byteLength > targetBytes) {
    logger.info('COMPRESS_TARGET', `Actual output (${(outBytes.byteLength / 1048576).toFixed(2)} MB) exceeded target (${targetSizeMb} MB). Executing 1-step quadratic fine-tuning.`);
    if (onProgress) onProgress(90, '微调缩放参数确保严格小于目标上限...');

    const shrinkRatio = Math.min(0.92, Math.sqrt((effectiveTargetBytes * 0.95) / outBytes.byteLength));
    const tunedScale = Math.max(0.60, Number((currentParams.scale * shrinkRatio).toFixed(2)));
    const tunedQuality = Math.max(0.30, Number((currentParams.quality * 0.92).toFixed(2)));

    outBytes = await renderFullDoc(tunedScale, tunedQuality, 90, 8);
    logger.info('COMPRESS_TARGET', `Fine-tuned output size: ${(outBytes.byteLength / 1048576).toFixed(2)} MB`);
  }

  // Universal Size Guard: Never allow output to be larger than original!
  if (outBytes && outBytes.byteLength >= origBytes.byteLength) {
    logger.info('COMPRESS_TARGET', `Compressed output (${outBytes.byteLength} B) >= original (${origBytes.byteLength} B). Returning original bytes.`);
    return origBytes;
  }

  if (onProgress) onProgress(100, '目标逼近压缩完成');
  return outBytes;
}

/**
 * Universal Compression Pipeline Dispatcher
 * 
 * @param {ArrayBuffer|Uint8Array} arrayBuffer 
 * @param {'extreme' | 'balanced' | 'target' | 'lossless'} level 
 * @param {Object} [options={}]
 * @param {number} [options.targetSizeMb=2.0]
 * @param {Function} [onProgress]
 * @returns {Promise<Uint8Array>}
 */
export async function compressPdf(arrayBuffer, level = 'balanced', options = {}, onProgress = null) {
  const password = options.password || '';
  const origBytes = new Uint8Array(arrayBuffer.slice ? arrayBuffer.slice(0) : arrayBuffer);

  let result;
  if (level === 'lossless') {
    result = await compressPdfLossless(arrayBuffer, password);
  } else if (level === 'target') {
    const targetSizeMb = options.targetSizeMb || 2.0;
    result = await compressPdfToTargetSize(arrayBuffer, targetSizeMb, options, onProgress);
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

