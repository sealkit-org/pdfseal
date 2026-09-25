import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Smart State KeepAlive & Lifecycle Management', () => {
  const rootDir = path.resolve(__dirname, '..');
  const appVuePath = path.join(rootDir, 'src/App.vue');
  const toolsDir = path.join(rootDir, 'src/tools');

  it('preserves component instances in App.vue using KeepAlive with bounded capacity', () => {
    const appContent = fs.readFileSync(appVuePath, 'utf-8');
    expect(appContent).toMatch(/<KeepAlive\s+:max="5">/);
    expect(appContent).toContain('</KeepAlive>');
  });

  it('resets delivered results on activation across all 13 standard processing tools', () => {
    const standardTools = [
      'CompressTool.vue',
      'SplitTool.vue',
      'OrganizeTool.vue',
      'PdfToImageTool.vue',
      'ImageToPdfTool.vue',
      'MergeTool.vue',
      'WatermarkTool.vue',
      'PageNumberTool.vue',
      'ProtectTool.vue',
      'UnlockTool.vue',
      'SignTool.vue',
      'RedactTool.vue',
      'SanitizeTool.vue'
    ];

    for (const toolFile of standardTools) {
      const filePath = path.join(toolsDir, toolFile);
      const content = fs.readFileSync(filePath, 'utf-8');

      // 1. Must use onActivated lifecycle hook
      expect(content, `${toolFile} must import and use onActivated`).toMatch(/\bonActivated\s*\(/);

      // 2. Must check lastExportedFile on activation before resetting
      expect(
        content,
        `${toolFile} must check lastExportedFile in onActivated to reset completed delivery while preserving draft`
      ).toMatch(/if\s*\(\s*lastExportedFile\.value\s*\)\s*\{\s*(await\s+)?(reset|clearAll)\s*\(\s*\);?\s*\}/);

      // 3. Must notify workspaceState of active file status
      expect(content, `${toolFile} must update workspaceState on activation`).toContain('workspaceState?.setActiveFile');

      // 4. Must not contain duplicate onActivated hooks (clean single activation handler)
      const onActivatedMatches = content.match(/onActivated\s*\(/g) || [];
      expect(onActivatedMatches.length, `${toolFile} should have exactly one onActivated hook`).toBe(1);
    }
  });

  it('resets completed batch results on activation in PipelineTool', () => {
    const filePath = path.join(toolsDir, 'PipelineTool.vue');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toMatch(/if\s*\(\s*outputResults\.value\.length\s*>\s*0\s*\)\s*\{\s*resetBatchAndResults\s*\(\s*\);?\s*\}/);
    expect(content).toContain('workspaceState?.setActiveFile');
  });
});
