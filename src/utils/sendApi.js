/**
 * Seal Send API Client
 * Interfaces with Cloudflare Worker for uploading & downloading blind encrypted blobs.
 * Includes local fallback simulation for offline dev/test environments.
 */

import { userSettings } from './userSettings';
import { logger } from './logger';

// Ephemeral in-memory/IndexedDB mock store for offline testing if no custom worker is deployed
const MOCK_EPHEMERAL_STORE = new Map();

export function getWorkerEndpoint() {
  const custom = userSettings.customWorkerUrl ? userSettings.customWorkerUrl.trim() : '';
  if (custom) return custom.replace(/\/+$/, '');
  
  // Build-time default environment variable
  const envUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SEAL_WORKER_URL) ? import.meta.env.VITE_SEAL_WORKER_URL.trim() : '';
  if (envUrl) return envUrl.replace(/\/+$/, '');

  // Default production fallback for sealkit.org
  if (typeof window !== 'undefined' && (window.location.hostname.includes('sealkit.org') || window.location.hostname === 'pdf.sealkit.org')) {
    return 'https://send.sealkit.org';
  }

  return '';
}

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Fetches health & storage watermark status from Worker
 * @returns {Promise<{ status: string, usageRatio: number, watermark: 'normal'|'high_85'|'critical_95', maxFileSize: number }>}
 */
export async function fetchServiceStatus() {
  const endpoint = getWorkerEndpoint();
  if (!endpoint) {
    return { status: 'mock', usageRatio: 0.1, watermark: 'normal', maxFileSize: MAX_FILE_BYTES };
  }
  try {
    const lang = userSettings.language || 'zh';
    const res = await fetch(`${endpoint}/api/send/status`, {
      headers: { 'X-Language': lang }
    });
    if (!res.ok) return { status: 'unknown', usageRatio: 0, watermark: 'normal', maxFileSize: MAX_FILE_BYTES };
    return await res.json();
  } catch (e) {
    return { status: 'offline', usageRatio: 0, watermark: 'normal', maxFileSize: MAX_FILE_BYTES };
  }
}

/**
 * Uploads an encrypted binary payload to Cloudflare R2 via Worker
 * @param {Object} params
 * @param {Uint8Array} params.encryptedBytes
 * @param {number} params.expirationSeconds
 * @param {boolean} params.burnAfterRead
 * @param {boolean} params.isPasswordProtected
 * @returns {Promise<{ id: string, expiresAt: number, isMock?: boolean }>}
 */
export async function uploadEncryptedPayload({ encryptedBytes, expirationSeconds = 3600, burnAfterRead = true, isPasswordProtected = true }) {
  if (encryptedBytes.byteLength > MAX_FILE_BYTES) {
    throw new Error(`单个外发文件大小不得超过 10 MB（当前：${(encryptedBytes.byteLength / (1024 * 1024)).toFixed(2)} MB）。`);
  }

  const endpoint = getWorkerEndpoint();
  const lang = userSettings.language || 'zh';

  // If real Cloudflare Worker URL is configured:
  if (endpoint) {
    try {
      const response = await fetch(`${endpoint}/api/send/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Expiration-Seconds': String(expirationSeconds),
          'X-Burn-After-Read': burnAfterRead ? 'true' : 'false',
          'X-Password-Protected': isPasswordProtected ? 'true' : 'false',
          'X-File-Size': String(encryptedBytes.byteLength),
          'X-Language': lang
        },
        body: encryptedBytes
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        if (errorJson.message) {
          throw new Error(errorJson.message);
        }
        if (response.status === 413) {
          throw new Error('文件大小超过 10MB 限制。');
        }
        if (response.status === 503) {
          throw new Error('中转盲盒存储池已达 95% 水位上限，暂时停止接收新文件，请稍后重试。');
        }
        if (response.status === 400 && errorJson.error === 'WATERMARK_RESTRICTED_10M') {
          throw new Error('中转池当前水位超 85%，仅支持选择 10 分钟有效时长。');
        }
        throw new Error(errorJson.error || `HTTP_UPLOAD_ERROR_${response.status}`);
      }

      const data = await response.json();
      logger.info('SEND', `Uploaded encrypted payload to Cloudflare Worker: ${data.id}`);
      return data;
    } catch (err) {
      logger.error('SEND', `Cloudflare Worker upload failed: ${err.message}`);
      throw err;
    }
  }

  // Local In-Browser Simulation Mode (when testing locally without deploying Worker yet)
  const id = 'mock_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
  const now = Date.now();
  const expiresAt = now + (expirationSeconds * 1000);

  const mockRecord = {
    bytes: Array.from(encryptedBytes), // Serialized for cross-tab storage
    expiresAt,
    burnAfterRead,
    isPasswordProtected,
    size: encryptedBytes.byteLength
  };

  MOCK_EPHEMERAL_STORE.set(id, { ...mockRecord, bytes: encryptedBytes });
  try {
    sessionStorage.setItem(`pdfseal_mock_${id}`, JSON.stringify(mockRecord));
    localStorage.setItem(`pdfseal_mock_${id}`, JSON.stringify(mockRecord));
  } catch (e) {}

  logger.info('SEND', `Saved encrypted payload to local session mock store: ${id}`);
  return {
    success: true,
    id,
    expiresAt,
    burnAfterRead,
    size: encryptedBytes.byteLength,
    isMock: true
  };
}

/**
 * Fetches public file metadata without downloading the full payload
 * @param {string} id 
 * @returns {Promise<{ id: string, size: number, expiresAt: number, burnAfterRead: boolean, isPasswordProtected: boolean }>}
 */
export async function fetchPayloadInfo(id) {
  const endpoint = getWorkerEndpoint();
  const lang = userSettings.language || 'zh';

  if (endpoint) {
    const response = await fetch(`${endpoint}/api/send/info/${id}`, {
      headers: { 'X-Language': lang }
    });
    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      if (response.status === 404 || response.status === 410) {
        throw new Error(errJson.message || 'FILE_EXPIRED_OR_DESTROYED');
      }
      throw new Error(errJson.message || `HTTP_INFO_ERROR_${response.status}`);
    }
    return response.json();
  }

  // Local Mock lookup (Check in-memory first, then cross-tab storage)
  let record = MOCK_EPHEMERAL_STORE.get(id);
  if (!record) {
    try {
      const stored = sessionStorage.getItem(`pdfseal_mock_${id}`) || localStorage.getItem(`pdfseal_mock_${id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        record = {
          ...parsed,
          bytes: new Uint8Array(parsed.bytes)
        };
        MOCK_EPHEMERAL_STORE.set(id, record);
      }
    } catch (e) {}
  }

  if (!record || Date.now() > record.expiresAt) {
    throw new Error('FILE_EXPIRED_OR_DESTROYED');
  }

  return {
    id,
    size: record.size,
    expiresAt: record.expiresAt,
    burnAfterRead: record.burnAfterRead,
    isPasswordProtected: record.isPasswordProtected
  };
}

/**
 * Downloads the encrypted binary ciphertext from Cloudflare R2
 * @param {string} id 
 * @returns {Promise<Uint8Array>}
 */
export async function downloadEncryptedPayload(id) {
  const endpoint = getWorkerEndpoint();
  const lang = userSettings.language || 'zh';

  if (endpoint) {
    const response = await fetch(`${endpoint}/api/send/file/${id}`, {
      headers: { 'X-Language': lang }
    });
    if (!response.ok) {
      if (response.status === 404 || response.status === 410) {
        throw new Error('FILE_EXPIRED_OR_DESTROYED');
      }
      throw new Error(`HTTP_DOWNLOAD_ERROR_${response.status}`);
    }
    const buf = await response.arrayBuffer();
    return new Uint8Array(buf);
  }

  // Local Mock download
  let record = MOCK_EPHEMERAL_STORE.get(id);
  if (!record) {
    try {
      const stored = sessionStorage.getItem(`pdfseal_mock_${id}`) || localStorage.getItem(`pdfseal_mock_${id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        record = {
          ...parsed,
          bytes: new Uint8Array(parsed.bytes)
        };
        MOCK_EPHEMERAL_STORE.set(id, record);
      }
    } catch (e) {}
  }

  if (!record || Date.now() > record.expiresAt) {
    throw new Error('FILE_EXPIRED_OR_DESTROYED');
  }

  const bytes = record.bytes;
  if (record.burnAfterRead) {
    MOCK_EPHEMERAL_STORE.delete(id);
    try {
      sessionStorage.removeItem(`pdfseal_mock_${id}`);
      localStorage.removeItem(`pdfseal_mock_${id}`);
    } catch (e) {}
  }

  return bytes;
}
