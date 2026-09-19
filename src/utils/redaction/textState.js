/**
 * Text State Machine: performs geometric simulation on parsed content stream operations,
 * calculating user-space bounding boxes for each show-text operator, as well as image / Form XObject placements.
 *
 * Managed state: CTM stack (q/Q), text matrix Tm, line leading TL, horizontal scaling Tz,
 * character rise Ts, and current font Tf.
 *
 * Text space -> User space: Trm = [Tfs*Tz, 0, 0, Tfs, 0, Ts] * Tm * CTM
 *   (PDF 32000-1:2008 section 9.4.2 Text space details; Tfs = font size)
 */
import { shouldRemoveOp } from './coords.js';

/** 3x2 matrix multiplication ([a, b, c, d, e, f] represents [[a, b, 0], [c, d, 0], [e, f, 1]]) */
export function mul(m1, m2) {
  // m1 x m2 (applies m2 transformation followed by m1)
  return [
    m1[0] * m2[0] + m1[1] * m2[2],
    m1[0] * m2[1] + m1[1] * m2[3],
    m1[2] * m2[0] + m1[3] * m2[2],
    m1[2] * m2[1] + m1[3] * m2[3],
    m1[4] * m2[0] + m1[5] * m2[2] + m2[4],
    m1[4] * m2[1] + m1[5] * m2[3] + m2[5]
  ];
}

const IDENT = [1, 0, 0, 1, 0, 0];

/**
 * @typedef {Object} ShowTextOp
 * @property {number} opIndex Index inside parseContentStream().ops
 * @property {{x:number,y:number,w:number,h:number}} bbox User-space bounding box
 * @property {boolean} invisible Tr 3 invisible text mode
 */

/**
 * @typedef {Object} XObjectPlacement
 * @property {number} opIndex Do operator index
 * @property {string} name Resource name (e.g. 'X1')
 * @property {{x:number,y:number,w:number,h:number}} bbox Placement rect in user space
 * @property {number[]} ctm CTM at the moment Do was called (initial matrix for nested Forms)
 */

/**
 * Simulates content stream operators.
 * @param {Array} ops Operator list produced by parseContentStream
 * @param {Object} opts
 * @param {import('./fontWidths.js').FontWidthResolver} opts.fonts Font width resolver
 * @returns {{showText: ShowTextOp[], xobjects: XObjectPlacement[], rects: Array<{opIndex,bbox}>}}
 *          rects are path rectangles produced by 're' (used for reference)
 */
export function simulateOps(ops, { fonts, initialCtm }) {
  const ctmStack = [];
  let ctm = initialCtm ? initialCtm.slice() : IDENT.slice();

  let inText = false;
  let tm = IDENT.slice(); // Text matrix
  let lineMatrix = IDENT.slice(); // Line start matrix
  let fontSize = 0;
  let fontKey = null;
  let leading = 0; // TL
  let tz = 1; // Tz horizontal scaling
  let ts = 0; // Ts text rise
  let tr = 0; // Tr text rendering mode

  /** @type {ShowTextOp[]} */
  const showText = [];
  /** @type {XObjectPlacement[]} */
  const xobjects = [];
  const rects = [];

  /** Measures string width in design space glyph units */
  const measureString = (s) => {
    if (!fontKey) return s.length * 500; // Fallback: 0.5em per character if font unknown
    let total = 0;
    for (let i = 0; i < s.length; i++) {
      const code = s.charCodeAt(i);
      const w = fonts.getWidth(fontKey, code);
      total += Number.isFinite(w) ? w : 500;
    }
    return total;
  };

  /** Computes user-space bbox for show-text operator (including full string width) */
  const emitShowText = (opIndex, widthUnits) => {
    // Text space transformation (font size / scaling / text rise)
    const tfs = fontSize;
    const tsm = [tfs * tz, 0, 0, tfs, 0, ts];
    const trm = mul(tsm, mul(tm, ctm));
    // Bbox: baseline direction widthUnits/1000 * fontSize, vertical height approx fontSize (ascent/descent simplified to [0, -0.25fs, 1.2fs])
    const w = (widthUnits / 1000) * tfs;
    const h = tfs * 1.25;
    const x0 = trm[4];
    const y0 = trm[5] - tfs * 0.25;
    // Expand along rotated baseline unit vectors
    const ux = trm[0] / tfs; // Unit baseline direction x
    const uy = trm[1] / tfs;
    const vx = trm[2] / tfs; // Unit vertical direction x
    const vy = trm[3] / tfs;
    const pts = [
      [x0, y0],
      [x0 + ux * w, y0 + uy * w],
      [x0 + ux * w + vx * h, y0 + uy * w + vy * h],
      [x0 + vx * h, y0 + vy * h]
    ];
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    showText.push({
      opIndex,
      bbox: {
        x: Math.min(...xs),
        y: Math.min(...ys),
        w: Math.max(...xs) - Math.min(...xs),
        h: Math.max(...ys) - Math.min(...ys)
      },
      invisible: tr === 3
    });
  };

  for (let idx = 0; idx < ops.length; idx++) {
    const { op, args } = ops[idx];
    switch (op) {
      case 'q': ctmStack.push(ctm.slice()); break;
      case 'Q': ctm = ctmStack.pop() || IDENT.slice(); break;
      case 'cm':
        if (args.length >= 6) {
          ctm = mul([args[0], args[1], args[2], args[3], args[4], args[5]], ctm);
        }
        break;
      case 'BT':
        inText = true;
        tm = IDENT.slice();
        lineMatrix = IDENT.slice();
        break;
      case 'ET':
        inText = false;
        break;
      case 'Tf':
        if (args.length >= 2 && args[0] && typeof args[0] === 'string') {
          fontKey = args[0];
          fontSize = Number(args[1]) || 0;
        }
        break;
      case 'TL': leading = Number(args[0]) || 0; break;
      case 'Tz': tz = (Number(args[0]) || 100) / 100; break;
      case 'Ts': ts = Number(args[0]) || 0; break;
      case 'Tr': tr = Number(args[0]) || 0; break;
      case 'Td':
        if (inText && args.length >= 2) {
          lineMatrix = mul([1, 0, 0, 1, Number(args[0]) || 0, Number(args[1]) || 0], lineMatrix);
          tm = lineMatrix.slice();
        }
        break;
      case 'TD':
        if (inText && args.length >= 2) {
          leading = -Number(args[1]) || 0;
          lineMatrix = mul([1, 0, 0, 1, Number(args[0]) || 0, Number(args[1]) || 0], lineMatrix);
          tm = lineMatrix.slice();
        }
        break;
      case 'Tm':
        if (inText && args.length >= 6) {
          tm = [args[0], args[1], args[2], args[3], args[4], args[5]].map(Number);
          lineMatrix = tm.slice();
        }
        break;
      case 'T*':
        if (inText) {
          lineMatrix = mul([1, 0, 0, 1, 0, -leading], lineMatrix);
          tm = lineMatrix.slice();
        }
        break;
      case 'Tj':
        if (inText && typeof args[0] === 'string') {
          emitShowText(idx, measureString(args[0]));
        }
        break;
      case "'":
        // Move to next line and show text
        if (inText) {
          lineMatrix = mul([1, 0, 0, 1, 0, -leading], lineMatrix);
          tm = lineMatrix.slice();
          if (typeof args[0] === 'string') emitShowText(idx, measureString(args[0]));
        }
        break;
      case '"':
        if (inText) {
          // Set spacing, move to next line, and show text
          lineMatrix = mul([1, 0, 0, 1, 0, -leading], lineMatrix);
          tm = lineMatrix.slice();
          if (typeof args[2] === 'string') emitShowText(idx, measureString(args[2]));
        }
        break;
      case 'TJ': {
        if (inText && Array.isArray(args[0])) {
          let units = 0;
          for (const el of args[0]) {
            if (typeof el === 'string') units += measureString(el);
            else if (typeof el === 'number') units += -Number(el); // Negative number indicates forward displacement in 1/1000 em
          }
          emitShowText(idx, units);
        }
        break;
      }
      case 're':
        if (args.length >= 4) {
          // Path rectangle (user space): x y w h transformed via CTM
          const [x, y, w, h] = args.map(Number);
          const p1 = applyCtm(ctm, x, y);
          const p2 = applyCtm(ctm, x + w, y + h);
          rects.push({
            opIndex: idx,
            bbox: {
              x: Math.min(p1[0], p2[0]),
              y: Math.min(p1[1], p2[1]),
              w: Math.abs(p2[0] - p1[0]),
              h: Math.abs(p2[1] - p1[1])
            }
          });
        }
        break;
      case 'Do': {
        if (args[0] && typeof args[0] === 'string') {
          // XObject placement: unit square [0,0,1,1] transformed via CTM
          const p0 = applyCtm(ctm, 0, 0);
          const p1 = applyCtm(ctm, 1, 1);
          xobjects.push({
            opIndex: idx,
            name: args[0],
            bbox: {
              x: Math.min(p0[0], p1[0]),
              y: Math.min(p0[1], p1[1]),
              w: Math.abs(p1[0] - p0[0]),
              h: Math.abs(p1[1] - p0[1])
            },
            ctm: ctm.slice()
          });
        }
        break;
      }
      default:
        break; // Other operators do not affect text matrix state
    }
  }

  return { showText, xobjects, rects };
}

function applyCtm(m, x, y) {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

/**
 * Filters show-text operators that must be removed based on redaction rects.
 * @param {ShowTextOp[]} showText
 * @param {Array<{x,y,w,h}>} redactRects
 * @returns {Set<number>} Set of opIndex integers to remove
 */
export function selectRemovedOps(showText, redactRects) {
  const removed = new Set();
  for (const st of showText) {
    if (st.bbox.w <= 0 && st.bbox.h <= 0) continue; // Skip zero-sized ops
    if (shouldRemoveOp(st.bbox, redactRects)) removed.add(st.opIndex);
  }
  return removed;
}
