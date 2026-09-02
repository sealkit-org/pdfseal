import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';

describe('Image to PDF Engine', () => {
  it('should compile multiple images into a multi-page PDF with A4 and US Letter sizes', async () => {
    const doc = await PDFDocument.create();

    // 1x1 sample PNG
    const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const binary = atob(base64Png);
    const pngBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      pngBytes[i] = binary.charCodeAt(i);
    }

    const embeddedPng = await doc.embedPng(pngBytes);

    // Page 1: A4
    const page1 = doc.addPage([595.28, 841.89]);
    page1.drawImage(embeddedPng, { x: 36, y: 36, width: 523.28, height: 769.89 });

    // Page 2: US Letter
    const page2 = doc.addPage([612, 792]);
    page2.drawImage(embeddedPng, { x: 36, y: 36, width: 540, height: 720 });

    const outBytes = await doc.save();
    expect(outBytes.length).toBeGreaterThan(0);

    const reloaded = await PDFDocument.load(outBytes);
    expect(reloaded.getPageCount()).toBe(2);

    const rPage1 = reloaded.getPage(0);
    expect(Math.round(rPage1.getWidth())).toBe(595);
    expect(Math.round(rPage1.getHeight())).toBe(842);

    const rPage2 = reloaded.getPage(1);
    expect(Math.round(rPage2.getWidth())).toBe(612);
    expect(Math.round(rPage2.getHeight())).toBe(792);
  });
});
