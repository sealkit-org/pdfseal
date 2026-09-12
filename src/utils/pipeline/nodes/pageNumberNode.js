import { applyPageNumbers } from '../../pageNumberEngine';
import { logger } from '../../logger';

/**
 * Headless Page Number Node (Map: N -> N)
 * Applies customized page numbering across all pages of input PDF items.
 * 
 * @param {Array<Object>} items 
 * @param {Object} params - { format, position, startNumber, skipCover, fontSize, textColor, maskMode, maskColor, margin }
 * @param {Function} [onProgress]
 * @returns {Promise<Array<Object>>}
 */
export async function executePageNumberNode(items, params = {}, onProgress = () => {}) {
  const result = [];
  const options = {
    format: params.format || 'Page {n} of {total}',
    position: params.position || 'bottom_center',
    startNumber: params.startNumber !== undefined ? Number(params.startNumber) : 1,
    skipCover: !!params.skipCover,
    fontSize: params.fontSize !== undefined ? Number(params.fontSize) : 10,
    textColor: params.textColor || '#334155',
    maskMode: params.maskMode || 'full_ribbon',
    maskColor: params.maskColor || '#ffffff',
    margin: params.margin !== undefined ? Number(params.margin) : 24
  };

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    onProgress(Math.round((i / items.length) * 100), `正在编排页码 [${i + 1}/${items.length}]: ${item.name}`);

    try {
      const { outBytes } = await applyPageNumbers(item.data, options);

      result.push({
        ...item,
        data: outBytes,
        name: item.name.replace(/\.pdf$/i, '') + '_Numbered.pdf'
      });
    } catch (err) {
      logger.warn('PIPELINE_PAGE_NUMBER', `Page number error on ${item.name}: ${err.message}`);
      result.push(item);
    }
  }

  onProgress(100, '批量页码编排完成');
  return result;
}
