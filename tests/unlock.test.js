import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { encryptPDF } from '@pdfsmaller/pdf-encrypt';
import { loadCleanPdfDocument, verifyPdfSecurity } from '../src/utils/pdfSecurity.js';

describe('PDF Unlock Engine', () => {
  it('should take an encrypted PDF and permanently strip encryption into a clean unencrypted PDF', async () => {
    // 1. Create a sample PDF
    const doc = await PDFDocument.create();
    doc.addPage([400, 400]);
    const rawBytes = await doc.save();

    // 2. Encrypt it with a user password
    const encryptedBytes = await encryptPDF(rawBytes, 'bank_password_123', {
      algorithm: 'RC4'
    });

    const checkEncrypted = await verifyPdfSecurity(encryptedBytes.buffer, '');
    expect(checkEncrypted.isEncrypted).toBe(true);
    expect(checkEncrypted.isOpenPasswordRequired).toBe(true);

    // 3. Unlock using loadCleanPdfDocument with the password
    const cleanDoc = await loadCleanPdfDocument(encryptedBytes.buffer, 'bank_password_123');
    const unlockedBytes = await cleanDoc.save({ useObjectStreams: true });

    // 4. Verify unlocked result has NO encryption dictionary and opens freely
    const checkUnlocked = await verifyPdfSecurity(unlockedBytes.buffer, '');
    expect(checkUnlocked.isEncrypted).toBe(false);
    expect(checkUnlocked.isOpenPasswordRequired).toBe(false);

    const reloaded = await PDFDocument.load(unlockedBytes);
    expect(reloaded.getPageCount()).toBe(1);
  });
});
