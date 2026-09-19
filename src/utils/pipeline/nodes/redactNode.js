import { loadCleanPdfDocument } from '../../pdfSecurity';
import { logger } from '../../logger';
import { redactPdf } from '../../redaction/redactEngine';
import { matchRules } from '../../redaction/ruleMatcher';

/**
 * Headless Redact Node (Map: N -> N)
 * Batch rule-based redaction: extracts text via pdf.js -> matches rules into bounding rects -> True Stream Redaction burn-in.
 *
 * Report (attached on output item.redactReport):
 *  - ruleStats: hit count per rule (zero hits clearly marked for caller to notify user via node_redact_report_zero_hits)
 *  - imagePages: image-based pages that rule-based vector matching cannot safely cover (manual box selection advised)
 *
 * @param {Array<Object>} items
 * @param {Object} params - { rules: [{type:'keyword'|'regex', value, caseSensitive?}], style: 'black'|'white'|'stamp' }
 * @param {Function} [onProgress]
 * @returns {Promise<Array<Object>>}
 */
export async function executeRedactNode(items, params = {}, onProgress = () => {}) {
  const result = [];
  const rules = Array.isArray(params.rules) ? params.rules : [];
  const style = ['black', 'white', 'gray', 'custom', 'stamp'].includes(params.style) ? params.style : 'black';
  const customColor = params.customColor || '#000000';
  const stampText = params.stampText || '[REDACTED]';

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    onProgress(Math.round((i / items.length) * 100), `Redacting [${i + 1}/${items.length}]: ${item.name}`);

    // Empty rules: intercepted upstream by validateStepParameters; passthrough as fallback for headless callers
    if (!rules.length) {
      result.push(item);
      continue;
    }

    try {
      // 1. Extract text page by page via pdf.js (same bbox metrics as UI snapping)
      const pagesText = await extractPagesText(item.data);

      // 2. Rules -> bounding rects (per page)
      const pagesSpec = {};
      const pageMatches = [];
      for (let p = 0; p < pagesText.length; p++) {
        const m = matchRules(pagesText[p], rules);
        if (m.rects.length) {
          pagesSpec[p] = { rects: m.rects };
        }
        pageMatches.push(m);
      }

      // 3. Zero hits across all pages: pass through unmodified (avoid empty shell), report marked
      if (!Object.keys(pagesSpec).length) {
        result.push({
          ...item,
          redactReport: { ok: true, zeroHits: true, ruleStats: (pageMatches[0]?.ruleStats) || [], imagePages: [] }
        });
        continue;
      }

      // 4. True Stream Redaction
      const { bytes, report } = await redactPdf(
        item.data instanceof Uint8Array ? item.data.slice() : new Uint8Array(item.data).slice(0),
        { pages: pagesSpec, style, customColor, stampText }
      );

      if (!report.ok) {
        logger.warn('PIPELINE_REDACT', `Redaction verification failed for ${item.name}; keeping original`);
        result.push({
          ...item,
          redactReport: { ok: false, zeroHits: false, ruleStats: [], imagePages: [] }
        });
        continue;
      }

      // 5. Image page annotation: pages downgraded to rasterization due to image/form/parse hazards
      const imagePages = report.pages
        .filter((pr) => pr.path === 'raster')
        .map((pr) => ({ index: pr.index, reason: pr.reason }));

      result.push({
        ...item,
        data: bytes,
        name: item.name.replace(/\.pdf$/i, '') + '_Redacted.pdf',
        redactReport: {
          ok: true,
          zeroHits: false,
          ruleStats: aggregateRuleStats(pageMatches),
          imagePages,
          rasterPages: report.rasterPages || []
        }
      });
    } catch (err) {
      logger.warn('PIPELINE_REDACT', `Redact error on ${item.name}: ${err.message}`);
      result.push(item);
    }
  }

  onProgress(100, 'Content redaction complete');
  return result;
}

/** Aggregates rule hit counts across all page match results */
function aggregateRuleStats(pageMatches) {
  if (!pageMatches.length) return [];
  const total = pageMatches[0].ruleStats.map((s) => ({ ...s, hits: 0 }));
  for (const pm of pageMatches) {
    pm.ruleStats.forEach((s, idx) => {
      if (total[idx]) total[idx].hits += s.hits;
    });
  }
  return total;
}

/** Extracts text items for all pages via pdf.js */
async function extractPagesText(bytes) {
  const pdfjs = await import('pdfjs-dist');
  const task = pdfjs.getDocument({
    data: bytes instanceof Uint8Array ? bytes.slice() : new Uint8Array(bytes).slice(),
    isEvalSupported: false,
    disableFontFace: true
  });
  const pdf = await task.promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    pages.push(tc.items);
  }
  await pdf.destroy();
  return pages;
}
