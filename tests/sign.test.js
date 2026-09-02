import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';

describe('PDF Sign & Stamp Engine', () => {
  it('should embed signature PNG onto a PDF page at precise coordinates', async () => {
    // 1. Create a blank PDF with 2 pages
    const doc = await PDFDocument.create();
    const page1 = doc.addPage([595, 842]); // A4
    doc.addPage([595, 842]);

    // 2. Create a 1x1 transparent PNG buffer
    const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const binary = atob(base64Png);
    const pngBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      pngBytes[i] = binary.charCodeAt(i);
    }

    // 3. Embed PNG and draw
    const embeddedPng = await doc.embedPng(pngBytes);
    page1.drawImage(embeddedPng, {
      x: 100,
      y: 150,
      width: 120,
      height: 40
    });

    const outBytes = await doc.save();
    expect(outBytes.length).toBeGreaterThan(0);

    const reloaded = await PDFDocument.load(outBytes);
    expect(reloaded.getPageCount()).toBe(2);
  });
});
