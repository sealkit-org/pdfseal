import { PDFDocument } from 'pdf-lib';
import { loadCleanPdfDocument } from '../../pdfSecurity';
import { logger } from '../../logger';

/**
 * Headless Merge Node (Reduce: N -> 1)
 * Combines multiple PDF items into a single merged PDF item.
 * 
 * @param {Array<Object>} items - Array of PipelineItems
 * @param {Object} params - { sortBy: 'order'|'name_asc', padBlankPageIfOdd: false }
 * @param {Function} [onProgress]
 * @returns {Promise<Array<Object>>} [mergedItem]
 */
export async function executeMergeNode(items, params = {}, onProgress = () => {}) {
  if (!items || items.length === 0) return [];
  if (items.length === 1) return items;

  let sorted = [...items];
  if (params.sortBy === 'name_asc') {
    sorted.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  }

  onProgress(10, 'Initializing merge engine...');
  const mergedPdf = await PDFDocument.create();
  let totalCopiedPages = 0;

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    const pct = 10 + Math.round(((i) / sorted.length) * 80);
    onProgress(pct, `Merging [${i + 1}/${sorted.length}]: ${item.name}`);

    try {
      const srcDoc = await loadCleanPdfDocument(item.data, { preserveWatermarks: true });
      const copiedPages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
      
      for (const page of copiedPages) {
        mergedPdf.addPage(page);
        totalCopiedPages++;
      }

      // Pad blank page if odd (for double-sided printing)
      if (params.padBlankPageIfOdd && (copiedPages.length % 2 !== 0)) {
        const lastPage = copiedPages[copiedPages.length - 1];
        const { width, height } = lastPage.getSize();
        mergedPdf.addPage([width, height]);
        totalCopiedPages++;
      }
    } catch (err) {
      logger.error('PIPELINE_MERGE', `Error copying pages from ${item.name}: ${err.message}`);
      throw new Error(`Merge failed (${item.name}): ${err.message}`);
    }
  }

  onProgress(95, 'Generating merged document...');
  const mergedBytes = await mergedPdf.save({ useObjectStreams: true });
  onProgress(100, 'Merge complete');

  return [{
    id: 'merged_' + Date.now(),
    name: 'Merged_Document.pdf',
    data: mergedBytes,
    mimeType: 'application/pdf',
    pageCount: totalCopiedPages,
    isEncrypted: false
  }];
}
