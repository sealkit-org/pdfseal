import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { createZipBlob } from '../src/utils/zipUtils';

describe('ZIP Packaging Utility (zipUtils)', () => {
  it('should package multiple files into a valid ZIP blob with expected contents', async () => {
    const files = [
      { name: 'document_1.pdf', data: new Uint8Array([1, 2, 3, 4, 5]) },
      { name: 'document_2.pdf', data: new Uint8Array([6, 7, 8, 9, 10]) },
      { name: 'notes.txt', data: 'Hello PDFSeal ZIP' }
    ];

    let progressCalls = 0;
    const blob = await createZipBlob(files, (percent) => {
      progressCalls++;
      expect(percent).toBeGreaterThanOrEqual(0);
      expect(percent).toBeLessThanOrEqual(100);
    });

    expect(blob).toBeTruthy();
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toBe('application/zip');
    expect(progressCalls).toBeGreaterThan(0);

    // Read back and inspect entries
    const arrayBuffer = await blob.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    expect(zip.file('document_1.pdf')).toBeTruthy();
    expect(zip.file('document_2.pdf')).toBeTruthy();
    expect(zip.file('notes.txt')).toBeTruthy();

    const notesContent = await zip.file('notes.txt').async('string');
    expect(notesContent).toBe('Hello PDFSeal ZIP');

    const doc1Bytes = await zip.file('document_1.pdf').async('uint8array');
    expect(Array.from(doc1Bytes)).toEqual([1, 2, 3, 4, 5]);
  });

  it('should throw error when files array is empty', async () => {
    await expect(createZipBlob([])).rejects.toThrow('No files provided');
    await expect(createZipBlob(null)).rejects.toThrow('No files provided');
  });
});
