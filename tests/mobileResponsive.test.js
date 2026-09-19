import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useDevice, updateDeviceMetrics } from '../src/utils/useDevice.js';
import en from '../src/locales/en.json';
import zh from '../src/locales/zh.json';

describe('Mobile Responsive & Device Detection Engine', () => {
  let listeners = [];

  beforeEach(() => {
    listeners = [];
    globalThis.window = {
      innerWidth: 1440,
      innerHeight: 900,
      matchMedia: (query) => ({
        matches: query === '(pointer: fine)' || query === '(hover: hover)',
        media: query
      }),
      addEventListener: (evt, fn) => listeners.push({ evt, fn }),
      removeEventListener: vi.fn(),
      dispatchEvent: (e) => {
        for (const l of listeners) {
          if (l.evt === e.type) l.fn();
        }
      }
    };
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        maxTouchPoints: 0,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        share: vi.fn(),
        canShare: vi.fn(() => true)
      },
      configurable: true,
      writable: true
    });
    globalThis.Event = class {
      constructor(type) { this.type = type; }
    };
    updateDeviceMetrics();
  });

  afterEach(() => {
    delete globalThis.window;
    delete globalThis.Event;
    vi.restoreAllMocks();
  });

  it('should strictly identify desktop environment as non-mobile', () => {
    window.innerWidth = 1440;
    window.innerHeight = 900;
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(pointer: fine)' || query === '(hover: hover)',
      media: query
    }));
    updateDeviceMetrics();

    const { isMobile } = useDevice();
    expect(isMobile.value).toBe(false);
  });

  it('should identify mobile phone when viewport <= 768px and coarse touch pointer is active', () => {
    window.innerWidth = 390;
    window.innerHeight = 844;
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(pointer: coarse)' || query === '(hover: none)',
      media: query
    }));
    updateDeviceMetrics();

    const { isMobile } = useDevice();
    expect(isMobile.value).toBe(true);
  });

  it('should detect landscape phone mode when height is small (<500px)', () => {
    window.innerWidth = 844;
    window.innerHeight = 390;
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(pointer: coarse)' || query === '(hover: none)',
      media: query
    }));
    updateDeviceMetrics();

    const { isLandscape } = useDevice();
    expect(isLandscape.value).toBe(true);
  });

  it('should verify presence of all mobile i18n keys in en and zh', () => {
    const requiredKeys = [
      'nav_all_tools',
      'result_btn_share',
      'result_btn_share_desc',
      'drawer_cat_assembly',
      'drawer_cat_security',
      'drawer_cat_edit',
      'drawer_cat_advanced',
      'merge_btn_from_local',
      'btn_add_from_pc',
      'pwa_install_title',
      'pwa_install_desc',
      'pwa_install_btn',
      'pwa_add_home_btn',
      'pwa_ios_guide_title',
      'pwa_ios_step1',
      'pwa_ios_step2',
      'pwa_ios_step3'
    ];

    for (const key of requiredKeys) {
      expect(en[key]).toBeTruthy();
      expect(zh[key]).toBeTruthy();
    }

    // Verify user-friendly non-desktop text
    expect(en.merge_btn_from_local).toBe('Add Local Files');
    expect(zh.merge_btn_from_local).toBe('选择本地文件');
  });

  it('should test PWA installation composable', async () => {
    const { usePwaInstall } = await import('../src/utils/usePwaInstall.js');
    const { canInstallPwa, isInstalled, isIos, installPwa } = usePwaInstall();
    expect(isInstalled.value).toBe(false);
    expect(canInstallPwa.value).toBe(false);
    expect(isIos.value).toBe(false);
    expect(await installPwa()).toBe(false);
  });

  it('should verify mobile thumb zone sticky bottom execution bar in all core tools', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const tools = [
      'ImageToPdfTool.vue',
      'MergeTool.vue',
      'CompressTool.vue',
      'SplitTool.vue',
      'WatermarkTool.vue',
      'OrganizeTool.vue'
    ];

    for (const tool of tools) {
      const filePath = path.resolve(__dirname, '../src/tools', tool);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Every core tool must have sticky bottom-14 md:static z-20 to clear mobile bottom navigation
      expect(content).toContain('sticky bottom-14 md:static z-20');
      expect(content).toContain('bg-white/95 backdrop-blur-md');
    }
  });

  it('should verify mobile compact layouts and drawers', async () => {
    const fs = await import('fs');
    const path = await import('path');

    // Image to PDF: 3-column compact gallery & mobile settings bottom sheet
    const img2pdf = fs.readFileSync(path.resolve(__dirname, '../src/tools/ImageToPdfTool.vue'), 'utf-8');
    expect(img2pdf).toContain('grid-cols-3');
    expect(img2pdf).toContain('isMobileSettingsOpen');
    expect(img2pdf).toContain('currentSettingsSummary');

    // Compress: 2x2 grid on mobile
    const compress = fs.readFileSync(path.resolve(__dirname, '../src/tools/CompressTool.vue'), 'utf-8');
    expect(compress).toContain('grid-cols-2 lg:grid-cols-4');

    // Organize: floating batch bar docked above mobile bottom nav
    const organize = fs.readFileSync(path.resolve(__dirname, '../src/tools/OrganizeTool.vue'), 'utf-8');
    expect(organize).toContain('bottom-18 sm:bottom-6');
  });
});
