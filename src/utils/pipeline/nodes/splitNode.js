import { PDFDocument } from 'pdf-lib';
import { loadCleanPdfDocument } from '../../pdfSecurity';
import { logger } from '../../logger';

/**
 * Parses range string like "1-3, 5, 8-10" into 0-indexed integer array
 * 
 * @param {string} expr 
 * @param {number} maxPages 
 * @returns {number[]}
 */
export function parseRangeExpression(expr, maxPages) {
  if (!expr || !expr.trim()) {
    return Array.from({ length: maxPages }, (_, i) => i);
  }

  const indices = new Set();
  const parts = expr.split(',');

  for (const part of parts) {
    const clean = part.trim().toLowerCase();
    if (!clean) continue;

    if (clean === 'last') {
      indices.add(maxPages - 1);
      continue;
    }

    if (clean.includes('-')) {
      const [startStr, endStr] = clean.split('-');
      const start = parseInt(startStr, 10);
      const end = (endStr.toLowerCase() === 'last') ? maxPages : parseInt(endStr, 10);

      if (!isNaN(start) && (!isNaN(end) || end === maxPages)) {
        const from = Math.max(1, Math.min(start, end));
        const to = Math.min(maxPages, Math.max(start, end));
        for (let p = from; p <= to; p++) {
          indices.add(p - 1);
        }
      }
    } else {
      const p = parseInt(clean, 10);
      if (!isNaN(p) && p >= 1 && p <= maxPages) {
        indices.add(p - 1);
      }
    }
  }

  return Array.from(indices).sort((a, b) => a - b);
}

/**
 * Headless Split & Extract Node (Explode / Map)
 * Extracts specified ranges or bursts pages into separate documents.
 * 
 * @param {Array<Object>} items 
 * @param {Object} params - { mode: 'extract_range'|'burst', rangeExpr: '1-3' }
 * @param {Function} [onProgress]
 * @returns {Promise<Array<Object>>}
 */
export async function executeSplitNode(items, params = {}, onProgress = () => {}) {
  const result = [];
  const mode = params.mode || 'extract_range';
  const rangeType = params.rangeType || 'custom';
  let expr = params.rangeExpr || '1-3';

  if (rangeType === 'first') {
    expr = '1';
  } else if (rangeType === 'last') {
    expr = 'last';
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    onProgress(Math.round((i / items.length) * 100), `Extracting / splitting pages [${i + 1}/${items.length}]: ${item.name}`);

    try {
      const srcDoc = await loadCleanPdfDocument(item.data, { preserveWatermarks: true });
      const totalPages = srcDoc.getPageCount();
      const baseName = item.name.replace(/\.pdf$/i, '');

      if (mode === 'burst') {
        // Burst every page into an independent document
        for (let p = 0; p < totalPages; p++) {
          const singleDoc = await PDFDocument.create();
          const [copiedPage] = await singleDoc.copyPages(srcDoc, [p]);
          singleDoc.addPage(copiedPage);
          const singleBytes = await singleDoc.save({ useObjectStreams: true });

          result.push({
            id: `${item.id}_p${p + 1}`,
            name: `${baseName}_Page_${p + 1}.pdf`,
            data: singleBytes,
            mimeType: 'application/pdf',
            pageCount: 1
          });
        }
      } else if (mode === 'interval') {
        // Split into chunks of N pages
        const interval = Math.max(1, parseInt(params.interval || 2, 10));
        let partIndex = 1;
        for (let p = 0; p < totalPages; p += interval) {
          const chunkIndices = [];
          for (let c = p; c < Math.min(totalPages, p + interval); c++) {
            chunkIndices.push(c);
          }
          const chunkDoc = await PDFDocument.create();
          const copiedPages = await chunkDoc.copyPages(srcDoc, chunkIndices);
          copiedPages.forEach(cp => chunkDoc.addPage(cp));
          const chunkBytes = await chunkDoc.save({ useObjectStreams: true });

          result.push({
            id: `${item.id}_part${partIndex}`,
            name: `${baseName}_Part_${partIndex}.pdf`,
            data: chunkBytes,
            mimeType: 'application/pdf',
            pageCount: chunkIndices.length
          });
          partIndex++;
        }
      } else if (mode === 'multi_range') {
        // Split by multiple custom ranges
        const ranges = Array.isArray(params.ranges) ? params.ranges : [expr];
        for (let r = 0; r < ranges.length; r++) {
          const rangeItem = ranges[r];
          const rangeExpr = typeof rangeItem === 'string' ? rangeItem : `${rangeItem.from}-${rangeItem.to}`;
          const pageIndices = parseRangeExpression(rangeExpr, totalPages);
          if (pageIndices.length === 0) continue;

          const rangeDoc = await PDFDocument.create();
          const copiedPages = await rangeDoc.copyPages(srcDoc, pageIndices);
          copiedPages.forEach(cp => rangeDoc.addPage(cp));
          const rangeBytes = await rangeDoc.save({ useObjectStreams: true });

          result.push({
            id: `${item.id}_range${r + 1}`,
            name: `${baseName}_Range_${r + 1}.pdf`,
            data: rangeBytes,
            mimeType: 'application/pdf',
            pageCount: pageIndices.length
          });
        }
      } else if (mode === 'extract_separate') {
        // Extract specified range into individual single-page documents
        const pageIndices = parseRangeExpression(expr, totalPages);
        for (const p of pageIndices) {
          const singleDoc = await PDFDocument.create();
          const [copiedPage] = await singleDoc.copyPages(srcDoc, [p]);
          singleDoc.addPage(copiedPage);
          const singleBytes = await singleDoc.save({ useObjectStreams: true });

          result.push({
            id: `${item.id}_p${p + 1}`,
            name: `${baseName}_Page_${p + 1}.pdf`,
            data: singleBytes,
            mimeType: 'application/pdf',
            pageCount: 1
          });
        }
      } else {
        // Default: Extract specified range into 1 combined document
        const pageIndices = parseRangeExpression(expr, totalPages);
        if (pageIndices.length > 0) {
          const newDoc = await PDFDocument.create();
          const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
          for (const page of copiedPages) {
            newDoc.addPage(page);
          }
          const extractedBytes = await newDoc.save({ useObjectStreams: true });
          result.push({
            id: `${item.id}_extracted`,
            name: `${baseName}_Extracted.pdf`,
            data: extractedBytes,
            mimeType: 'application/pdf',
            pageCount: copiedPages.length
          });
        }
      }
    } catch (err) {
      logger.warn('PIPELINE_SPLIT', `Split error on ${item.name}: ${err.message}`);
      result.push(item);
    }
  }

  onProgress(100, 'Page extraction complete');
  return result;
}
