import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

/**
 * Checks if a PDF is encrypted (with User Password or Owner/Permission Password)
 * and whether a valid password is required to unlock it.
 * 
 * @param {ArrayBuffer|Uint8Array} arrayBuffer 
 * @param {string} password 
 * @returns {Promise<{ isEncrypted: boolean, isValid: boolean, error?: string }>}
 */
export async function verifyPdfSecurity(arrayBuffer, password = '') {
  let isEncrypted = false;

  // 1. Check with pdf-lib strict encryption check
  try {
    const doc = await PDFDocument.load(arrayBuffer, { 
      password: password || undefined,
      ignoreEncryption: false 
    });
    if (doc.isEncrypted) {
      isEncrypted = true;
    }
  } catch (err) {
    const msg = err.message?.toLowerCase() || '';
    if (msg.includes('encrypted') || msg.includes('password')) {
      isEncrypted = true;
    }
  }

  // 2. Check with pdf.js worker
  try {
    const pdfData = new Uint8Array(arrayBuffer.slice ? arrayBuffer.slice(0) : arrayBuffer);
    const loadingTask = pdfjsLib.getDocument({
      data: pdfData,
      password: password || undefined
    });
    await loadingTask.promise;
  } catch (err) {
    if (err.name === 'PasswordException' || err.message?.toLowerCase().includes('password')) {
      isEncrypted = true;
      if (password) {
        return { isEncrypted: true, isValid: false, error: 'Password incorrect' };
      }
    }
  }

  // If encrypted and no password was provided by user, require password unlock
  if (isEncrypted && !password) {
    return { isEncrypted: true, isValid: false, error: 'Password required' };
  }

  return { isEncrypted, isValid: true };
}
