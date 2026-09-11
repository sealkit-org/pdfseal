import { describe, it, expect, beforeEach } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { 
  applyBackgroundFlattening, 
  computeBoxBlurGrayscale,
  calculateBatchTargetPages,
  loadSavedStamps,
  saveStampToLibrary,
  deleteSavedStamp
} from '../src/utils/imageProcess.js';

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

describe('Image Processing & White Background Removal Engine', () => {
  it('should turn white background transparent while keeping dark ink opaque', () => {
    // 2x1 image: pixel 0 is white (255, 255, 255, 255), pixel 1 is black ink (20, 20, 20, 255)
    const data = new Uint8ClampedArray([
      255, 255, 255, 255,
      20, 20, 20, 255
    ]);
    const imgData = { width: 2, height: 1, data };

    applyBackgroundFlattening(imgData, { threshold: 220, softness: 20, shadowSuppression: 'none' });

    // Pixel 0 (white) should be transparent (alpha = 0)
    expect(data[3]).toBe(0);

    // Pixel 1 (ink) should remain fully opaque (alpha = 255)
    expect(data[7]).toBe(255);
  });

  it('should eliminate paper shadow gradient using local background flattening', () => {
    // 4x1 image simulating a shadow gradient:
    // Pixel 0: bright white paper (240)
    // Pixel 1: bright ink stroke (30)
    // Pixel 2: shadow area paper (140) -> without flattening this would fail global threshold!
    // Pixel 3: shadow area ink stroke (20)
    const data = new Uint8ClampedArray([
      240, 240, 240, 255,
      30, 30, 30, 255,
      140, 140, 140, 255,
      20, 20, 20, 255
    ]);
    const imgData = { width: 4, height: 1, data };

    applyBackgroundFlattening(imgData, { 
      threshold: 220, 
      softness: 20, 
      shadowSuppression: 'medium' 
    });

    // In shadow area, paper (pixel 2) should be transparent despite raw brightness being 140
    expect(data[11]).toBe(0);

    // Both ink strokes (pixel 1 & pixel 3) should remain opaque
    expect(data[7]).toBeGreaterThan(200);
    expect(data[15]).toBeGreaterThan(200);
  });

  it('should recolor ink to crisp business blue when requested', () => {
    const data = new Uint8ClampedArray([
      40, 40, 40, 255 // dark stroke
    ]);
    const imgData = { width: 1, height: 1, data };

    applyBackgroundFlattening(imgData, {
      threshold: 220,
      inkColor: 'blue',
      shadowSuppression: 'none'
    });

    // Ink RGB should match business navy blue (30, 58, 138)
    expect(data[0]).toBe(30);
    expect(data[1]).toBe(58);
    expect(data[2]).toBe(138);
    expect(data[3]).toBe(255);
  });

  it('should compute box blur on 1D grayscale buffer correctly', () => {
    const gray = new Uint8Array([10, 20, 30, 40, 50]);
    const blurred = computeBoxBlurGrayscale(gray, 5, 1, 1);
    expect(blurred.length).toBe(5);
    expect(blurred[2]).toBeCloseTo(30, 0); // Center pixel average of 20, 30, 40
  });
});

describe('Multi-Page Batch Target Page Calculator', () => {
  const totalPages = 10;

  it('should calculate all pages correctly', () => {
    const pages = calculateBatchTargetPages('all', totalPages);
    expect(pages).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('should calculate all except last page (contract initials standard)', () => {
    const pages = calculateBatchTargetPages('except_last', totalPages);
    expect(pages).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(pages.includes(10)).toBe(false);
  });

  it('should calculate even pages correctly', () => {
    const pages = calculateBatchTargetPages('even', totalPages);
    expect(pages).toEqual([2, 4, 6, 8, 10]);
  });

  it('should calculate odd pages correctly', () => {
    const pages = calculateBatchTargetPages('odd', totalPages);
    expect(pages).toEqual([1, 3, 5, 7, 9]);
  });

  it('should parse custom comma and hyphen ranges correctly', () => {
    const pages = calculateBatchTargetPages('custom', totalPages, '1-3, 5, 8-9');
    expect(pages).toEqual([1, 2, 3, 5, 8, 9]);
  });
});

describe('Local Saved Stamps Library Manager', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('should save, load, and delete stamps in localStorage', () => {
    // Polyfill simple localStorage for test environment if not present
    if (typeof localStorage === 'undefined') {
      const store = {};
      globalThis.localStorage = {
        getItem: (k) => store[k] || null,
        setItem: (k, v) => { store[k] = String(v); },
        removeItem: (k) => { delete store[k]; },
        clear: () => { Object.keys(store).forEach(k => delete store[k]); }
      };
    }

    const saved = saveStampToLibrary({
      name: 'Executive Initial',
      dataUrl: 'data:image/png;base64,sample123',
      type: 'drawn'
    });
    expect(saved).toBeTruthy();
    expect(saved.name).toBe('Executive Initial');

    const list = loadSavedStamps();
    expect(list.length).toBe(1);
    expect(list[0].dataUrl).toBe('data:image/png;base64,sample123');

    const remaining = deleteSavedStamp(saved.id);
    expect(remaining.length).toBe(0);
    expect(loadSavedStamps().length).toBe(0);
  });
});
