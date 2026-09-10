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
        if (selector.startsWith('link[rel="')) {
          const rel = selector.match(/rel="([^"]+)"/)?.[1];
          return mockLinks.get(rel) || null;
        }
        return null;
      }
    };

    globalThis.window = {
      location: {
        origin: 'https://pdfseal.com',
        pathname: '/merge-pdf'
      }
    };
  });

  it('should define all 13 semantic tool routes', () => {
    const expectedTools = [
      'merge', 'compress', 'organize', 'split', 'sign',
      'protect', 'unlock', 'image_to_pdf', 'watermark',
      'sanitize', 'pipeline', 'vault', 'receive'
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
    expect(TOOL_ROUTES['watermark']).toBe('/watermark-pdf');
    expect(TOOL_ROUTES['sanitize']).toBe('/sanitize-pdf');
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
    expect(canonical.getAttribute('href')).toBe('https://pdfseal.com/split-pdf');
  });
});
