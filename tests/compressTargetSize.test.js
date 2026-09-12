import { describe, it, expect } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { 
  paramFromQualityIndex, 
  compressPdfToTargetSize, 
  compressPdf 
} from '../src/utils/pdfCompress';
import { executeCompressNode } from '../src/utils/pipeline/nodes/compressNode';
import { AVAILABLE_NODES } from '../src/utils/pipeline/pipelineTypes';

describe('Target Size Compression & Bisection Engine (Sprint 3.2)', () => {
  describe('paramFromQualityIndex - Monotonic Clarity Curve', () => {
    it('should correctly produce boundary values for t = 0 and t = 1', () => {
      const minParam = paramFromQualityIndex(0);
      expect(minParam.scale).toBe(0.75);
      expect(minParam.quality).toBe(0.35);

      const maxParam = paramFromQualityIndex(1);
      expect(maxParam.scale).toBe(2.50);
      expect(maxParam.quality).toBe(0.85);
    });

    it('should clamp out-of-range t values', () => {
      const belowZero = paramFromQualityIndex(-0.5);
      expect(belowZero.scale).toBe(0.75);
      expect(belowZero.quality).toBe(0.35);

      const aboveOne = paramFromQualityIndex(1.5);
      expect(aboveOne.scale).toBe(2.50);
      expect(aboveOne.quality).toBe(0.85);
    });

    it('should be strictly monotonic increasing across t = 0 to 1', () => {
      const steps = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0];
      const params = steps.map(t => paramFromQualityIndex(t));

      for (let i = 0; i < params.length - 1; i++) {
        expect(params[i].scale).toBeLessThanOrEqual(params[i + 1].scale);
        expect(params[i].quality).toBeLessThanOrEqual(params[i + 1].quality);
      }
    });
  });

  describe('compressPdfToTargetSize & Size Guard', () => {
    async function createSamplePdf(pageCount = 2) {
      const doc = await PDFDocument.create();
      const font = await doc.embedFont(StandardFonts.Helvetica);
      for (let i = 0; i < pageCount; i++) {
        const page = doc.addPage([600, 800]);
        page.drawText(`Sample Document Page ${i + 1} with text content.`, {
          x: 50,
          y: 720,
          size: 16,
          font
        });
      }
      return await doc.save();
    }

    it('should retain original/lossless without lossy downsampling when original is already smaller than target', async () => {
      const samplePdf = await createSamplePdf(1);
      const targetSizeMb = 5.0; // 5 MB (sample is < 2 KB)

      const messages = [];
      const onProgress = (pct, msg) => {
        messages.push(msg);
      };

      const result = await compressPdfToTargetSize(samplePdf.buffer, targetSizeMb, {}, onProgress);
      expect(result).toBeDefined();
      expect(result.byteLength).toBeGreaterThan(0);
      expect(result.byteLength).toBeLessThanOrEqual(targetSizeMb * 1024 * 1024);
      // Confirmed lossless path executed
      expect(messages.some(m => m.includes('无损'))).toBe(true);
    });

    it('should dispatch level === "target" via universal compressPdf', async () => {
      const samplePdf = await createSamplePdf(2);
      const result = await compressPdf(samplePdf.buffer, 'target', { targetSizeMb: 2.0 });

      expect(result).toBeDefined();
      expect(result.byteLength).toBeGreaterThan(0);
      expect(result.byteLength).toBeLessThanOrEqual(2.0 * 1024 * 1024);
    });

    it('should enforce the anti-inflation guard so output is never larger than input', async () => {
      const samplePdf = await createSamplePdf(1);
      const result = await compressPdfToTargetSize(samplePdf.buffer, 10.0);

      expect(result.byteLength).toBeLessThanOrEqual(samplePdf.byteLength);
    });
  });

  describe('Pipeline Integration for Target Size', () => {
    it('should have node_compress configured with targetSizeMb in AVAILABLE_NODES', () => {
      const nodeDef = AVAILABLE_NODES.node_compress;
      expect(nodeDef).toBeDefined();
      expect(nodeDef.defaultParams.targetSizeMb).toBe(2);
    });

    it('should successfully execute executeCompressNode with level="target" and targetSizeMb=2', async () => {
      const doc = await PDFDocument.create();
      const page = doc.addPage([500, 500]);
      page.drawText('Pipeline Compress Item', { x: 50, y: 400, size: 14 });
      const itemBytes = await doc.save();

      const items = [
        { name: 'Visa_Application.pdf', data: itemBytes }
      ];

      const progressLogs = [];
      const onProgress = (pct, msg) => {
        progressLogs.push({ pct, msg });
      };

      const out = await executeCompressNode(items, { level: 'target', targetSizeMb: 2 }, onProgress);

      expect(out.length).toBe(1);
      expect(out[0].name).toBe('Visa_Application_Compressed.pdf');
      expect(out[0].data.byteLength).toBeGreaterThan(0);
      expect(out[0].data.byteLength).toBeLessThanOrEqual(2 * 1024 * 1024);

      const hasTargetLog = progressLogs.some(l => l.msg.includes('≤ 2 MB'));
      expect(hasTargetLog).toBe(true);
    });

    it('should validate level="target" policy permissions correctly across tiers', async () => {
      const { validatePipelinePreflight } = await import('../src/utils/pipeline/pipelinePolicy');
      const pipelineDef = {
        name: 'Target Size Flow',
        steps: [
          { id: 's1', nodeId: 'node_compress', params: { level: 'target', targetSizeMb: 2 } }
        ]
      };
      const dummyFiles = [{ name: 'doc.pdf', data: new Uint8Array([1, 2, 3]) }];

      // Free tier requires Pro for target size
      const freeCheck = validatePipelinePreflight(pipelineDef, dummyFiles, 'free');
      expect(freeCheck.pass).toBe(false);
      expect(freeCheck.code).toBe('ERR_NODE_COMPRESS_LEVEL');

      // Pro tier allows target size
      const proCheck = validatePipelinePreflight(pipelineDef, dummyFiles, 'pro');
      expect(proCheck.pass).toBe(true);
    });
  });
});
