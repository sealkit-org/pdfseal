/**
 * Supporter Certificate & Offline License Verification Engine
 * 
 * Cryptographically verifies licenses offline using native Web Crypto ECDSA (P-256 / SHA-256).
 * 100% Client-Side. Zero server pings. Zero tracking.
 */

// Embedded Official Public Key for Verification (Public keys are safe to be public)
export const ISSUER_PUBLIC_KEY_JWK = {
  key_ops: ['verify'],
  ext: true,
  kty: 'EC',
  x: 'wzeguKGZzRSYTQuZ9hJE3kciLhsqQ-KbiddSA_cX97U',
  y: 'xQhTvYyyT_zDEJXn2CGbWn_46gAZyYZqVQj6Nx0XvkI',
  crv: 'P-256'
};

const CERT_PREFIX = 'SEAL-';

/**
 * Universal Web Crypto Subtle instance
 */
function getSubtleCrypto() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
    return globalThis.crypto.subtle;
  }
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    return window.crypto.subtle;
  }
  throw new Error('Web Crypto API (crypto.subtle) is not available in this environment');
}

/**
 * Base64URL string <-> Uint8Array helpers (Safe for browser & node)
 */
export function bytesToBase64Url(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = typeof btoa === 'function' 
    ? btoa(binary) 
    : Buffer.from(binary, 'binary').toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlToBytes(base64Url) {
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  if (typeof atob === 'function') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } else {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
}

/**
 * Issues and signs a certificate (used by issuer CLI and automated tests)
 * @param {Object} payload 
 * @param {Object} privateKeyJwk 
 * @returns {Promise<string>} Certificate string format: "SEAL-[payload].[signature]"
 */
export async function signSupporterCertificate(payload, privateKeyJwk) {
  const subtle = getSubtleCrypto();
  
  const privateKey = await subtle.importKey(
    'jwk',
    privateKeyJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const payloadJson = JSON.stringify(payload);
  const payloadBytes = new TextEncoder().encode(payloadJson);

  const signatureBuffer = await subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    privateKey,
    payloadBytes
  );

  const payloadB64 = bytesToBase64Url(payloadBytes);
  const signatureB64 = bytesToBase64Url(new Uint8Array(signatureBuffer));

  return `${CERT_PREFIX}${payloadB64}.${signatureB64}`;
}

/**
 * Cryptographically verifies a certificate string offline
 * @param {string} certificateString 
 * @param {Object} [customPublicKeyJwk] Optional override for test environments
 * @returns {Promise<{ valid: boolean, cert?: Object, error?: string }>}
 */
export async function verifySupporterCertificate(certificateString, customPublicKeyJwk = null) {
  try {
    if (!certificateString || typeof certificateString !== 'string') {
      return { valid: false, error: '证书代码不能为空' };
    }

    const trimmed = certificateString.trim();
    if (!trimmed.startsWith(CERT_PREFIX)) {
      return { valid: false, error: '无效的证书格式 (缺少 SEAL- 前缀)' };
    }

    const content = trimmed.substring(CERT_PREFIX.length);
    const parts = content.split('.');
    if (parts.length !== 2) {
      return { valid: false, error: '证书结构损坏 (缺少数字签名段)' };
    }

    const [payloadB64, signatureB64] = parts;
    const payloadBytes = base64UrlToBytes(payloadB64);
    const signatureBytes = base64UrlToBytes(signatureB64);

    // 1. Verify cryptographic digital signature using Web Crypto ECDSA
    const subtle = getSubtleCrypto();
    const publicKeyJwk = customPublicKeyJwk || ISSUER_PUBLIC_KEY_JWK;
    
    const publicKey = await subtle.importKey(
      'jwk',
      publicKeyJwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );

    const isSignatureValid = await subtle.verify(
      { name: 'ECDSA', hash: { name: 'SHA-256' } },
      publicKey,
      signatureBytes,
      payloadBytes
    );

    if (!isSignatureValid) {
      return { valid: false, error: '数字签名验证失败：此证书未经官方私钥签发或已被篡改' };
    }

    // 2. Parse and validate JSON payload content
    const payloadJson = new TextDecoder().decode(payloadBytes);
    const cert = JSON.parse(payloadJson);

    if (!cert.tier || !['pro_annual', 'pro_lifetime', 'enterprise'].includes(cert.tier)) {
      return { valid: false, error: '未知的授权等级: ' + cert.tier };
    }

    // 3. Check expiration (if annual pass)
    if (cert.expiresAt && typeof cert.expiresAt === 'number') {
      if (Date.now() > cert.expiresAt) {
        const expiredDateStr = new Date(cert.expiresAt).toLocaleDateString();
        return { 
          valid: false, 
          error: `此证书已于 ${expiredDateStr} 到期，请续订或升级终身版`,
          expired: true,
          cert 
        };
      }
    }

    return {
      valid: true,
      cert: {
        id: cert.id || 'cert_' + Math.random().toString(36).substring(2, 9),
        name: cert.name || 'Supporter',
        email: cert.email || '',
        tier: cert.tier,
        issuedAt: cert.issuedAt || Date.now(),
        expiresAt: cert.expiresAt || null, // null means lifetime
        raw: trimmed
      }
    };
  } catch (err) {
    return { valid: false, error: '证书解析异常: ' + (err.message || '格式错误') };
  }
}
