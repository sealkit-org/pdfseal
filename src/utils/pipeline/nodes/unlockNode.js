import { loadCleanPdfDocument, verifyPdfSecurity } from '../../pdfSecurity';
import { logger } from '../../logger';

/**
 * Headless Unlock / Security Stripping Node
 * Removes encryption or owner restrictions from pipeline items.
 * 
 * @param {Array<Object>} items - Array of PipelineItems
 * @param {Object} params - { password: '', skipIfUnencrypted: true }
 * @param {Function} [onProgress] - Progress callback (percentage, message)
 * @returns {Promise<Array<Object>>}
 */
export async function executeUnlockNode(items, params = {}, onProgress = () => {}) {
  const result = [];
  const password = params.password || '';

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    onProgress(Math.round(((i) / items.length) * 100), `正在解密: ${item.name}`);

    try {
      const security = await verifyPdfSecurity(item.data, password);
      if (!security.isEncrypted) {
        result.push(item);
        continue;
      }

      const cleanDoc = await loadCleanPdfDocument(item.data, { password });
      const unlockedBytes = await cleanDoc.save({ useObjectStreams: true });

      result.push({
        ...item,
        data: unlockedBytes,
        isEncrypted: false,
        name: item.name.replace(/\.pdf$/i, '') + '_Unlocked.pdf'
      });
    } catch (err) {
      logger.warn('PIPELINE_UNLOCK', `Failed to unlock ${item.name}: ${err.message}`);
      if (params.skipIfUnencrypted) {
        result.push(item);
      } else {
        throw new Error(`解密失败 (${item.name}): ${err.message}`);
      }
    }
  }

  onProgress(100, '解密处理完成');
  return result;
}
