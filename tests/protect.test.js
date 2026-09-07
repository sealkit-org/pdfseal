import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { encryptPDF } from '@pdfsmaller/pdf-encrypt';
import { verifyPdfSecurity, loadCleanPdfDocument } from '../src/utils/pdfSecurity';
import { executeProtectNode } from '../src/utils/pipeline/nodes/protectNode';
import { executePipelineNode } from '../src/utils/pipeline/nodes/index';

describe('PDF Protect & Encryption Engine', () => {
  async function createSamplePdfBytes(pageCount = 1) {
    const doc = await PDFDocument.create();
    for (let i = 0; i < pageCount; i++) {
      doc.addPage([400, 600]);
    }
    return await doc.save();
  }

  it('should encrypt PDF with AES-256 User & Owner passwords and enforce password to open', async () => {
    const rawBytes = await createSamplePdfBytes(2);
    const userPassword = 'user_open_secret';
    const ownerPassword = 'owner_master_secret';

    const encryptedBytes = await encryptPDF(rawBytes, userPassword, {
      ownerPassword,
      algorithm: 'AES-256',
      allowPrinting: false,
      allowCopying: false,
      allowModifying: false,
      allowAnnotating: false
    });

    expect(encryptedBytes).toBeTruthy();
    expect(encryptedBytes.length).toBeGreaterThan(0);

    // 1. Without password, open should be blocked
    const secNoPass = await verifyPdfSecurity(encryptedBytes.buffer, '');
    expect(secNoPass.isEncrypted).toBe(true);
    expect(secNoPass.isOpenPasswordRequired).toBe(true);
    expect(secNoPass.isValid).toBe(false);

    // 2. With correct password, open should succeed
    const secWithPass = await verifyPdfSecurity(encryptedBytes.buffer, userPassword);
    expect(secWithPass.isEncrypted).toBe(true);
    expect(secWithPass.isValid).toBe(true);

    // 3. Document can be loaded and read with user password
    const cleanDoc = await loadCleanPdfDocument(encryptedBytes, { password: userPassword });
    expect(cleanDoc.getPageCount()).toBe(2);
  });

  it('should support Owner-Only permission lock (open without password, but encrypted)', async () => {
    const rawBytes = await createSamplePdfBytes(1);
    const ownerPassword = 'owner_perm_only_123';

    const encryptedBytes = await encryptPDF(rawBytes, '', {
      ownerPassword,
      algorithm: 'AES-256',
      allowPrinting: true,
      allowCopying: false,
      allowModifying: false,
      allowAnnotating: true
    });

    const sec = await verifyPdfSecurity(encryptedBytes.buffer, '');
    expect(sec.isEncrypted).toBe(true);
    expect(sec.isOpenPasswordRequired).toBe(false);

    // Reader opens it without password prompt
    const cleanDoc = await loadCleanPdfDocument(encryptedBytes);
    expect(cleanDoc.getPageCount()).toBe(1);
  });

  it('should support legacy RC4 128-bit encryption algorithm', async () => {
    const rawBytes = await createSamplePdfBytes(1);
    const userPassword = 'rc4_secret_key';

    const encryptedBytes = await encryptPDF(rawBytes, userPassword, {
      ownerPassword: 'rc4_owner_key',
      algorithm: 'RC4'
    });

    const sec = await verifyPdfSecurity(encryptedBytes.buffer, userPassword);
    expect(sec.isEncrypted).toBe(true);
    expect(sec.isValid).toBe(true);
  });

  it('should execute protectNode in pipeline headless engine on batch items', async () => {
    const rawBytes = await createSamplePdfBytes(1);
    const items = [
      { name: 'invoice_alpha.pdf', data: rawBytes },
      { name: 'invoice_beta.pdf', data: rawBytes }
    ];

    const results = await executeProtectNode(items, {
      userPassword: 'batch_open_pass',
      ownerPassword: 'batch_owner_pass',
      algorithm: 'AES-256',
      allowPrinting: false
    });

    expect(results.length).toBe(2);
    expect(results[0].name).toBe('invoice_alpha_Protected.pdf');
    expect(results[1].name).toBe('invoice_beta_Protected.pdf');
    expect(results[0].isEncrypted).toBe(true);
    expect(results[1].isEncrypted).toBe(true);

    // Verify both can be unlocked with batch password
    const checkSec = await verifyPdfSecurity(results[0].data.buffer, 'batch_open_pass');
    expect(checkSec.isValid).toBe(true);
  });

  it('should be invocable via executePipelineNode dispatcher', async () => {
    const rawBytes = await createSamplePdfBytes(1);
    const items = [{ name: 'doc.pdf', data: rawBytes }];

    const results = await executePipelineNode('node_protect', items, {
      userPassword: 'pass',
      ownerPassword: 'owner'
    });

    expect(results.length).toBe(1);
    expect(results[0].name).toBe('doc_Protected.pdf');
    expect(results[0].isEncrypted).toBe(true);
  });

  it('should throw an error on malformed or non-PDF bytes', async () => {
    const corruptedBytes = new TextEncoder().encode('function arrayBuffer() { [native code] }');
    await expect(
      encryptPDF(corruptedBytes, 'pass123', { algorithm: 'AES-256' })
    ).rejects.toThrow(/failed to parse|no pdf header|invalid pdf/i);
  });
});

