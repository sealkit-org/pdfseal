/**
 * Redaction coordinate system conversions (single source of truth).
 *
 * Three coordinate spaces:
 *  - User space (default PDF coordinates, y pointing upwards): rects for redactPdf engine.
 *  - Canvas display space (y pointing downwards, includes /Rotate): rects drawn in RedactTool.
 *  - pdf.js textItem.transform: user-space matrix (without viewport scale/rotation).
 *
 * All conversions must go through pdf.js viewport (which already handles /Rotate and CropBox)
 * to avoid coordinate drift across components.
 */

/**
 * Converts pdf.js textItem into a user-space axis-aligned bounding box (y pointing upwards).
 * textItem.transform = [a, b, c, d, e, f] (Trm, including font size and CTM), with e, f as baseline origin.
 * width / height are already user-space dimensions (width along baseline, height along font vertical vector),
 * and must not be multiplied by transform scale again.
 * @param {{str:string,transform:number[],width:number,height:number}} item
 * @returns {{x:number,y:number,w:number,h:number}} User-space axis-aligned bounding box
 */
export function textItemToUserBBox(item) {
  const t = item.transform;
  const w = item.width || 0;
  const h = item.height || 0;
  // Unit vectors along baseline and font vertical direction (normalized font scale)
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
 * Converts user-space rect to canvas display rect (used to highlight existing marks).
 * @param {{x:number,y:number,w:number,h:number}} rect
 * @param {import('pdfjs-dist').PageViewport} viewport
 */
export function userRectToCanvas(rect, viewport) {
  // viewport.convertToViewportRectangle takes [x1, y1, x2, y2] in user space
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
 * Converts canvas display rect to user-space rect (sent to engine for redaction burn-in).
 * @param {{x:number,y:number,w:number,h:number}} rect
 * @param {import('pdfjs-dist').PageViewport} viewport
 */
export function canvasRectToUser(rect, viewport) {
  // pdf.js viewport provides convertToPdfPoint for single points; normalize after conversion
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
 * Checks whether two axis-aligned rectangles intersect (inclusive of touching boundaries).
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
 * Checks whether the center point of bbox falls inside rect.
 */
export function centerInside(bbox, rect) {
  const cx = bbox.x + bbox.w / 2;
  const cy = bbox.y + bbox.h / 2;
  return cx >= rect.x && cx <= rect.x + rect.w && cy >= rect.y && cy <= rect.y + rect.h;
}

/**
 * Determines whether a text operator should be removed:
 * returns true if the bbox overlap area ratio with any redaction rect exceeds threshold,
 * or if its center point falls inside the rect.
 * @param {object} bbox Text operator bbox (user space)
 * @param {Array<{x,y,w,h}>} rects
 * @param {number} [threshold=0.5]
 */
export function shouldRemoveOp(bbox, rects, threshold = 0.5) {
  const area = bbox.w * bbox.h;
  if (area <= 0) {
    // Treat zero-area text (empty string or space) using center-point rule
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
