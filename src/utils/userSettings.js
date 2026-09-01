import { reactive, watch } from 'vue';

const STORAGE_KEY = 'pdfseal_global_settings';

const DEFAULT_SETTINGS = {
  // Rendering & Layer processing
  preserveWatermarks: true, // true = keep all annotations, stamps, floating watermarks; false = clean core text
  // Vault & Archiving
  autoSaveToVault: true, // Auto-archive exported files into Local Vault
  defaultVaultView: 'grid', // 'grid' | 'list'
  // Export Naming
  defaultExportPrefix: 'PDFSeal',
  // Security & Session
  rememberSessionPasswords: true
};

function loadSettings() {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      }
    }
  } catch (e) {}
  return { ...DEFAULT_SETTINGS };
}

export const userSettings = reactive(loadSettings());

// Auto-save changes to localStorage
watch(
  userSettings,
  (newVal) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newVal));
      }
    } catch (e) {}
  },
  { deep: true }
);

export function resetSettings() {
  Object.assign(userSettings, DEFAULT_SETTINGS);
}
