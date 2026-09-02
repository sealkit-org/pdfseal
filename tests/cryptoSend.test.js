import { describe, it, expect } from 'vitest';
import { 
  generateSendKey, 
  exportKeyUrlSafe, 
  importKeyUrlSafe, 
  encryptFilePayload, 
  decryptFilePayload, 
  isPayloadPasswordProtected 
} from '../src/utils/cryptoSend';

describe('Seal Send E2EE Cryptographic Engine', () => {
  it('should generate, export to URL-safe string, and re-import 256-bit AES-GCM key', async () => {
    const key = await generateSendKey();
    const urlSafe = await exportKeyUrlSafe(key);
    expect(urlSafe).toBeTruthy();
    expect(urlSafe).not.toContain('+');
    expect(urlSafe).not.toContain('/');
    expect(urlSafe).not.toContain('=');

    const importedKey = await importKeyUrlSafe(urlSafe);
    expect(importedKey).toBeDefined();
    expect(importedKey.algorithm.name).toBe('AES-GCM');
  });

  it('should encrypt and decrypt PDF payload with 100% data integrity without password', async () => {
    const key = await generateSendKey();
    const originalPdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x99, 0x88, 0x77]);
    const payload = {
      name: 'Confidential_Report_2026.pdf',
      pageCount: 15,
      arrayBuffer: originalPdfData.buffer
    };

    // 1. Encrypt locally in memory
    const encryptedBytes = await encryptFilePayload(payload, key, '');
    expect(encryptedBytes.byteLength).toBeGreaterThan(originalPdfData.byteLength);
    expect(isPayloadPasswordProtected(encryptedBytes)).toBe(false);

    // 2. Export key and simulate recipient receiving link
    const keyString = await exportKeyUrlSafe(key);
    const recipientKey = await importKeyUrlSafe(keyString);

    // 3. Decrypt on recipient side
    const result = await decryptFilePayload(encryptedBytes, recipientKey, '');
    expect(result.name).toBe('Confidential_Report_2026.pdf');
    expect(result.pageCount).toBe(15);
    expect(result.size).toBe(originalPdfData.byteLength);

    const decryptedArray = new Uint8Array(result.arrayBuffer);
    expect(decryptedArray).toEqual(originalPdfData);
  });

  it('should handle optional password protection layer with PBKDF2', async () => {
    const key = await generateSendKey();
    const originalPdfData = new TextEncoder().encode('%PDF-1.4 Secret Tax Documents 2026');
    const payload = {
      name: 'Taxes.pdf',
      pageCount: 3,
      arrayBuffer: originalPdfData.buffer
    };

    const pin = '8899';
    const encryptedBytes = await encryptFilePayload(payload, key, pin);
    expect(isPayloadPasswordProtected(encryptedBytes)).toBe(true);

    const keyString = await exportKeyUrlSafe(key);
    const recipientKey = await importKeyUrlSafe(keyString);

    // Missing password
    await expect(decryptFilePayload(encryptedBytes, recipientKey, ''))
      .rejects.toThrow('PASSWORD_REQUIRED');

    // Wrong password
    await expect(decryptFilePayload(encryptedBytes, recipientKey, '1234'))
      .rejects.toThrow('INVALID_PASSWORD');

    // Correct password
    const result = await decryptFilePayload(encryptedBytes, recipientKey, '8899');
    expect(result.name).toBe('Taxes.pdf');
    expect(new Uint8Array(result.arrayBuffer)).toEqual(originalPdfData);
  });

  it('should reject tampered ciphertext with AES-GCM authentication failure', async () => {
    const key = await generateSendKey();
    const originalPdfData = new Uint8Array([1, 2, 3, 4, 5]);
    const payload = { name: 'doc.pdf', pageCount: 1, arrayBuffer: originalPdfData.buffer };

    const encryptedBytes = await encryptFilePayload(payload, key, '');
    
    // Tamper with one byte in the ciphertext body
    encryptedBytes[encryptedBytes.length - 5] ^= 0xFF;

    await expect(decryptFilePayload(encryptedBytes, key, ''))
      .rejects.toThrow('INVALID_MASTER_KEY_OR_TAMPERED');
  });
});
