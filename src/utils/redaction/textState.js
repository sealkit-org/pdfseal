/**
 * 文本状态机：对解析后的内容流操作做几何推演，
 * 输出每个 show-text 操作符在用户空间的 bbox，以及图像/Form 的放置信息。
 *
 * 状态：CTM 栈（q/Q）、文本矩阵 Tm、行距 TL、水平缩放 Tz、字距 Ts、当前字体 Tf。
 *
 * 文本空间 → 用户空间：Trm = Tfs×Tz  0  0  Tfs  0  Ts  ×  Tm × CTM
 *   （PDF 32000-1:2008 9.4.2 Text space details；Tfs = 字号）
 */
import { shouldRemoveOp } from './coords.js';

/** 3×2 矩阵乘法（[a b c d e f] 表示 [[a b 0][c d 0][e f 1]]） */
export function mul(m1, m2) {
  // m1 × m2（先应用 m2 再 m1）
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
 * @property {number} opIndex 在 parseContentStream().ops 中的下标
 * @property {{x:number,y:number,w:number,h:number}} bbox 用户空间
 * @property {boolean} invisible Tr 3 隐形文字
 */

/**
 * @typedef {Object} XObjectPlacement
 * @property {number} opIndex Do 操作符下标
 * @property {string} name 资源名（如 'X1'）
 * @property {{x:number,y:number,w:number,h:number}} bbox 放置四边形（用户空间）
 * @property {number[]} ctm Do 时刻的 CTM（Form 递归的初始矩阵）
 */

/**
 * 模拟内容流。
 * @param {Array} ops parseContentStream 输出的操作符列表
 * @param {Object} opts
 * @param {import('./fontWidths.js').FontWidthResolver} opts.fonts 字体宽度解析器
 * @returns {{showText: ShowTextOp[], xobjects: XObjectPlacement[], rects: Array<{opIndex,bbox}>}}
 *          rects 为路径绘制（re）产生的矩形（供 stamp 定位参考，v1 未用）
 */
export function simulateOps(ops, { fonts, initialCtm }) {
  const ctmStack = [];
  let ctm = initialCtm ? initialCtm.slice() : IDENT.slice();

  let inText = false;
  let tm = IDENT.slice(); // 文本矩阵
  let lineMatrix = IDENT.slice(); // 行起点矩阵
  let fontSize = 0;
  let fontKey = null;
  let leading = 0; // TL
  let tz = 1; // Tz 水平缩放
  let ts = 0; // Ts 字距 rise
  let tr = 0; // Tr 渲染模式

  /** @type {ShowTextOp[]} */
  const showText = [];
  /** @type {XObjectPlacement[]} */
  const xobjects = [];
  const rects = [];

  /** Tj/TJ 的字符串展宽（设计空间 units） */
  const measureString = (s) => {
    if (!fontKey) return s.length * 500; // 无字体：0.5em 兜底
    let total = 0;
    for (let i = 0; i < s.length; i++) {
      const code = s.charCodeAt(i);
      const w = fonts.getWidth(fontKey, code);
      total += Number.isFinite(w) ? w : 500;
    }
    return total;
  };

  /** 计算 show-text 的用户空间 bbox（含全部字符串宽度） */
  const emitShowText = (opIndex, widthUnits) => {
    // 文本空间变换（含字号/缩放/字距）
    const tfs = fontSize;
    const tsm = [tfs * tz, 0, 0, tfs, 0, ts];
    const trm = mul(tsm, mul(tm, ctm));
    // bbox：基线方向 widthUnits/1000 × 字号，垂直方向近似字号（ ascent/descent 简化为 [0, -0.25fs, 1.2fs]）
    const w = (widthUnits / 1000) * tfs;
    const h = tfs * 1.25;
    const x0 = trm[4];
    const y0 = trm[5] - tfs * 0.25;
    // 旋转时用基线向量展开
    const ux = trm[0] / tfs; // 单位基线方向 x
    const uy = trm[1] / tfs;
    const vx = trm[2] / tfs; // 单位垂直方向 x
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
        // 换行 + show
        if (inText) {
          lineMatrix = mul([1, 0, 0, 1, 0, -leading], lineMatrix);
          tm = lineMatrix.slice();
          if (typeof args[0] === 'string') emitShowText(idx, measureString(args[0]));
        }
        break;
      case '"':
        if (inText) {
          // aw ac ' → 设置字距 + 换行 + show
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
            else if (typeof el === 'number') units += -Number(el); // 平移量单位是千分之em的负数
          }
          emitShowText(idx, units);
        }
        break;
      }
      case 're':
        if (args.length >= 4) {
          // 当前路径矩形（用户空间）：x y w h 经 CTM
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
          // XObject 放置：单位方形 [0,0,1,1] 经 CTM
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
        break; // 其余操作符不影响状态
    }
  }

  return { showText, xobjects, rects };
}

function applyCtm(m, x, y) {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

/**
 * 根据脱敏矩形过滤出需要删除的 show-text 操作符。
 * @param {ShowTextOp[]} showText
 * @param {Array<{x,y,w,h}>} redactRects
 * @returns {Set<number>} 需要删除的 opIndex 集合
 */
export function selectRemovedOps(showText, redactRects) {
  const removed = new Set();
  for (const st of showText) {
    if (st.bbox.w <= 0 && st.bbox.h <= 0) continue; // 空操作
    if (shouldRemoveOp(st.bbox, redactRects)) removed.add(st.opIndex);
  }
  return removed;
}
