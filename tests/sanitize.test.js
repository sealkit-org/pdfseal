import { describe, it, expect } from 'vitest';
import { PDFDocument, PDFName } from 'pdf-lib';

describe('PDF Metadata Sanitizer', () => {
  it('should inspect and completely strip private author, title, subject, keywords, creator, producer, creationDate, and modDate', async () => {
    // 1. Create document with sensitive metadata
    const doc = await PDFDocument.create({ updateMetadata: false });
    doc.updateMetadata = false;
    doc.addPage([200, 200]);
    doc.setTitle('Sensitive Financial Report 2026');
    doc.setAuthor('John Doe (MacBook-Pro-16)');
    doc.setSubject('Q3 Confidential Taxes');
    doc.setKeywords(['taxes', 'revenue', 'private']);
    doc.setCreator('Microsoft Word 365');
    doc.setProducer('Adobe PDF Library 15.0');
    doc.setCreationDate(new Date('2026-01-01T08:00:00Z'));
    doc.setModificationDate(new Date('2026-09-01T12:00:00Z'));
    const dirtyBytes = await doc.save();

    // 2. Verify metadata exists in dirty document
    const loadedDirty = await PDFDocument.load(dirtyBytes, { updateMetadata: false });
    expect(loadedDirty.getTitle()).toBe('Sensitive Financial Report 2026');
    expect(loadedDirty.getAuthor()).toBe('John Doe (MacBook-Pro-16)');
    expect(loadedDirty.getSubject()).toBe('Q3 Confidential Taxes');
    expect(loadedDirty.getKeywords()).toContain('taxes');
    expect(loadedDirty.getCreator()).toBe('Microsoft Word 365');
    expect(loadedDirty.getProducer()).toBe('Adobe PDF Library 15.0');
    expect(loadedDirty.getCreationDate()).toBeInstanceOf(Date);
    expect(loadedDirty.getModificationDate()).toBeInstanceOf(Date);

    // 3. Execute Complete Deep Sanitization Routine
    loadedDirty.updateMetadata = false;
    try {
      const infoRef = loadedDirty.context.trailerInfo?.Info;
      if (infoRef) {
        const infoDict = loadedDirty.context.lookup(infoRef);
        if (infoDict && infoDict.delete) {
          infoDict.delete(PDFName.of('Title'));
          infoDict.delete(PDFName.of('Author'));
          infoDict.delete(PDFName.of('Subject'));
          infoDict.delete(PDFName.of('Keywords'));
          infoDict.delete(PDFName.of('Creator'));
          infoDict.delete(PDFName.of('Producer'));
          infoDict.delete(PDFName.of('CreationDate'));
          infoDict.delete(PDFName.of('ModDate'));
          infoDict.delete(PDFName.of('Trapped'));
        }
        loadedDirty.context.delete(infoRef);
      }
      if (loadedDirty.context.trailerInfo) {
        delete loadedDirty.context.trailerInfo.Info;
      }
    } catch (e) {}

    // Clear standard fields
    loadedDirty.setTitle('');
    loadedDirty.setAuthor('');
    loadedDirty.setSubject('');
    loadedDirty.setKeywords([]);
    loadedDirty.setProducer('');
    loadedDirty.setCreator('');

    // Strip XMP stream and PieceInfo from Catalog
    try {
      const catalog = loadedDirty.catalog;
      const metadataKey = PDFName.of('Metadata');
      if (catalog && catalog.has(metadataKey)) {
        catalog.delete(metadataKey);
      }
      const pieceInfoKey = PDFName.of('PieceInfo');
      if (catalog && catalog.has(pieceInfoKey)) {
        catalog.delete(pieceInfoKey);
      }
    } catch (e) {}

    const cleanBytes = await loadedDirty.save();
    const loadedClean = await PDFDocument.load(cleanBytes, { updateMetadata: false });

    // 4. Assert all private metadata has been completely stripped (0 privacy leakage)
    expect(loadedClean.getTitle()).toBeFalsy();
    expect(loadedClean.getAuthor()).toBeFalsy();
    expect(loadedClean.getSubject()).toBeFalsy();
    expect(loadedClean.getKeywords()).toBeFalsy();
    expect(loadedClean.getCreator()).toBeFalsy();
    expect(loadedClean.getProducer()).toBeFalsy();
    expect(loadedClean.getCreationDate()).toBeFalsy();
    expect(loadedClean.getModificationDate()).toBeFalsy();
  });
});
