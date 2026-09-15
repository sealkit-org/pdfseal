import { describe, it, expect, vi } from 'vitest';
import worker, { 
  isOriginAllowed, 
  reconcileStorage, 
  MIN_EXPIRATION_SECONDS, 
  MAX_EXPIRATION_SECONDS, 
  DEFAULT_EXPIRATION_SECONDS 
} from '../cloudflare/worker.js';

describe('Cloudflare Worker Security & Anti-Abuse (Fixes 2 & 3)', () => {
  it('should strictly validate origin and prevent domain spoofing / substring attacks', () => {
    // Empty origin should be rejected
    expect(isOriginAllowed('', null)).toBe(false);
    expect(isOriginAllowed(null, null)).toBe(false);

    // Spoofed / suffix-attack domains should be rejected
    expect(isOriginAllowed('https://evil-sealkit.org', null)).toBe(false);
    expect(isOriginAllowed('https://notsealkit.org', null)).toBe(false);
    expect(isOriginAllowed('https://evil.com/?sealkit.org', null)).toBe(false);
    expect(isOriginAllowed('https://sealkit.org.evil.com', null)).toBe(false);
    expect(isOriginAllowed('https://attacker.pages.dev', null)).toBe(false);
    expect(isOriginAllowed('https://attacker.workers.dev', null)).toBe(false);
    expect(isOriginAllowed('https://attacker.github.io', null)).toBe(false);

    // Legitimate domains should be allowed
    expect(isOriginAllowed('https://sealkit.org', null)).toBe(true);
    expect(isOriginAllowed('https://app.sealkit.org', null)).toBe(true);
    expect(isOriginAllowed('https://pdfseal.sealkit.org', null)).toBe(true);
    expect(isOriginAllowed('http://localhost:5173', null)).toBe(true);
    expect(isOriginAllowed('http://localhost', null)).toBe(true);
    expect(isOriginAllowed('http://127.0.0.1:8787', null)).toBe(true);
    expect(isOriginAllowed('https://pdfseal.pages.dev', null)).toBe(true);
  });

  it('should support custom ALLOWED_ORIGINS environment variable', () => {
    const env = { ALLOWED_ORIGINS: 'https://mycustomdomain.com, example.org' };
    expect(isOriginAllowed('https://mycustomdomain.com', env)).toBe(true);
    expect(isOriginAllowed('https://sub.example.org', env)).toBe(true);
    expect(isOriginAllowed('https://evil.com', env)).toBe(false);
  });

  it('should define correct expiration bounds', () => {
    expect(MIN_EXPIRATION_SECONDS).toBe(60);
    expect(MAX_EXPIRATION_SECONDS).toBe(7 * 86400);
    expect(DEFAULT_EXPIRATION_SECONDS).toBe(3600);
  });

  it('should return 503 STORAGE_UNAVAILABLE if R2 or KV bindings are missing on upload', async () => {
    const req = new Request('https://worker.local/api/send/upload', {
      method: 'POST',
      headers: {
        'Origin': 'https://sealkit.org'
      },
      body: new Uint8Array([1, 2, 3])
    });

    const env = {}; // No bindings
    const res = await worker.fetch(req, env, { waitUntil: () => {} });
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toBe('STORAGE_UNAVAILABLE');
  });

  it('should reject non-browser upload request with no Origin and no AUTH_SECRET_TOKEN', async () => {
    const req = new Request('https://worker.local/api/send/upload', {
      method: 'POST',
      body: new Uint8Array([1, 2, 3])
    });

    const env = {
      PDFSEAL_BUCKET: {},
      PDFSEAL_KV: {}
    };

    const res = await worker.fetch(req, env, { waitUntil: () => {} });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('UNAUTHORIZED_ORIGIN');
  });

  it('should reject unauthorized Origin on upload', async () => {
    const req = new Request('https://worker.local/api/send/upload', {
      method: 'POST',
      headers: {
        'Origin': 'https://evil-sealkit.org'
      },
      body: new Uint8Array([1, 2, 3])
    });

    const env = {
      PDFSEAL_BUCKET: {},
      PDFSEAL_KV: {}
    };

    const res = await worker.fetch(req, env, { waitUntil: () => {} });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('UNAUTHORIZED_ORIGIN');
  });
});

describe('Cloudflare Worker Storage Reconciliation & Orphan Sweeper (Fix 4)', () => {
  it('should delete orphan R2 objects whose KV expired and calibrate storage counter', async () => {
    const deletedR2Keys = [];
    const deletedKVKeys = [];
    let savedStorageCounter = null;

    const mockR2Objects = [
      { key: 'payload_seal_active1', size: 1000 },
      { key: 'payload_seal_orphan_expired', size: 2000 },
      { key: 'payload_seal_orphan_nokv', size: 3000 }
    ];

    const mockKVStore = new Map();
    // active1: still valid
    mockKVStore.set('meta_seal_active1', JSON.stringify({
      id: 'seal_active1',
      expiresAt: Date.now() + 100000
    }));
    // orphan_expired: expired in the past
    mockKVStore.set('meta_seal_orphan_expired', JSON.stringify({
      id: 'seal_orphan_expired',
      expiresAt: Date.now() - 5000
    }));
    // orphan_nokv: missing from KV (already purged by KV TTL)

    const env = {
      PDFSEAL_BUCKET: {
        list: vi.fn().mockResolvedValue({
          objects: mockR2Objects,
          truncated: false
        }),
        delete: vi.fn().mockImplementation((key) => {
          deletedR2Keys.push(key);
          return Promise.resolve();
        })
      },
      PDFSEAL_KV: {
        get: vi.fn().mockImplementation((key) => {
          return Promise.resolve(mockKVStore.get(key) || null);
        }),
        delete: vi.fn().mockImplementation((key) => {
          deletedKVKeys.push(key);
          return Promise.resolve();
        }),
        put: vi.fn().mockImplementation((key, val) => {
          if (key === 'stats_active_storage_bytes') {
            savedStorageCounter = val;
          }
          return Promise.resolve();
        })
      }
    };

    const summary = await reconcileStorage(env);

    expect(summary.scanned).toBe(3);
    expect(summary.orphansDeleted).toBe(2);
    expect(summary.activeBytes).toBe(1000); // only active1 size

    expect(deletedR2Keys).toContain('payload_seal_orphan_expired');
    expect(deletedR2Keys).toContain('payload_seal_orphan_nokv');
    expect(deletedR2Keys).not.toContain('payload_seal_active1');

    expect(deletedKVKeys).toContain('meta_seal_orphan_expired');
    expect(savedStorageCounter).toBe('1000');
  });
});
