import { encryptPDF } from '@pdfsmaller/pdf-encrypt';
import { loadCleanPdfDocument } from '../../pdfSecurity';
import { logger } from '../../logger';

/**
 * Headless Protect / Encryption & Permission Lock Node
 * Encrypts pipeline items with User Password (Open) and/or Owner Password (Permissions).
 * 
 * @param {Array<Object>} items - Array of PipelineItems
 * @param {Object} params - { userPassword: '', ownerPassword: '', algorithm: 'AES-256', allowPrinting: false, allowCopying: false, allowModifying: false, allowAnnotating: false }
 * @param {Function} [onProgress] - Progress callback (percentage, message)
 * @returns {Promise<Array<Object>>}
 */
export async function executeProtectNode(items, params = {}, onProgress = () => {}) {
  const result = [];
  const userPassword = params.userPassword || '';
  const ownerPassword = params.ownerPassword || '';
  const algorithm = params.algorithm === 'RC4' ? 'RC4' : 'AES-256';

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    onProgress(Math.round(((i) / items.length) * 100), `正在加密保护: ${item.name}`);

    try {
      // Ensure the PDF is cleanly loaded (stripping any existing locks if already decrypted)
      const cleanDoc = await loadCleanPdfDocument(item.data, { 
        password: params.existingPassword || '',
        preserveWatermarks: true 
      });
      const rawBytes = await cleanDoc.save({ useObjectStreams: false });

      // Apply standard PDF encryption & permission controls
      const encryptedBytes = await encryptPDF(rawBytes, userPassword, {
        ownerPassword: ownerPassword || undefined,
        algorithm,
        allowPrinting: Boolean(params.allowPrinting),
        allowModifying: Boolean(params.allowModifying),
        allowCopying: Boolean(params.allowCopying),
        allowAnnotating: Boolean(params.allowAnnotating),
        allowFillingForms: Boolean(params.allowAnnotating || params.allowFillingForms),
        allowHighQualityPrint: Boolean(params.allowPrinting)
      });

      result.push({
        ...item,
        data: encryptedBytes,
        isEncrypted: true,
        name: item.name.replace(/\.pdf$/i, '') + '_Protected.pdf'
      });
    } catch (err) {
      logger.warn('PIPELINE_PROTECT', `Failed to protect ${item.name}: ${err.message}`);
      throw new Error(`加密保护失败 (${item.name}): ${err.message}`);
    }
  }

  onProgress(100, '加密保护处理完成');
  return result;
}
