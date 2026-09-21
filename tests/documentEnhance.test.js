import { describe, it, expect } from 'vitest';
import { applyDocumentEnhancement } from '../src/utils/imageProcess.js';

describe('Document Scanner Enhancement Engine (applyDocumentEnhancement)', () => {
  it('should flatten non-uniform lighting shadow and whiten paper while preserving colored stamps (mode=color)', () => {
    // Create a 40x40 synthetic document with a dark shadow gradient across width:
    // Left (x=0..19): bright paper (240, 235, 230)
    // Right (x=20..39): shadowed paper (135, 130, 120)
    // Text at (5, 5) in bright zone: (30, 30, 30)
    // Text at (32, 5) in shadow zone: (20, 20, 20)
    // Red seal at (32, 32) in shadow zone: (160, 30, 30)
    const w = 40;
    const h = 40;
    const data = new Uint8ClampedArray(w * h * 4);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const isShadow = x >= 20;
        if (x === 5 && y === 5) {
          // Dark text on bright paper
          data[idx] = 30; data[idx + 1] = 30; data[idx + 2] = 30; data[idx + 3] = 255;
        } else if (x === 32 && y === 5) {
          // Dark text on shadowed paper
          data[idx] = 20; data[idx + 1] = 20; data[idx + 2] = 20; data[idx + 3] = 255;
        } else if (x === 32 && y === 32) {
          // Red stamp on shadowed paper
          data[idx] = 160; data[idx + 1] = 30; data[idx + 2] = 30; data[idx + 3] = 255;
        } else if (isShadow) {
          // Shadowed yellowish paper
          data[idx] = 135; data[idx + 1] = 130; data[idx + 2] = 120; data[idx + 3] = 255;
        } else {
          // Bright paper
          data[idx] = 240; data[idx + 1] = 235; data[idx + 2] = 230; data[idx + 3] = 255;
        }
      }
    }

    const imgData = { width: w, height: h, data };
    applyDocumentEnhancement(imgData, { mode: 'color', shadowSuppression: 'medium' });

    // 1. Both bright and shadowed paper should be normalized to pure white (255, 255, 255)
    // Check bright paper at (0, 0)
    const pBright = 0;
    expect(data[pBright]).toBe(255);
    expect(data[pBright + 1]).toBe(255);
    expect(data[pBright + 2]).toBe(255);

    // Check shadowed paper at (38, 0)
    const pShadow = (0 * w + 38) * 4;
    expect(data[pShadow]).toBeGreaterThanOrEqual(245);
    expect(data[pShadow + 1]).toBeGreaterThanOrEqual(245);
    expect(data[pShadow + 2]).toBeGreaterThanOrEqual(245);

    // 2. Text in both zones should remain dark and sharp
    const pTextBright = (5 * w + 5) * 4;
    expect(data[pTextBright]).toBeLessThan(60);

    const pTextShadow = (5 * w + 32) * 4;
    expect(data[pTextShadow]).toBeLessThan(60);

    // 3. Red stamp in shadow zone should retain strong red chroma
    const pStamp = (32 * w + 32) * 4;
    expect(data[pStamp]).toBeGreaterThan(120); // Strong Red
    expect(data[pStamp + 1]).toBeLessThan(80); // Low Green
    expect(data[pStamp + 2]).toBeLessThan(80); // Low Blue
  });

  it('should generate crisp binary black and white document in bw mode', () => {
    const w = 4;
    const h = 4;
    const data = new Uint8ClampedArray(w * h * 4);

    // Fill background with gray paper (160) and 1 black text pixel (25)
    for (let i = 0; i < w * h; i++) {
      const idx = i * 4;
      data[idx] = 160; data[idx + 1] = 160; data[idx + 2] = 160; data[idx + 3] = 255;
    }
    // Pixel 5 is text
    data[5 * 4] = 25; data[5 * 4 + 1] = 25; data[5 * 4 + 2] = 25;

    const imgData = { width: w, height: h, data };
    applyDocumentEnhancement(imgData, { mode: 'bw' });

    // In bw mode, every pixel is either 0 or 255
    for (let i = 0; i < w * h; i++) {
      const idx = i * 4;
      const val = data[idx];
      expect(val === 0 || val === 255).toBe(true);
      expect(data[idx + 1]).toBe(val);
      expect(data[idx + 2]).toBe(val);
    }

    // Pixel 5 must be pure black (0)
    expect(data[5 * 4]).toBe(0);
    // Background pixel must be pure white (255)
    expect(data[0]).toBe(255);
  });

  it('should produce pure gray shades in grayscale mode with pure white background', () => {
    const w = 4;
    const h = 4;
    const data = new Uint8ClampedArray(w * h * 4);

    // Color image with yellow paper and blue pen
    for (let i = 0; i < w * h; i++) {
      const idx = i * 4;
      data[idx] = 210; data[idx + 1] = 200; data[idx + 2] = 170; data[idx + 3] = 255;
    }
    // Blue ink at pixel 2
    data[2 * 4] = 30; data[2 * 4 + 1] = 50; data[2 * 4 + 2] = 180;

    const imgData = { width: w, height: h, data };
    applyDocumentEnhancement(imgData, { mode: 'grayscale' });

    // In grayscale mode, R === G === B for all pixels
    for (let i = 0; i < w * h; i++) {
      const idx = i * 4;
      expect(data[idx]).toBe(data[idx + 1]);
      expect(data[idx + 1]).toBe(data[idx + 2]);
    }

    // Paper background should be whitened to 255
    expect(data[0]).toBe(255);
  });

  it('should bypass modification when mode is original', () => {
    const data = new Uint8ClampedArray([100, 150, 200, 255]);
    const origData = new Uint8ClampedArray(data);
    const imgData = { width: 1, height: 1, data };

    applyDocumentEnhancement(imgData, { mode: 'original' });
    expect(Array.from(data)).toEqual(Array.from(origData));
  });

  it('should safely handle invalid or empty input gracefully', () => {
    expect(applyDocumentEnhancement(null)).toBeNull();
    expect(applyDocumentEnhancement({})).toEqual({});
  });

  it('should support executeImg2PdfNode with enhanceScanner: true in pipeline', async () => {
    const { executeImg2PdfNode } = await import('../src/utils/pipeline/nodes/img2pdfNode.js');
    const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const binary = atob(base64Png);
    const pngBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      pngBytes[i] = binary.charCodeAt(i);
    }

    const items = [
      { id: 'img_1', name: 'receipt.png', data: pngBytes, mimeType: 'image/png' }
    ];

    const result = await executeImg2PdfNode(items, {
      mergeIntoOne: true,
      pageSize: 'a4',
      enhanceScanner: true,
      enhanceFilter: 'color'
    });

    expect(result).toHaveLength(1);
    expect(result[0].mimeType).toBe('application/pdf');
    expect(result[0].data.length).toBeGreaterThan(0);
  });
});
