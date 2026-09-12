import { describe, it, expect } from 'vitest';
import { PDFDocument, PageSizes, degrees } from 'pdf-lib';
import { assembleOrganizedPdf, generateBlankPageThumbnail } from '../src/utils/organizeEngine';

describe('PDF Organize & Assemble Engine (organizeEngine.js)', () => {
  it('should generate a valid data URL for blank page thumbnail', () => {
    const thumb = generateBlankPageThumbnail();
    expect(thumb).toBeTypeOf('string');
    expect(thumb.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('should reorder pages, rotate specific pages, and delete pages accurately', async () => {
    // Create initial 4-page PDF (pages: 0, 1, 2, 3)
    const srcDoc = await PDFDocument.create();
    for (let i = 0; i < 4; i++) {
      srcDoc.addPage([100 * (i + 1), 100 * (i + 1)]);
    }
    const srcBytes = await srcDoc.save();

    // User Operations:
    // 1. Delete page 1 -> remaining [0, 2, 3]
    // 2. Reorder to [3, 0, 2]
    // 3. Rotate page 3 by 90deg, page 0 by 180deg
    const pages = [
      { id: '1', type: 'source', pageIndex: 3, rotation: 90 },
      { id: '2', type: 'source', pageIndex: 0, rotation: 180 },
      { id: '3', type: 'source', pageIndex: 2, rotation: 0 },
    ];

    const assembledBytes = await assembleOrganizedPdf(pages, { sourceBytes: srcBytes });
    const resultDoc = await PDFDocument.load(assembledBytes);

    expect(resultDoc.getPageCount()).toBe(3);
    const resultPages = resultDoc.getPages();
    expect(resultPages[0].getRotation().angle).toBe(90);
    expect(resultPages[1].getRotation().angle).toBe(180);
    expect(resultPages[2].getRotation().angle).toBe(0);
    // Page 0 was original page index 3 (width 400)
    expect(resultPages[0].getWidth()).toBe(400);
  });

  it('should support inserting standard A4 blank pages', async () => {
    const srcDoc = await PDFDocument.create();
    srcDoc.addPage([200, 200]);
    const srcBytes = await srcDoc.save();

    const pages = [
      { id: 'p1', type: 'source', pageIndex: 0, rotation: 0 },
      { id: 'p_blank_1', type: 'blank', rotation: 0 },
      { id: 'p_blank_2', type: 'blank', rotation: 90 }
    ];

    const assembledBytes = await assembleOrganizedPdf(pages, { sourceBytes: srcBytes });
    const resultDoc = await PDFDocument.load(assembledBytes);

    expect(resultDoc.getPageCount()).toBe(3);
    const resultPages = resultDoc.getPages();
    
    // Page 1: source
    expect(resultPages[0].getWidth()).toBe(200);

    // Page 2: standard A4 blank portrait
    expect(resultPages[1].getWidth()).toBeCloseTo(PageSizes.A4[0], 0);
    expect(resultPages[1].getHeight()).toBeCloseTo(PageSizes.A4[1], 0);
    expect(resultPages[1].getRotation().angle).toBe(0);

    // Page 3: standard A4 blank landscape (90 deg)
    expect(resultPages[2].getWidth()).toBeCloseTo(PageSizes.A4[1], 0);
    expect(resultPages[2].getHeight()).toBeCloseTo(PageSizes.A4[0], 0);
    expect(resultPages[2].getRotation().angle).toBe(90);
  });

  it('should support appending external PDF pages into assembly', async () => {
    // Primary document (1 page, 300x300)
    const primDoc = await PDFDocument.create();
    primDoc.addPage([300, 300]);
    const primBytes = await primDoc.save();

    // External document (2 pages, 500x500)
    const extDoc = await PDFDocument.create();
    extDoc.addPage([500, 500]);
    extDoc.addPage([500, 500]);
    const extBytes = await extDoc.save();

    const pages = [
      { id: 'p_prim_0', type: 'source', pageIndex: 0, rotation: 0 },
      { id: 'p_ext_1', type: 'external', pageIndex: 1, rotation: 90, sourceBytes: extBytes },
      { id: 'p_blank', type: 'blank', rotation: 0 }
    ];

    const assembledBytes = await assembleOrganizedPdf(pages, { sourceBytes: primBytes });
    const resultDoc = await PDFDocument.load(assembledBytes);

    expect(resultDoc.getPageCount()).toBe(3);
    const resultPages = resultDoc.getPages();
    expect(resultPages[0].getWidth()).toBe(300);
    expect(resultPages[1].getWidth()).toBe(500);
    expect(resultPages[1].getRotation().angle).toBe(90);
    expect(resultPages[2].getWidth()).toBeCloseTo(PageSizes.A4[0], 0);
  });

  it('should throw an error if no pages are provided', async () => {
    await expect(assembleOrganizedPdf([], {})).rejects.toThrow('No pages to organize.');
  });
});
