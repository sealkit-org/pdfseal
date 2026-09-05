/**
 * User Custom Pipelines Local Persistence Manager
 * Stores user-created automated pipelines in browser localStorage for offline use.
 */

const STORAGE_KEY = 'pdfseal_user_custom_pipelines';

export function loadUserPipelines() {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('[PDFSeal] Failed to load user custom pipelines:', e);
    return [];
  }
}

export function saveUserPipeline(pipeline) {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const existing = loadUserPipelines();
    const id = pipeline.id || ('custom_flow_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6));
    const record = {
      id,
      name: pipeline.name || '未命名流程',
      desc: pipeline.desc || '',
      isCustom: true,
      updatedAt: Date.now(),
      steps: JSON.parse(JSON.stringify(pipeline.steps || [])),
      exportConfig: pipeline.exportConfig || { destination: 'download_files' }
    };

    const idx = existing.findIndex(p => p.id === id);
    if (idx >= 0) {
      existing[idx] = record;
    } else {
      existing.unshift(record);
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    return record;
  } catch (e) {
    console.error('[PDFSeal] Failed to save custom pipeline:', e);
    return null;
  }
}

export function deleteUserPipeline(id) {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    const existing = loadUserPipelines();
    const filtered = existing.filter(p => p.id !== id);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (e) {
    console.error('[PDFSeal] Failed to delete custom pipeline:', e);
    return false;
  }
}
