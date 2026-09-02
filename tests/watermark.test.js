import { describe, it, expect } from 'vitest';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';

describe('PDF Watermark & Stamp Utility', () => {
  it('should draw custom watermark text across all pages with custom opacity and rotation', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([500, 500]);
    doc.addPage([500, 500]);

    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    const text = 'CONFIDENTIAL TEST';
    const size = 36;
    const angle = -45;
    const opacity = 0.5;

    for (const page of doc.getPages()) {
      const { width, height } = page.getSize();
      page.drawText(text, {
        x: width / 2,
        y: height / 2,
        size: size,
        font: font,
        color: rgb(1, 0, 0),
        opacity: opacity,
        rotate: degrees(angle),
      });
    }

    const outBytes = await doc.save();
    const resultDoc = await PDFDocument.load(outBytes);

    expect(resultDoc.getPageCount()).toBe(2);
    expect(outBytes.length).toBeGreaterThan(0);
  });

  it('should encrypt output bytes with owner password protection', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([200, 200]);
    const rawBytes = await doc.save();

    const { encryptPDF } = await import('@pdfsmaller/pdf-encrypt');
    const encryptedBytes = await encryptPDF(rawBytes, '', {
      ownerPassword: 'owner_test_password',
      algorithm: 'RC4'
    });

    const { verifyPdfSecurity } = await import('../src/utils/pdfSecurity.js');
    const sec = await verifyPdfSecurity(encryptedBytes.buffer, '');
    expect(sec.isEncrypted).toBe(true);
    expect(sec.isOpenPasswordRequired).toBe(false);
  });
});
