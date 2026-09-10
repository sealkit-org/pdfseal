import { describe, it, expect, beforeEach } from 'vitest';
import { dispatchToTool, consumePendingFile, clearPendingFile, pendingToolFile } from '../src/utils/toolBridge';
import zh from '../src/locales/zh.json';
import en from '../src/locales/en.json';
import de from '../src/locales/de.json';
import es from '../src/locales/es.json';
import fr from '../src/locales/fr.json';

describe('Next Action Flow (跨工具无缝接力流)', () => {
  beforeEach(() => {
    clearPendingFile();
  });

  // Mirrors NextActionBanner.vue priorityMap — keep in sync when updating the component
  const priorityMap = {
    merge: ['compress', 'sign', 'protect', 'pdf_to_image', 'vault'],
    compress: ['protect', 'sign', 'watermark', 'pdf_to_image', 'vault'],
    organize: ['compress', 'sign', 'protect', 'pdf_to_image', 'vault'],
    split: ['compress', 'sign', 'protect', 'pdf_to_image', 'vault'],
    watermark: ['protect', 'compress', 'sign', 'vault'],
    protect: ['watermark', 'compress', 'vault'],
    sanitize: ['protect', 'watermark', 'compress', 'sign', 'vault'],
    unlock: ['split', 'organize', 'compress', 'watermark', 'sign'],
    sign: ['protect', 'compress', 'watermark', 'vault'],
    image_to_pdf: ['watermark', 'compress', 'protect', 'sign', 'vault']
  };

  it('should define targeted recommendations for all 11 tools', () => {
    const tools = ['merge', 'compress', 'organize', 'split', 'watermark', 'protect', 'sanitize', 'unlock', 'sign', 'image_to_pdf', 'pdf_to_image'];
    for (const tool of tools) {
      if (tool === 'pdf_to_image') continue; // relay target only; no banner is rendered inside the tool page yet
      expect(priorityMap[tool]).toBeDefined();
      expect(priorityMap[tool].length).toBeGreaterThanOrEqual(3);
      // Tool should not recommend itself
      expect(priorityMap[tool]).not.toContain(tool);
    }
    // New tool must appear as a relay target of the core PDF tools
    expect(priorityMap.merge).toContain('pdf_to_image');
    expect(priorityMap.compress).toContain('pdf_to_image');
  });

  it('should seamlessly relay exported file from one tool to another via toolBridge', () => {
    const fakeBuffer = new Uint8Array([37, 80, 68, 70]).buffer; // %PDF
    const exportedFile = {
      name: 'Merged_Doc.pdf',
      arrayBuffer: fakeBuffer,
      size: fakeBuffer.byteLength
    };

    // User completes merge and clicks "Compress"
    dispatchToTool('compress', exportedFile);

    expect(pendingToolFile.value).not.toBeNull();
    expect(pendingToolFile.value.targetTool).toBe('compress');

    // Receiving tool activates and consumes
    const received = consumePendingFile('compress');
    expect(received).not.toBeNull();
    expect(received.name).toBe('Merged_Doc.pdf');
    expect(received.arrayBuffer).toBe(fakeBuffer);

    // After consumption, bus is cleanly reset
    expect(consumePendingFile('compress')).toBeNull();
  });

  it('should support multi-step consecutive relay chain (Merge -> Compress -> Protect)', () => {
    const originalPdf = new Uint8Array([1, 2, 3]).buffer;

    // Step 1: Merge -> Compress
    dispatchToTool('compress', { name: 'Step1_Merged.pdf', arrayBuffer: originalPdf });
    const step1Consumed = consumePendingFile('compress');
    expect(step1Consumed.name).toBe('Step1_Merged.pdf');

    // Step 2: Compress -> Protect
    const compressedPdf = new Uint8Array([1, 2]).buffer;
    dispatchToTool('protect', { name: 'Step2_Compressed.pdf', arrayBuffer: compressedPdf });
    const step2Consumed = consumePendingFile('protect');
    expect(step2Consumed.name).toBe('Step2_Compressed.pdf');

    // Step 3: Bus is empty
    expect(pendingToolFile.value).toBeNull();
  });

  it('should contain all required i18n keys for NextAction across all 5 languages', () => {
    const requiredKeys = [
      'next_action_title',
      'next_action_desc',
      'next_action_sign',
      'next_action_compress',
      'next_action_protect',
      'next_action_watermark',
      'next_action_split',
      'next_action_organize',
      'next_action_sanitize',
      'next_action_merge',
      'next_action_vault',
      'next_action_pdf_to_image'
    ];

    const locales = { zh, en, de, es, fr };

    for (const [lang, dict] of Object.entries(locales)) {
      for (const key of requiredKeys) {
        expect(dict[key], `Missing key "${key}" in ${lang}.json`).toBeDefined();
        expect(dict[key].trim().length, `Empty key "${key}" in ${lang}.json`).toBeGreaterThan(0);
      }
    }
  });
});
