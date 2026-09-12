import { PDFDocument, PageSizes, degrees } from 'pdf-lib';
import { loadCleanPdfDocument } from './pdfSecurity';
import { logger } from './logger';

/**
 * Generates a clean A4 blank canvas thumbnail dataURL.
 * Standard A4 ratio (1 : 1.414).
 * 
 * @returns {string} dataURL
 */
export function generateBlankPageThumbnail(text = 'BLANK') {
  if (typeof document === 'undefined') {
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  }
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 226; // ~1:1.414 ratio
  const ctx = canvas.getContext('2d');
  
  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Subtle border & centered watermark badge
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

  // Soft localized text watermark (e.g. BLANK / 空白页 / LEER)
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text || 'BLANK', canvas.width / 2, canvas.height / 2);

  return canvas.toDataURL('image/png');
}

/**
 * Assembles a brand new PDF from a mixed list of pages.
 * Supports:
 * - type: 'source' (from primary source document at pageIndex)
 * - type: 'blank' (creates a blank A4 page)
 * - type: 'external' (from an external source document at pageIndex)
 * 
 * @param {Array<Object>} pages - List of page operation items
 * @param {Object} options
 * @param {Uint8Array} [options.sourceBytes] - Primary source document bytes
 * @param {string} [options.password] - Password for primary document if needed
 * @returns {Promise<Uint8Array>} Assembled PDF bytes
 */
export async function assembleOrganizedPdf(pages = [], options = {}) {
  if (!pages || pages.length === 0) {
    throw new Error('No pages to organize.');
  }

  const newPdf = await PDFDocument.create();

  // Cache loaded source documents to avoid reloading the same document repeatedly
  const docCache = new Map();

  // Load primary source document if provided
  let primaryDoc = null;
  if (options.sourceBytes) {
    primaryDoc = await loadCleanPdfDocument(options.sourceBytes, options.password || '');
    docCache.set('primary', primaryDoc);
  }

  for (const item of pages) {
    const rot = item.rotation || 0;

    if (item.type === 'blank') {
      // Create standard A4 blank page
      const isRotatedLandscape = (rot % 180 !== 0);
      const width = isRotatedLandscape ? PageSizes.A4[1] : PageSizes.A4[0];
      const height = isRotatedLandscape ? PageSizes.A4[0] : PageSizes.A4[1];
      const blankPage = newPdf.addPage([width, height]);
      if (rot !== 0) {
        blankPage.setRotation(degrees(rot));
      }
    } else if (item.type === 'external' && item.sourceBytes) {
      // External document page
      let extDoc = docCache.get(item.sourceBytes);
      if (!extDoc) {
        extDoc = await loadCleanPdfDocument(item.sourceBytes);
        docCache.set(item.sourceBytes, extDoc);
      }
      const [copied] = await newPdf.copyPages(extDoc, [item.pageIndex]);
      const currentRot = copied.getRotation().angle;
      copied.setRotation(degrees(currentRot + rot));
      newPdf.addPage(copied);
    } else {
      // Primary source page (default)
      if (!primaryDoc) {
        throw new Error('Primary document bytes required for source pages.');
      }
      const [copied] = await newPdf.copyPages(primaryDoc, [item.pageIndex]);
      const currentRot = copied.getRotation().angle;
      copied.setRotation(degrees(currentRot + rot));
      newPdf.addPage(copied);
    }
  }

  logger.info('ORGANIZE_ENGINE', `Assembled ${newPdf.getPageCount()} pages successfully`);
  return await newPdf.save();
}
