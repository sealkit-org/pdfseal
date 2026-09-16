/**
 * 栅格化烧录（扫描件/图像命中页的回退路径）。
 *
 * 浏览器：pdf.js 高 DPI 渲染（最长边 ≤4000px）→ 画布上烧录遮罩 → JPEG 重编码。
 * Node 单测：注入 renderPage 假渲染器（返回固定 JPEG 字节），
 *            引擎侧逻辑（Contents/Resources/Annots 替换）与浏览器完全一致。
 */
import { userRectToCanvas } from './coords.js';

const MAX_EDGE_PX = 4000;

/**
 * @param {ArrayBuffer|Uint8Array} originalBytes 原始文件字节（栅格化基于原件渲染，
 *        不依赖已删改的 pdf-lib doc——所见即所得）
 * @param {number} pageIndex 0 基页码
 * @param {Array<{x,y,w,h}>} rects 用户空间脱敏矩形
 * @param {'black'|'white'|'stamp'} style
 * @param {{password?: string, dpi?: number, jpegQuality?: number, renderPage?: Function}} opts
 * @returns {Promise<{jpegBytes: Uint8Array, widthPt: number, heightPt: number}>}
 *          widthPt/heightPt = viewport(scale=1) 尺寸（旋转已烘焙）
 */
export async function rasterBurnPage(originalBytes, pageIndex, rects, style, opts = {}) {
  if (typeof opts.renderPage === 'function') {
    // 注入渲染器（单测/无 DOM 环境）
    return opts.renderPage(originalBytes, pageIndex, rects, style, opts);
  }
  return browserRender(originalBytes, pageIndex, rects, style, opts);
}

async function browserRender(originalBytes, pageIndex, rects, style, opts) {
  const pdfjs = await import('pdfjs-dist');
  const loadingTask = pdfjs.getDocument({
    data: originalBytes instanceof Uint8Array ? originalBytes.slice() : new Uint8Array(originalBytes).slice(),
    password: opts.password || undefined,
    cMapUrl: (typeof window !== 'undefined' ? window.location.origin : '') + '/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: (typeof window !== 'undefined' ? window.location.origin : '') + '/standard_fonts/'
  });
  const pdf = await loadingTask.promise;
  try {
    const page = await pdf.getPage(pageIndex + 1);
    const base = page.getViewport({ scale: 1 });
    let scale = (opts.dpi || 192) / 72;
    const longest = Math.max(base.width, base.height) * scale;
    if (longest > MAX_EDGE_PX) scale *= MAX_EDGE_PX / longest; // 大页内存上限

    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport, intent: 'display' }).promise;

    // 烧录遮罩（用户空间 → canvas 空间，viewport 已含 /Rotate）
    for (const r of rects) {
      const c = userRectToCanvas(r, viewport);
      if (style === 'stamp') {
        ctx.fillStyle = '#000000';
        ctx.fillRect(c.x, c.y, c.w, c.h);
        const size = Math.max(6, Math.min(c.h * 0.5, (c.w * 0.85) / 9));
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${size}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('[REDACTED]', c.x + c.w / 2, c.y + c.h / 2);
      } else {
        ctx.fillStyle = style === 'white' ? '#ffffff' : '#000000';
        ctx.fillRect(c.x, c.y, c.w, c.h);
      }
    }

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', opts.jpegQuality || 0.85));
    const jpegBytes = new Uint8Array(await blob.arrayBuffer());
    canvas.width = 0; // 立即释放
    canvas.height = 0;
    return { jpegBytes, widthPt: base.width, heightPt: base.height };
  } finally {
    try { await pdf.destroy(); } catch { /* ignore */ }
  }
}
