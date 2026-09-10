import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { validatePipelinePreflight, canSaveNewPipeline } from '../src/utils/pipeline/pipelinePolicy';
import { checkNodeCompatibility, AVAILABLE_NODES } from '../src/utils/pipeline/pipelineTypes';
import { executeMergeNode } from '../src/utils/pipeline/nodes/mergeNode';
import { executeSanitizeNode } from '../src/utils/pipeline/nodes/sanitizeNode';
import { parseRangeExpression } from '../src/utils/pipeline/nodes/splitNode';
import { runPipeline } from '../src/utils/pipeline/pipelineRunner';
import { saveUserPipeline, loadUserPipelines, deleteUserPipeline } from '../src/utils/pipeline/userPipelines';

describe('Pipeline Automation & Policy Engine', () => {
  // Helper to create a minimal 1-page PDF
  async function createTestPdf(pageText = 'Hello PDF') {
    const doc = await PDFDocument.create();
    const page = doc.addPage([200, 200]);
    doc.setTitle('Original Title');
    doc.setAuthor('Original Author');
    const bytes = await doc.save();
    return bytes;
  }

  describe('Policy Preflight Verification', () => {
    it('should reject batch runs exceeding free file limit (3 files max)', () => {
      const pipelineDef = {
        name: 'Test Flow',
        steps: [{ id: '1', nodeId: 'node_sanitize', params: {} }]
      };
      const files = [
        { name: '1.pdf', data: new Uint8Array([1]) },
        { name: '2.pdf', data: new Uint8Array([2]) },
        { name: '3.pdf', data: new Uint8Array([3]) },
        { name: '4.pdf', data: new Uint8Array([4]) }
      ];

      const checkFree = validatePipelinePreflight(pipelineDef, files, 'free');
      expect(checkFree.pass).toBe(false);
      expect(checkFree.code).toBe('ERR_MAX_BATCH_FILES');
      expect(checkFree.triggerPro).toBe(true);

      const checkPro = validatePipelinePreflight(pipelineDef, files, 'pro');
      expect(checkPro.pass).toBe(true);
    });

    it('should reject pipelines exceeding free step limit (3 steps max)', () => {
      const pipelineDef = {
        name: 'Long Flow',
        steps: [
          { id: '1', nodeId: 'node_unlock', params: {} },
          { id: '2', nodeId: 'node_sanitize', params: {} },
          { id: '3', nodeId: 'node_watermark', params: {} },
          { id: '4', nodeId: 'node_compress', params: {} }
        ]
      };
      const files = [{ name: '1.pdf', data: new Uint8Array([1]) }];

      const check = validatePipelinePreflight(pipelineDef, files, 'free');
      expect(check.pass).toBe(false);
      expect(check.code).toBe('ERR_MAX_STEPS');
      expect(check.triggerPro).toBe(true);
    });

    it('should gate node_sign batch stamping for more than 1 file in free tier', () => {
      const pipelineDef = {
        name: 'Sign Flow',
        steps: [{ id: '1', nodeId: 'node_sign', params: {} }]
      };
      const files = [
        { name: '1.pdf', data: new Uint8Array([1]) },
        { name: '2.pdf', data: new Uint8Array([2]) }
      ];

      const check = validatePipelinePreflight(pipelineDef, files, 'free');
      expect(check.pass).toBe(false);
      expect(check.code).toBe('ERR_NODE_SIGN_LIMIT');
      expect(check.triggerPro).toBe(true);
    });

    it('should enforce saved pipeline quota', () => {
      expect(canSaveNewPipeline(2, 'free').allowed).toBe(true);
      expect(canSaveNewPipeline(3, 'free').allowed).toBe(false);
      expect(canSaveNewPipeline(50, 'pro').allowed).toBe(true);
    });
  });

  describe('Node Compatibility & Type Port Checking', () => {
    it('should accept valid sequential node pairings', () => {
      expect(checkNodeCompatibility('node_img2pdf', 'node_compress').compatible).toBe(true);
      expect(checkNodeCompatibility('node_merge', 'node_watermark').compatible).toBe(true);
      expect(checkNodeCompatibility('node_sanitize', 'node_compress').compatible).toBe(true);
    });

    it('should define the pdf2img node with explode topology and image output', () => {
      const node = AVAILABLE_NODES.node_pdf2img;
      expect(node).toBeDefined();
      expect(node.outputs).toContain('image_docs');
      expect(node.topology).toBe('explode');
      expect(node.defaultParams).toEqual({ format: 'png', dpi: 150 });
    });

    it('should suggest inserting a pdf2img node when feeding image consumer from PDF producer', () => {
      // e.g. Split (PDF out) -> Image to PDF (expects images in) is incompatible
      const check = checkNodeCompatibility('node_split', 'node_img2pdf');
      expect(check.compatible).toBe(false);
      expect(check.suggestion).toContain('PDF 转图片');
    });

    it('should accurately parse range expression in split node', () => {
      expect(parseRangeExpression('1-3, 5', 10)).toEqual([0, 1, 2, 4]);
      expect(parseRangeExpression('2', 5)).toEqual([1]);
      expect(parseRangeExpression('', 3)).toEqual([0, 1, 2]);
    });
  });

  describe('Headless Node Execution & Pipeline Runner', () => {
    it('should merge 2 separate PDFs into 1 single document', async () => {
      const pdf1 = await createTestPdf('Doc 1');
      const pdf2 = await createTestPdf('Doc 2');

      const items = [
        { id: '1', name: 'doc1.pdf', data: pdf1, mimeType: 'application/pdf' },
        { id: '2', name: 'doc2.pdf', data: pdf2, mimeType: 'application/pdf' }
      ];

      const merged = await executeMergeNode(items, { sortBy: 'order' });
      expect(merged).toHaveLength(1);
      expect(merged[0].name).toBe('Merged_Document.pdf');

      const reloaded = await PDFDocument.load(merged[0].data);
      expect(reloaded.getPageCount()).toBe(2);
    });

    it('should sanitize metadata from PDF items', async () => {
      const pdf = await createTestPdf('Doc with metadata');
      const items = [{ id: '1', name: 'target.pdf', data: pdf, mimeType: 'application/pdf' }];

      const sanitized = await executeSanitizeNode(items, { stripDocInfo: true });
      expect(sanitized).toHaveLength(1);

      const reloaded = await PDFDocument.load(sanitized[0].data, { updateMetadata: false });
      expect(reloaded.getTitle()).toBeFalsy();
      expect(reloaded.getAuthor()).toBeFalsy();
      expect(reloaded.getProducer()).toBeFalsy();
    });

    it('should successfully execute a multi-step pipeline through runPipeline in Pro tier', async () => {
      const pdf = await createTestPdf('Multi-step test');
      const files = [{ name: 'sample.pdf', data: pdf, mimeType: 'application/pdf' }];

      const pipelineDef = {
        name: 'Sanitize and Watermark Flow',
        steps: [
          { id: 'step_1', nodeId: 'node_sanitize', params: { stripDocInfo: true } },
          { id: 'step_2', nodeId: 'node_watermark', params: { text: 'APPROVED', opacity: 0.3 } }
        ],
        exportConfig: {
          namingTemplate: '{original}_Processed_{date}.pdf'
        }
      };

      const progressSteps = [];
      const result = await runPipeline(pipelineDef, files, {
        userTier: 'pro',
        onProgress: (p) => progressSteps.push(p.stepName)
      });

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toContain('sample_Processed_');
      expect(progressSteps.length).toBeGreaterThan(0);

      const finalPdf = await PDFDocument.load(result.items[0].data, { updateMetadata: false });
      expect(finalPdf.getTitle()).toBeFalsy();
      expect(finalPdf.getPageCount()).toBe(1);
    });

    it('should successfully execute standard naming pipeline in Free tier', async () => {
      const pdf = await createTestPdf('Free tier test');
      const files = [{ name: 'free_doc.pdf', data: pdf, mimeType: 'application/pdf' }];

      const pipelineDef = {
        name: 'Free Flow',
        steps: [
          { id: 'step_1', nodeId: 'node_sanitize', params: { stripDocInfo: true } }
        ],
        exportConfig: {
          destination: 'download_files'
        }
      };

      const result = await runPipeline(pipelineDef, files, { userTier: 'free' });
      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(1);
    });
  });

  describe('User Custom Pipeline Persistence', () => {
    it('should save, load, update, and delete custom pipelines in localStorage', () => {
      // Mock window.localStorage
      const store = {};
      global.window = {
        localStorage: {
          getItem: (k) => store[k] || null,
          setItem: (k, v) => { store[k] = v; },
          removeItem: (k) => { delete store[k]; }
        }
      };

      // 1. Initial load should be empty
      expect(loadUserPipelines()).toEqual([]);

      // 2. Save new pipeline
      const saved = saveUserPipeline({
        name: 'My Custom Invoice Flow',
        desc: 'Testing pipeline persistence',
        steps: [{ nodeId: 'node_img2pdf', params: { pageSize: 'a4' } }]
      });

      expect(saved).toBeTruthy();
      expect(saved.id).toContain('custom_flow_');
      expect(saved.name).toBe('My Custom Invoice Flow');
      expect(saved.isCustom).toBe(true);

      // 3. Load pipelines
      const list = loadUserPipelines();
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe(saved.id);
      expect(list[0].steps).toHaveLength(1);

      // 4. Update pipeline
      const updated = saveUserPipeline({
        id: saved.id,
        name: 'Renamed Invoice Flow',
        steps: [{ nodeId: 'node_img2pdf' }, { nodeId: 'node_compress' }]
      });
      expect(updated.name).toBe('Renamed Invoice Flow');
      const updatedList = loadUserPipelines();
      expect(updatedList).toHaveLength(1);
      expect(updatedList[0].name).toBe('Renamed Invoice Flow');
      expect(updatedList[0].steps).toHaveLength(2);

      // 5. Delete pipeline
      const deleted = deleteUserPipeline(saved.id);
      expect(deleted).toBe(true);
      expect(loadUserPipelines()).toEqual([]);
    });

    it('should allow saving as new flow without overwriting existing flow when id is not supplied', () => {
      const store = {};
      global.window = {
        localStorage: {
          getItem: (k) => store[k] || null,
          setItem: (k, v) => { store[k] = v; },
          removeItem: (k) => { delete store[k]; }
        }
      };

      // Save flow 1
      const flow1 = saveUserPipeline({
        name: 'Flow 1',
        desc: 'First workflow',
        steps: [{ nodeId: 'node_img2pdf' }]
      });
      expect(loadUserPipelines()).toHaveLength(1);

      // Save as new flow (even if steps are identical, omitting id branches a new flow)
      const flow2 = saveUserPipeline({
        name: 'Flow 2',
        desc: 'Second workflow',
        steps: [{ nodeId: 'node_img2pdf' }]
      });

      expect(flow2.id).not.toBe(flow1.id);
      const list = loadUserPipelines();
      expect(list).toHaveLength(2);
      expect(list.map(f => f.name)).toContain('Flow 1');
      expect(list.map(f => f.name)).toContain('Flow 2');

      // Save as third flow
      const flow3 = saveUserPipeline({
        name: 'Flow 3',
        steps: [{ nodeId: 'node_compress' }]
      });
      expect(loadUserPipelines()).toHaveLength(3);
    });
  });
});
