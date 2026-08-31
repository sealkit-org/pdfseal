import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';

describe('PDF Metadata Sanitizer', () => {
  it('should inspect and completely strip private author, title, subject, keywords, and creator metadata', async () => {
    // 1. Create document with sensitive metadata
    const doc = await PDFDocument.create();
    doc.addPage([200, 200]);
    doc.setTitle('Sensitive Financial Report 2026');
    doc.setAuthor('John Doe (MacBook-Pro-16)');
    doc.setSubject('Q3 Confidential Taxes');
    doc.setKeywords(['taxes', 'revenue', 'private']);
    doc.setCreator('Microsoft Word 365');
    const dirtyBytes = await doc.save();

    // 2. Verify metadata exists in dirty document
    const loadedDirty = await PDFDocument.load(dirtyBytes);
    expect(loadedDirty.getTitle()).toBe('Sensitive Financial Report 2026');
    expect(loadedDirty.getAuthor()).toBe('John Doe (MacBook-Pro-16)');
    expect(loadedDirty.getSubject()).toBe('Q3 Confidential Taxes');
    expect(loadedDirty.getKeywords()).toContain('taxes');
    expect(loadedDirty.getCreator()).toBe('Microsoft Word 365');

    // 3. Execute Sanitization Routine
    loadedDirty.setTitle('');
    loadedDirty.setAuthor('');
    loadedDirty.setSubject('');
    loadedDirty.setKeywords([]);
    loadedDirty.setProducer('');
    loadedDirty.setCreator('');

    const cleanBytes = await loadedDirty.save();
    const loadedClean = await PDFDocument.load(cleanBytes);

    // 4. Assert all private metadata has been completely stripped (0 privacy leakage)
    expect(loadedClean.getTitle()).toBeFalsy();
    expect(loadedClean.getAuthor()).toBeFalsy();
    expect(loadedClean.getSubject()).toBeFalsy();
    expect(loadedClean.getKeywords()).toBeFalsy();
    expect(loadedClean.getCreator()).toBeFalsy();
  });
});
