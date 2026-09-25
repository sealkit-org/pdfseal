import { ref, computed } from 'vue';
import en from './locales/en.json';
import zh from './locales/zh.json';
import de from './locales/de.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import ja from './locales/ja.json';

const dictionaries = { en, zh, de, es, fr, ja };

export const SUPPORTED_LANGUAGES = ['en', 'de', 'es', 'fr', 'ja', 'zh'];

// Force Vite HMR reload for JSON locales
// Determine initial language safely for both browser and test/SSR environments
export function getInitialLang() {
  // 1. Priority: URL query parameter (?lang=ja or ?hl=ja) for direct language sharing & crawler discovery
  if (typeof window !== 'undefined' && window.location && window.location.search) {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const paramLang = (searchParams.get('lang') || searchParams.get('hl') || '').toLowerCase().trim();
      if (paramLang) {
        if (dictionaries[paramLang]) return paramLang;
        if (paramLang.startsWith('zh')) return 'zh';
        if (paramLang.startsWith('ja')) return 'ja';
        if (paramLang.startsWith('de')) return 'de';
        if (paramLang.startsWith('es')) return 'es';
        if (paramLang.startsWith('fr')) return 'fr';
        if (paramLang.startsWith('en')) return 'en';
      }
    } catch (e) {}
  }

  // 2. Local storage
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem('pdfseal_lang');
      if (saved && dictionaries[saved]) return saved;
    } catch (e) {}
  }

  // 3. Browser system language
  const nav = (typeof navigator !== 'undefined' ? (navigator.language || navigator.userLanguage || 'en') : 'en').toLowerCase();
  if (nav.startsWith('zh')) return 'zh';
  if (nav.startsWith('ja')) return 'ja';
  if (nav.startsWith('de')) return 'de';
  if (nav.startsWith('es')) return 'es';
  if (nav.startsWith('fr')) return 'fr';
  return 'en';
}

export const currentLang = ref(getInitialLang());

let onLanguageChangeCallback = null;
export function onLanguageChange(cb) {
  onLanguageChangeCallback = cb;
}

export function setLanguage(lang, syncUrl = true) {
  if (dictionaries[lang]) {
    currentLang.value = lang;
    if (typeof window !== 'undefined') {
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('pdfseal_lang', lang);
        } catch (e) {}
      }
      if (syncUrl && window.history && window.location) {
        try {
          const url = new URL(window.location.href);
          if (lang === 'en') {
            url.searchParams.delete('lang');
            url.searchParams.delete('hl');
          } else {
            url.searchParams.set('lang', lang);
          }
          const newUrl = url.pathname + (url.search ? url.search : '') + (url.hash || '');
          window.history.replaceState(window.history.state, '', newUrl);
        } catch (e) {}
      }
    }
    updateTitle();
    if (onLanguageChangeCallback) {
      try { onLanguageChangeCallback(lang); } catch (e) {}
    }
  }
}

export function t(key, fallbackOrParams = null, fallback = null) {
  let params = null;
  let defaultStr = null;

  if (fallbackOrParams && typeof fallbackOrParams === 'object') {
    params = fallbackOrParams;
    if (typeof fallback === 'string') defaultStr = fallback;
  } else if (typeof fallbackOrParams === 'string') {
    defaultStr = fallbackOrParams;
    if (fallback && typeof fallback === 'object') {
      params = fallback;
    }
  } else if (fallback && typeof fallback === 'object') {
    params = fallback;
  }

  let str = null;
  const dict = dictionaries[currentLang.value] || dictionaries.en;
  if (dict && dict[key] !== undefined) str = dict[key];
  else if (dictionaries.en && dictionaries.en[key] !== undefined) str = dictionaries.en[key];
  else if (defaultStr !== null) str = defaultStr;
  else str = key;

  if (params && typeof params === 'object') {
    Object.keys(params).forEach(k => {
      str = String(str).replaceAll('{' + k + '}', params[k]);
    });
  }
  return str;
}

export function updateTitle() {
  if (typeof document !== 'undefined') {
    document.title = t('page_title');
  }
}

// Initialize title on load if document exists
if (typeof document !== 'undefined') {
  updateTitle();
}
