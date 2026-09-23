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
  let threshold = options.threshold ?? 220;
  // If threshold is passed as a percentage (e.g. 50..100 from UI slider)
  if (threshold <= 100) {
    threshold = Math.round((threshold / 100) * 255);
  }
  const softness = options.softness ?? 25;
  const shadowMode = options.shadowSuppression ?? options.shadowRemoval ?? 'medium';
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
 * Processes an Image (HTMLImageElement, HTMLCanvasElement, or dataURL string) in browser
 * and produces a clean transparent PNG dataURL.
 * 
 * @param {HTMLImageElement|HTMLCanvasElement|string} imgElementOrUrl 
 * @param {Object} [options={}] 
 * @returns {Promise<string>} Processed transparent PNG dataURL
 */
export async function processImageToTransparentDataUrl(imgElementOrUrl, options = {}) {
  if (typeof document === 'undefined') return '';

  let imgElement = imgElementOrUrl;
  if (typeof imgElementOrUrl === 'string') {
    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imgElementOrUrl;
      });
      imgElement = img;
    } catch (e) {
      return '';
    }
  }

  if (!imgElement) return '';
  const w = imgElement.naturalWidth || imgElement.width;
  const h = imgElement.naturalHeight || imgElement.height;
  if (!w || !h) return '';

  const canvas = document.createElement('canvas');

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

  const shouldTrim = options.trim !== false;
  const outputCanvas = shouldTrim ? trimTransparentCanvas(canvas) : canvas;

  return outputCanvas.toDataURL('image/png');
}

/**
 * Trims transparent border pixels from a canvas, returning a tight-fitting canvas.
 * 
 * @param {HTMLCanvasElement} canvas 
 * @param {number} [padding=6] 
 * @returns {HTMLCanvasElement}
 */
export function trimTransparentCanvas(canvas, padding = 6) {
  if (typeof document === 'undefined' || !canvas || !canvas.width || !canvas.height) return canvas;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const w = canvas.width;
  const h = canvas.height;
  let imgData;
  try {
    imgData = ctx.getImageData(0, 0, w, h);
  } catch (e) {
    return canvas;
  }
  const data = imgData.data;

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const alpha = data[(y * w + x) * 4 + 3];
      if (alpha > 15) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // If completely transparent or nothing detected, return original canvas
  if (maxX < minX || maxY < minY) {
    return canvas;
  }

  const cropX = Math.max(0, minX - padding);
  const cropY = Math.max(0, minY - padding);
  const cropW = Math.min(w - cropX, (maxX - minX + 1) + padding * 2);
  const cropH = Math.min(h - cropY, (maxY - minY + 1) + padding * 2);

  const trimmedCanvas = document.createElement('canvas');
  trimmedCanvas.width = cropW;
  trimmedCanvas.height = cropH;
  const tCtx = trimmedCanvas.getContext('2d');
  if (!tCtx) return canvas;

  tCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  return trimmedCanvas;
}

/**
 * Linear-Time O(W*H) Guided Filter for Edge-Preserving Illumination Estimation
 * 
 * @param {Float32Array} guideAndSrc 
 * @param {number} width 
 * @param {number} height 
 * @param {number} radius 
 * @param {number} [eps=150]
 * @returns {Float32Array}
 */
export function computeGuidedIlluminationMap(guideAndSrc, width, height, radius, eps = 150) {
  const total = width * height;
  const mean_p = computeBoxBlurGrayscale(guideAndSrc, width, height, radius);

  const guideSq = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    guideSq[i] = guideAndSrc[i] * guideAndSrc[i];
  }
  const mean_II = computeBoxBlurGrayscale(guideSq, width, height, radius);

  const a = new Float32Array(total);
  const b = new Float32Array(total);

  for (let i = 0; i < total; i++) {
    const mean_i = mean_p[i];
    const variance = Math.max(0, mean_II[i] - mean_i * mean_i);
    const aVal = variance / (variance + eps);
    a[i] = aVal;
    b[i] = (1 - aVal) * mean_i;
  }

  const mean_a = computeBoxBlurGrayscale(a, width, height, radius);
  const mean_b = computeBoxBlurGrayscale(b, width, height, radius);

  const out = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    out[i] = Math.max(1, mean_a[i] * guideAndSrc[i] + mean_b[i]);
  }

  return out;
}

/**
 * Fast Anisotropic Horizontal & Vertical Line Detector (O(W*H))
 * Detects continuous thin lines (e.g. 1px invoice grid lines) to protect from whitening erosion.
 */
export function detectThinGridLines(gray, width, height, strokeDelta = 18) {
  const total = width * height;
  const isLine = new Uint8Array(total);
  if (width < 6 || height < 6) return isLine;
  const minRunLength = 6;

  // Horizontal runs
  for (let y = 1; y < height - 1; y++) {
    const rowOffset = y * width;
    let runStart = -1;

    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x;
      const val = gray[idx];
      const topVal = gray[(y - 1) * width + x];
      const botVal = gray[(y + 1) * width + x];
      const isDarker = (topVal - val > strokeDelta) && (botVal - val > strokeDelta);

      if (isDarker) {
        if (runStart === -1) runStart = x;
      } else {
        if (runStart !== -1 && (x - runStart) >= minRunLength) {
          for (let rx = runStart; rx < x; rx++) isLine[rowOffset + rx] = 1;
        }
        runStart = -1;
      }
    }
    if (runStart !== -1 && (width - runStart) >= minRunLength) {
      for (let rx = runStart; rx < width; rx++) isLine[rowOffset + rx] = 1;
    }
  }

  // Vertical runs
  for (let x = 1; x < width - 1; x++) {
    let runStart = -1;

    for (let y = 0; y < height; y++) {
      const idx = y * width + x;
      const val = gray[idx];
      const leftVal = gray[y * width + (x - 1)];
      const rightVal = gray[y * width + (x + 1)];
      const isDarker = (leftVal - val > strokeDelta) && (rightVal - val > strokeDelta);

      if (isDarker) {
        if (runStart === -1) runStart = y;
      } else {
        if (runStart !== -1 && (y - runStart) >= minRunLength) {
          for (let ry = runStart; ry < y; ry++) isLine[ry * width + x] = 1;
        }
        runStart = -1;
      }
    }
    if (runStart !== -1 && (height - runStart) >= minRunLength) {
      for (let ry = runStart; ry < height; ry++) isLine[ry * width + x] = 1;
    }
  }

  return isLine;
}

/**
 * Pure algorithm function for document photo enhancement:
 * Flattens non-uniform shadows, whitens paper background, and sharpens text clarity.
 * (CamScanner-style 100% in-browser illumination normalization)
 * 
 * @param {Object} imageData - { width, height, data: Uint8ClampedArray }
 * @param {Object} [options={}]
 * @param {'color'|'bw'|'grayscale'|'original'} [options.mode='color']
 * @param {'none'|'low'|'medium'|'high'} [options.shadowSuppression='medium']
 * @param {number} [options.whitenStrength=0.92] - Paper whitening sensitivity (0.7 ~ 1.0)
 * @returns {Object} Processed imageData
 */
export function applyDocumentEnhancement(imageData, options = {}) {
  if (!imageData || !imageData.data) return imageData;
  const { width, height, data } = imageData;
  const mode = options.mode ?? 'color';
  if (mode === 'original') return imageData;

  const shadowMode = options.shadowSuppression ?? 'medium';
  const whitenStrength = options.whitenStrength ?? 0.92;
  const totalPixels = width * height;
  const gray = new Float32Array(totalPixels);

  // 1. Compute perceptual luminance
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }

  // 2. Estimate background illumination map (guided edge-preserving filter)
  let bgMap = null;
  let gridLineMap = null;

  if (shadowMode !== 'none') {
    let radiusRatio = 0.08; // medium default
    if (shadowMode === 'low') radiusRatio = 0.04;
    if (shadowMode === 'high') radiusRatio = 0.14;

    const minDim = Math.min(width, height);
    const maxAllowedRadius = Math.max(1, Math.floor(minDim / 3));
    const blurRadius = Math.max(1, Math.min(maxAllowedRadius, Math.round(minDim * radiusRatio)));

    // Tier 1: Text-Stroke Decoupling to avoid halo artifacts around text
    const coarseBg = computeBoxBlurGrayscale(gray, width, height, blurRadius);
    const guideBuffer = new Float32Array(totalPixels);
    const inkDelta = 18;
    for (let i = 0; i < totalPixels; i++) {
      if (gray[i] < coarseBg[i] - inkDelta) {
        guideBuffer[i] = coarseBg[i];
      } else {
        guideBuffer[i] = gray[i];
      }
    }

    // Tier 2: Guided Illumination Filter for sharp boundary tracking
    bgMap = computeGuidedIlluminationMap(guideBuffer, width, height, blurRadius, 150);

    // Tier 3: Thin 1px grid line detection
    gridLineMap = detectThinGridLines(gray, width, height, 16);
  }

  const basePaperThreshold = Math.round(255 - (whitenStrength * 55)); // ~204 by default
  const bwThresholdRatio = 0.77 + ((1.0 - whitenStrength) * 0.1); // ~0.78 by default
  const tSafe = 75;

  // 3. Pixel-wise illumination normalization & tone mapping
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const gVal = gray[i];
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];

    const localBg = bgMap ? Math.max(15, bgMap[i]) : 240;

    // Noise-Regulated Soft Division in deep shadow to prevent shot noise amplification
    const lambdaL = localBg < tSafe ? Math.pow((tSafe - localBg) / tSafe, 2) : 0;
    const effectiveBg = localBg + lambdaL * 18.0 + 1.0;
    const normLuma = Math.min(255, Math.round(((gVal + 1.0) / effectiveBg) * 255));

    const isThinGrid = gridLineMap && gridLineMap[i] === 1;
    const activePaperThreshold = isThinGrid ? Math.min(250, basePaperThreshold + 32) : basePaperThreshold;

    if (mode === 'bw') {
      // High-contrast clean black & white binary photocopy style
      const isInk = isThinGrid || ((gVal < localBg * bwThresholdRatio) && (normLuma < 195));
      const val = isInk ? 0 : 255;
      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
    } else if (mode === 'grayscale') {
      // Clean normalized grayscale with whitened paper
      let val = normLuma;
      if (normLuma >= activePaperThreshold && !isThinGrid) {
        val = 255;
      } else if (normLuma >= 175 && !isThinGrid) {
        const factor = (normLuma - 175) / (activePaperThreshold - 175);
        val = Math.min(255, Math.round(175 + factor * (255 - 175)));
      } else if (normLuma < 130 || isThinGrid) {
        // Deepen dark text strokes and preserve thin grid lines
        val = isThinGrid ? Math.round(normLuma * 0.75) : Math.max(0, Math.round(normLuma * 0.85 - 10));
      }
      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
    } else {
      // mode === 'color': Preserve colored seals, stamps and colored ink while whitening paper
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const chromaDelta = maxC - minC;
      const isWarmPaper = (r >= g && g >= b) && (chromaDelta < 22) && (normLuma >= 175);
      const isChromatic = (chromaDelta > 24) && !isWarmPaper;

      if (!isChromatic && (normLuma >= activePaperThreshold || (normLuma >= 238 && !isThinGrid && chromaDelta < 18 && gVal >= 150))) {
        // Paper background: Force to clean 255 pure white
        data[idx] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
      } else if (!isChromatic && normLuma >= 180 && !isThinGrid) {
        // Smooth transition zone to pure white paper
        const factor = (normLuma - 180) / (activePaperThreshold - 180);
        const gain = 1.0 + factor * ((255 / Math.max(1, gVal)) - 1.0);
        data[idx] = Math.min(255, Math.round(r * gain));
        data[idx + 1] = Math.min(255, Math.round(g * gain));
        data[idx + 2] = Math.min(255, Math.round(b * gain));
      } else if (isChromatic) {
        // Uniform Hue-Locked Gamut-Preserving Scaling
        const gain = Math.min(2.2, Math.max(1.0, Math.pow(255 / effectiveBg, 0.85)));
        let rCand = r * gain;
        let gCand = g * gain;
        let bCand = b * gain;

        const maxCand = Math.max(rCand, gCand, bCand);
        if (maxCand > 255) {
          const compress = 255 / maxCand;
          rCand *= compress;
          gCand *= compress;
          bCand *= compress;
        }

        data[idx] = Math.round(rCand);
        data[idx + 1] = Math.round(gCand);
        data[idx + 2] = Math.round(bCand);
      } else {
        // Dark text strokes, ink strokes, or thin grid lines
        if (normLuma < 130 || isThinGrid) {
          const darken = isThinGrid ? 0.75 : Math.max(0.65, normLuma / 140);
          data[idx] = Math.round(r * darken);
          data[idx + 1] = Math.round(g * darken);
          data[idx + 2] = Math.round(b * darken);
        } else {
          const gain = Math.min(1.4, 255 / effectiveBg);
          data[idx] = Math.min(255, Math.round(r * gain));
          data[idx + 1] = Math.min(255, Math.round(g * gain));
          data[idx + 2] = Math.min(255, Math.round(b * gain));
        }
      }
    }

    // Ensure fully opaque document sheet
    data[idx + 3] = 255;
  }

  return imageData;
}

/**
 * Creates an enhanced document Canvas from an Image or Canvas element
 * 
 * @param {HTMLImageElement|HTMLCanvasElement} imgElement 
 * @param {Object} [options={}] 
 * @param {number} [options.maxDimension=2400]
 * @returns {HTMLCanvasElement|null}
 */
export function enhanceDocumentCanvas(imgElement, options = {}) {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  const w = imgElement.naturalWidth || imgElement.width;
  const h = imgElement.naturalHeight || imgElement.height;
  if (!w || !h) return null;

  const maxDim = options.maxDimension || 2400;
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
  applyDocumentEnhancement(imageData, options);
  ctx.putImageData(imageData, 0, 0);

  return canvas;
}

/**
 * Generates an enhanced thumbnail DataURL for instant card preview
 * 
 * @param {HTMLImageElement|HTMLCanvasElement} imgElement 
 * @param {Object} [options={}] 
 * @returns {string} JPEG DataURL
 */
export function generateEnhancedThumbnail(imgElement, options = {}) {
  const canvas = enhanceDocumentCanvas(imgElement, {
    ...options,
    maxDimension: 360
  });
  return canvas ? canvas.toDataURL('image/jpeg', 0.85) : '';
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
