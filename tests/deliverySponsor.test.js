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
  it('all 6 languages must have valid nav_donate_btn and nav_donate_tooltip keys', () => {
    const locales = [
      { name: 'en', dict: en },
      { name: 'zh', dict: zh },
      { name: 'de', dict: de },
      { name: 'es', dict: es },
      { name: 'fr', dict: fr },
      { name: 'ja', dict: ja }
    ];

    for (const { name, dict } of locales) {
      expect(dict.nav_donate_btn, `${name} missing nav_donate_btn`).toBeDefined();
      expect(dict.nav_donate_btn.length).toBeGreaterThan(0);
      expect(dict.nav_donate_tooltip, `${name} missing nav_donate_tooltip`).toBeDefined();
      expect(dict.nav_donate_tooltip.length).toBeGreaterThan(0);
    }
  });

  it('siteConfig.features.enableNavbarDonate should be true only when official mode and donations are active', () => {
    const originalOfficial = isOfficialMode.value;
    const originalKofi = siteConfig.kofiUrl;

    try {
      // Case 1: Official site with Ko-fi URL
      isOfficialMode.value = true;
      siteConfig.kofiUrl = 'https://ko-fi.com/muffin27';
      expect(siteConfig.features.enableNavbarDonate).toBe(true);

      // Case 2: Self-hosted mode (isOfficialMode is false) -> must be strictly false
      isOfficialMode.value = false;
      expect(siteConfig.features.enableNavbarDonate).toBe(false);

      // Case 3: Official mode but no Ko-fi URL -> must be false
      isOfficialMode.value = true;
      siteConfig.kofiUrl = '';
      expect(siteConfig.features.enableNavbarDonate).toBe(false);
    } finally {
      isOfficialMode.value = originalOfficial;
      siteConfig.kofiUrl = originalKofi;
    }
  });

  it('Navbar.vue has icon-only Pipeline and About, prominent Donate and GitHub, and clean popover', () => {
    const navbarPath = path.resolve(__dirname, '../src/components/Navbar.vue');
    const content = fs.readFileSync(navbarPath, 'utf-8');

    // 1. Pipeline button must be icon-only (no visible text span)
    expect(content).toContain('data-testid="navbar-pipeline-btn"');
    expect(content).not.toContain("{{ t('tab_pipeline') || 'Pipeline' }}");

    // 2. About button must be icon-only (no visible text span or ChevronDown inside button)
    expect(content).toContain('data-testid="navbar-about-btn"');
    expect(content).not.toContain("<span class=\"hidden sm:inline text-xs font-semibold\">{{ t('navbar_about', 'About') }}</span>");

    // 3. Donate button must be prominent, warm-styled, and guarded by enableNavbarDonate
    expect(content).toContain('data-testid="navbar-donate-btn"');
    expect(content).toContain('v-if="siteConfig.features.enableNavbarDonate"');
    expect(content).toContain(':href="siteConfig.kofiUrl"');
    expect(content).toContain("t('nav_donate_btn'");

    // 4. GitHub button must be present in top navbar
    expect(content).toContain('data-testid="navbar-github-btn"');
    expect(content).toContain('v-if="siteConfig.githubRepoUrl"');
    expect(content).toContain(':href="siteConfig.githubRepoUrl"');

    // 5. About popover must have removed redundant GitHub and Ko-fi links
    expect(content).not.toContain("t('about_github_title'");
    expect(content).not.toContain("t('about_kofi_title'");
  });

  it('Footer.vue removes redundant GitHub and Ko-fi links', () => {
    const footerPath = path.resolve(__dirname, '../src/components/Footer.vue');
    const content = fs.readFileSync(footerPath, 'utf-8');

    // Neither Ko-fi link nor standalone GitHub link should exist in footer
    expect(content).not.toContain("t('footer_feed_seal')");
    expect(content).not.toMatch(/<a\s+v-if="siteConfig\.githubRepoUrl"\s+:href="siteConfig\.githubRepoUrl"\s+target="_blank"[^>]*>GitHub<\/a>/);
  });
});
