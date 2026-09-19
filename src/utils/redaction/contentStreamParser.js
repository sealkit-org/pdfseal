/**
 * PDF Content Stream Lexical Parser (Redaction Core).
 *
 * Outputs byte ranges (start/end) for each operator, allowing sliced reconstruction
 * of the stream during vector rewriting.
 * Simulation layer (textState.js) computes text geometry based on parsed operators.
 *
 * Recognized operator subset (required for state simulation):
 *   q Q cm BT ET Tf Td TD Tm T* TL Tz Ts Tr Tj TJ ' " Do re W W* n
 * Remaining operators (including BDC/BMC/EMC/gs, etc.) are preserved verbatim to maintain byte fidelity.
 * BI/ID/EI inline images are recorded as inlineImageSpans (preserved verbatim during reconstruction;
 * rasterization is triggered if intersecting with redaction rects).
 *
 * On parsing error (out-of-bounds/malformed), returns parseError, signaling callers to safely fall back to page rasterization.
 */

const WHITESPACE = new Set([0x00, 0x09, 0x0a, 0x0c, 0x0d, 0x20]);
const DELIMS = new Set(['(', ')', '<', '>', '[', ']', '{', '}', '/', '%']);

/**
 * @typedef {Object} PdfToken
 * @property {'num'|'name'|'string'|'hexstring'|'array'|'dict'|'keyword'} type
 * @property {*} value
 * @property {number} start Start byte offset
 * @property {number} end End byte offset (exclusive)
 */

/**
 * @typedef {Object} PdfOp
 * @property {string} op Operator name (e.g., 'Tj')
 * @property {Array} args Operands (list of token.value)
 * @property {number} start Start byte offset of entire operator expression
 * @property {number} end End byte offset (exclusive)
 */

/** Decodes string literal: (...) with nested parentheses and octal/backslash escape sequences */
function readStringToken(bytes, i) {
  // bytes[i] === 0x28 '('
  let depth = 1;
  let j = i + 1;
  let out = '';
  while (j < bytes.length) {
    const b = bytes[j];
    if (b === 0x5c) {
      // Backslash escape
      const nb = bytes[j + 1];
      if (nb === undefined) break;
      if (nb >= 0x30 && nb <= 0x37) {
        // Octal, up to 3 digits
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
      else out += String.fromCharCode(nb); // \\ \( \) or literal character
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
  return null; // Unclosed string literal
}

/** Decodes hexadecimal string <...> (with odd-length zero padding) */
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

/** Decodes PDF Name /Name (with #xx hex escape sequences) */
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

/** Parses number (integer / real / signs) */
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

/** Parses array [...] (TJ operands): elements tokenized recursively */
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
    else return null; // Unknown structure inside array -> parsing failed
    if (!r) return null;
    items.push(r.token.value);
    j = r.next;
  }
  return null; // Unclosed array
}

/** Parses dictionary <<...>> (BDC operands, etc.; consumed verbatim without deep interpretation) */
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

/** Reads a single token, skipping whitespace and comments. Returns EOF or null on failure. */
function readToken(bytes, i) {
  let j = i;
  while (j < bytes.length) {
    const b = bytes[j];
    if (WHITESPACE.has(b)) { j++; continue; }
    if (b === 0x25) { // % Comment until newline
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
  // Keyword (operator)
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
 * Parses PDF content stream.
 * @param {Uint8Array} bytes Decoded (decompressed) content stream bytes
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
        // Inline image: BI <dict tokens> ID <binary> EI
        const span = readInlineImage(bytes, i); // i points right after BI
        if (!span) {
          return { ops, inlineImageSpans, parseError: `inline image parse failed at byte ${opStart}` };
        }
        inlineImageSpans.push({ start: opStart, end: span.end });
        i = span.end;
        pendingArgs = [];
        continue;
      }
      // Regular operator
      ops.push({ op: kw, args: pendingArgs.map((a) => a.value), start: opStart, end: i });
      pendingArgs = [];
      opStart = i;
      continue;
    }
    // Operand
    if (pendingArgs.length === 0) opStart = t.start;
    pendingArgs.push(t);
  }
  // Trailing unknown operand without trailing operator: ignored as comments
  return { ops, inlineImageSpans, parseError: null };
}

/**
 * Reads inline image BI...ID...EI.
 * When invoked, i is immediately after BI. Data length is estimated via W*H*depth or scans for EI.
 */
function readInlineImage(bytes, i) {
  // 1. Collect dict tokens until ID
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

  // 2. Estimate pixel data length: W H BPC CS (DeviceRGB=3 / DeviceGray=1)
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

  // A single whitespace character follows ID, then binary data begins
  let dataStart = idPos + 2;
  if (dataStart < bytes.length && WHITESPACE.has(bytes[idPos + 1])) dataStart = idPos + 2;
  else dataStart = idPos + 1;

  // 3. Attempt to locate EI at estimated offset
  if (w && h && w > 0 && h > 0) {
    const est = Math.ceil((w * h * ncomp * bpc) / 8);
    const eiPos = dataStart + est;
    // EI is preceded by whitespace
    if (eiPos + 1 < bytes.length && bytes[eiPos] === 0x45 && bytes[eiPos + 1] === 0x49) {
      return { end: eiPos + 2 };
    }
    // Search small neighborhood around estimate in case of padding
    for (let d = -2; d <= 4; d++) {
      const p = eiPos + d;
      if (p > dataStart && p + 1 < bytes.length && bytes[p] === 0x45 && bytes[p + 1] === 0x49) {
        return { end: p + 2 };
      }
    }
  }
  // 4. Fallback: linear scan for "EI" from dataStart
  for (let p = dataStart; p + 1 < bytes.length; p++) {
    if (bytes[p] === 0x45 && bytes[p + 1] === 0x49) {
      return { end: p + 2 };
    }
  }
  return null;
}
