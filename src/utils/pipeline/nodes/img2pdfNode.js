import { PDFDocument } from 'pdf-lib';
import { logger } from '../../logger';
import { enhanceDocumentCanvas } from '../../imageProcess';

function isJpegBuffer(data, mimeType, name) {
  if (data && data.length >= 4) {
    if (data[0] === 0xFF && data[1] === 0xD8 && data[2] === 0xFF) return true;
    if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4E && data[3] === 0x47) return false;
  }
  return mimeType === 'image/jpeg' || mimeType === 'image/jpg' || /\.jpe?g$/i.test(name || '');
}

async function prepareImageBytes(item, scannerMode, shadowSuppression) {
  const isJpg = isJpegBuffer(item.data, item.mimeType, item.name);
  if (!scannerMode || scannerMode === 'none' || typeof document === 'undefined') {
    return { data: item.data, isJpg };
  }

  try {
    const blob = new Blob([item.data], { type: item.mimeType || (isJpg ? 'image/jpeg' : 'image/png') });
    const blobUrl = URL.createObjectURL(blob);
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = blobUrl;
    });
    URL.revokeObjectURL(blobUrl);

    const canvas = enhanceDocumentCanvas(img, {
      mode: scannerMode,
      shadowSuppression: shadowSuppression || 'medium'
    });
    if (!canvas) {
      return { data: item.data, isJpg };
    }

    const enhancedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const binary = atob(enhancedDataUrl.split(',')[1]);
    const enhancedBytes = new Uint8Array(binary.length);
    for (let k = 0; k < binary.length; k++) {
      enhancedBytes[k] = binary.charCodeAt(k);
    }
    return { data: enhancedBytes, isJpg: true };
  } catch (err) {
    logger.warn('PIPELINE_IMG2PDF', `Document enhancement failed for ${item.name}: ${err.message}`);
    return { data: item.data, isJpg };
  }
}

/**
 * Headless Image to PDF Node (Reduce or Map)
 * Converts image items into PDF documents.
 * 
 * @param {Array<Object>} items 
 * @param {Object} params - { mergeIntoOne: true, pageSize: 'fit_image'|'a4', scannerMode: 'none'|'color'|'bw'|'grayscale', shadowSuppression: 'low'|'medium'|'high' }
 * @param {Function} [onProgress]
 * @returns {Promise<Array<Object>>}
 */
export async function executeImg2PdfNode(items, params = {}, onProgress = () => {}) {
  const mergeIntoOne = params.mergeIntoOne !== false;
  const pageSize = params.pageSize || 'fit_image';
  const scannerMode = params.scannerMode || (params.enhanceScanner ? (params.enhanceFilter || 'color') : 'none');
  const shadowSuppression = params.shadowSuppression || 'medium';

  if (mergeIntoOne) {
    onProgress(10, 'Initializing images to PDF...');
    const mergedDoc = await PDFDocument.create();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      onProgress(10 + Math.round((i / items.length) * 80), `Assembling image [${i + 1}/${items.length}]: ${item.name}`);

      try {
        const { data: imgBytes, isJpg } = await prepareImageBytes(item, scannerMode, shadowSuppression);
        const embeddedImg = isJpg ? await mergedDoc.embedJpg(imgBytes) : await mergedDoc.embedPng(imgBytes);
        const { width: imgW, height: imgH } = embeddedImg;

        if (pageSize === 'a4') {
          // A4 dimensions: 595.28 x 841.89
          const page = mergedDoc.addPage([595.28, 841.89]);
          const scale = Math.min((595.28 - 40) / imgW, (841.89 - 40) / imgH, 1.0);
          const drawW = imgW * scale;
          const drawH = imgH * scale;
          page.drawImage(embeddedImg, {
            x: (595.28 - drawW) / 2,
            y: (841.89 - drawH) / 2,
            width: drawW,
            height: drawH
          });
        } else {
          // 'fit_image': page matches exact image dimensions
          const page = mergedDoc.addPage([imgW, imgH]);
          page.drawImage(embeddedImg, { x: 0, y: 0, width: imgW, height: imgH });
        }
      } catch (err) {
        logger.warn('PIPELINE_IMG2PDF', `Failed to embed image ${item.name}: ${err.message}`);
      }
    }

    onProgress(95, 'Exporting merged PDF...');
    const pdfBytes = await mergedDoc.save({ useObjectStreams: true });
    onProgress(100, 'Conversion complete');

    return [{
      id: 'img_pdf_' + Date.now(),
      name: 'Compiled_Images.pdf',
      data: pdfBytes,
      mimeType: 'application/pdf',
      pageCount: mergedDoc.getPageCount()
    }];
  } else {
    // Convert each image to an individual single-page PDF
    const result = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      onProgress(Math.round((i / items.length) * 100), `Converting image [${i + 1}/${items.length}]: ${item.name}`);

      try {
        const doc = await PDFDocument.create();
        const { data: imgBytes, isJpg } = await prepareImageBytes(item, scannerMode, shadowSuppression);
        const embeddedImg = isJpg ? await doc.embedJpg(imgBytes) : await doc.embedPng(imgBytes);
        const { width: imgW, height: imgH } = embeddedImg;
        const page = doc.addPage([imgW, imgH]);
        page.drawImage(embeddedImg, { x: 0, y: 0, width: imgW, height: imgH });
        const pdfBytes = await doc.save({ useObjectStreams: true });

        result.push({
          id: item.id + '_pdf',
          name: item.name.replace(/\.[^/.]+$/, '') + '.pdf',
          data: pdfBytes,
          mimeType: 'application/pdf',
          pageCount: 1
        });
      } catch (err) {
        logger.warn('PIPELINE_IMG2PDF', `Failed to convert image ${item.name}: ${err.message}`);
      }
    }
    onProgress(100, 'All images converted');
    return result;
  }
}
