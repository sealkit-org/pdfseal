import { describe, it, expect, beforeAll } from 'vitest';
import { 
  verifySupporterCertificate, 
  signSupporterCertificate,
  ISSUER_PUBLIC_KEY_JWK 
} from '../src/utils/security/supporterCertificate';
import fs from 'fs';
import path from 'path';

const PRIVATE_KEY_PATH = path.join(__dirname, '../.keys/issuer-private-key.json');

let privateKeyJwk;
let testPublicKeyJwk = null;

describe('Supporter Certificate & Cryptographic License Engine', () => {
  beforeAll(async () => {
    if (fs.existsSync(PRIVATE_KEY_PATH)) {
      privateKeyJwk = JSON.parse(fs.readFileSync(PRIVATE_KEY_PATH, 'utf8'));
      testPublicKeyJwk = null; // Uses official embedded ISSUER_PUBLIC_KEY_JWK
    } else {
      // In CI / clean clone environments where private keys are strictly gitignored,
      // generate an ephemeral test ECDSA key pair in memory.
      const subtle = globalThis.crypto.subtle;
      const keyPair = await subtle.generateKey(
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['sign', 'verify']
      );
      privateKeyJwk = await subtle.exportKey('jwk', keyPair.privateKey);
      testPublicKeyJwk = await subtle.exportKey('jwk', keyPair.publicKey);
    }
  });

  it('should successfully verify a freshly signed lifetime certificate', async () => {
    const payload = {
      id: 'cert_test_1',
      name: 'Alice Legal Partner',
      email: 'alice@lawfirm.com',
      tier: 'pro_lifetime',
      issuedAt: Date.now(),
      expiresAt: null
    };

    const certString = await signSupporterCertificate(payload, privateKeyJwk);
    expect(certString.startsWith('SEAL-')).toBe(true);

    const res = await verifySupporterCertificate(certString, testPublicKeyJwk);
    expect(res.valid).toBe(true);
    expect(res.cert.name).toBe('Alice Legal Partner');
    expect(res.cert.email).toBe('alice@lawfirm.com');
    expect(res.cert.tier).toBe('pro_lifetime');
    expect(res.cert.expiresAt).toBeNull();
  });

  it('should verify a valid annual certificate with future expiration', async () => {
    const futureDate = Date.now() + 1000 * 60 * 60 * 24 * 365; // 1 year later
    const payload = {
      id: 'cert_test_annual',
      name: 'Bob Accountant',
      email: 'bob@cpa.com',
      tier: 'pro_annual',
      issuedAt: Date.now(),
      expiresAt: futureDate
    };

    const certString = await signSupporterCertificate(payload, privateKeyJwk);
    const res = await verifySupporterCertificate(certString, testPublicKeyJwk);
    expect(res.valid).toBe(true);
    expect(res.cert.tier).toBe('pro_annual');
    expect(res.cert.expiresAt).toBe(futureDate);
  });

  it('should reject an expired certificate with clear expired flag and message', async () => {
    const pastDate = Date.now() - 1000 * 60 * 60 * 24; // 1 day ago
    const payload = {
      id: 'cert_expired',
      name: 'Charlie Expired',
      tier: 'pro_annual',
      issuedAt: Date.now() - 1000 * 60 * 60 * 24 * 366,
      expiresAt: pastDate
    };

    const certString = await signSupporterCertificate(payload, privateKeyJwk);
    const res = await verifySupporterCertificate(certString, testPublicKeyJwk);
    expect(res.valid).toBe(false);
    expect(res.expired).toBe(true);
    expect(res.error.toLowerCase()).toContain('expired');
  });

  it('should reject a tampered certificate where payload was modified by an attacker', async () => {
    const payload = {
      id: 'cert_legit',
      name: 'Legit User',
      tier: 'pro_annual',
      issuedAt: Date.now(),
      expiresAt: Date.now() + 100000
    };

    const certString = await signSupporterCertificate(payload, privateKeyJwk);
    // Attacker tampers with 1 byte of the base64 payload
    const parts = certString.split('.');
    const tamperedPayloadB64 = parts[0].slice(0, -2) + 'AA'; // mutate
    const tamperedCert = `${tamperedPayloadB64}.${parts[1]}`;

    const res = await verifySupporterCertificate(tamperedCert, testPublicKeyJwk);
    expect(res.valid).toBe(false);
    expect(res.error.toLowerCase()).toContain('signature verification failed');
  });

  it('should reject malformed or empty certificate strings gracefully', async () => {
    const res1 = await verifySupporterCertificate('');
    expect(res1.valid).toBe(false);

    const res2 = await verifySupporterCertificate('INVALID-PREFIX-1234');
    expect(res2.valid).toBe(false);

    const res3 = await verifySupporterCertificate('SEAL-onlyonepart');
    expect(res3.valid).toBe(false);
  });
});
