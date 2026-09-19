/**
 * Rule Matcher: rule-to-redaction-rectangles translation layer for Pipeline node `node_redact`.
 *
 * Input consists of pdf.js getTextContent text items (in user space), outputting
 * user-space rects ready to be consumed by redactPdf. Matching runs against individual
 * textItem.str (aligning with manual UI box selection bounding metrics).
 *
 * Safeguards (prevents ReDoS hanging the UI and accidental full-document destruction):
 *  - Malformed regex patterns are safely skipped via try/catch with warnings logged.
 *  - Pattern length capped at MAX_PATTERN_LENGTH.
 *  - Hit count per page capped at MAX_HITS_PER_PAGE (stops matching when reached).
 *
 * Known boundary: text lines split across multiple textItems cannot be matched if sensitive
 * strings span items (manual box selection covers this case, stated in node documentation).
 */
import { textItemToUserBBox } from './coords.js';

/** Maximum pattern length for regex / keyword (characters) */
export const MAX_PATTERN_LENGTH = 256;
/** Maximum match hits per page (item level); stops matching when reached */
export const MAX_HITS_PER_PAGE = 500;
/** Same-line merge: baseline y difference tolerance (pt) */
export const LINE_TOLERANCE = 3;
/** Same-line merge: maximum horizontal gap between adjacent boxes (pt) to allow merging */
export const MERGE_GAP = 12;

/**
 * Universal date regex:
 * Supports ISO / Chinese date formatting (e.g. 2026-09-17, 2026年9月17日) as well as common international formats (09/17/2026, 17/09/2026, 17.09.2026, 17-09-2026).
 */
export const UNIVERSAL_DATE_REGEX = '(?:\\b\\d{4}[-/.]\\d{1,2}[-/.]\\d{1,2}\\b|\\b\\d{4}年\\d{1,2}月\\d{1,2}日?|\\b\\d{1,2}[-/.]\\d{1,2}[-/.]\\d{4}\\b)';

/**
 * Built-in PII presets (templates for batch redaction, displayed as chips in PipelineTool).
 * Patterns are regex strings; label keys are mapped by i18n key node_redact_preset_*.
 */
export const PII_PRESETS = [
  {
    id: 'id',
    labelKey: 'node_redact_preset_id',
    type: 'regex',
    caseSensitive: false,
    // 18-digit resident ID (including trailing X)
    value: '\\b[1-9]\\d{5}(?:19|20)\\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\\d|3[01])\\d{3}[\\dXx]\\b'
  },
  {
    id: 'phone',
    labelKey: 'node_redact_preset_phone',
    type: 'regex',
    caseSensitive: false,
    // Mainland China mobile phone
    value: '\\b1[3-9]\\d{9}\\b'
  },
  {
    id: 'bank',
    labelKey: 'node_redact_preset_bank',
    type: 'regex',
    caseSensitive: false,
    // 16-19 consecutive digits (common credit / debit card format)
    value: '\\b\\d{16,19}\\b'
  },
  {
    id: 'email',
    labelKey: 'node_redact_preset_email',
    type: 'regex',
    caseSensitive: false,
    value: '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}'
  },
  {
    id: 'date',
    labelKey: 'node_redact_preset_date',
    type: 'regex',
    caseSensitive: false,
    value: UNIVERSAL_DATE_REGEX
  }
];

/**
 * Dynamically returns localized PII presets based on current language environment.
 * @param {string} [lang='zh']
 */
export function getLocalizedPiiPresets(lang = 'zh') {
  const isZh = String(lang || '').toLowerCase().startsWith('zh');
  return [
    {
      id: 'id',
      labelKey: isZh ? 'node_redact_preset_id' : 'node_redact_preset_ssn',
      type: 'regex',
      caseSensitive: false,
      value: isZh
        ? '\\b[1-9]\\d{5}(?:19|20)\\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\\d|3[01])\\d{3}[\\dXx]\\b'
        : '\\b\\d{3}-\\d{2}-\\d{4}\\b'
    },
    {
      id: 'phone',
      labelKey: 'node_redact_preset_phone',
      type: 'regex',
      caseSensitive: false,
      value: isZh
        ? '\\b1[3-9]\\d{9}\\b'
        : '\\b(?:\\+?\\d{1,3}[- ]?)?\\(?\\d{2,4}\\)?[- ]?\\d{3,4}[- ]?\\d{4}\\b'
    },
    {
      id: 'bank',
      labelKey: 'node_redact_preset_bank',
      type: 'regex',
      caseSensitive: false,
      value: '\\b\\d{16,19}\\b'
    },
    {
      id: 'email',
      labelKey: 'node_redact_preset_email',
      type: 'regex',
      caseSensitive: false,
      value: '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}'
    },
    {
      id: 'date',
      labelKey: 'node_redact_preset_date',
      type: 'regex',
      caseSensitive: false,
      value: UNIVERSAL_DATE_REGEX
    }
  ];
}

/** Escapes special regex characters (used when constructing regex from keyword mode) */
function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Compiles a single rule into a reusable RegExp object. Returns { valid: false } on invalid / overlength pattern.
 * @param {{type:'keyword'|'regex', value:string, caseSensitive?:boolean}} rule
 */
export function compileRule(rule) {
  const value = typeof rule?.value === 'string' ? rule.value : '';
  if (!value.trim() || value.length > MAX_PATTERN_LENGTH) {
    return { valid: false, re: null, error: value.length > MAX_PATTERN_LENGTH ? 'pattern-too-long' : 'empty-pattern' };
  }
  const source = rule.type === 'regex' ? value : escapeRegExp(value);
  const flags = rule.caseSensitive ? 'g' : 'gi';
  try {
    return { valid: true, re: new RegExp(source, flags), error: null };
  } catch (e) {
    return { valid: false, re: null, error: String(e?.message || e) };
  }
}

/**
 * Batch rule matching: textItems -> redaction rects.
 * @param {Array<{str:string, transform:number[], width:number, height:number}>} textItems
 *        Single page items from pdf.js getTextContent().items
 * @param {Array<{type,value,caseSensitive?}>} rules
 * @returns {{
 *   rects: Array<{x,y,w,h}>,
 *   ruleStats: Array<{ ruleIndex:number, valid:boolean, error:string|null, hits:number }>,
 *   totalHits: number,
 *   hitLimitReached: boolean,
 *   warnings: string[]
 * }}
 */
export function matchRules(textItems, rules) {
  const list = Array.isArray(rules) ? rules : [];
  const items = Array.isArray(textItems) ? textItems : [];
  const compiled = list.map((r, i) => ({ ...compileRule(r), ruleIndex: i }));
  const warnings = compiled
    .filter((c) => !c.valid && c.error !== 'empty-pattern')
    .map((c) => `rule#${c.ruleIndex}: ${c.error}`);

  /** Matched user-space bboxes (before same-line merging) */
  const hitBoxes = [];
  const perRuleHits = new Map(); // ruleIndex -> hit count
  let totalHits = 0;
  let hitLimitReached = false;

  outer: for (const item of items) {
    const str = item?.str || '';
    if (!str) continue;
    for (const c of compiled) {
      if (!c.valid) continue;
      c.re.lastIndex = 0;
      if (c.re.test(str)) {
        const box = item.bbox ? { ...item.bbox } : textItemToUserBBox(item);
        if (str) box.snapped = str;
        hitBoxes.push(box);
        perRuleHits.set(c.ruleIndex, (perRuleHits.get(c.ruleIndex) || 0) + 1);
        totalHits += 1;
        if (totalHits >= MAX_HITS_PER_PAGE) {
          hitLimitReached = true;
          warnings.push(`hit-limit: stopped at ${MAX_HITS_PER_PAGE} hits per page`);
          break outer;
        }
      }
    }
  }

  const rects = mergeSameLine(hitBoxes);
  return {
    rects,
    ruleStats: compiled.map((c) => ({
      ruleIndex: c.ruleIndex,
      valid: c.valid,
      error: c.error,
      hits: perRuleHits.get(c.ruleIndex) || 0
    })),
    totalHits,
    hitLimitReached,
    warnings
  };
}

/**
 * Same-line adjacent hit merging: clusters boxes with similar y baselines (within +/- LINE_TOLERANCE),
 * sorts them by x horizontally, and merges adjacent boxes whose gap is <= MERGE_GAP into a unified rect.
 * @param {Array<{x,y,w,h}>} boxes
 */
export function mergeSameLine(boxes) {
  if (!boxes.length) return [];
  // Cluster into lines by y center
  const sorted = [...boxes].sort((a, b) => a.y - b.y);
  const lines = [];
  for (const b of sorted) {
    const cy = b.y + b.h / 2;
    const line = lines.find((l) => Math.abs(l.cy - cy) <= LINE_TOLERANCE + Math.max(l.h, b.h) / 2);
    if (line) {
      line.boxes.push(b);
      line.cy = (line.cy * (line.boxes.length - 1) + cy) / line.boxes.length;
      line.h = Math.max(line.h, b.h);
    } else {
      lines.push({ cy, h: b.h, boxes: [b] });
    }
  }

  const rects = [];
  for (const line of lines) {
    line.boxes.sort((a, b) => a.x - b.x);
    let cur = { ...line.boxes[0] };
    for (let i = 1; i < line.boxes.length; i++) {
      const n = line.boxes[i];
      const gap = n.x - (cur.x + cur.w);
      if (gap <= MERGE_GAP) {
        const right = Math.max(cur.x + cur.w, n.x + n.w);
        const bottom = Math.min(cur.y, n.y);
        const top = Math.max(cur.y + cur.h, n.y + n.h);
        cur = {
          x: cur.x,
          y: bottom,
          w: right - cur.x,
          h: top - bottom,
          ...(cur.snapped || n.snapped ? { snapped: [cur.snapped, n.snapped].filter(Boolean).join(' ') } : {})
        };
      } else {
        rects.push(cur);
        cur = { ...n };
      }
    }
    rects.push(cur);
  }
  return rects;
}
