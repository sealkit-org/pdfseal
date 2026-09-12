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
        // Standard signature width reference on A4 (595 pt width)
        // At default scaleRatio 0.5: targetW is approx 140pt (about 24% of page width)
        const aspect = stampImage.height / stampImage.width;
        const baseWidth = Math.min(stampImage.width, 280);
        const targetW = Math.max(30, Math.round(baseWidth * (scaleRatio / 0.5)));
        const targetH = Math.max(15, Math.round(targetW * aspect));

        const targetPages = [];
        if (placement === 'first_page') {
          targetPages.push(pages[0]);
        } else if (placement === 'all_pages') {
          targetPages.push(...pages);
        } else if (placement === 'except_last') {
          targetPages.push(...pages.slice(0, Math.max(1, pages.length - 1)));
        } else {
          // 'last_page' or 'last_page_bottom_right' (default)
          targetPages.push(pages[pages.length - 1]);
        }

        // Determine effective position
        const pos = params.position || (placement === 'except_last' ? 'mid_right' : 'bottom_right');

        for (const page of targetPages) {
          const { width, height } = page.getSize();
          let posX = width - targetW - 40;
          let posY = 40;

          if (pos === 'mid_right') {
            posX = width - targetW - 15; // right edge initial margin
            posY = Math.round((height - targetH) / 2);
          } else if (pos === 'bottom_center') {
            posX = Math.round((width - targetW) / 2);
            posY = 40;
          } else if (pos === 'bottom_left') {
            posX = 40;
            posY = 40;
          } else if (placement === 'first_page' && !params.position) {
            posX = width - targetW - 40;
            posY = height - targetH - 60;
          } else {
            // 'bottom_right'
            posX = width - targetW - 40;
            posY = 40;
          }

          page.drawImage(stampImage, {
            x: Math.max(10, posX),
            y: Math.max(10, posY),
            width: targetW,
            height: targetH
          });

          if (params.addDateStamp) {
            try {
              const font = await doc.embedFont('Helvetica');
              const now = new Date();
              const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
              page.drawText(dateStr, {
                x: Math.max(10, posX + Math.round((targetW - 55) / 2)),
                y: Math.max(10, posY - 12),
                size: 8,
                font
              });
            } catch (err) {
              // Ignore date font embedding error if any
            }
          }
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
