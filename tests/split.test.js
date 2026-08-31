import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';

describe('PDF Split & Extract Utility', () => {
  it('should accurately extract specific page indices into a new document', async () => {
    // Create 10-page document
    const srcDoc = await PDFDocument.create();
    for (let i = 0; i < 10; i++) {
      srcDoc.addPage([100, 100]);
    }
    const srcBytes = await srcDoc.save();

    // User selects pages: 1, 4, 7 (0-indexed: [0, 3, 6])
    const selectedIndices = [0, 3, 6];

    const newDoc = await PDFDocument.create();
    const sourceLoaded = await PDFDocument.load(srcBytes);
    const copiedPages = await newDoc.copyPages(sourceLoaded, selectedIndices);
    copiedPages.forEach(p => newDoc.addPage(p));

    const outBytes = await newDoc.save();
    const resultDoc = await PDFDocument.load(outBytes);

    expect(resultDoc.getPageCount()).toBe(3);
  });
});
