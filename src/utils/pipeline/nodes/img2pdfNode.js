import { PDFDocument } from 'pdf-lib';
import { logger } from '../../logger';
import { applyDocumentEnhancement } from '../../imageProcess';

/**
 * Headless Image to PDF Node (Reduce or Map)
 * Converts image items into PDF documents.
 * 
 * @param {Array<Object>} items 
 * @param {Object} params - { mergeIntoOne: true, pageSize: 'fit_image'|'a4', scannerMode: 'none'|'color'|'bw'|'grayscale' }
 * @param {Function} [onProgress]
 * @returns {Promise<Array<Object>>}
 */
export async function executeImg2PdfNode(items, params = {}, onProgress = () => {}) {
  const mergeIntoOne = params.mergeIntoOne !== false;
  const pageSize = params.pageSize || 'fit_image';
  const scannerMode = params.scannerMode || (params.enhanceScanner ? (params.enhanceFilter || 'color') : 'none');

  if (mergeIntoOne) {
    onProgress(10, 'Initializing images to PDF...');
    const mergedDoc = await PDFDocument.create();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      onProgress(10 + Math.round((i / items.length) * 80), `Assembling image [${i + 1}/${items.length}]: ${item.name}`);

      try {
        const isJpg = item.mimeType === 'image/jpeg' || /\.jpe?g$/i.test(item.name);
        const embeddedImg = isJpg ? await mergedDoc.embedJpg(item.data) : await mergedDoc.embedPng(item.data);
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
        const isJpg = item.mimeType === 'image/jpeg' || /\.jpe?g$/i.test(item.name);
        const embeddedImg = isJpg ? await doc.embedJpg(item.data) : await doc.embedPng(item.data);
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
