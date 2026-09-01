/**
 * Pure JavaScript PDF Permissions & Owner Password Encryption Engine
 * Implements ISO 32000-1 / PDF 1.7 Standard Security Handler (Revision 3, 128-bit RC4)
 * 
 * Features:
 * - Allows anyone to OPEN and VIEW the PDF freely without password prompt.
 * - Restricts MODIFYING, EDITING, COPYING, and ANNOTATING unless Owner Password is supplied.
 * - 100% Zero external dependencies.
 */

// Standard 32-byte PDF padding specified by Adobe / ISO 32000-1
const PDF_PADDING = new Uint8Array([
  0x28, 0xBF, 0x4E, 0x5E, 0x4E, 0x75, 0x8A, 0x41,
  0x64, 0x00, 0x4E, 0x56, 0xFF, 0xFA, 0x01, 0x08,
  0x2E, 0x2E, 0x00, 0xB6, 0xD0, 0x68, 0x3E, 0x80,
  0x2F, 0x0C, 0xA9, 0xFE, 0x64, 0x53, 0x69, 0x7A
]);

// Self-contained fast MD5 implementation
function md5(buffers) {
  function safeAdd(x, y) {
    const lsw = (x & 0xFFFF) + (y & 0xFFFF);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xFFFF);
  }
  function bitRol(num, cnt) {
    return (num << cnt) | (num >>> (32 - cnt));
  }
  function cmn(q, a, b, x, s, t) {
    return safeAdd(bitRol(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
  }
  function ff(a, b, c, d, x, s, t) {
    return cmn((b & c) | (~b & d), a, b, x, s, t);
  }
  function gg(a, b, c, d, x, s, t) {
    return cmn((b & d) | (c & ~d), a, b, x, s, t);
  }
  function hh(a, b, c, d, x, s, t) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }
  function ii(a, b, c, d, x, s, t) {
    return cmn(c ^ (b | ~d), a, b, x, s, t);
  }

  // Combine input buffers into a single Uint8Array
  let totalLen = 0;
  for (const b of buffers) totalLen += b.length;
  const data = new Uint8Array(totalLen);
  let offset = 0;
  for (const b of buffers) {
    data.set(b, offset);
    offset += b.length;
  }

  // Pre-processing for MD5 padding
  const nWords = (((totalLen + 8) >> 6) + 1) * 16;
  const words = new Int32Array(nWords);
  for (let i = 0; i < totalLen; i++) {
    words[i >> 2] |= data[i] << ((i % 4) * 8);
  }
  words[totalLen >> 2] |= 0x80 << ((totalLen % 4) * 8);
  words[nWords - 2] = (totalLen * 8) & 0xFFFFFFFF;
  words[nWords - 1] = Math.floor((totalLen * 8) / 0x100000000);

  let a = 1732584193;
  let b = -271733879;
  let c = -1732584194;
  let d = 271733878;

  for (let i = 0; i < nWords; i += 16) {
    const olda = a, oldb = b, oldc = c, oldd = d;

    a = ff(a, b, c, d, words[i], 7, -680876936);
    d = ff(d, a, b, c, words[i + 1], 12, -389564586);
    c = ff(c, d, a, b, words[i + 2], 17, 606105819);
    b = ff(b, c, d, a, words[i + 3], 22, -1044525330);
    a = ff(a, b, c, d, words[i + 4], 7, -176418897);
    d = ff(d, a, b, c, words[i + 5], 12, 1200080426);
    c = ff(c, d, a, b, words[i + 6], 17, -1473231341);
    b = ff(b, c, d, a, words[i + 7], 22, -45705983);
    a = ff(a, b, c, d, words[i + 8], 7, 1770035416);
    d = ff(d, a, b, c, words[i + 9], 12, -1958414417);
    c = ff(c, d, a, b, words[i + 10], 17, -42063);
    b = ff(b, c, d, a, words[i + 11], 22, -1990404162);
    a = ff(a, b, c, d, words[i + 12], 7, 1804603682);
    d = ff(d, a, b, c, words[i + 13], 12, -40341101);
    c = ff(c, d, a, b, words[i + 14], 17, -1502002290);
    b = ff(b, c, d, a, words[i + 15], 22, 1236535329);

    a = gg(a, b, c, d, words[i + 1], 5, -165796510);
    d = gg(d, a, b, c, words[i + 6], 9, -1069501632);
    c = gg(c, d, a, b, words[i + 11], 14, 643717713);
    b = gg(b, c, d, a, words[i], 20, -373897302);
    a = gg(a, b, c, d, words[i + 5], 5, -701558691);
    d = gg(d, a, b, c, words[i + 10], 9, 38016083);
    c = gg(c, d, a, b, words[i + 15], 14, -660478335);
    b = gg(b, c, d, a, words[i + 4], 20, -405537848);
    a = gg(a, b, c, d, words[i + 9], 5, 568446438);
    d = gg(d, a, b, c, words[i + 14], 9, -1019803690);
    c = gg(c, d, a, b, words[i + 3], 14, -187363961);
    b = gg(b, c, d, a, words[i + 8], 20, 1163531501);
    a = gg(a, b, c, d, words[i + 13], 5, -1444681467);
    d = gg(d, a, b, c, words[i + 2], 9, -51403784);
    c = gg(c, d, a, b, words[i + 7], 14, 1735328473);
    b = gg(b, c, d, a, words[i + 12], 20, -1926607734);

    a = hh(a, b, c, d, words[i + 5], 4, -378558);
    d = hh(d, a, b, c, words[i + 8], 11, -2022574463);
    c = hh(c, d, a, b, words[i + 11], 16, 1839030562);
    b = hh(b, c, d, a, words[i + 14], 23, -35309556);
    a = hh(a, b, c, d, words[i + 1], 4, -1530992060);
    d = hh(d, a, b, c, words[i + 4], 11, 1272893353);
    c = hh(c, d, a, b, words[i + 7], 16, -155497632);
    b = hh(b, c, d, a, words[i + 10], 23, -1094730640);
    a = hh(a, b, c, d, words[i + 13], 4, 681279174);
    d = hh(d, a, b, c, words[i], 11, -358537222);
    c = hh(c, d, a, b, words[i + 3], 16, -722521979);
    b = hh(b, c, d, a, words[i + 6], 23, 76029189);
    a = hh(a, b, c, d, words[i + 9], 4, -640364487);
    d = hh(d, a, b, c, words[i + 12], 11, -421815835);
    c = hh(c, d, a, b, words[i + 15], 16, 530742520);
    b = hh(b, c, d, a, words[i + 2], 23, -995338651);

    a = ii(a, b, c, d, words[i], 6, -198630844);
    d = ii(d, a, b, c, words[i + 7], 10, 1126891415);
    c = ii(c, d, a, b, words[i + 14], 15, -1416354905);
    b = ii(b, c, d, a, words[i + 5], 21, -57434055);
    a = ii(a, b, c, d, words[i + 12], 6, 1700485571);
    d = ii(d, a, b, c, words[i + 3], 10, -1894986606);
    c = ii(c, d, a, b, words[i + 10], 15, -1051523);
    b = ii(b, c, d, a, words[i + 1], 21, -2054922799);
    a = ii(a, b, c, d, words[i + 8], 6, 1873313359);
    d = ii(d, a, b, c, words[i + 15], 10, -30611744);
    c = ii(c, d, a, b, words[i + 6], 15, -1560198380);
    b = ii(b, c, d, a, words[i + 13], 21, 1309151649);
    a = ii(a, b, c, d, words[i + 4], 6, -145523070);
    d = ii(d, a, b, c, words[i + 11], 10, -1120210379);
    c = ii(c, d, a, b, words[i + 2], 15, 718787259);
    b = ii(b, c, d, a, words[i + 9], 21, -343485551);

    a = safeAdd(a, olda);
    b = safeAdd(b, oldb);
    c = safeAdd(c, oldc);
    d = safeAdd(d, oldd);
  }

  const out = new Uint8Array(16);
  const wordsOut = [a, b, c, d];
  for (let i = 0; i < 4; i++) {
    out[i * 4] = wordsOut[i] & 0xFF;
    out[i * 4 + 1] = (wordsOut[i] >> 8) & 0xFF;
    out[i * 4 + 2] = (wordsOut[i] >> 16) & 0xFF;
    out[i * 4 + 3] = (wordsOut[i] >> 24) & 0xFF;
  }
  return out;
}

// Fast RC4 stream cipher
function rc4(key, data) {
  const s = new Uint8Array(256);
  for (let i = 0; i < 256; i++) s[i] = i;
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + s[i] + key[i % key.length]) & 255;
    const tmp = s[i];
    s[i] = s[j];
    s[j] = tmp;
  }
  let i = 0;
  j = 0;
  const out = new Uint8Array(data.length);
  for (let k = 0; k < data.length; k++) {
    i = (i + 1) & 255;
    j = (j + s[i]) & 255;
    const tmp = s[i];
    s[i] = s[j];
    s[j] = tmp;
    out[k] = data[k] ^ s[(s[i] + s[j]) & 255];
  }
  return out;
}

function padPassword(pwd) {
  const enc = new TextEncoder();
  const bytes = enc.encode(pwd);
  const out = new Uint8Array(32);
  if (bytes.length >= 32) {
    out.set(bytes.subarray(0, 32));
  } else {
    out.set(bytes);
    out.set(PDF_PADDING.subarray(0, 32 - bytes.length), bytes.length);
  }
  return out;
}

function toHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Compute Standard PDF /O and /U hashes and Encryption Parameters
 *
 * @param {string} ownerPassword - Password required to modify/edit/unlock permissions
 * @param {string} [userPassword=''] - Open/View password (empty string = anyone can open without password)
 * @param {Uint8Array} idBytes - 16-byte document ID
 * @param {number} [permissions=-3904] - Standard read-only permissions mask
 * @returns {{ oHex: string, uHex: string, pInt: number, docKey: Uint8Array }}
 */
export function computePdfEncryptionParams(ownerPassword, userPassword = '', idBytes = null, permissions = -3904) {
  if (!idBytes || idBytes.length < 16) {
    idBytes = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(idBytes);
    } else {
      for (let i = 0; i < 16; i++) idBytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // 1. Algorithm 3: Compute /O Entry
  const paddedOwner = padPassword(ownerPassword);
  let hashO = md5([paddedOwner]);
  for (let i = 0; i < 50; i++) {
    hashO = md5([hashO]);
  }
  const keyO = hashO.subarray(0, 16);
  let paddedUser = padPassword(userPassword);
  let encryptedO = rc4(keyO, paddedUser);
  for (let i = 1; i <= 19; i++) {
    const roundKey = new Uint8Array(keyO.length);
    for (let k = 0; k < keyO.length; k++) roundKey[k] = keyO[k] ^ i;
    encryptedO = rc4(roundKey, encryptedO);
  }

  // 2. Algorithm 2: Compute Document Key
  const pBytes = new Uint8Array(4);
  pBytes[0] = permissions & 0xFF;
  pBytes[1] = (permissions >> 8) & 0xFF;
  pBytes[2] = (permissions >> 16) & 0xFF;
  pBytes[3] = (permissions >> 24) & 0xFF;

  let hashDoc = md5([paddedUser, encryptedO, pBytes, idBytes.subarray(0, 16)]);
  for (let i = 0; i < 50; i++) {
    hashDoc = md5([hashDoc]);
  }
  const docKey = hashDoc.subarray(0, 16);

  // 3. Algorithm 4: Compute /U Entry
  let hashU = md5([PDF_PADDING, idBytes.subarray(0, 16)]);
  let encryptedU = rc4(docKey, hashU);
  for (let i = 1; i <= 19; i++) {
    const roundKey = new Uint8Array(docKey.length);
    for (let k = 0; k < docKey.length; k++) roundKey[k] = docKey[k] ^ i;
    encryptedU = rc4(roundKey, encryptedU);
  }
  const uBytes = new Uint8Array(32);
  uBytes.set(encryptedU);

  return {
    oHex: toHex(encryptedO),
    uHex: toHex(uBytes),
    pInt: permissions,
    idHex: toHex(idBytes.subarray(0, 16)),
    docKey
  };
}
