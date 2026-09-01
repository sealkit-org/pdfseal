import { describe, it, expect, beforeEach } from 'vitest';
import { getRankedTools, recordToolUsage, toolUsageCounts } from '../src/utils/usageTracker';

describe('Smart Tool Usage Ranking Engine', () => {
  const sampleTools = [
    { id: 'vault', labelKey: 'tab_vault' },
    { id: 'merge', labelKey: 'tab_merge' },
    { id: 'organize', labelKey: 'tab_organize' },
    { id: 'split', labelKey: 'tab_split' },
    { id: 'watermark', labelKey: 'tab_watermark' },
    { id: 'sanitize', labelKey: 'tab_sanitize' }
  ];

  it('keeps vault pinned at index 0 at all times', () => {
    const ranked = getRankedTools(sampleTools);
    expect(ranked[0].id).toBe('vault');
  });

  it('dynamically ranks tools by usage count', () => {
    // Boost watermark and split usage heavily
    toolUsageCounts.value.watermark = 999;
    toolUsageCounts.value.split = 888;
    toolUsageCounts.value.merge = 10;

    const ranked = getRankedTools(sampleTools);
    expect(ranked[0].id).toBe('vault'); // Vault stays pinned
    expect(ranked[1].id).toBe('watermark'); // 1st most used
    expect(ranked[2].id).toBe('split'); // 2nd most used
  });

  it('ranks pure operational tools list when vault is separated to the right', () => {
    const opTools = [
      { id: 'merge' },
      { id: 'organize' },
      { id: 'split' },
      { id: 'watermark' },
      { id: 'sanitize' }
    ];
    toolUsageCounts.value.sanitize = 1000;
    const ranked = getRankedTools(opTools);
    expect(ranked[0].id).toBe('sanitize');
  });
});
