import { describe, it, expect } from 'vitest';
import { router, TOOL_ROUTES } from '../src/router';
import en from '../src/locales/en.json';
import zh from '../src/locales/zh.json';
import de from '../src/locales/de.json';
import es from '../src/locales/es.json';
import fr from '../src/locales/fr.json';

describe('14-in-1 Dedicated Hub Homepage (HomeView)', () => {
  const essentialToolIds = ['merge', 'compress', 'sign', 'organize', 'split', 'pdf_to_image'];
  const securityToolIds = ['redact', 'sanitize', 'protect', 'unlock'];
  const transformToolIds = ['image_to_pdf', 'watermark', 'page_number', 'pipeline'];
  const all14ToolIds = [...essentialToolIds, ...securityToolIds, ...transformToolIds];

  it('router should map root path / directly to home route without redirecting to merge', () => {
    const rootRoute = router.getRoutes().find(r => r.path === '/');
    expect(rootRoute).toBeDefined();
    expect(rootRoute.name).toBe('home');
    expect(rootRoute.meta?.toolId).toBe('home');
    // Ensure it does not have a redirect property forcing away from home
    expect(rootRoute.redirect).toBeUndefined();
  });

  it('should define valid routes in TOOL_ROUTES for all 14 tools in matrix', () => {
    expect(all14ToolIds.length).toBe(14);
    all14ToolIds.forEach(id => {
      expect(TOOL_ROUTES[id]).toBeDefined();
      expect(TOOL_ROUTES[id].startsWith('/')).toBe(true);
    });
  });

  it('all 14 tools should have complete title and description keys across all 5 languages', () => {
    const dictionaries = [en, zh, de, es, fr];
    const descKeyMap = {
      pdf_to_image: 'p2i_desc',
      image_to_pdf: 'img2pdf_desc',
      pipeline: 'pipeline_subtitle'
    };

    all14ToolIds.forEach(id => {
      const tabKey = `tab_${id}`;
      const descKey = descKeyMap[id] || `${id}_desc`;

      dictionaries.forEach(dict => {
        expect(dict[tabKey], `Missing tabKey ${tabKey}`).toBeDefined();
        expect(dict[tabKey].length).toBeGreaterThan(0);
        expect(dict[descKey], `Missing descKey ${descKey} for tool ${id}`).toBeDefined();
        expect(dict[descKey].length).toBeGreaterThan(0);
      });
    });
  });

  it('homepage banner, category, and benefit keys should exist in all 5 languages', () => {
    const requiredHomeKeys = [
      'seo_title_home',
      'seo_desc_home',
      'home_hero_title',
      'home_hero_subtitle',
      'home_pill_guarantee',
      'home_benefit_zero_leak',
      'home_benefit_offline',
      'home_benefit_free',
      'home_cat_essential',
      'home_cat_essential_desc',
      'home_cat_security',
      'home_cat_security_desc',
      'home_cat_transform',
      'home_cat_transform_desc',
      'home_badge_popular',
      'home_badge_save_size',
      'home_badge_stamp',
      'home_badge_print_quality',
      'home_badge_true_erase',
      'home_badge_batch',
      'home_badge_organize',
      'home_badge_split',
      'home_badge_sanitize',
      'home_badge_unlock',
      'home_badge_image_to_pdf',
      'home_badge_watermark',
      'home_badge_page_number',
      'home_action_use',
      'home_vault_title',
      'home_vault_desc'
    ];

    const dictionaries = [en, zh, de, es, fr];
    dictionaries.forEach(dict => {
      requiredHomeKeys.forEach(key => {
        expect(dict[key]).toBeDefined();
        expect(dict[key].trim().length).toBeGreaterThan(0);
      });
    });
  });
});
