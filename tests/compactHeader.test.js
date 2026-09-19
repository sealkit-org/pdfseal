import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Compact Tool Header & Outer Border Design Consistency', () => {
  const toolsDir = path.resolve(__dirname, '../src/tools');

  it('strictly enforces unified card padding (sm:p-7) across Watermark, PageNumber, Redact, and other tools', () => {
    const targetTools = [
      'MergeTool.vue',
      'CompressTool.vue',
      'OrganizeTool.vue',
      'SplitTool.vue',
      'SignTool.vue',
      'SanitizeTool.vue',
      'ProtectTool.vue',
      'UnlockTool.vue',
      'ImageToPdfTool.vue',
      'PdfToImageTool.vue',
      'WatermarkTool.vue',
      'PageNumberTool.vue',
      'RedactTool.vue'
    ];

    for (const toolFile of targetTools) {
      const filePath = path.join(toolsDir, toolFile);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Every standard tool card container must have sm:p-7, border-slate-100, and shadow-xl
      expect(content, `${toolFile} outer card must match standard sm:p-7 padding`).toContain('sm:p-7 shadow-xl border border-slate-100 flex flex-col');
      // Must not contain legacy sm:p-5 card padding
      expect(content, `${toolFile} should not have disparate sm:p-5 card padding`).not.toContain('sm:p-5 shadow-xl');
    }
  });

  it('unifies empty state dropzone border styling across Watermark, PageNumber, and Redact', () => {
    const canvasTools = ['WatermarkTool.vue', 'PageNumberTool.vue', 'RedactTool.vue'];

    for (const toolFile of canvasTools) {
      const filePath = path.join(toolsDir, toolFile);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Dropzone must use standard border-slate-200 and bg-slate-50/50
      expect(content, `${toolFile} dropzone border must be border-slate-200`).toContain('border-slate-200 hover:');
      expect(content, `${toolFile} dropzone background must be bg-slate-50/50`).toContain('bg-slate-50/50');
      expect(content, `${toolFile} dropzone should not use bg-slate-50/40 hover:bg-slate-50/80`).not.toContain('bg-slate-50/40 hover:bg-slate-50/80');
    }
  });

  it('integrates file selection count and action buttons into MergeTool top title header', () => {
    const mergeContent = fs.readFileSync(path.join(toolsDir, 'MergeTool.vue'), 'utf-8');

    // Header has dynamic subtitle when files are loaded
    expect(mergeContent).toContain("t('merge_selected_title')");
    expect(mergeContent).toContain("t('merge_selected_hint')");

    // Header has fused action buttons
    expect(mergeContent).toContain("t('merge_btn_from_local')");
    expect(mergeContent).toContain("t('merge_btn_from_vault')");
    expect(mergeContent).toContain("t('merge_btn_reverse')");
    expect(mergeContent).toContain("t('btn_clear_all')");

    // Old intermediate Assembly Control Bar is removed
    expect(mergeContent).not.toContain('Assembly Control Bar');
  });

  it('integrates file selection count and action buttons into ImageToPdfTool top title header', () => {
    const img2PdfContent = fs.readFileSync(path.join(toolsDir, 'ImageToPdfTool.vue'), 'utf-8');

    // Header has dynamic subtitle when images are loaded
    expect(img2PdfContent).toContain("t('img2pdf_selected'");
    expect(img2PdfContent).toContain("t('img2pdf_selected_hint')");
    expect(img2PdfContent).toContain("t('img2pdf_add_more'");
    expect(img2PdfContent).toContain("t('merge_btn_reverse')");
    expect(img2PdfContent).toContain("t('img2pdf_clear_all'");
    expect(img2PdfContent).toContain('reverseImages');

    // Old redundant toolbar is removed from workspace
    expect(img2PdfContent).not.toContain('<!-- Top Toolbar -->');

    // Workspace uses tightened spacing matching MergeTool
    expect(img2PdfContent).toContain("isProcessing || lastExportedFile ? 'pt-4' : 'pt-2.5 sm:pt-3'");
  });

  it('unifies compact header pattern across Compress, Protect, Unlock, Split, Organize, and Sign tools', () => {
    const unifiedSingleDocTools = [
      { file: 'CompressTool.vue', testId: 'compress-reset-btn', checkOldBar: 'Top Loaded File Summary Bar' },
      { file: 'ProtectTool.vue', testId: 'protect-reset-btn', checkOldBar: 'File Summary Card' },
      { file: 'UnlockTool.vue', testId: 'unlock-reset-btn', checkOldBar: 'File Summary Card' },
      { file: 'SplitTool.vue', testId: 'split-reset-btn', checkOldBar: 'Top Toolbar & Status Bar' },
      { file: 'OrganizeTool.vue', testId: 'organize-reset-btn' },
      { file: 'SignTool.vue', testId: 'sign-reset-btn', checkOldBar: 'Top File Summary Bar & Page Switcher' },
      { file: 'WatermarkTool.vue', testId: 'wm-reset-btn' },
      { file: 'PageNumberTool.vue', testId: 'pn-reset-btn' },
      { file: 'RedactTool.vue', testId: 'redact-reset-btn' },
      { file: 'SanitizeTool.vue', testId: 'san-reset-btn' },
      { file: 'PdfToImageTool.vue', testId: 'p2i-reset-btn' }
    ];

    for (const item of unifiedSingleDocTools) {
      const content = fs.readFileSync(path.join(toolsDir, item.file), 'utf-8');

      // 1. Universal file input near the card top
      expect(content, `${item.file} should have universal file input`).toMatch(/<input\s+ref="fileInputRef"/);

      // 2. Fused Compact Header with Dynamic Subtitle & Action Bar
      expect(content, `${item.file} should have fused header with dynamic subtitle`).toContain('Dynamic Subtitle: File selection info when active');

      // 3. Reset button with data-testid
      if (item.testId) {
        expect(content, `${item.file} should contain reset button with ${item.testId}`).toContain(`data-testid="${item.testId}"`);
      }

      // 4. Tightened workspace padding
      expect(content, `${item.file} should have tightened workspace padding`).toContain("'pt-2.5 sm:pt-3'");

      // 5. Redundant old intermediate bars removed
      if (item.checkOldBar) {
        expect(content, `${item.file} should not have redundant ${item.checkOldBar}`).not.toContain(item.checkOldBar);
      }
    }
  });
});
