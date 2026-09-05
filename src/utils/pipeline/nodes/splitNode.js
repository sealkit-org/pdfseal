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
    onProgress(Math.round((i / items.length) * 100), `正在处理页面提取 [${i + 1}/${items.length}]: ${item.name}`);

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
      } else {
        // Extract specified range
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

  onProgress(100, '页面提取拆分完成');
  return result;
}
