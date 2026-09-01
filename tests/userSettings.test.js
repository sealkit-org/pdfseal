import { describe, it, expect, beforeEach } from 'vitest';
import { userSettings, resetSettings } from '../src/utils/userSettings';

describe('Global User Settings Manager', () => {
  beforeEach(() => {
    resetSettings();
  });

  it('should initialize with standard defaults', () => {
    expect(userSettings.preserveWatermarks).toBe(true);
    expect(userSettings.autoSaveToVault).toBe(true);
    expect(userSettings.defaultVaultView).toBe('grid');
    expect(userSettings.defaultExportPrefix).toBe('PDFSeal');
    expect(userSettings.rememberSessionPasswords).toBe(true);
  });

  it('should allow mutably modifying settings', () => {
    userSettings.preserveWatermarks = false;
    userSettings.defaultVaultView = 'list';
    userSettings.defaultExportPrefix = 'Contract';

    expect(userSettings.preserveWatermarks).toBe(false);
    expect(userSettings.defaultVaultView).toBe('list');
    expect(userSettings.defaultExportPrefix).toBe('Contract');
  });

  it('should reset to defaults when requested', () => {
    userSettings.preserveWatermarks = false;
    userSettings.defaultExportPrefix = 'Custom';
    resetSettings();

    expect(userSettings.preserveWatermarks).toBe(true);
    expect(userSettings.defaultExportPrefix).toBe('PDFSeal');
  });
});
