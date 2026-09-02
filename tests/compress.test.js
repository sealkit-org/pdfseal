import { describe, it, expect } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { detectDocumentType, compressPdfLossless } from '../src/utils/pdfCompress.js';

describe('PDF Compress & Document Type Detection Engine', () => {
  it('should detect a text-heavy document as vector', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([500, 500]);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    page.drawText('This is a text heavy legal document with lots of clauses, paragraphs, and vector elements.', {
      x: 50,
      y: 450,
      size: 14,
      font
    });

    const pdfBytes = await doc.save();
    const result = await detectDocumentType(pdfBytes.buffer);

    expect(result.type).toBe('vector');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('should perform lossless structural compression on document', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([600, 800]);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    page.drawText('Testing lossless structural object stream compression.', {
      x: 50,
      y: 700,
      size: 16,
      font
    });

    const originalBytes = await doc.save();
    const compressedBytes = await compressPdfLossless(originalBytes.buffer);

    expect(compressedBytes.byteLength).toBeGreaterThan(0);
    const reloaded = await PDFDocument.load(compressedBytes);
    expect(reloaded.getPageCount()).toBe(1);
  });
});
