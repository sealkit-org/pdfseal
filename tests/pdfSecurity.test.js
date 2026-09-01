import { describe, it, expect } from 'vitest';
import { hasRawPdfEncryption, verifyPdfSecurity } from '../src/utils/pdfSecurity';
import { PDFDocument } from 'pdf-lib';

describe('PDF Security Dual-Probe & Raw Binary Sniffing', () => {
  it('detects unencrypted PDF accurately', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([200, 200]);
    const pdfBytes = await doc.save();

    expect(hasRawPdfEncryption(pdfBytes)).toBe(false);

    const result = await verifyPdfSecurity(pdfBytes, '');
    expect(result.isEncrypted).toBe(false);
    expect(result.isOpenPasswordRequired).toBe(false);
    expect(result.isValid).toBe(true);
  });

  it('detects raw /Encrypt trailer dictionary in synthetic buffer', async () => {
    const textEncoder = new TextEncoder();
    const mockEncryptedTrailer = textEncoder.encode('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<< /Encrypt 2 0 R /Size 3 >>\n%%EOF');
    
    expect(hasRawPdfEncryption(mockEncryptedTrailer)).toBe(true);
  });
});
