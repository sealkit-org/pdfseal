import { loadCleanPdfDocument } from '../../pdfSecurity';
import { logger } from '../../logger';
import { redactPdf } from '../../redaction/redactEngine';
import { matchRules } from '../../redaction/ruleMatcher';

/**
 * Headless Redact Node (Map: N -> N)
 * 批量规则脱敏：pdf.js 提取文本 → 规则匹配为矩形 → True Stream Redaction 烧录。
 *
 * 报告（附加在产出 item.redactReport）：
 *  - ruleStats：每条规则命中数（0 命中显性标出，调用方用 node_redact_report_zero_hits 提示）
 *  - imagePages：规则路径无法安全覆盖的图像型页（需用敏感信息脱敏工具手动框选）
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

    // 规则为空：validateStepParameters 上游已拦截；headless 直调兜底原样透传
    if (!rules.length) {
      result.push(item);
      continue;
    }

    try {
      // 1. pdf.js 逐页提取文本（与 UI 吸附同源的 bbox 口径）
      const pagesText = await extractPagesText(item.data);

      // 2. 规则 → 矩形（逐页）
      const pagesSpec = {};
      const pageMatches = [];
      for (let p = 0; p < pagesText.length; p++) {
        const m = matchRules(pagesText[p], rules);
        if (m.rects.length) {
          pagesSpec[p] = { rects: m.rects };
        }
        pageMatches.push(m);
      }

      // 3. 无任何命中：原样透传（不产出空壳），报告标注
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

      // 5. 图像型页标注：栅格化页中因图像/表单/解析降级的页，规则无法精准覆盖
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

/** 逐页匹配结果的规则命中数聚合 */
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

/** pdf.js 提取全部页文本项（Node 环境 standard_fonts 警告无害，回退内置 metrics） */
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
