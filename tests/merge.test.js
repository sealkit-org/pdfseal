import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';

describe('PDF Merge Utility', () => {
  it('should successfully merge 3 distinct PDF documents into one', async () => {
    // 1. Create Doc 1 (2 pages)
    const doc1 = await PDFDocument.create();
    doc1.addPage([200, 200]);
    doc1.addPage([200, 200]);
    const bytes1 = await doc1.save();

    // 2. Create Doc 2 (1 page)
    const doc2 = await PDFDocument.create();
    doc2.addPage([300, 300]);
    const bytes2 = await doc2.save();

    // 3. Create Doc 3 (3 pages)
    const doc3 = await PDFDocument.create();
    doc3.addPage([100, 100]);
    doc3.addPage([100, 100]);
    doc3.addPage([100, 100]);
    const bytes3 = await doc3.save();

    // Execute Merge
    const mergedDoc = await PDFDocument.create();
    for (const bytes of [bytes1, bytes2, bytes3]) {
      const srcDoc = await PDFDocument.load(bytes);
      const copiedPages = await mergedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
      copiedPages.forEach(p => mergedDoc.addPage(p));
    }

    const mergedBytes = await mergedDoc.save();
    const resultDoc = await PDFDocument.load(mergedBytes);

    // Assert total page count: 2 + 1 + 3 = 6 pages
    expect(resultDoc.getPageCount()).toBe(6);
    expect(mergedBytes.length).toBeGreaterThan(0);
  });
});
