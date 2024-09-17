/**
 * Redaction 坐标系转换（唯一转换源）
 *
 * 三个空间：
 *  - 用户空间（PDF 默认坐标，y 向上）：引擎 redactPdf 的 rect 全部使用该空间
 *  - canvas 显示空间（y 向下，含 /Rotate）：RedactTool 拖框的 rect
 *  - pdf.js textItem.transform：用户空间矩阵（不含 viewport）
 *
 * 转换一律经由 pdf.js viewport（已处理 /Rotate 与 CropBox），
 * 任何组件不得自行拼偏移，避免多处转换口径漂移。
 */

/**
 * pdf.js 文本项 → 用户空间 bbox（y 向上）。
 * textItem.transform = [a,b,c,d,e,f]（Trm，含字号与 CTM），e,f = 基线起点；
 * width/height 已是用户空间尺寸（width 沿基线方向、height 沿字体竖直方向），
 * 不得再乘 transform（曾因此把 bbox 放大了字号倍数）。
 * 盒体从基线起点沿字体向上方向展开 height（pdf.js 口径：不含下降部）。
 * @param {{str:string,transform:number[],width:number,height:number}} item
 * @returns {{x:number,y:number,w:number,h:number}} 用户空间轴对齐包围盒
 */
export function textItemToUserBBox(item) {
  const t = item.transform;
  const w = item.width || 0;
  const h = item.height || 0;
  // 基线方向 / 字体竖直方向的单位向量（去掉字号缩放）
  const bl = Math.hypot(t[0], t[1]) || 1;
  const vd = Math.hypot(t[2], t[3]) || 1;
  const ux = t[0] / bl, uy = t[1] / bl;
  const vx = t[2] / vd, vy = t[3] / vd;
  const x0 = t[4], y0 = t[5];
  const pts = [
    [x0, y0],
    [x0 + ux * w, y0 + uy * w],
    [x0 + ux * w + vx * h, y0 + uy * w + vy * h],
    [x0 + vx * h, y0 + vy * h]
  ];
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/**
 * 用户空间 rect → canvas 显示 rect（用于高亮已有标记）。
 * @param {{x:number,y:number,w:number,h:number}} rect
 * @param {import('pdfjs-dist').PageViewport} viewport
 */
export function userRectToCanvas(rect, viewport) {
  // viewport.convertToViewportRectangle 输入 [x1,y1,x2,y2]（用户空间）
  const [x1, y1, x2, y2] = viewport.convertToViewportRectangle([
    rect.x, rect.y, rect.x + rect.w, rect.y + rect.h
  ]);
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    w: Math.abs(x2 - x1),
    h: Math.abs(y2 - y1)
  };
}

/**
 * canvas 显示 rect → 用户空间 rect（拖框结果交给引擎烧录）。
 * @param {{x:number,y:number,w:number,h:number}} rect
 * @param {import('pdfjs-dist').PageViewport} viewport
 */
export function canvasRectToUser(rect, viewport) {
  // pdf.js viewport 只提供 convertToPdfPoint（无 Rectangle 版本），两角转换后归一化
  const [x1, y1] = viewport.convertToPdfPoint(rect.x, rect.y);
  const [x2, y2] = viewport.convertToPdfPoint(rect.x + rect.w, rect.y + rect.h);
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    w: Math.abs(x2 - x1),
    h: Math.abs(y2 - y1)
  };
}

/**
 * 两个轴对齐矩形是否相交（含边界接触）。
 * @param {{x:number,y:number,w:number,h:number}} a
 * @param {{x:number,y:number,w:number,h:number}} b
 */
export function rectsIntersect(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/**
 * bbox 中心点是否落在 rect 内。
 */
export function centerInside(bbox, rect) {
  const cx = bbox.x + bbox.w / 2;
  const cy = bbox.y + bbox.h / 2;
  return cx >= rect.x && cx <= rect.x + rect.w && cy >= rect.y && cy <= rect.y + rect.h;
}

/**
 * 删除判定：bbox 与任一脱敏 rect 的重叠面积占比 ≥ 阈值，或中心点在 rect 内。
 * @param {object} bbox 文本算子 bbox（用户空间）
 * @param {Array<{x,y,w,h}>} rects
 * @param {number} [threshold=0.5]
 */
export function shouldRemoveOp(bbox, rects, threshold = 0.5) {
  const area = bbox.w * bbox.h;
  if (area <= 0) {
    // 零面积（空串/纯空格）也按中心点规则处理
    return rects.some((r) => centerInside(bbox, r));
  }
  for (const r of rects) {
    if (centerInside(bbox, r)) return true;
    const ix = Math.max(0, Math.min(bbox.x + bbox.w, r.x + r.w) - Math.max(bbox.x, r.x));
    const iy = Math.max(0, Math.min(bbox.y + bbox.h, r.y + r.h) - Math.max(bbox.y, r.y));
    if ((ix * iy) / area >= threshold) return true;
  }
  return false;
}
