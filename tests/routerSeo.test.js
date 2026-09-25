import { describe, it, expect, beforeEach } from 'vitest';
import { TOOL_ROUTES, ROUTE_TO_TOOL } from '../src/router';
import { updateSeoMeta, getCurrentToolId } from '../src/utils/seo';
import { setLanguage } from '../src/i18n';

describe('Vue Router & Dynamic SEO Metadata Engine', () => {
  let mockMetaTags = new Map();
  let mockLinks = new Map();

  beforeEach(() => {
    mockMetaTags.clear();
    mockLinks.clear();

    const mockHead = {
      appendChild: (el) => {
        if (el._tag === 'meta') {
          const key = el.name ? `name="${el.name}"` : `property="${el.property}"`;
          mockMetaTags.set(key, el);
        } else if (el._tag === 'link') {
          if (el.hreflang) {
            mockLinks.set(`link[rel="${el.rel}"][hreflang="${el.hreflang}"]`, el);
          }
          mockLinks.set(`link[rel="${el.rel}"]`, el);
          mockLinks.set(el.rel, el);
        }
      }
    };

    globalThis.document = {
      title: '',
      head: mockHead,
      documentElement: {
        _attrs: {},
        setAttribute(k, v) { this._attrs[k] = v; },
        getAttribute(k) { return this._attrs[k]; }
      },
      createElement(tagName) {
        return {
          _tag: tagName,
          _attrs: {},
          setAttribute(k, v) {
            this._attrs[k] = v;
            this[k] = v;
          },
          getAttribute(k) {
            return this._attrs[k] || this[k];
          }
        };
      },
      querySelector(selector) {
        if (selector.startsWith('meta[')) {
          const key = selector.replace('meta[', '').replace(']', '');
          return mockMetaTags.get(key) || null;
        }
        if (mockLinks.has(selector)) {
          return mockLinks.get(selector);
        }
        if (selector.startsWith('link[rel="') && !selector.includes('hreflang=')) {
          const rel = selector.match(/rel="([^"]+)"/)?.[1];
          return mockLinks.get(rel) || null;
        }
        return null;
      }
    };

    globalThis.window = {
      location: {
        origin: 'https://pdf.sealkit.org',
        pathname: '/merge-pdf',
        search: ''
      },
      history: {
        state: null,
        replaceState: (state, title, url) => {}
      }
    };
  });

  it('should define all 16 semantic tool routes', () => {
    const expectedTools = [
      'merge', 'compress', 'organize', 'split', 'sign',
      'protect', 'unlock', 'image_to_pdf', 'pdf_to_image', 'watermark',
      'page_number', 'sanitize', 'redact', 'pipeline', 'vault', 'receive'
    ];

    expectedTools.forEach(tool => {
      expect(TOOL_ROUTES[tool]).toBeDefined();
      expect(TOOL_ROUTES[tool].startsWith('/')).toBe(true);
    });

    expect(TOOL_ROUTES['merge']).toBe('/merge-pdf');
    expect(TOOL_ROUTES['compress']).toBe('/compress-pdf');
    expect(TOOL_ROUTES['organize']).toBe('/organize-pdf');
    expect(TOOL_ROUTES['split']).toBe('/split-pdf');
    expect(TOOL_ROUTES['sign']).toBe('/sign-pdf');
    expect(TOOL_ROUTES['protect']).toBe('/protect-pdf');
    expect(TOOL_ROUTES['unlock']).toBe('/unlock-pdf');
    expect(TOOL_ROUTES['image_to_pdf']).toBe('/image-to-pdf');
    expect(TOOL_ROUTES['pdf_to_image']).toBe('/pdf-to-image');
    expect(TOOL_ROUTES['watermark']).toBe('/watermark-pdf');
    expect(TOOL_ROUTES['page_number']).toBe('/page-number');
    expect(TOOL_ROUTES['sanitize']).toBe('/sanitize-pdf');
    expect(TOOL_ROUTES['redact']).toBe('/redact-pdf');
    expect(TOOL_ROUTES['pipeline']).toBe('/pipeline');
    expect(TOOL_ROUTES['vault']).toBe('/vault');
    expect(TOOL_ROUTES['receive']).toBe('/receive');
  });

  it('should update document title and meta description dynamically', () => {
    setLanguage('en');
    updateSeoMeta('compress');
    expect(getCurrentToolId()).toBe('compress');
    expect(document.title).toContain('Compress PDF');
    expect(document.title).toContain('PDFSeal');

    const metaDesc = document.querySelector('meta[name="description"]');
    expect(metaDesc).not.toBeNull();
    expect(metaDesc.getAttribute('content')).toContain('Compress and reduce PDF file size');

    const ogTitle = document.querySelector('meta[property="og:title"]');
    expect(ogTitle).not.toBeNull();
    expect(ogTitle.getAttribute('content')).toBe(document.title);
  });

  it('should switch SEO metadata dynamically when language switches', () => {
    updateSeoMeta('sign');
    setLanguage('zh');
    expect(document.title).toContain('PDF 签名');
    
    setLanguage('de');
    expect(document.title).toContain('PDF signieren');

    setLanguage('es');
    expect(document.title).toContain('Firmar PDF');

    setLanguage('fr');
    expect(document.title).toContain('Signer PDF');

    // Reset back to English
    setLanguage('en');
    expect(document.title).toContain('Sign PDF');
  });

  it('should set canonical URL link correctly', () => {
    updateSeoMeta({ meta: { toolId: 'split' }, path: '/split-pdf' });
    const canonical = document.querySelector('link[rel="canonical"]');
    expect(canonical).not.toBeNull();
    expect(canonical.getAttribute('href')).toBe('https://pdf.sealkit.org/split-pdf');
  });

  it('should support dedicated 14-tool matrix homepage route and SEO metadata', () => {
    expect(TOOL_ROUTES.home).toBe('/');
    expect(ROUTE_TO_TOOL['/']).toBe('home');

    // English Home SEO
    setLanguage('en');
    updateSeoMeta('home');
    expect(getCurrentToolId()).toBe('home');
    expect(document.title).toContain('PDFSeal');
    const enMetaDesc = document.querySelector('meta[name="description"]');
    expect(enMetaDesc).not.toBeNull();
    expect(enMetaDesc.getAttribute('content')).toContain('14-in-1');

    // Canonical link for home
    const canonical = document.querySelector('link[rel="canonical"]');
    expect(canonical).not.toBeNull();
    expect(canonical.getAttribute('href')).toBe('https://pdf.sealkit.org/');

    // Chinese Home SEO
    setLanguage('zh');
    updateSeoMeta('home');
    expect(document.title).toContain('PDFSeal');
    expect(document.title).toContain('纯本地');
    const zhMetaDesc = document.querySelector('meta[name="description"]');
    expect(zhMetaDesc).not.toBeNull();
    expect(zhMetaDesc.getAttribute('content')).toContain('14 合 1');
  });

  it('should generate language-aware canonical and full hreflang alternate links', () => {
    setLanguage('ja');
    updateSeoMeta('merge');
    const canonical = document.querySelector('link[rel="canonical"]');
    expect(canonical.getAttribute('href')).toBe('https://pdf.sealkit.org/merge-pdf?lang=ja');

    const jaAlternate = document.querySelector('link[rel="alternate"][hreflang="ja"]');
    expect(jaAlternate).not.toBeNull();
    expect(jaAlternate.getAttribute('href')).toBe('https://pdf.sealkit.org/merge-pdf?lang=ja');

    const enAlternate = document.querySelector('link[rel="alternate"][hreflang="en"]');
    expect(enAlternate).not.toBeNull();
    expect(enAlternate.getAttribute('href')).toBe('https://pdf.sealkit.org/merge-pdf');

    const xDefault = document.querySelector('link[rel="alternate"][hreflang="x-default"]');
    expect(xDefault).not.toBeNull();
    expect(xDefault.getAttribute('href')).toBe('https://pdf.sealkit.org/merge-pdf');

    setLanguage('en');
  });

  it('should detect language from URL query parameter (?lang=ja and ?hl=de)', async () => {
    const { getInitialLang } = await import('../src/i18n.js');
    globalThis.window.location.search = '?lang=ja';
    expect(getInitialLang()).toBe('ja');

    globalThis.window.location.search = '?hl=de';
    expect(getInitialLang()).toBe('de');

    globalThis.window.location.search = '?lang=zh-CN';
    expect(getInitialLang()).toBe('zh');

    globalThis.window.location.search = '';
  });
});
