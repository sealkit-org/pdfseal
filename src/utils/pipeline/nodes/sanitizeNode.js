import { PDFDocument, PDFName } from 'pdf-lib';
import { loadCleanPdfDocument } from '../../pdfSecurity';
import { logger } from '../../logger';

/**
 * Headless Sanitize / Metadata Stripping Node (Map: N -> N)
 * Purges author, creator, modification history, XMP and piece info.
 * 
 * @param {Array<Object>} items 
 * @param {Object} params - { stripDocInfo: true, stripGpsAndThumb: true, stripPieceInfo: true }
 * @param {Function} [onProgress]
 * @returns {Promise<Array<Object>>}
 */
export async function executeSanitizeNode(items, params = {}, onProgress = () => {}) {
  const result = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    onProgress(Math.round((i / items.length) * 100), `正在脱敏 [${i + 1}/${items.length}]: ${item.name}`);

    try {
      const doc = await loadCleanPdfDocument(item.data, { preserveWatermarks: true });
      doc.updateMetadata = false;

      // Delete Info dictionary from trailer
      try {
        const infoRef = doc.context.trailerInfo?.Info;
        if (infoRef) {
          const infoDict = doc.context.lookup(infoRef);
          if (infoDict && infoDict.delete) {
            infoDict.delete(PDFName.of('Title'));
            infoDict.delete(PDFName.of('Author'));
            infoDict.delete(PDFName.of('Subject'));
            infoDict.delete(PDFName.of('Keywords'));
            infoDict.delete(PDFName.of('Creator'));
            infoDict.delete(PDFName.of('Producer'));
            infoDict.delete(PDFName.of('CreationDate'));
            infoDict.delete(PDFName.of('ModDate'));
            infoDict.delete(PDFName.of('Trapped'));
          }
          doc.context.delete(infoRef);
        }
        if (doc.context.trailerInfo) {
          delete doc.context.trailerInfo.Info;
        }
      } catch (e) {}

      // Clear standard document info dictionary
      if (params.stripDocInfo !== false) {
        doc.setTitle('');
        doc.setAuthor('');
        doc.setSubject('');
        doc.setKeywords([]);
        doc.setProducer('');
        doc.setCreator('');
      }

      // Purge Catalog-level metadata
      if (doc.catalog) {
        if (params.stripPieceInfo !== false) {
          doc.catalog.delete(PDFName.of('PieceInfo'));
        }
        if (params.stripDocInfo !== false) {
          doc.catalog.delete(PDFName.of('Metadata'));
        }
      }

      // Purge Annotations, Comments, Hyperlinks, and Interactive Forms
      if (params.stripAnnots === true) {
        try {
          const form = doc.getForm();
          if (form) {
            form.flatten();
          }
        } catch (e) {
          logger.warn('SANITIZE', `Failed to flatten forms for ${item.name}: ${e.message}`);
        }
        const pages = doc.getPages();
        for (const page of pages) {
          if (page.node.has(PDFName.of('Annots'))) {
            // Delete all remaining annotations/links
            page.node.delete(PDFName.of('Annots'));
          }
        }
      }

      // Purge Page-level thumbnails
      if (params.stripGpsAndThumb !== false) {
        const pages = doc.getPages();
        for (const p of pages) {
          if (p.node) {
            p.node.delete(PDFName.of('Thumb'));
            p.node.delete(PDFName.of('PieceInfo'));
          }
        }
      }

      const sanitizedBytes = await doc.save({
        useObjectStreams: true,
        addDefaultPage: false,
        updateMetadata: false
      });

      result.push({
        ...item,
        data: sanitizedBytes,
        name: item.name.replace(/\.pdf$/i, '') + '_Sanitized.pdf'
      });
    } catch (err) {
      logger.warn('PIPELINE_SANITIZE', `Sanitize error on ${item.name}: ${err.message}`);
      result.push(item);
    }
  }

  onProgress(100, '元数据脱敏完成');
  return result;
}
