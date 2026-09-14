import * as pdfjsLib from 'pdfjs-dist';
import { logger } from '../../logger';

const JPG_QUALITY = 0.92;

/**
 * Headless PDF to Image Node (Explode)
 * Renders each page of incoming PDF documents into PNG / JPG image items.
 *
 * @param {Array<Object>} items - PDF items ({ name, data, mimeType })
 * @param {Object} params - { format: 'png'|'jpg', dpi: 150|300 }
 * @param {Function} [onProgress]
 * @returns {Promise<Array<Object>>} - Image items ({ name, data, mimeType })
 */
export async function executePdf2ImgNode(items, params = {}, onProgress = () => {}) {
  const format = params.format === 'jpg' ? 'jpg' : 'png';
  const dpi = Number(params.dpi) === 300 ? 300 : 150;
  const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
  const ext = format === 'jpg' ? 'jpg' : 'png';

  const result = [];
  // Items never carry pageCount upstream (runner only passes id/name/data/mimeType),
  // so progress is interpolated per document: (docsDone + pageIdx/docPages) / totalDocs
  const totalDocs = items.length;

  for (let docIdx = 0; docIdx < items.length; docIdx++) {
    const item = items[docIdx];
    const origBase = (item.originalName || item.name || 'Document').replace(/\.pdf$/i, '').replace(/\.[^/.]+$/, '');

    let pdf = null;
    try {
      const dataCopy = item.data instanceof Uint8Array ? new Uint8Array(item.data) : new Uint8Array(item.data);
      const loadingTask = pdfjsLib.getDocument({
        data: dataCopy,
        cMapUrl: typeof window !== 'undefined' ? (window.location.origin + '/cmaps/') : '/cmaps/',
        cMapPacked: true,
        standardFontDataUrl: typeof window !== 'undefined' ? (window.location.origin + '/standard_fonts/') : '/standard_fonts/'
      });
      pdf = await loadingTask.promise;

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: dpi / 72 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext('2d');
        // White background: JPEG has no alpha; PNG output stays consistent
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport, intent: 'print' }).promise;

        const blob = await new Promise((resolve, reject) => {
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('canvas.toBlob returned null'))),
            mime,
            format === 'jpg' ? JPG_QUALITY : undefined
          );
        });
        const bytes = new Uint8Array(await blob.arrayBuffer());

        result.push({
          id: `${item.id || 'doc'}_page_${i}`,
          name: `${origBase}_page_${String(i).padStart(2, '0')}.${ext}`,
          data: bytes,
          mimeType: mime
        });

        onProgress(
          Math.min(99, Math.round(((docIdx + i / pdf.numPages) / totalDocs) * 100)),
          `Rendering page [${origBase} · ${i}/${pdf.numPages}] (${dpi} DPI ${format.toUpperCase()})`
        );
      }
    } catch (err) {
      logger.warn('PIPELINE_PDF2IMG', `Failed to convert ${item.name}: ${err.message}`);
    } finally {
      if (pdf) {
        try {
          await pdf.destroy();
        } catch (e) {}
      }
    }
  }

  onProgress(100, 'All pages converted');
  logger.info('PIPELINE_PDF2IMG', `Converted ${result.length} pages to ${format.toUpperCase()} at ${dpi} DPI`);
  return result;
}
