import { compressPdf } from '../../pdfCompress';
import { logger } from '../../logger';

/**
 * Headless Compression Node (Map: N -> N)
 * Compresses each PDF item using balanced, extreme, or lossless mode.
 * 
 * @param {Array<Object>} items 
 * @param {Object} params - { level: 'balanced'|'extreme'|'lossless' }
 * @param {Function} [onProgress]
 * @returns {Promise<Array<Object>>}
 */
export async function executeCompressNode(items, params = {}, onProgress = () => {}) {
  const result = [];
  const level = params.level || 'balanced';
  const targetSizeMb = Number(params.targetSizeMb) || 2.0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const basePct = Math.round((i / items.length) * 100);
    const nextPct = Math.round(((i + 1) / items.length) * 100);

    const levelDisplay = level === 'target' ? `≤ ${targetSizeMb} MB` : level;
    onProgress(basePct, `正在压缩 [${i + 1}/${items.length}]: ${item.name} (${levelDisplay})`);

    try {
      const compressedBytes = await compressPdf(item.data, level, { targetSizeMb }, (cur, tot) => {
        const subPct = basePct + Math.round((cur / tot) * (nextPct - basePct));
        onProgress(subPct, `正在压缩 [${i + 1}/${items.length}] 第 ${cur}/${tot} 页...`);
      });

      result.push({
        ...item,
        data: compressedBytes,
        name: item.name.replace(/\.pdf$/i, '') + '_Compressed.pdf'
      });
    } catch (err) {
      logger.warn('PIPELINE_COMPRESS', `Compression error on ${item.name}: ${err.message}`);
      // Fallback: keep original if error
      result.push(item);
    }
  }

  onProgress(100, '批量压缩处理完成');
  return result;
}
