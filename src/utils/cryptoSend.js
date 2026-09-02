/**
 * Seal Send Cryptographic Engine (100% In-Browser Web Crypto E2EE)
 * Zero-Knowledge AES-GCM-256 Encryption + PBKDF2 Password Derivation.
 * Files are encrypted locally before leaving the client; decryption key lives solely in URL hash.
 */

const MAGIC_HEADER = new Uint8Array([0x53, 0x45, 0x41, 0x4c, 0x53, 0x45, 0x4e, 0x44, 0x5f, 0x56, 0x31, 0x00]); // "SEALSEND_V1\0"
const PBKDF2_ITERATIONS = 100000;

/**
 * Generates a random 256-bit AES-GCM symmetric encryption key
 * @returns {Promise<CryptoKey>}
 */
export async function generateSendKey() {
  const cryptoObj = getCrypto();
  return cryptoObj.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // extractable for URL hash
    ['encrypt', 'decrypt']
  );
}

/**
 * Exports a CryptoKey to URL-safe base64 string for embedding into URL hash
 * @param {CryptoKey} key 
 * @returns {Promise<string>}
 */
export async function exportKeyUrlSafe(key) {
  const cryptoObj = getCrypto();
  const raw = await cryptoObj.subtle.exportKey('raw', key);
  const base64 = bytesToBase64(new Uint8Array(raw));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Imports a CryptoKey from a URL-safe base64 string extracted from URL hash
 * @param {string} base64Url 
 * @returns {Promise<CryptoKey>}
 */
export async function importKeyUrlSafe(base64Url) {
  const cryptoObj = getCrypto();
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const rawBytes = base64ToBytes(base64);
  return cryptoObj.subtle.importKey(
    'raw',
    rawBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Derives a secondary key from a user PIN/password using PBKDF2
 * @param {string} password 
 * @param {Uint8Array} salt 
 * @returns {Promise<CryptoKey>}
 */
async function derivePasswordKey(password, salt) {
  const cryptoObj = getCrypto();
  const enc = new TextEncoder();
  const keyMaterial = await cryptoObj.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return cryptoObj.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a PDF file with metadata locally in browser RAM
 * @param {Object} payload
 * @param {ArrayBuffer|Uint8Array} payload.arrayBuffer PDF binary bytes
 * @param {string} payload.name Filename
 * @param {number} [payload.pageCount=1]
 * @param {CryptoKey} primaryKey The generated AES-256 master key
 * @param {string} [password=''] Optional 4-6 digit PIN/password
 * @returns {Promise<Uint8Array>} Binary ciphertext ready for upload
 */
export async function encryptFilePayload({ arrayBuffer, name, pageCount = 1 }, primaryKey, password = '') {
  const cryptoObj = getCrypto();
  const rawPdfBytes = arrayBuffer instanceof Uint8Array ? arrayBuffer : new Uint8Array(arrayBuffer);

  const metaObj = {
    name: name || 'Document.pdf',
    pageCount: pageCount || 1,
    size: rawPdfBytes.byteLength,
    timestamp: Date.now()
  };

  const metaBytes = new TextEncoder().encode(JSON.stringify(metaObj));
  const metaLenBytes = new Uint8Array(4);
  new DataView(metaLenBytes.buffer).setUint32(0, metaBytes.byteLength, false);

  // Combine: [4 bytes metaLen] + [metaBytes] + [pdfBytes]
  const combinedPlaintext = new Uint8Array(4 + metaBytes.byteLength + rawPdfBytes.byteLength);
  combinedPlaintext.set(metaLenBytes, 0);
  combinedPlaintext.set(metaBytes, 4);
  combinedPlaintext.set(rawPdfBytes, 4 + metaBytes.byteLength);

  // 1. Primary Encryption with Master Key
  const iv1 = cryptoObj.getRandomValues(new Uint8Array(12));
  let intermediateCiphertext = await cryptoObj.subtle.encrypt(
    { name: 'AES-GCM', iv: iv1 },
    primaryKey,
    combinedPlaintext
  );

  let hasPassword = Boolean(password && password.trim());
  let salt = new Uint8Array(16);
  let iv2 = new Uint8Array(12);

  let finalCiphertextBytes = new Uint8Array(intermediateCiphertext);

  // 2. Optional Secondary Encryption with Password Derived Key
  if (hasPassword) {
    salt = cryptoObj.getRandomValues(new Uint8Array(16));
    iv2 = cryptoObj.getRandomValues(new Uint8Array(12));
    const pwdKey = await derivePasswordKey(password.trim(), salt);
    const pwdEncrypted = await cryptoObj.subtle.encrypt(
      { name: 'AES-GCM', iv: iv2 },
      pwdKey,
      finalCiphertextBytes
    );
    finalCiphertextBytes = new Uint8Array(pwdEncrypted);
  }

  // Final Output Wire Format:
  // [12 bytes MAGIC_HEADER]
  // [1 byte hasPasswordFlag (0 or 1)]
  // [16 bytes salt]
  // [12 bytes iv1]
  // [12 bytes iv2]
  // [Remaining bytes: finalCiphertext]
  const totalLength = 12 + 1 + 16 + 12 + 12 + finalCiphertextBytes.byteLength;
  const wireBytes = new Uint8Array(totalLength);

  wireBytes.set(MAGIC_HEADER, 0);
  wireBytes[12] = hasPassword ? 1 : 0;
  wireBytes.set(salt, 13);
  wireBytes.set(iv1, 29);
  wireBytes.set(iv2, 41);
  wireBytes.set(finalCiphertextBytes, 53);

  return wireBytes;
}

/**
 * Decrypts an encrypted payload locally in browser RAM
 * @param {ArrayBuffer|Uint8Array} encryptedBytes 
 * @param {CryptoKey} primaryKey Master key from URL hash
 * @param {string} [password=''] Optional password entered by recipient
 * @returns {Promise<{ name: string, pageCount: number, arrayBuffer: ArrayBuffer, size: number }>}
 */
export async function decryptFilePayload(encryptedBytes, primaryKey, password = '') {
  const cryptoObj = getCrypto();
  const wire = encryptedBytes instanceof Uint8Array ? encryptedBytes : new Uint8Array(encryptedBytes);

  if (wire.byteLength < 53) {
    throw new Error('CORRUPTED_PAYLOAD_TOO_SHORT');
  }

  // Verify Magic Header
  for (let i = 0; i < 12; i++) {
    if (wire[i] !== MAGIC_HEADER[i]) {
      throw new Error('INVALID_MAGIC_HEADER');
    }
  }

  const hasPassword = wire[12] === 1;
  const salt = wire.slice(13, 29);
  const iv1 = wire.slice(29, 41);
  const iv2 = wire.slice(41, 53);
  let ciphertext = wire.slice(53);

  // 1. Password layer decryption if password protected
  if (hasPassword) {
    if (!password || !password.trim()) {
      throw new Error('PASSWORD_REQUIRED');
    }
    const pwdKey = await derivePasswordKey(password.trim(), salt);
    try {
      const pwdDecrypted = await cryptoObj.subtle.decrypt(
        { name: 'AES-GCM', iv: iv2 },
        pwdKey,
        ciphertext
      );
      ciphertext = new Uint8Array(pwdDecrypted);
    } catch (e) {
      throw new Error('INVALID_PASSWORD');
    }
  }

  // 2. Primary master key decryption
  let plainBytes;
  try {
    const rawPlain = await cryptoObj.subtle.decrypt(
      { name: 'AES-GCM', iv: iv1 },
      primaryKey,
      ciphertext
    );
    plainBytes = new Uint8Array(rawPlain);
  } catch (e) {
    throw new Error('INVALID_MASTER_KEY_OR_TAMPERED');
  }

  // 3. Unpack metadata and PDF binary
  const metaLen = new DataView(plainBytes.buffer, plainBytes.byteOffset, 4).getUint32(0, false);
  const metaJsonBytes = plainBytes.slice(4, 4 + metaLen);
  const pdfBytes = plainBytes.slice(4 + metaLen);

  const metaStr = new TextDecoder().decode(metaJsonBytes);
  const meta = JSON.parse(metaStr);

  return {
    name: meta.name || 'Decrypted_Document.pdf',
    pageCount: meta.pageCount || 1,
    size: meta.size || pdfBytes.byteLength,
    arrayBuffer: pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength)
  };
}

/**
 * Checks if an encrypted payload requires a password without performing full decryption
 * @param {ArrayBuffer|Uint8Array} encryptedBytes 
 * @returns {boolean}
 */
export function isPayloadPasswordProtected(encryptedBytes) {
  const wire = encryptedBytes instanceof Uint8Array ? encryptedBytes : new Uint8Array(encryptedBytes);
  if (wire.byteLength < 13) return false;
  return wire[12] === 1;
}

// Helpers
function getCrypto() {
  if (typeof window !== 'undefined' && window.crypto) return window.crypto;
  if (typeof globalThis !== 'undefined' && globalThis.crypto) return globalThis.crypto;
  throw new Error('Web Crypto API is not available in this environment');
}

function bytesToBase64(bytes) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
