/**
 * PDF 内容流词法解析器（Redaction 核心）。
 *
 * 输出每个操作符的字节范围（start/end），供矢量重写时按切片重建流；
 * 模拟层（textState.js）基于 ops 做文本几何推演。
 *
 * 识别的操作符子集（状态模拟所需）：
 *   q Q cm BT ET Tf Td TD Tm T* TL Tz Ts Tr Tj TJ ' " Do re W W* n
 * 其余操作符（含 BDC/BMC/EMC/gs 等）原样保留，不影响字节重建。
 * BI/ID/EI 内联图整段记录为 inlineImageSpans（重建时原样保留；与脱敏区相交 → 页面栅格化）。
 *
 * 解析失败（越界/畸形）时返回 parseError，调用方必须让该页降级栅格化——绝不静默。
 */

const WHITESPACE = new Set([0x00, 0x09, 0x0a, 0x0c, 0x0d, 0x20]);
const DELIMS = new Set(['(', ')', '<', '>', '[', ']', '{', '}', '/', '%']);

/**
 * @typedef {Object} PdfToken
 * @property {'num'|'name'|'string'|'hexstring'|'array'|'dict'|'keyword'} type
 * @property {*} value
 * @property {number} start 字节起点
 * @property {number} end 字节终点（不含）
 */

/**
 * @typedef {Object} PdfOp
 * @property {string} op 操作符名（如 'Tj'）
 * @property {Array} args 操作数（token.value 列表）
 * @property {number} start 整个操作（含操作数）的字节起点
 * @property {number} end 字节终点（不含）
 */

/** 字符串字面量解码：(…) 含嵌套括号与八进制/反斜杠转义 */
function readStringToken(bytes, i) {
  // bytes[i] === 0x28 '('
  let depth = 1;
  let j = i + 1;
  let out = '';
  while (j < bytes.length) {
    const b = bytes[j];
    if (b === 0x5c) {
      // 反斜杠转义
      const nb = bytes[j + 1];
      if (nb === undefined) break;
      if (nb >= 0x30 && nb <= 0x37) {
        // 八进制，最多 3 位
        let oct = '';
        let k = j + 1;
        while (k < bytes.length && oct.length < 3 && bytes[k] >= 0x30 && bytes[k] <= 0x37) {
          oct += String.fromCharCode(bytes[k]);
          k++;
        }
        out += String.fromCharCode(parseInt(oct, 8));
        j = k;
        continue;
      }
      const escMap = { 0x6e: '\n', 0x72: '\r', 0x74: '\t', 0x62: '\b', 0x66: '\f' };
      if (escMap[nb] !== undefined) out += escMap[nb];
      else out += String.fromCharCode(nb); // \\ \( \) 或其他原样
      j += 2;
      continue;
    }
    if (b === 0x28) depth++;
    else if (b === 0x29) {
      depth--;
      if (depth === 0) return { token: { type: 'string', value: out, start: i, end: j + 1 }, next: j + 1 };
    }
    out += String.fromCharCode(b);
    j++;
  }
  return null; // 未闭合
}

/** 十六进制串 <...> 解码（含奇数位补零） */
function readHexStringToken(bytes, i) {
  let j = i + 1;
  let hex = '';
  while (j < bytes.length && bytes[j] !== 0x3e) {
    const c = String.fromCharCode(bytes[j]);
    if (/[0-9a-fA-F]/.test(c)) hex += c;
    j++;
  }
  if (j >= bytes.length) return null;
  if (hex.length % 2 === 1) hex += '0';
  let value = '';
  for (let k = 0; k < hex.length; k += 2) {
    value += String.fromCharCode(parseInt(hex.slice(k, k + 2), 16));
  }
  return { token: { type: 'hexstring', value, start: i, end: j + 1 }, next: j + 1 };
}

/** 名称 /Name（含 #xx 十六进制转义） */
function readNameToken(bytes, i) {
  let j = i + 1;
  let name = '';
  while (j < bytes.length) {
    const c = String.fromCharCode(bytes[j]);
    if (WHITESPACE.has(bytes[j]) || DELIMS.has(c)) break;
    if (c === '#') {
      const hex = String.fromCharCode(bytes[j + 1], bytes[j + 2]);
      if (/^[0-9a-fA-F]{2}$/.test(hex)) {
        name += String.fromCharCode(parseInt(hex, 16));
        j += 3;
        continue;
      }
    }
    name += c;
    j++;
  }
  if (!name) return null;
  return { token: { type: 'name', value: name, start: i, end: j }, next: j };
}

/** 数字（整数/实数/正负号） */
function readNumberToken(bytes, i) {
  let j = i;
  let s = '';
  while (j < bytes.length) {
    const c = String.fromCharCode(bytes[j]);
    if (/[-+0-9.]/.test(c)) { s += c; j++; }
    else break;
  }
  if (!s) return null;
  const v = parseFloat(s);
  if (Number.isNaN(v)) return null;
  return { token: { type: 'num', value: v, start: i, end: j }, next: j };
}

/** 数组 [...]（TJ 操作数）：元素递归 tokenize */
function readArrayToken(bytes, i) {
  // bytes[i] === '['
  const items = [];
  let j = i + 1;
  while (j < bytes.length) {
    const b = bytes[j];
    if (b === 0x5d) return { token: { type: 'array', value: items, start: i, end: j + 1 }, next: j + 1 };
    if (WHITESPACE.has(b)) { j++; continue; }
    let r;
    if (b === 0x28) r = readStringToken(bytes, j);
    else if (b === 0x3c && bytes[j + 1] !== 0x3c) r = readHexStringToken(bytes, j);
    else if (b === 0x2f) r = readNameToken(bytes, j);
    else if (/[0-9\-+.]/.test(String.fromCharCode(b))) r = readNumberToken(bytes, j);
    else if (b === 0x3c && bytes[j + 1] === 0x3c) r = readDictToken(bytes, j);
    else if (b === 0x5b) r = readArrayToken(bytes, j);
    else return null; // 数组内未知结构 → 解析失败
    if (!r) return null;
    items.push(r.token.value);
    j = r.next;
  }
  return null; // 未闭合
}

/** 字典 <<...>>（BDC 等操作数；原样吞下，值不解释 */
function readDictToken(bytes, i) {
  // bytes[i..i+1] === '<<'
  let depth = 1;
  let j = i + 2;
  while (j < bytes.length) {
    if (bytes[j] === 0x3c && bytes[j + 1] === 0x3c) { depth++; j += 2; continue; }
    if (bytes[j] === 0x3e && bytes[j + 1] === 0x3e) {
      depth--;
      j += 2;
      if (depth === 0) return { token: { type: 'dict', value: null, start: i, end: j }, next: j };
      continue;
    }
    j++;
  }
  return null;
}

/** 读一个 token；空白/注释跳过。返回 null 表示需要终止 */
function readToken(bytes, i) {
  let j = i;
  while (j < bytes.length) {
    const b = bytes[j];
    if (WHITESPACE.has(b)) { j++; continue; }
    if (b === 0x25) { // % 注释到行尾
      while (j < bytes.length && bytes[j] !== 0x0a && bytes[j] !== 0x0d) j++;
      continue;
    }
    break;
  }
  if (j >= bytes.length) return { eof: true, next: j };
  const b = bytes[j];
  const c = String.fromCharCode(b);
  if (b === 0x28) return readStringToken(bytes, j);
  if (b === 0x3c) {
    if (bytes[j + 1] === 0x3c) return readDictToken(bytes, j);
    return readHexStringToken(bytes, j);
  }
  if (b === 0x2f) return readNameToken(bytes, j);
  if (b === 0x5b) return readArrayToken(bytes, j);
  if (/[0-9\-+.]/.test(c)) return readNumberToken(bytes, j);
  // 关键字（操作符）
  let k = j;
  let kw = '';
  while (k < bytes.length) {
    const kc = String.fromCharCode(bytes[k]);
    if (WHITESPACE.has(bytes[k]) || DELIMS.has(kc) || /[[\]{}]/.test(kc)) break;
    kw += kc;
    k++;
  }
  if (!kw) return { eof: true, next: j + 1 };
  return { token: { type: 'keyword', value: kw, start: j, end: k }, next: k };
}

const KNOWN_OPS = new Set([
  'q', 'Q', 'cm', 'BT', 'ET', 'Tf', 'Td', 'TD', 'Tm', 'T*', 'TL', 'Tz', 'Ts', 'Tr',
  'Tj', 'TJ', "'", '"', 'Do', 're', 'W', 'W*', 'n', 'gs', 'j', 'J', 'w', 'M', 'd',
  'ri', 'i', 'S', 's', 'f', 'F', 'f*', 'B', 'B*', 'b', 'b*', 'n0',
  'CS', 'cs', 'SC', 'SCN', 'sc', 'scn', 'G', 'g', 'RG', 'rg', 'K', 'k',
  'BDC', 'BMC', 'EMC', 'DP', 'MP', 'd0', 'd1', 'sh', 'BI', 'ID', 'EI', 'BX', 'EX'
]);

/**
 * 解析内容流。
 * @param {Uint8Array} bytes 已解码（解压后）的内容流字节
 * @returns {{ops: PdfOp[], inlineImageSpans: Array<{start:number,end:number}>, parseError: string|null}}
 */
export function parseContentStream(bytes) {
  /** @type {PdfOp[]} */
  const ops = [];
  const inlineImageSpans = [];
  let i = 0;
  /** @type {PdfToken[]} */
  let pendingArgs = [];
  let opStart = 0;

  while (i < bytes.length) {
    const r = readToken(bytes, i);
    if (r.eof) break;
    i = r.next;
    const t = r.token;
    if (!t) {
      return { ops, inlineImageSpans, parseError: `lexer failed at byte ${i}` };
    }
    if (t.type === 'keyword') {
      const kw = t.value;
      if (kw === 'BI') {
        // 内联图：BI <dict tokens> ID <binary> EI
        const span = readInlineImage(bytes, i); // i 指向 BI 之后
        if (!span) {
          return { ops, inlineImageSpans, parseError: `inline image parse failed at byte ${opStart}` };
        }
        inlineImageSpans.push({ start: opStart, end: span.end });
        i = span.end;
        pendingArgs = [];
        continue;
      }
      // 常规操作符
      ops.push({ op: kw, args: pendingArgs.map((a) => a.value), start: opStart, end: i });
      pendingArgs = [];
      opStart = i;
      continue;
    }
    // 操作数
    if (pendingArgs.length === 0) opStart = t.start;
    pendingArgs.push(t);
  }
  // 尾部未知操作数（无操作符收尾）：视为注释忽略
  return { ops, inlineImageSpans, parseError: null };
}

/**
 * 读取内联图 BI...ID...EI。
 * 进入时 i 已越过 BI。数据长度优先按 W*H*组件位深估算，否则扫描 EI。
 */
function readInlineImage(bytes, i) {
  // 1. 收集 dict tokens 直到 ID
  let dictTokens = [];
  let j = i;
  let idPos = -1;
  while (j < bytes.length) {
    const r = readToken(bytes, j);
    if (r.eof || !r.token) return null;
    j = r.next;
    if (r.token.type === 'keyword' && r.token.value === 'ID') { idPos = r.token.start; break; }
    dictTokens.push(r.token);
  }
  if (idPos < 0) return null;

  // 2. 估算像素数据长度：W H BPC CS(DeviceRGB=3/DeviceGray=1)
  let w = null;
  let h = null;
  let bpc = 8;
  let ncomp = 3;
  for (let k = 0; k + 1 < dictTokens.length; k++) {
    const t = dictTokens[k];
    const v = dictTokens[k + 1];
    if (t.type === 'name' && v.type === 'num') {
      if (t.value === 'W') w = v.value;
      else if (t.value === 'H') h = v.value;
      else if (t.value === 'BPC') bpc = v.value;
    }
    if (t.type === 'name' && t.value === 'CS' && dictTokens[k + 1].type === 'name') {
      const cs = dictTokens[k + 1].value;
      ncomp = cs === 'G' || cs === 'DeviceGray' ? 1 : cs === 'CMYK' || cs === 'DeviceCMYK' ? 4 : 3;
    }
  }

  // ID 后紧跟一个空白字节，然后是数据
  let dataStart = idPos + 2;
  if (dataStart < bytes.length && WHITESPACE.has(bytes[idPos + 1])) dataStart = idPos + 2;
  else dataStart = idPos + 1;

  // 3. 优先按估算长度定位 EI
  if (w && h && w > 0 && h > 0) {
    const est = Math.ceil((w * h * ncomp * bpc) / 8);
    const eiPos = dataStart + est;
    // EI 前有一个空白分隔
    if (eiPos + 1 < bytes.length && bytes[eiPos] === 0x45 && bytes[eiPos + 1] === 0x49) {
      return { end: eiPos + 2 };
    }
    // 估算失败（可能数据流不对称）：宽限扫描附近
    for (let d = -2; d <= 4; d++) {
      const p = eiPos + d;
      if (p > dataStart && p + 1 < bytes.length && bytes[p] === 0x45 && bytes[p + 1] === 0x49) {
        return { end: p + 2 };
      }
    }
  }
  // 4. fallback：从 dataStart 起扫描 "EI"（带前一空白更可信）
  for (let p = dataStart; p + 1 < bytes.length; p++) {
    if (bytes[p] === 0x45 && bytes[p + 1] === 0x49) {
      return { end: p + 2 };
    }
  }
  return null;
}
