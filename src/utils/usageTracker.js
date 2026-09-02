import { ref } from 'vue';

const STORAGE_KEY = 'pdfseal_tool_usage_v1';

// Initial default weights reflecting European/American top search popularity
export const DEFAULT_WEIGHTS = {
  merge: 100,
  compress: 90,
  image_to_pdf: 80,
  sign: 70,
  split: 60,
  organize: 50,
  unlock: 40,
  dewatermark: 30,
  watermark: 20,
  sanitize: 10
};

export const toolUsageCounts = ref(loadUsage());

function loadUsage() {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULT_WEIGHTS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Failed to load usage counts:', e);
  }
  return { ...DEFAULT_WEIGHTS };
}

/**
 * Records an interaction or execution with a tool.
 * Note: 'vault' does not participate in the frequency ranking (kept as special pinned hub).
 * @param {string} toolId 
 */
export function recordToolUsage(toolId) {
  if (!toolId || toolId === 'vault') return;

  if (typeof toolUsageCounts.value[toolId] !== 'number') {
    toolUsageCounts.value[toolId] = 0;
  }
  toolUsageCounts.value[toolId] += 1;

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toolUsageCounts.value));
    }
  } catch (e) {
    console.error('Failed to save usage counts:', e);
  }
}

/**
 * Sorts tools dynamically by usage frequency while keeping 'vault' pinned at the front.
 * @param {Array<{id: string, labelKey: string, icon: any}>} toolList 
 * @returns {Array<{id: string, labelKey: string, icon: any}>}
 */
export function getRankedTools(toolList) {
  const vaultTool = toolList.find(t => t.id === 'vault');
  const otherTools = toolList.filter(t => t.id !== 'vault');

  otherTools.sort((a, b) => {
    const countA = toolUsageCounts.value[a.id] ?? (DEFAULT_WEIGHTS[a.id] || 0);
    const countB = toolUsageCounts.value[b.id] ?? (DEFAULT_WEIGHTS[b.id] || 0);
    return countB - countA;
  });

  return vaultTool ? [vaultTool, ...otherTools] : otherTools;
}
