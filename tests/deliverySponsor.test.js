import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { siteConfig, isOfficialMode } from '../src/config/siteConfig.js';
import en from '../src/locales/en.json';
import zh from '../src/locales/zh.json';
import de from '../src/locales/de.json';
import es from '../src/locales/es.json';
import fr from '../src/locales/fr.json';
import ja from '../src/locales/ja.json';

describe('Delivery Sponsor & Ko-fi Coffee Tip Badge', () => {
  const resultDeliveryViewPath = path.resolve(__dirname, '../src/components/ResultDeliveryView.vue');
  const pipelineToolPath = path.resolve(__dirname, '../src/tools/PipelineTool.vue');

  it('all 6 languages must have valid result_sponsor_prompt and result_sponsor_btn keys', () => {
    const locales = [
      { name: 'en', dict: en },
      { name: 'zh', dict: zh },
      { name: 'de', dict: de },
      { name: 'es', dict: es },
      { name: 'fr', dict: fr },
      { name: 'ja', dict: ja }
    ];

    for (const { name, dict } of locales) {
      expect(dict.result_sponsor_prompt, `${name} missing result_sponsor_prompt`).toBeDefined();
      expect(dict.result_sponsor_prompt.length).toBeGreaterThan(0);
      expect(dict.result_sponsor_btn, `${name} missing result_sponsor_btn`).toBeDefined();
      expect(dict.result_sponsor_btn.length).toBeGreaterThan(0);
    }
  });

  it('siteConfig.features.enableDeliverySponsor should be true only when official mode and donations are active', () => {
    const originalOfficial = isOfficialMode.value;
    const originalKofi = siteConfig.kofiUrl;

    try {
      // Case 1: Official site with Ko-fi URL
      isOfficialMode.value = true;
      siteConfig.kofiUrl = 'https://ko-fi.com/muffin27';
      expect(siteConfig.features.enableDeliverySponsor).toBe(true);

      // Case 2: Self-hosted mode (isOfficialMode is false) -> must be strictly false
      isOfficialMode.value = false;
      expect(siteConfig.features.enableDeliverySponsor).toBe(false);

      // Case 3: Official mode but no Ko-fi URL -> must be false
      isOfficialMode.value = true;
      siteConfig.kofiUrl = '';
      expect(siteConfig.features.enableDeliverySponsor).toBe(false);
    } finally {
      isOfficialMode.value = originalOfficial;
      siteConfig.kofiUrl = originalKofi;
    }
  });

  it('ResultDeliveryView.vue must integrate sponsor strip guarded by enableDeliverySponsor', () => {
    const content = fs.readFileSync(resultDeliveryViewPath, 'utf-8');

    // Must be conditional on siteConfig.features.enableDeliverySponsor
    expect(content).toContain('v-if="siteConfig.features.enableDeliverySponsor"');
    expect(content).toContain('data-testid="delivery-sponsor-strip"');
    expect(content).toContain('data-testid="delivery-sponsor-link"');
    expect(content).toContain("t('result_sponsor_prompt'");
    expect(content).toContain("t('result_sponsor_btn'");
    expect(content).toContain(':href="siteConfig.kofiUrl"');
  });

  it('PipelineTool.vue must integrate sponsor strip in harvest bar guarded by enableDeliverySponsor', () => {
    const content = fs.readFileSync(pipelineToolPath, 'utf-8');

    expect(content).toContain('v-if="siteConfig.features.enableDeliverySponsor"');
    expect(content).toContain('data-testid="pipeline-sponsor-strip"');
    expect(content).toContain('data-testid="pipeline-sponsor-link"');
    expect(content).toContain("t('result_sponsor_prompt'");
    expect(content).toContain("t('result_sponsor_btn'");
    expect(content).toContain(':href="siteConfig.kofiUrl"');
  });
});
