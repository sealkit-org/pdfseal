import { loadCleanPdfDocument } from '../../pdfSecurity';
import { logger } from '../../logger';

/**
 * Headless Sign & Stamp Node (Map: N -> N)
 * Places a signature or stamp image onto documents at configured placement.
 * 
 * @param {Array<Object>} items 
 * @param {Object} params - { stampDataUrl: string, placement: 'last_page_bottom_right'|'first_page'|'all_pages', scale: 0.5 }
 * @param {Function} [onProgress]
 * @returns {Promise<Array<Object>>}
 */
export async function executeSignNode(items, params = {}, onProgress = () => {}) {
  const result = [];
  const placement = params.placement || 'last_page_bottom_right';
  const scaleRatio = params.scale || 0.5;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    onProgress(Math.round((i / items.length) * 100), `正在批量盖章 [${i + 1}/${items.length}]: ${item.name}`);

    try {
      const doc = await loadCleanPdfDocument(item.data, { preserveWatermarks: true });
      const pages = doc.getPages();
      if (pages.length === 0) {
        result.push(item);
        continue;
      }

      let stampImage = null;
      if (params.stampDataUrl && params.stampDataUrl.startsWith('data:image/')) {
        const base64Data = params.stampDataUrl.split(',')[1];
        const binaryStr = atob(base64Data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let k = 0; k < binaryStr.length; k++) {
          bytes[k] = binaryStr.charCodeAt(k);
        }
        if (params.stampDataUrl.includes('image/jpeg') || params.stampDataUrl.includes('image/jpg')) {
          stampImage = await doc.embedJpg(bytes);
        } else {
          stampImage = await doc.embedPng(bytes);
        }
      }

      if (stampImage) {
        const stampDims = stampImage.scale(scaleRatio);
        const targetPages = [];

        if (placement === 'first_page') {
          targetPages.push(pages[0]);
        } else if (placement === 'all_pages') {
          targetPages.push(...pages);
        } else {
          // 'last_page_bottom_right' (default)
          targetPages.push(pages[pages.length - 1]);
        }

        for (const page of targetPages) {
          const { width, height } = page.getSize();
          let posX = width - stampDims.width - 40;
          let posY = 40; // bottom right margin

          if (placement === 'first_page') {
            posX = width - stampDims.width - 40;
            posY = height - stampDims.height - 60;
          }

          page.drawImage(stampImage, {
            x: Math.max(10, posX),
            y: Math.max(10, posY),
            width: stampDims.width,
            height: stampDims.height
          });
        }
      }

      const signedBytes = await doc.save({ useObjectStreams: true });
      result.push({
        ...item,
        data: signedBytes,
        name: item.name.replace(/\.pdf$/i, '') + '_Signed.pdf'
      });
    } catch (err) {
      logger.warn('PIPELINE_SIGN', `Sign error on ${item.name}: ${err.message}`);
      result.push(item);
    }
  }

  onProgress(100, '批量签名盖章完成');
  return result;
}
