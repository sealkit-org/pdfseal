import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { 
  hexToRgb, 
  isPureAscii, 
  interpolatePageNumber, 
  calculatePageNumberGeometry, 
  applyPageNumbers,
  detectDominantBackgroundColor
} from '../src/utils/pageNumberEngine';
import { executePageNumberNode } from '../src/utils/pipeline/nodes/pageNumberNode';

describe('Page Numbering Engine & Pipeline Integration', () => {
  // Helper to create a multi-page test PDF in memory
  async function createTestPdf(pageCount = 3) {
    const doc = await PDFDocument.create();
    for (let i = 0; i < pageCount; i++) {
      const page = doc.addPage([600, 800]);
      // Draw dummy content
      page.drawText(`Page Content ${i + 1}`, { x: 50, y: 700, size: 20 });
    }
    return await doc.save();
  }

  describe('Color and String Utilities', () => {
    it('should correctly convert hex color to normalized RGB', () => {
      expect(hexToRgb('#ffffff')).toEqual({ r: 1, g: 1, b: 1 });
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
      expect(hexToRgb('#fff')).toEqual({ r: 1, g: 1, b: 1 });

      const slate = hexToRgb('#334155');
      expect(slate.r).toBeCloseTo(0.2, 1);
      expect(slate.g).toBeCloseTo(0.25, 1);
      expect(slate.b).toBeCloseTo(0.33, 1);

      // Fallback for invalid hex
      expect(hexToRgb('invalid')).toEqual({ r: 1, g: 1, b: 1 });
    });

    it('should identify pure ASCII vs non-ASCII strings', () => {
      expect(isPureAscii('Page 1 of 10')).toBe(true);
      expect(isPureAscii('1 / 5')).toBe(true);
      expect(isPureAscii('第 1 页，共 5 页')).toBe(false);
      expect(isPureAscii('Seite 1 von 5')).toBe(true);
    });

    it('should correctly detect dominant background color from canvas and filter out foreground text/stamps', () => {
      // Null / empty fallback
      expect(detectDominantBackgroundColor(null)).toBe('#ffffff');
      expect(detectDominantBackgroundColor({})).toBe('#ffffff');

      // Mock canvas with dominant parchment background (#fbf9f4) and some black text pixels
      const mockCanvas = {
        width: 100,
        height: 100,
        getContext: () => ({
          getImageData: (x, y) => {
            // Simulate 10% black text / stamp pixels, 90% parchment paper background
            if (x === 10 && y === 10) {
              return { data: [0, 0, 0, 255] }; // Black text
            }
            if (x === 50 && y === 50) {
              return { data: [220, 38, 38, 255] }; // Red stamp
            }
            return { data: [251, 249, 244, 255] }; // Dominant parchment
          }
        })
      };

      const detected = detectDominantBackgroundColor(mockCanvas);
      // Expected: parchment color quantized to step of 6 -> close to #fcfaf4 or #fbf9f4
      expect(detected).toMatch(/^#[0-9a-f]{6}$/i);
      const rgbVal = hexToRgb(detected);
      expect(rgbVal.r).toBeGreaterThan(0.9);
      expect(rgbVal.g).toBeGreaterThan(0.9);
      expect(rgbVal.b).toBeGreaterThan(0.85);

      // Mock canvas with transparent background (should default to #ffffff)
      const transparentCanvas = {
        width: 100,
        height: 100,
        getContext: () => ({
          getImageData: () => ({ data: [0, 0, 0, 0] })
        })
      };
      expect(detectDominantBackgroundColor(transparentCanvas)).toBe('#ffffff');
    });
  });

  describe('Macro Interpolation', () => {
    it('should interpolate standard {n} and {total} tokens', () => {
      expect(interpolatePageNumber('{n}', 0, 5)).toBe('1');
      expect(interpolatePageNumber('{n} / {total}', 2, 5)).toBe('3 / 5');
      expect(interpolatePageNumber('Page {n} of {total}', 4, 5)).toBe('Page 5 of 5');
    });

    it('should support custom starting page number', () => {
      expect(interpolatePageNumber('Page {n}', 0, 5, { startNumber: 10 })).toBe('Page 10');
      expect(interpolatePageNumber('Page {n} of {total}', 1, 5, { startNumber: 10 })).toBe('Page 11 of 5');
    });

    it('should skip cover page (index 0) when skipCover is true', () => {
      const coverResult = interpolatePageNumber('Page {n} of {total}', 0, 5, { skipCover: true });
      expect(coverResult).toBeNull();

      // Page 2 (index 1) should be numbered 1, with total count = 4
      const page2Result = interpolatePageNumber('Page {n} of {total}', 1, 5, { skipCover: true });
      expect(page2Result).toBe('Page 1 of 4');

      // Page 5 (index 4) should be numbered 4 of 4
      const page5Result = interpolatePageNumber('Page {n} of {total}', 4, 5, { skipCover: true });
      expect(page5Result).toBe('Page 4 of 4');
    });

    it('should support {doc_total} token alongside {total}', () => {
      const result = interpolatePageNumber('P.{n} (Section {total} / Total {doc_total})', 1, 5, { skipCover: true });
      expect(result).toBe('P.1 (Section 4 / Total 5)');
    });
  });

  describe('Geometry and Masking Calculation', () => {
    it('should calculate positions for bottom anchors', () => {
      const geoCenter = calculatePageNumberGeometry({
        pageWidth: 600,
        pageHeight: 800,
        textWidth: 50,
        fontSize: 10,
        position: 'bottom_center',
        margin: 20
      });
      expect(geoCenter.textX).toBe((600 - 50) / 2);
      expect(geoCenter.textY).toBe(20);

      const geoRight = calculatePageNumberGeometry({
        pageWidth: 600,
        pageHeight: 800,
        textWidth: 50,
        fontSize: 10,
        position: 'bottom_right',
        margin: 20
      });
      expect(geoRight.textX).toBe(600 - 20 - 50);
      expect(geoRight.textY).toBe(20);

      const geoLeft = calculatePageNumberGeometry({
        pageWidth: 600,
        pageHeight: 800,
        textWidth: 50,
        fontSize: 10,
        position: 'bottom_left',
        margin: 20
      });
      expect(geoLeft.textX).toBe(20);
      expect(geoLeft.textY).toBe(20);
    });

    it('should calculate positions for top anchors', () => {
      const geoTop = calculatePageNumberGeometry({
        pageWidth: 600,
        pageHeight: 800,
        textWidth: 60,
        fontSize: 12,
        position: 'top_center',
        margin: 25
      });
      expect(geoTop.textX).toBe((600 - 60) / 2);
      expect(geoTop.textY).toBe(800 - 25 - 12);
    });

    it('should generate full ribbon mask covering entire width', () => {
      const geo = calculatePageNumberGeometry({
        pageWidth: 600,
        pageHeight: 800,
        textWidth: 50,
        fontSize: 10,
        position: 'bottom_center',
        margin: 20,
        maskMode: 'full_ribbon'
      });
      expect(geo.maskRect).not.toBeNull();
      expect(geo.maskRect.x).toBe(0);
      expect(geo.maskRect.width).toBe(600);
      expect(geo.maskRect.y).toBe(0);
      expect(geo.maskRect.height).toBeGreaterThanOrEqual(34);
    });

    it('should generate localized box mask covering text area', () => {
      const geo = calculatePageNumberGeometry({
        pageWidth: 600,
        pageHeight: 800,
        textWidth: 80,
        fontSize: 10,
        position: 'bottom_center',
        margin: 20,
        maskMode: 'local_box'
      });
      expect(geo.maskRect).not.toBeNull();
      expect(geo.maskRect.width).toBeGreaterThanOrEqual(80);
      expect(geo.maskRect.x).toBeGreaterThan(0);
      expect(geo.maskRect.x + geo.maskRect.width).toBeLessThan(600);
    });

    it('should not generate mask rect when maskMode is none', () => {
      const geo = calculatePageNumberGeometry({
        pageWidth: 600,
        pageHeight: 800,
        textWidth: 50,
        fontSize: 10,
        position: 'bottom_center',
        margin: 20,
        maskMode: 'none'
      });
      expect(geo.maskRect).toBeNull();
    });
  });

  describe('Headless PDF Execution', () => {
    it('should apply page numbers to all pages with full ribbon mask', async () => {
      const testBytes = await createTestPdf(3);
      const result = await applyPageNumbers(testBytes, {
        format: 'Page {n} of {total}',
        position: 'bottom_center',
        fontSize: 10,
        textColor: '#334155',
        maskMode: 'full_ribbon',
        maskColor: '#ffffff'
      });

      expect(result.pageCount).toBe(3);
      expect(result.outBytes).toBeInstanceOf(Uint8Array);
      expect(result.outBytes.length).toBeGreaterThan(0);

      const parsed = await PDFDocument.load(result.outBytes);
      expect(parsed.getPageCount()).toBe(3);
    });

    it('should respect skipCover option by leaving cover untouched', async () => {
      const testBytes = await createTestPdf(4);
      const result = await applyPageNumbers(testBytes, {
        format: '{n} / {total}',
        skipCover: true,
        position: 'bottom_right',
        startNumber: 1,
        maskMode: 'local_box'
      });

      expect(result.pageCount).toBe(4);
      const parsed = await PDFDocument.load(result.outBytes);
      expect(parsed.getPageCount()).toBe(4);
    });

    it('should handle top positions and custom mask colors', async () => {
      const testBytes = await createTestPdf(2);
      const result = await applyPageNumbers(testBytes, {
        format: 'Doc Section - {n}',
        position: 'top_right',
        maskColor: '#fbf9f4', // cream parchment color
        textColor: '#1d4ed8'
      });

      expect(result.pageCount).toBe(2);
      expect(result.outBytes.length).toBeGreaterThan(0);
    });

    it('should handle maskColor: "auto" gracefully with fallback', async () => {
      const testBytes = await createTestPdf(2);
      const result = await applyPageNumbers(testBytes, {
        format: 'Page {n} of {total}',
        position: 'bottom_center',
        maskColor: 'auto'
      });

      expect(result.pageCount).toBe(2);
      const parsed = await PDFDocument.load(result.outBytes);
      expect(parsed.getPageCount()).toBe(2);
    });
  });

  describe('Pipeline Node Execution', () => {
    it('should execute executePageNumberNode on batch items with maskColor: "auto"', async () => {
      const pdfA = await createTestPdf(2);
      const pdfB = await createTestPdf(3);

      const items = [
        { name: 'contract_a.pdf', data: pdfA },
        { name: 'contract_b.pdf', data: pdfB }
      ];

      const processed = await executePageNumberNode(items, {
        format: 'Page {n} of {total}',
        position: 'bottom_center',
        skipCover: false,
        maskMode: 'full_ribbon',
        maskColor: 'auto'
      });

      expect(processed.length).toBe(2);
      expect(processed[0].name).toBe('contract_a_Numbered.pdf');
      expect(processed[1].name).toBe('contract_b_Numbered.pdf');

      const docA = await PDFDocument.load(processed[0].data);
      expect(docA.getPageCount()).toBe(2);

      const docB = await PDFDocument.load(processed[1].data);
      expect(docB.getPageCount()).toBe(3);
    });
  });
});
