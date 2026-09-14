import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  activateLemonLicense, 
  deactivateLemonLicense,
  getOrCreateInstanceId 
} from '../src/utils/security/lemonSqueezyLicense';

describe('LemonSqueezy License Gateway & Device Seat Management', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should generate a persistent device instance id', () => {
    const id1 = getOrCreateInstanceId();
    expect(id1).toBeTruthy();
    expect(id1.startsWith('PDFSeal-')).toBe(true);
  });

  it('should successfully activate a valid LemonSqueezy license key', async () => {
    const mockApiResponse = {
      activated: true,
      error: null,
      license_key: {
        id: 999123,
        status: 'active',
        key: '428b4887-test-key-valid',
        activation_limit: 3,
        activation_usage: 1,
        created_at: '2026-09-03T12:00:00.000Z',
        expires_at: null // lifetime
      },
      instance: {
        id: 'inst_abc123',
        name: 'PDFSeal-Device'
      },
      meta: {
        user_name: 'John Buyer',
        user_email: 'john@buyer.com'
      }
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse
    });

    const res = await activateLemonLicense('428b4887-test-key-valid', 'PDFSeal-Device');
    expect(res.success).toBe(true);
    expect(res.cert.name).toBe('John Buyer');
    expect(res.cert.email).toBe('john@buyer.com');
    expect(res.cert.tier).toBe('pro_lifetime');
    expect(res.cert.provider).toBe('lemonsqueezy');
    expect(res.cert.instanceId).toBe('inst_abc123');
  });

  it('should correctly handle seat limit reached error (activation_limit_reached)', async () => {
    const mockLimitResponse = {
      activated: false,
      error: 'This license key has reached its activation_limit_reached.'
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockLimitResponse
    });

    const res = await activateLemonLicense('over-limit-key');
    expect(res.success).toBe(false);
    expect(res.error).toContain('limit');
  });

  it('should correctly handle invalid or not found license keys', async () => {
    const mockNotFoundResponse = {
      activated: false,
      error: 'License key not_found.'
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockNotFoundResponse
    });

    const res = await activateLemonLicense('nonexistent-key');
    expect(res.success).toBe(false);
    expect(res.error).toContain('Invalid');
  });

  it('should successfully deactivate and release a device seat', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ deactivated: true })
    });

    const res = await deactivateLemonLicense('428b4887-test-key-valid', 'inst_abc123');
    expect(res.success).toBe(true);
  });
});
