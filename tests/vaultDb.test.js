import { describe, it, expect } from 'vitest';
import { computeSha256 } from '../src/utils/vaultDb';

describe('Local Vault Engine & Cryptographic Hash', () => {
  it('computes consistent SHA-256 digital fingerprint', async () => {
    const textEncoder = new TextEncoder();
    const data1 = textEncoder.encode('PDFSeal Sample Document 1');
    const data2 = textEncoder.encode('PDFSeal Sample Document 1');
    const data3 = textEncoder.encode('PDFSeal Sample Document 2 Different');

    const hash1 = await computeSha256(data1);
    const hash2 = await computeSha256(data2);
    const hash3 = await computeSha256(data3);

    expect(hash1).toBeDefined();
    expect(hash1.length).toBeGreaterThan(0);
    // Identical content must yield identical hash
    expect(hash1).toBe(hash2);
    // Different content must yield different hash
    expect(hash1).not.toBe(hash3);
  });

  it('computes hash for Uint8Array and ArrayBuffer slices seamlessly', async () => {
    const uint8 = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const hashUint8 = await computeSha256(uint8);
    const hashBuffer = await computeSha256(uint8.buffer);

    expect(hashUint8).toBe(hashBuffer);
  });
});
