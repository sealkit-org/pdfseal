import { describe, it, expect } from 'vitest';
import { PDFDocument, degrees } from 'pdf-lib';

describe('PDF Organize & Rotate Utility', () => {
  it('should reorder pages, rotate specific pages, and delete pages accurately', async () => {
    // Create initial 4-page PDF (pages: 0, 1, 2, 3)
    const srcDoc = await PDFDocument.create();
    for (let i = 0; i < 4; i++) {
      const page = srcDoc.addPage([100 * (i + 1), 100 * (i + 1)]);
    }
    const srcBytes = await srcDoc.save();

    // Mock User Action:
    // 1. Delete page 1 (was index 1) -> remaining pages: [0, 2, 3]
    // 2. Reorder: put page 3 first -> new order: [3, 0, 2]
    // 3. Rotate page 3 by 90 degrees, page 0 by 180 degrees
    const operations = [
      { originalIndex: 3, rotation: 90 },
      { originalIndex: 0, rotation: 180 },
      { originalIndex: 2, rotation: 0 },
    ];

    const newDoc = await PDFDocument.create();
    const sourceLoaded = await PDFDocument.load(srcBytes);

    for (const op of operations) {
      const [copied] = await newDoc.copyPages(sourceLoaded, [op.originalIndex]);
      const currentRot = copied.getRotation().angle;
      copied.setRotation(degrees(currentRot + op.rotation));
      newDoc.addPage(copied);
    }

    const outBytes = await newDoc.save();
    const resultDoc = await PDFDocument.load(outBytes);

    // Assert:
    expect(resultDoc.getPageCount()).toBe(3);
    const pages = resultDoc.getPages();
    expect(pages[0].getRotation().angle).toBe(90);
    expect(pages[1].getRotation().angle).toBe(180);
    expect(pages[2].getRotation().angle).toBe(0);
    // Verify first page width matches original index 3 (400px)
    expect(pages[0].getWidth()).toBe(400);
  });
});
