import { describe, it, expect, beforeEach } from 'vitest';
import { AVAILABLE_NODES, checkNodeCompatibility } from '../src/utils/pipeline/pipelineTypes';
import { NODE_EXECUTORS } from '../src/utils/pipeline/nodes';
import { executePdf2ImgNode } from '../src/utils/pipeline/nodes/pdf2imgNode';
import { TOOL_ROUTES } from '../src/router/toolRoutes';
import { updateSeoMeta, getCurrentToolId } from '../src/utils/seo';
import { setLanguage } from '../src/i18n';

describe('PDF to Image Engine & Pipeline Node', () => {
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
        origin: 'https://pdf.sealkit.org',
        pathname: '/pdf-to-image'
      }
    };
  });

  it('should register node_pdf2img in NODE_EXECUTORS and AVAILABLE_NODES', () => {
    expect(NODE_EXECUTORS.node_pdf2img).toBeDefined();
    expect(NODE_EXECUTORS.node_pdf2img).toBe(executePdf2ImgNode);

    const node = AVAILABLE_NODES.node_pdf2img;
    expect(node).toBeDefined();
    expect(node.id).toBe('node_pdf2img');
    expect(node.category).toBe('output_convert');
    expect(node.inputs).toEqual(['pdf_docs']);
    expect(node.outputs).toEqual(['image_docs']);
    expect(node.topology).toBe('explode');
    expect(node.defaultParams).toEqual({ format: 'png', dpi: 150 });
  });

  it('should validate compatibility when chaining PDF producers to Image consumers', () => {
    // PDF node (e.g. merge) to PDF2IMG node should be compatible
    const step1 = checkNodeCompatibility('node_merge', 'node_pdf2img');
    expect(step1.compatible).toBe(true);

    // PDF2IMG (produces image_docs) to IMG2PDF (consumes image_docs) should be compatible
    const step2 = checkNodeCompatibility('node_pdf2img', 'node_img2pdf');
    expect(step2.compatible).toBe(true);

    // PDF node directly to IMG2PDF should fail with suggestion to insert pdf2img
    const step3 = checkNodeCompatibility('node_merge', 'node_img2pdf');
    expect(step3.compatible).toBe(false);
    expect(step3.suggestion).toContain('PDF to Images');
  });

  it('should define correct semantic route and SEO titles in multiple languages', () => {
    expect(TOOL_ROUTES.pdf_to_image).toBe('/pdf-to-image');

    // Test English SEO
    setLanguage('en');
    updateSeoMeta('pdf_to_image');
    expect(getCurrentToolId()).toBe('pdf_to_image');
    expect(document.title).toContain('PDF to Image');
    expect(document.title).toContain('PDFSeal');

    // Test Chinese SEO
    setLanguage('zh');
    updateSeoMeta('pdf_to_image');
    expect(document.title).toContain('PDF 转 PNG/JPG 图片');
  });
});
