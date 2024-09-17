import { describe, it, expect } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { validatePipelinePreflight, canSaveNewPipeline, validateStepParameters, PIPELINE_POLICY } from '../src/utils/pipeline/pipelinePolicy';
import { checkNodeCompatibility, AVAILABLE_NODES } from '../src/utils/pipeline/pipelineTypes';
import { executeMergeNode } from '../src/utils/pipeline/nodes/mergeNode';
import { executeSanitizeNode } from '../src/utils/pipeline/nodes/sanitizeNode';
import { executeRedactNode } from '../src/utils/pipeline/nodes/redactNode';
import { parseRangeExpression } from '../src/utils/pipeline/nodes/splitNode';
import { runPipeline } from '../src/utils/pipeline/pipelineRunner';
import { saveUserPipeline, loadUserPipelines, deleteUserPipeline } from '../src/utils/pipeline/userPipelines';
import { PRESET_PIPELINES } from '../src/utils/pipeline/presetPipelines';
import { PII_PRESETS } from '../src/utils/redaction/ruleMatcher';
import enLocale from '../src/locales/en.json';
import zhLocale from '../src/locales/zh.json';

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

    it('should allow unlimited pipeline steps for all users without step count restrictions', () => {
      const pipelineDef = {
        name: 'Long Flow',
        steps: [
          { id: '1', nodeId: 'node_unlock', params: {} },
          { id: '2', nodeId: 'node_sanitize', params: {} },
          { id: '3', nodeId: 'node_page_number', params: {} },
          { id: '4', nodeId: 'node_watermark', params: {} },
          { id: '5', nodeId: 'node_compress', params: {} }
        ]
      };
      const files = [{ name: '1.pdf', data: new Uint8Array([1]) }];

      const check = validatePipelinePreflight(pipelineDef, files, 'free');
      expect(check.pass).toBe(true);
      expect(PIPELINE_POLICY.free.maxStepsPerPipeline).toBe(Infinity);
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
      expect(check.suggestion).toContain('PDF to Images');
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

      try {
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
      } finally {
        // 清理全局污染：pdf.js 在 Node 下检测到 window 会走浏览器路径（window.location.origin）
        delete global.window;
      }
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

      try {
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
      } finally {
        delete global.window;
      }
    });
  });

  describe('Official Preset Pipelines (Sprint 3.3)', () => {
    // Standard 1x1 transparent PNG for image-based tests
    const samplePngBytes = Uint8Array.from(
      atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='),
      c => c.charCodeAt(0)
    );

    it('should have 3 battle-tested official preset pipelines', () => {
      expect(PRESET_PIPELINES).toHaveLength(3);
      expect(PRESET_PIPELINES.map(p => p.id)).toEqual([
        'preset_tender_sanitize',
        'preset_receipt_packer',
        'preset_contract_stamp'
      ]);
    });

    it('should verify all adjacent node pairs in presets are type-compatible', () => {
      for (const preset of PRESET_PIPELINES) {
        for (let i = 0; i < preset.steps.length - 1; i++) {
          const currentStep = preset.steps[i];
          const nextStep = preset.steps[i + 1];
          const check = checkNodeCompatibility(currentStep.nodeId, nextStep.nodeId);
          expect(check.compatible, `${preset.id}: ${currentStep.nodeId} -> ${nextStep.nodeId} should be compatible`).toBe(true);
        }
      }
    });

    it('should verify all presets have i18n nameKey and descKey mapped in en and zh locale dictionaries', () => {
      for (const preset of PRESET_PIPELINES) {
        expect(preset.nameKey).toBeDefined();
        expect(enLocale[preset.nameKey]).toBeDefined();
        expect(zhLocale[preset.nameKey]).toBeDefined();
        expect(preset.descKey).toBeDefined();
        expect(enLocale[preset.descKey]).toBeDefined();
        expect(zhLocale[preset.descKey]).toBeDefined();
      }
      const contractPreset = PRESET_PIPELINES.find(p => p.id === 'preset_contract_stamp');
      expect(enLocale[contractPreset.nameKey]).toBe('Contract & NDA Execution Flow');
      expect(zhLocale[contractPreset.nameKey]).toBe('商务合同签署与防伪归档流');
    });

    it('should support resolveNodeName in runPipeline options to localize progress step titles', async () => {
      const preset = PRESET_PIPELINES.find(p => p.id === 'preset_tender_sanitize');
      const pdf = await createTestPdf('Test Localization');
      const files = [{ name: 'test.pdf', data: pdf, mimeType: 'application/pdf' }];
      const stepNamesReported = [];
      await runPipeline(preset, files, {
        userTier: 'free',
        resolveNodeName: (nodeId) => `CUSTOM_${nodeId}`,
        onProgress: (p) => {
          if (p.stepName && !stepNamesReported.includes(p.stepName)) {
            stepNamesReported.push(p.stepName);
          }
        }
      });
      expect(stepNamesReported.some(name => name.startsWith('CUSTOM_'))).toBe(true);
    });

    it('should verify all official presets pass free tier preflight successfully with unlimited steps', () => {
      for (const preset of PRESET_PIPELINES) {
        const fakeFiles = [{ name: 'test.pdf', data: new Uint8Array([1]) }];
        const check = validatePipelinePreflight(preset, fakeFiles, 'free');
        expect(check.pass, `${preset.id} should pass preflight in free tier`).toBe(true);
      }
    });

    it('should execute preset_tender_sanitize end-to-end with metadata wipe, page numbers, compression and watermark', async () => {
      const preset = PRESET_PIPELINES.find(p => p.id === 'preset_tender_sanitize');
      expect(preset).toBeDefined();
      expect(preset.steps.length).toBeGreaterThanOrEqual(3);

      const pdf = await createTestPdf('Confidential Tender Document');
      const files = [{ name: 'Bid_Proposal_v1.pdf', data: pdf, mimeType: 'application/pdf' }];

      const result = await runPipeline(preset, files, { userTier: 'free' });
      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toContain('Bid_Proposal_v1_SubmissionReady_');

      const reloaded = await PDFDocument.load(result.items[0].data, { updateMetadata: false });
      expect(reloaded.getTitle()).toBeFalsy();
      expect(reloaded.getAuthor()).toBeFalsy();
      expect(reloaded.getPageCount()).toBe(1);
    });

    it('should execute preset_receipt_packer end-to-end from multiple images into A4 paginated compressed PDF', async () => {
      const preset = PRESET_PIPELINES.find(p => p.id === 'preset_receipt_packer');
      expect(preset).toBeDefined();

      const imageFiles = [
        { name: 'hotel_bill.png', data: samplePngBytes, mimeType: 'image/png' },
        { name: 'taxi_receipt.png', data: samplePngBytes, mimeType: 'image/png' }
      ];

      const result = await runPipeline(preset, imageFiles, { userTier: 'free' });
      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toContain('Expense_Report_');

      const reloaded = await PDFDocument.load(result.items[0].data);
      expect(reloaded.getPageCount()).toBe(2);
      const firstPageSize = reloaded.getPage(0).getSize();
      expect(Math.round(firstPageSize.width)).toBe(595); // A4 width
    });

    it('should execute preset_contract_stamp end-to-end with sanitization, numbering, signature and executed watermark', async () => {
      const preset = PRESET_PIPELINES.find(p => p.id === 'preset_contract_stamp');
      expect(preset).toBeDefined();
      expect(preset.steps).toHaveLength(5);

      // Create a 2-page contract
      const doc = await PDFDocument.create();
      doc.addPage([595, 842]);
      doc.addPage([595, 842]);
      doc.setTitle('Draft NDA Agreement');
      doc.setAuthor('Internal Counsel');
      const contractPdf = await doc.save();

      const files = [{ name: 'Mutual_NDA_Final.pdf', data: contractPdf, mimeType: 'application/pdf' }];

      // Clone preset and configure sample signature stamp
      const testPreset = JSON.parse(JSON.stringify(preset));
      testPreset.steps.find(s => s.nodeId === 'node_sign').params.stampDataUrl = 
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const result = await runPipeline(testPreset, files, { userTier: 'free' });
      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toContain('Mutual_NDA_Final_Executed_');

      const reloaded = await PDFDocument.load(result.items[0].data, { updateMetadata: false });
      expect(reloaded.getTitle()).toBeFalsy();
      expect(reloaded.getAuthor()).toBeFalsy();
      expect(reloaded.getPageCount()).toBe(2);
    });
  });

  describe('Runtime Step Parameter Validation Engine', () => {
    it('should strictly block runPipeline execution if node_sign is missing signature/stamp', async () => {
      const preset = PRESET_PIPELINES.find(p => p.id === 'preset_contract_stamp');
      const pdf = await createTestPdf('Contract requiring signature');
      const files = [{ name: 'contract.pdf', data: pdf, mimeType: 'application/pdf' }];

      // Raw preset has stampDataUrl: ''
      const result = await runPipeline(preset, files, { userTier: 'free' });
      expect(result.success).toBe(false);
      expect(result.code).toBe('ERR_MISSING_STAMP');
      expect(result.nodeId).toBe('node_sign');
      expect(result.reason).toContain('Missing stamp');
    });

    it('should strictly block runPipeline execution if node_protect is missing open password', async () => {
      const flow = {
        name: 'Protect Without Password',
        steps: [
          { nodeId: 'node_protect', params: { preset: 'confidential', userPassword: '' } }
        ]
      };
      const pdf = await createTestPdf('Confidential PDF');
      const files = [{ name: 'doc.pdf', data: pdf, mimeType: 'application/pdf' }];

      const result = await runPipeline(flow, files, { userTier: 'free' });
      expect(result.success).toBe(false);
      expect(result.code).toBe('ERR_MISSING_PASSWORD');
      expect(result.reason).toContain('Missing open password');
    });

    it('should strictly block runPipeline execution if node_watermark has empty text', async () => {
      const flow = {
        name: 'Empty Watermark Flow',
        steps: [
          { nodeId: 'node_watermark', params: { text: '   ' } }
        ]
      };
      const pdf = await createTestPdf('Watermark PDF');
      const files = [{ name: 'doc.pdf', data: pdf, mimeType: 'application/pdf' }];

      const result = await runPipeline(flow, files, { userTier: 'free' });
      expect(result.success).toBe(false);
      expect(result.code).toBe('ERR_MISSING_WATERMARK_TEXT');
      expect(result.reason).toContain('Watermark text cannot be empty');
    });
  });

  describe('Pipeline Deliverables ZIP Bundle Packaging', () => {
    it('should package multiple deliverables into a valid ZIP archive without data loss', async () => {
      const { createZipBlob } = await import('../src/utils/zipUtils');
      const JSZip = (await import('jszip')).default;

      const pdf1 = await createTestPdf('Invoice 001');
      const pdf2 = await createTestPdf('Invoice 002');
      const deliverables = [
        { name: 'Invoice_001_processed.pdf', data: pdf1 },
        { name: 'Invoice_002_processed.pdf', data: pdf2 }
      ];

      const zipBlob = await createZipBlob(deliverables);
      expect(zipBlob).toBeDefined();
      expect(zipBlob.size).toBeGreaterThan(0);

      const zip = await JSZip.loadAsync(zipBlob);
      const fileNames = Object.keys(zip.files);
      expect(fileNames).toContain('Invoice_001_processed.pdf');
      expect(fileNames).toContain('Invoice_002_processed.pdf');

      // Verify uncorrupted contents
      const extractedBytes1 = await zip.file('Invoice_001_processed.pdf').async('uint8array');
      const reloadedDoc1 = await PDFDocument.load(extractedBytes1);
      expect(reloadedDoc1.getPageCount()).toBe(1);
    });
  });

  describe('Redact Node (rule-based batch redaction)', () => {
    /** 带已知文本行的 PDF（供规则命中） */
    async function createTextPdf() {
      const doc = await PDFDocument.create();
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const page = doc.addPage([595.28, 841.89]);
      page.drawText('Reach me at john.doe@example.com today', { x: 72, y: 720, size: 12, font });
      page.drawText('Safe public line stays', { x: 72, y: 690, size: 12, font });
      page.drawText('Call 13800138000 for details', { x: 72, y: 660, size: 12, font });
      return doc.save();
    }

    async function extractText(bytes) {
      const pdfjs = await import('pdfjs-dist');
      const task = pdfjs.getDocument({
        data: bytes instanceof Uint8Array ? bytes.slice() : new Uint8Array(bytes).slice(),
        isEvalSupported: false,
        disableFontFace: true
      });
      const pdf = await task.promise;
      const page = await pdf.getPage(1);
      const tc = await page.getTextContent();
      await pdf.destroy();
      return tc.items.map((i) => i.str).join(' ');
    }

    it('should define node_redact with map topology, security category and empty default rules', () => {
      const node = AVAILABLE_NODES.node_redact;
      expect(node).toBeDefined();
      expect(node.category).toBe('security');
      expect(node.topology).toBe('map');
      expect(node.inputs).toContain('pdf_docs');
      expect(node.outputs).toContain('pdf_docs');
      expect(node.defaultParams).toEqual({ rules: [], style: 'black' });
      expect(node.nameKey).toBe('tab_redact');
      expect(enLocale[node.descKey]).toBeDefined();
      expect(zhLocale[node.descKey]).toBeDefined();
    });

    it('should be type-compatible with pdf_docs neighbors (sanitize -> redact -> compress)', () => {
      expect(checkNodeCompatibility('node_sanitize', 'node_redact').compatible).toBe(true);
      expect(checkNodeCompatibility('node_redact', 'node_compress').compatible).toBe(true);
    });

    it('should have all 5 PII presets with i18n labels registered', () => {
      expect(PII_PRESETS.map((p) => p.id)).toEqual(['id', 'phone', 'bank', 'email', 'date']);
      for (const preset of PII_PRESETS) {
        expect(enLocale[preset.labelKey]).toBeDefined();
        expect(zhLocale[preset.labelKey]).toBeDefined();
        expect(preset.type).toBe('regex');
      }
    });

    it('should burn matched keyword/regex hits and keep sibling text intact', async () => {
      const pdf = await createTextPdf();
      const items = [{ id: '1', name: 'contacts.pdf', data: pdf, mimeType: 'application/pdf' }];

      const out = await executeRedactNode(items, {
        rules: [
          { type: 'regex', value: '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}' },
          { type: 'regex', value: '\\b1[3-9]\\d{9}\\b' }
        ],
        style: 'black'
      });

      expect(out).toHaveLength(1);
      expect(out[0].name).toBe('contacts_Redacted.pdf');
      expect(out[0].redactReport.ok).toBe(true);
      expect(out[0].redactReport.zeroHits).toBe(false);
      expect(out[0].redactReport.ruleStats.map((s) => s.hits)).toEqual([1, 1]);
      expect(out[0].redactReport.imagePages).toEqual([]);

      const text = await extractText(out[0].data);
      expect(text).not.toContain('john.doe@example.com');
      expect(text).not.toContain('13800138000');
      expect(text).toContain('Safe public line stays');
    }, 60000);

    it('should pass items through unchanged with zeroHits report when no rule matches', async () => {
      const pdf = await createTextPdf();
      const items = [{ id: '1', name: 'plain.pdf', data: pdf, mimeType: 'application/pdf' }];

      const out = await executeRedactNode(items, {
        rules: [{ type: 'keyword', value: 'NO-SUCH-WORD-XYZ' }]
      });

      expect(out).toHaveLength(1);
      expect(out[0].name).toBe('plain.pdf'); // 原名透传
      expect(out[0].redactReport.zeroHits).toBe(true);
      expect(out[0].redactReport.ruleStats[0].hits).toBe(0);
    }, 60000);

    it('should bypass silently-invalid regex rules instead of throwing', async () => {
      const pdf = await createTextPdf();
      const items = [{ id: '1', name: 'bad_rx.pdf', data: pdf, mimeType: 'application/pdf' }];

      const out = await executeRedactNode(items, {
        rules: [{ type: 'regex', value: '([unclosed' }, { type: 'keyword', value: 'Safe public line' }]
      });

      expect(out).toHaveLength(1);
      expect(out[0].redactReport.ok).toBe(true);
      // 无效规则 hits=0，有效规则正常命中
      expect(out[0].redactReport.ruleStats[0].valid).toBe(false);
      expect(out[0].redactReport.ruleStats[1].hits).toBeGreaterThan(0);
    }, 60000);

    it('should block runPipeline when node_redact has no rules configured', async () => {
      const flow = {
        name: 'Redact Without Rules',
        steps: [{ id: 's1', nodeId: 'node_redact', params: { rules: [], style: 'black' } }]
      };
      const pdf = await createTextPdf();
      const files = [{ name: 'doc.pdf', data: pdf, mimeType: 'application/pdf' }];

      const result = await runPipeline(flow, files, { userTier: 'free' });
      expect(result.success).toBe(false);
      expect(result.code).toBe('ERR_MISSING_REDACT_RULES');
      expect(result.reason).toContain('At least one keyword or pattern rule');

      // validateStepParameters 直测同样拦截
      const direct = validateStepParameters(flow.steps);
      expect(direct.valid).toBe(false);
      expect(direct.code).toBe('ERR_MISSING_REDACT_RULES');
    }, 60000);

    it('should execute sanitize -> redact pipeline end-to-end in free tier', async () => {
      const doc = await PDFDocument.create();
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const page = doc.addPage([595.28, 841.89]);
      page.drawText('Email bob@test.org inside', { x: 72, y: 700, size: 12, font });
      page.drawText('Public footer line', { x: 72, y: 670, size: 12, font });
      doc.setTitle('Secret Memo');
      doc.setAuthor('Agent X');
      const pdf = await doc.save();

      const flow = {
        name: 'Privacy Flow',
        steps: [
          { id: 's1', nodeId: 'node_sanitize', params: { stripDocInfo: true } },
          { id: 's2', nodeId: 'node_redact', params: { rules: [{ type: 'regex', value: '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}' }], style: 'black' } }
        ]
      };
      const files = [{ name: 'memo.pdf', data: pdf, mimeType: 'application/pdf' }];

      const result = await runPipeline(flow, files, { userTier: 'free' });
      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(1);

      const reloaded = await PDFDocument.load(result.items[0].data, { updateMetadata: false });
      expect(reloaded.getTitle()).toBeFalsy();
      expect(reloaded.getAuthor()).toBeFalsy();

      const pdfjs = await import('pdfjs-dist');
      const task = pdfjs.getDocument({
        data: result.items[0].data.slice(),
        isEvalSupported: false,
        disableFontFace: true
      });
      const outPdf = await task.promise;
      const p = await outPdf.getPage(1);
      const tc = await p.getTextContent();
      await outPdf.destroy();
      const text = tc.items.map((i) => i.str).join(' ');
      expect(text).not.toContain('bob@test.org');
      // email 与 'inside' 同一 show-text 操作符（同 item），随整行删除；无关行必须保留
      expect(text).toContain('Public footer line');
    }, 60000);
  });
});
