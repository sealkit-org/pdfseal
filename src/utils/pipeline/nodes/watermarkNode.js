import { StandardFonts, rgb } from 'pdf-lib';
import { loadCleanPdfDocument } from '../../pdfSecurity';
import { logger } from '../../logger';

/**
 * Headless Watermark Node (Map: N -> N)
 * Applies watermark text/stamp across all pages of input items.
 * 
 * @param {Array<Object>} items 
 * @param {Object} params - { text: 'CONFIDENTIAL', opacity: 0.25, rotation: 45, color: '#808080' }
 * @param {Function} [onProgress]
 * @returns {Promise<Array<Object>>}
 */
export async function executeWatermarkNode(items, params = {}, onProgress = () => {}) {
  const result = [];
  const text = params.text || 'CONFIDENTIAL';
  const opacity = params.opacity !== undefined ? Number(params.opacity) : 0.25;
  const rotation = params.rotation !== undefined ? Number(params.rotation) : 45;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    onProgress(Math.round((i / items.length) * 100), `正在加水印 [${i + 1}/${items.length}]: ${item.name}`);

    try {
      const doc = await loadCleanPdfDocument(item.data, { preserveWatermarks: true });
      const pages = doc.getPages();

      // Check if browser canvas is available
      const hasCanvas = typeof document !== 'undefined' && typeof document.createElement === 'function';

      if (hasCanvas) {
        // High-DPI Canvas Rendering (Universal CJK & Latin Font Rendering)
        for (const page of pages) {
          const { width, height } = page.getSize();
          const scale = 2;
          const stampCanvas = document.createElement('canvas');
          stampCanvas.width = width * scale;
          stampCanvas.height = height * scale;
          const sctx = stampCanvas.getContext('2d');

          sctx.save();
          sctx.scale(scale, scale);
          sctx.translate(width / 2, height / 2);
          sctx.rotate((rotation * Math.PI) / 180);
          sctx.font = `bold 42px "PingFang SC", "Microsoft YaHei", "SimHei", "Heiti SC", sans-serif`;
          sctx.fillStyle = params.color || '#808080';
          sctx.globalAlpha = opacity;
          sctx.textAlign = 'center';
          sctx.textBaseline = 'middle';
          sctx.fillText(text, 0, 0);
          sctx.restore();

          const pngBlob = await new Promise(resolve => stampCanvas.toBlob(resolve, 'image/png'));
          const pngBuffer = await pngBlob.arrayBuffer();
          const pngImage = await doc.embedPng(pngBuffer);

          page.drawImage(pngImage, {
            x: 0,
            y: 0,
            width,
            height
          });
        }
      } else {
        // Fallback Vector Rendering (Node.js / Unit Test environment)
        const font = await doc.embedFont(StandardFonts.HelveticaBold);
        for (const page of pages) {
          const { width, height } = page.getSize();
          const textWidth = font.widthOfTextAtSize(text, 42);
          page.drawText(text, {
            x: width / 2 - textWidth / 2,
            y: height / 2,
            size: 42,
            font,
            color: rgb(0.5, 0.5, 0.5),
            opacity,
            rotate: { type: 'degrees', angle: rotation }
          });
        }
      }

      let outBytes = await doc.save({ useObjectStreams: true });

      result.push({
        ...item,
        data: outBytes,
        name: item.name.replace(/\.pdf$/i, '') + '_Watermarked.pdf'
      });
    } catch (err) {
      logger.warn('PIPELINE_WATERMARK', `Watermark error on ${item.name}: ${err.message}`);
      result.push(item);
    }
  }

  onProgress(100, '批量水印添加完成');
  return result;
}
