/**
 * 规则匹配器：Pipeline 节点 node_redact 的"规则 → 脱敏矩形"转换层。
 *
 * 输入为 pdf.js getTextContent 的文本项（用户空间），输出为 redactPdf 可直接
 * 消费的 rects。匹配在单个 textItem.str 上进行（与 UI 手动框选同源的 bbox 口径）。
 *
 * 安全防护（防灾难性回溯冻结 UI / 防意外全文档摧毁）：
 *  - 无效正则 try/catch 跳过并记录 warning
 *  - pattern 长度上限 MAX_PATTERN_LENGTH
 *  - 单页命中数上限 MAX_HITS_PER_PAGE（触顶即停止匹配）
 *
 * 已知边界：文本行可能被拆成多个 textItem，跨 item 拆分的敏感串无法命中
 * （UI 手动框选可覆盖该场景，节点边界备注已声明）。
 */
import { textItemToUserBBox } from './coords.js';

/** 正则/关键词模式长度上限（字符） */
export const MAX_PATTERN_LENGTH = 256;
/** 单页命中数上限（textItem 级），触顶停止匹配 */
export const MAX_HITS_PER_PAGE = 500;
/** 同行合并：两命中 bbox 的行基线 y 差容差（pt） */
export const LINE_TOLERANCE = 3;
/** 同行合并：相邻 bbox 间最大空隙（pt），超过则不合并 */
export const MERGE_GAP = 12;

/**
 * 内置 PII 预设（批量脱敏模板，PipelineTool 配置面板以 chips 呈现）。
 * pattern 均为 regex 类型；label 由 i18n key node_redact_preset_* 提供。
 */
export const PII_PRESETS = [
  {
    id: 'id',
    labelKey: 'node_redact_preset_id',
    type: 'regex',
    caseSensitive: false,
    // 18 位居民身份证（含末位 X）
    value: '\\b[1-9]\\d{5}(?:19|20)\\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\\d|3[01])\\d{3}[\\dXx]\\b'
  },
  {
    id: 'phone',
    labelKey: 'node_redact_preset_phone',
    type: 'regex',
    caseSensitive: false,
    // 中国大陆手机号
    value: '\\b1[3-9]\\d{9}\\b'
  },
  {
    id: 'bank',
    labelKey: 'node_redact_preset_bank',
    type: 'regex',
    caseSensitive: false,
    // 16-19 位连续数字（银行卡常见长度）
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
    // 2026-09-17 / 2026/9/17 / 2026年9月17日
    value: '\\b\\d{4}[-/年.]\\d{1,2}[-/月.]\\d{1,2}日?\\b'
  }
];

/** 正则元字符转义（keyword 模式构造安全正则用） */
function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 编译单条规则为可复用的正则。无效/超长规则返回 { valid: false }。
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
 * 规则批量匹配：textItems → 脱敏 rects。
 * @param {Array<{str:string, transform:number[], width:number, height:number}>} textItems
 *        单页 pdf.js getTextContent().items
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

  /** 命中的用户空间 bbox（合并前） */
  const hitBoxes = [];
  const perRuleHits = new Map(); // ruleIndex → 命中数
  let totalHits = 0;
  let hitLimitReached = false;

  outer: for (const item of items) {
    const str = item?.str || '';
    if (!str) continue;
    for (const c of compiled) {
      if (!c.valid) continue;
      c.re.lastIndex = 0;
      if (c.re.test(str)) {
        hitBoxes.push(textItemToUserBBox(item));
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
 * 同行相邻命中合并：y 基线相近（±LINE_TOLERANCE）的 bbox 按行聚类，
 * 行内按 x 排序，空隙 ≤ MERGE_GAP 的相邻框合并为一个矩形。
 * @param {Array<{x,y,w,h}>} boxes
 */
export function mergeSameLine(boxes) {
  if (!boxes.length) return [];
  // 按 y 中心聚类成行
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
        cur = { x: cur.x, y: bottom, w: right - cur.x, h: top - bottom };
      } else {
        rects.push(cur);
        cur = { ...n };
      }
    }
    rects.push(cur);
  }
  return rects;
}
