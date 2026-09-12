/**
 * 🦭 PDFSeal Image Processing Engine
 * 
 * High-performance client-side Canvas & TypedArray image filters for:
 * 1. Phone photo shadow removal via local background normalization (Box Blur / Illuminance estimation)
 * 2. Adaptive soft-alpha edge background transparency
 * 3. Ink contrast enhancement & recoloring (Original, Crisp Black, Business Blue, Official Stamp Red)
 */

/**
 * Fast 2-Pass Horizontal + Vertical 1D Box Blur on a 1D grayscale buffer (O(W*H))
 * Used to extract low-frequency illumination & shadow distribution map.
 * 
 * @param {Uint8Array} gray 
 * @param {number} width 
 * @param {number} height 
 * @param {number} radius 
 * @returns {Float32Array} Blurred background estimation
 */
export function computeBoxBlurGrayscale(gray, width, height, radius) {
  const size = width * height;
  const temp = new Float32Array(size);
  const out = new Float32Array(size);
  const r = Math.max(1, Math.floor(radius));

  // 1. Horizontal Pass
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    let sum = 0;
    let count = 0;

    // Initialize window
    for (let x = -r; x <= r; x++) {
      if (x >= 0 && x < width) {
        sum += gray[rowOffset + x];
        count++;
      }
    }
    temp[rowOffset] = sum / count;

    // Slide window across row
    for (let x = 1; x < width; x++) {
      const addX = x + r;
      const subX = x - r - 1;

      if (addX < width) {
        sum += gray[rowOffset + addX];
        count++;
      }
      if (subX >= 0) {
        sum -= gray[rowOffset + subX];
        count--;
      }
      temp[rowOffset + x] = count > 0 ? sum / count : gray[rowOffset + x];
    }
  }

  // 2. Vertical Pass
  for (let x = 0; x < width; x++) {
    let sum = 0;
    let count = 0;

    // Initialize window
    for (let y = -r; y <= r; y++) {
      if (y >= 0 && y < height) {
        sum += temp[y * width + x];
        count++;
      }
    }
    out[x] = sum / count;

    // Slide window down column
    for (let y = 1; y < height; y++) {
      const addY = y + r;
      const subY = y - r - 1;

      if (addY < height) {
        sum += temp[addY * width + x];
        count++;
      }
      if (subY >= 0) {
        sum -= temp[subY * width + x];
        count--;
      }
      out[y * width + x] = count > 0 ? sum / count : temp[y * width + x];
    }
  }

  return out;
}

/**
 * Ink Color Palette
 */
export const INK_COLORS = {
  original: null,
  black: { r: 15, g: 23, b: 42 },     // Slate-900 / Crisp Black Ink
  blue: { r: 30, g: 58, b: 138 },     // Blue-900 / Business Executive Navy
  red: { r: 220, g: 38, b: 38 }       // Red-600 / Official Stamp Crimson
};

/**
 * Pure algorithm function: Removes background, suppresses shadows, and recolors ink.
 * Directly operates on ImageData-like structures ({ width, height, data: Uint8ClampedArray }).
 * 
 * @param {Object} imageData - { width, height, data }
 * @param {Object} options
 * @param {number} [options.threshold=220] - Luminance threshold (150-250)
 * @param {number} [options.softness=25] - Soft alpha transition width
 * @param {'none'|'low'|'medium'|'high'} [options.shadowSuppression='medium']
 * @param {'original'|'black'|'blue'|'red'} [options.inkColor='original']
 * @param {boolean} [options.enhanceContrast=true]
 * @returns {Object} Processed ImageData-like object
 */
export function applyBackgroundFlattening(imageData, options = {}) {
  const { width, height, data } = imageData;
  const threshold = options.threshold ?? 220;
  const softness = options.softness ?? 25;
  const shadowMode = options.shadowSuppression ?? 'medium';
  const inkColorKey = options.inkColor ?? 'original';
  const enhanceContrast = options.enhanceContrast ?? true;

  const totalPixels = width * height;
  const gray = new Uint8Array(totalPixels);

  // 1. Compute perceptual grayscale luminance
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    gray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  // 2. Estimate background illumination map if shadow suppression is active
  let bgMap = null;
  if (shadowMode !== 'none') {
    let radiusRatio = 0.05; // medium default
    if (shadowMode === 'low') radiusRatio = 0.03;
    if (shadowMode === 'high') radiusRatio = 0.08;

    const blurRadius = Math.max(8, Math.round(Math.min(width, height) * radiusRatio));
    bgMap = computeBoxBlurGrayscale(gray, width, height, blurRadius);
  }

  const targetInk = INK_COLORS[inkColorKey] || null;
  const minThreshold = threshold - softness;

  // 3. Normalize pixels and compute alpha & color
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const origAlpha = data[idx + 3];
    if (origAlpha === 0) continue;

    const gVal = gray[i];
    let normalizedLuma = gVal;

    if (bgMap) {
      const localBg = Math.max(1, bgMap[i]);
      // Normalize: pixel relative to local paper background
      normalizedLuma = (gVal / localBg) * 255;
      if (normalizedLuma > 255) normalizedLuma = 255;
    }

    // Determine alpha transition
    let newAlpha = 0;
    if (normalizedLuma >= threshold) {
      // Paper background -> 100% transparent
      newAlpha = 0;
    } else if (normalizedLuma <= minThreshold) {
      // Core ink stroke -> full opacity
      newAlpha = origAlpha;
    } else {
      // Soft transition band
      const factor = (threshold - normalizedLuma) / softness;
      newAlpha = Math.round(origAlpha * factor);
    }

    data[idx + 3] = newAlpha;

    // If pixel is visible, apply ink enhancement or recoloring
    if (newAlpha > 0) {
      if (targetInk) {
        // Pure color mapping
        data[idx] = targetInk.r;
        data[idx + 1] = targetInk.g;
        data[idx + 2] = targetInk.b;
      } else if (enhanceContrast) {
        // Darken non-white strokes to boost faint phone pencil/pen lines
        const factor = Math.max(0.6, normalizedLuma / 200);
        data[idx] = Math.round(data[idx] * factor);
        data[idx + 1] = Math.round(data[idx + 1] * factor);
        data[idx + 2] = Math.round(data[idx + 2] * factor);
      }
    }
  }

  return imageData;
}

/**
 * Processes an Image (HTMLImageElement, HTMLCanvasElement, or dataURL) in browser
 * and produces a clean transparent PNG dataURL.
 * 
 * @param {HTMLImageElement|HTMLCanvasElement} imgElement 
 * @param {Object} options 
 * @returns {string} Processed transparent PNG dataURL
 */
export function processImageToTransparentDataUrl(imgElement, options = {}) {
  if (typeof document === 'undefined') return '';

  const canvas = document.createElement('canvas');
  const w = imgElement.naturalWidth || imgElement.width;
  const h = imgElement.naturalHeight || imgElement.height;

  // Scale down huge mobile camera photos (e.g. 4000x3000 -> max 1000px) for speed and PDF compactness
  const maxDim = 1000;
  let targetW = w;
  let targetH = h;
  if (w > maxDim || h > maxDim) {
    if (w > h) {
      targetW = maxDim;
      targetH = Math.round((h * maxDim) / w);
    } else {
      targetH = maxDim;
      targetW = Math.round((w * maxDim) / h);
    }
  }

  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imgElement, 0, 0, targetW, targetH);

  const imageData = ctx.getImageData(0, 0, targetW, targetH);
  applyBackgroundFlattening(imageData, options);
  ctx.putImageData(imageData, 0, 0);

  return canvas.toDataURL('image/png');
}

/**
 * Saved Stamps LocalStorage Manager
 */
const SAVED_STAMPS_KEY = 'pdfseal_saved_stamps_v1';
const MAX_SAVED_STAMPS = 8;

export function loadSavedStamps() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SAVED_STAMPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function saveStampToLibrary(stampItem) {
  if (typeof localStorage === 'undefined') return false;
  try {
    const stamps = loadSavedStamps();
    const newStamp = {
      id: `stamp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: stampItem.name || 'My Signature',
      dataUrl: stampItem.dataUrl,
      type: stampItem.type || 'drawn', // 'drawn' | 'typed' | 'upload'
      createdAt: Date.now()
    };

    // Keep most recent first, limit to MAX_SAVED_STAMPS
    const updated = [newStamp, ...stamps.filter(s => s.dataUrl !== stampItem.dataUrl)].slice(0, MAX_SAVED_STAMPS);
    localStorage.setItem(SAVED_STAMPS_KEY, JSON.stringify(updated));
    return newStamp;
  } catch (e) {
    return false;
  }
}

export function deleteSavedStamp(id) {
  if (typeof localStorage === 'undefined') return [];
  try {
    const stamps = loadSavedStamps().filter(s => s.id !== id);
    localStorage.setItem(SAVED_STAMPS_KEY, JSON.stringify(stamps));
    return stamps;
  } catch (e) {
    return [];
  }
}

/**
 * Calculates target page numbers for batch signature replication
 * 
 * @param {string} mode - 'all' | 'except_last' | 'even' | 'odd' | 'custom'
 * @param {number} totalPages - Total pages in document
 * @param {string} [customRange=''] - e.g. "1-3, 5, 8"
 * @param {number} [sourcePage=1] - Original page of signature
 * @returns {Array<number>} 1-indexed target page numbers (excluding source page by default or including)
 */
export function calculateBatchTargetPages(mode, totalPages, customRange = '', sourcePage = 1) {
  const pages = new Set();

  if (mode === 'all') {
    for (let p = 1; p <= totalPages; p++) pages.add(p);
  } else if (mode === 'except_last') {
    for (let p = 1; p < totalPages; p++) pages.add(p);
  } else if (mode === 'even') {
    for (let p = 2; p <= totalPages; p += 2) pages.add(p);
  } else if (mode === 'odd') {
    for (let p = 1; p <= totalPages; p += 2) pages.add(p);
  } else if (mode === 'custom' && customRange) {
    const parts = String(customRange).split(',').map(s => s.trim()).filter(Boolean);
    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-').map(s => parseInt(s.trim(), 10));
        if (!isNaN(startStr) && !isNaN(endStr)) {
          const start = Math.max(1, Math.min(startStr, endStr));
          const end = Math.min(totalPages, Math.max(startStr, endStr));
          for (let p = start; p <= end; p++) pages.add(p);
        }
      } else {
        const p = parseInt(part, 10);
        if (!isNaN(p) && p >= 1 && p <= totalPages) pages.add(p);
      }
    }
  }

  // Return sorted array
  return Array.from(pages).sort((a, b) => a - b);
}
