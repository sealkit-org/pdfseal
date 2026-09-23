import { 
  Minimize2, 
  PenTool, 
  Lock, 
  ShieldCheck, 
  EyeOff, 
  Layers, 
  Scissors, 
  Stamp, 
  ListOrdered, 
  ImageDown, 
  Images, 
  Files, 
  FolderLock 
} from 'lucide-vue-next';

/**
 * Tool Catalog defining styling, icons, and labels for all interactive relay actions
 */
export const ACTION_CATALOG = {
  compress: {
    id: 'compress',
    labelKey: 'tab_compress',
    icon: Minimize2,
    color: 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200',
    heroColor: 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
  },
  sign: {
    id: 'sign',
    labelKey: 'tab_sign',
    icon: PenTool,
    color: 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-200',
    heroColor: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
  },
  protect: {
    id: 'protect',
    labelKey: 'tab_protect',
    icon: Lock,
    color: 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200',
    heroColor: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
  },
  sanitize: {
    id: 'sanitize',
    labelKey: 'tab_sanitize',
    icon: ShieldCheck,
    color: 'text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border-cyan-200',
    heroColor: 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-cyan-600/20'
  },
  redact: {
    id: 'redact',
    labelKey: 'tab_redact',
    icon: EyeOff,
    color: 'text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-200',
    heroColor: 'bg-slate-800 hover:bg-slate-900 text-white shadow-slate-800/20'
  },
  organize: {
    id: 'organize',
    labelKey: 'tab_organize',
    icon: Layers,
    color: 'text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-200',
    heroColor: 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/20'
  },
  split: {
    id: 'split',
    labelKey: 'tab_split',
    icon: Scissors,
    color: 'text-teal-700 bg-teal-50 hover:bg-teal-100 border-teal-200',
    heroColor: 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20'
  },
  watermark: {
    id: 'watermark',
    labelKey: 'tab_watermark',
    icon: Stamp,
    color: 'text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200',
    heroColor: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
  },
  page_number: {
    id: 'page_number',
    labelKey: 'tab_page_number',
    icon: ListOrdered,
    color: 'text-violet-700 bg-violet-50 hover:bg-violet-100 border-violet-200',
    heroColor: 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-600/20'
  },
  pdf_to_image: {
    id: 'pdf_to_image',
    labelKey: 'tab_pdf_to_image',
    icon: ImageDown,
    color: 'text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border-cyan-200',
    heroColor: 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-cyan-600/20'
  },
  image_to_pdf: {
    id: 'image_to_pdf',
    labelKey: 'tab_image_to_pdf',
    icon: Images,
    color: 'text-violet-700 bg-violet-50 hover:bg-violet-100 border-violet-200',
    heroColor: 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-600/20'
  },
  merge: {
    id: 'merge',
    labelKey: 'tab_merge',
    icon: Files,
    color: 'text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-200',
    heroColor: 'bg-slate-700 hover:bg-slate-800 text-white shadow-slate-700/20'
  },
  vault: {
    id: 'vault',
    labelKey: 'next_action_vault',
    icon: FolderLock,
    color: 'text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200',
    heroColor: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
  }
};

/**
 * Standard priority map for general PDF-to-PDF relays
 */
export const DEFAULT_PRIORITY_MAP = {
  merge: ['page_number', 'organize', 'sign', 'compress'],
  compress: ['protect', 'sign', 'watermark', 'pdf_to_image'],
  organize: ['page_number', 'compress', 'sign', 'protect'],
  split: ['page_number', 'compress', 'sign', 'organize'],
  page_number: ['watermark', 'protect', 'compress', 'sign'],
  watermark: ['protect', 'compress', 'sign', 'sanitize'],
  protect: ['vault', 'watermark', 'compress', 'sign'],
  sanitize: ['protect', 'compress', 'watermark', 'sign'],
  redact: ['sanitize', 'protect', 'compress', 'sign'],
  unlock: ['organize', 'split', 'compress', 'sign'],
  sign: ['protect', 'compress', 'watermark', 'sanitize'],
  image_to_pdf: ['page_number', 'compress', 'watermark', 'protect']
};

/**
 * Checks whether an exported deliverable file is a ZIP archive
 * 
 * @param {Object} file
 * @returns {boolean}
 */
export function isZipDeliverable(file) {
  if (!file) return false;
  if (file.isZip) return true;
  const name = (file.name || '').toLowerCase();
  return name.endsWith('.zip');
}

/**
 * Formats byte size into human readable string
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Resolves context-aware smart next actions (Hero recommendation + Secondary pills)
 * 
 * @param {string} sourceTool - Source tool identifier
 * @param {Object} file - Output deliverable object { name, size, arrayBuffer, isZip, ... }
 * @param {Object} [options] - Additional options (e.g. { pageCount })
 * @returns {Object} { canRelay, isZip, heroAction, secondaryActions }
 */
export function resolveNextActions(sourceTool, file, options = {}) {
  // -------------------------------------------------------------
  // 1. ZIP DELIVERABLE (PDF-to-Image bundle, multi-file Split)
  // When the output is a packaged ZIP archive, workflow relay is completed.
  // We clean up the delivery view by NOT rendering a forced NextAction banner.
  // -------------------------------------------------------------
  if (isZipDeliverable(file)) {
    return {
      canRelay: false,
      isZip: true,
      heroAction: null,
      secondaryActions: []
    };
  }

  const size = file?.size || 0;
  const sizeFormatted = formatFileSize(size);

  // -------------------------------------------------------------
  // 2. LARGE PDF RULE (> 10MB, and not coming from compress)
  // -------------------------------------------------------------
  const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024; // 10 MB
  if (size >= LARGE_FILE_THRESHOLD && sourceTool !== 'compress') {
    const heroDef = ACTION_CATALOG.compress;
    const fallbackIds = DEFAULT_PRIORITY_MAP[sourceTool] || ['page_number', 'organize', 'sign'];
    const secondaryIds = fallbackIds.filter(id => id !== 'compress' && id !== sourceTool).slice(0, 3);

    return {
      canRelay: true,
      isZip: false,
      heroAction: {
        ...heroDef,
        badgeKey: 'next_action_badge_oversized',
        badgeParams: { size: sizeFormatted },
        titleKey: 'next_action_recommend_title',
        descKey: 'next_action_desc_compress_large',
        descParams: { size: sizeFormatted },
        ctaKey: 'next_action_cta_compress'
      },
      secondaryActions: secondaryIds.map(id => ACTION_CATALOG[id]).filter(Boolean)
    };
  }

  // -------------------------------------------------------------
  // 3. CONTEXTUAL SEMANTIC WORKFLOW RULES (Single PDF <= 10MB)
  // -------------------------------------------------------------
  let heroId = 'page_number';
  let badgeKey = 'next_action_badge_ready';
  let descKey = 'next_action_desc_general';
  let ctaKey = 'next_action_cta_page_number';
  let secondaryIds = [];

  switch (sourceTool) {
    case 'merge':
      heroId = 'page_number';
      badgeKey = 'next_action_badge_new_doc';
      descKey = 'next_action_desc_merge_paginated';
      ctaKey = 'next_action_cta_page_number';
      secondaryIds = ['organize', 'sign', 'compress'];
      break;

    case 'organize':
      heroId = 'page_number';
      badgeKey = 'next_action_badge_ready';
      descKey = 'next_action_desc_merge_paginated';
      ctaKey = 'next_action_cta_page_number';
      secondaryIds = ['compress', 'sign', 'protect'];
      break;

    case 'split':
      heroId = 'page_number';
      badgeKey = 'next_action_badge_ready';
      descKey = 'next_action_desc_merge_paginated';
      ctaKey = 'next_action_cta_page_number';
      secondaryIds = ['compress', 'sign', 'organize'];
      break;

    case 'image_to_pdf':
      heroId = 'page_number';
      badgeKey = 'next_action_badge_new_doc';
      descKey = 'next_action_desc_img2pdf_numbered';
      ctaKey = 'next_action_cta_page_number';
      secondaryIds = ['compress', 'watermark', 'protect'];
      break;

    case 'page_number':
      heroId = 'watermark';
      badgeKey = 'next_action_badge_paginated';
      descKey = 'next_action_desc_watermark_ready';
      ctaKey = 'next_action_cta_watermark';
      secondaryIds = ['protect', 'compress', 'sign'];
      break;

    case 'sign':
      heroId = 'protect';
      badgeKey = 'next_action_badge_signed';
      descKey = 'next_action_desc_protect_signed';
      ctaKey = 'next_action_cta_protect';
      secondaryIds = ['compress', 'watermark', 'sanitize'];
      break;

    case 'watermark':
      heroId = 'protect';
      badgeKey = 'next_action_badge_watermarked';
      descKey = 'next_action_desc_protect_watermarked';
      ctaKey = 'next_action_cta_protect';
      secondaryIds = ['compress', 'sign', 'sanitize'];
      break;

    case 'redact':
      heroId = 'sanitize';
      badgeKey = 'next_action_badge_privacy';
      descKey = 'next_action_desc_sanitize_redacted';
      ctaKey = 'next_action_cta_sanitize';
      secondaryIds = ['protect', 'compress', 'sign'];
      break;

    case 'sanitize':
      heroId = 'protect';
      badgeKey = 'next_action_badge_clean';
      descKey = 'next_action_desc_protect_sanitized';
      ctaKey = 'next_action_cta_protect';
      secondaryIds = ['compress', 'watermark', 'sign'];
      break;

    case 'unlock':
      heroId = 'organize';
      badgeKey = 'next_action_badge_unlocked';
      descKey = 'next_action_desc_unlocked';
      ctaKey = 'next_action_cta_organize';
      secondaryIds = ['split', 'compress', 'sign'];
      break;

    case 'compress':
      heroId = 'protect';
      badgeKey = 'next_action_badge_ready';
      descKey = 'next_action_desc_protect_signed';
      ctaKey = 'next_action_cta_protect';
      secondaryIds = ['sign', 'watermark', 'pdf_to_image'];
      break;

    case 'protect':
      heroId = 'watermark';
      badgeKey = 'next_action_badge_ready';
      descKey = 'next_action_desc_general';
      ctaKey = 'next_action_cta_watermark';
      secondaryIds = ['compress', 'sign', 'sanitize'];
      break;

    default:
      heroId = 'compress';
      badgeKey = 'next_action_badge_general';
      descKey = 'next_action_desc_general';
      ctaKey = 'next_action_cta_compress';
      secondaryIds = ['page_number', 'sign', 'protect'];
      break;
  }

  const heroDef = ACTION_CATALOG[heroId] || ACTION_CATALOG.compress;
  const secondaryActions = secondaryIds
    .filter(id => id !== heroId && id !== sourceTool)
    .map(id => ACTION_CATALOG[id])
    .filter(Boolean)
    .slice(0, 3);

  return {
    canRelay: true,
    isZip: false,
    heroAction: {
      ...heroDef,
      badgeKey,
      badgeParams: badgeKey === 'next_action_badge_oversized' ? { size: sizeFormatted } : null,
      titleKey: 'next_action_recommend_title',
      descKey,
      descParams: descKey === 'next_action_desc_compress_large' ? { size: sizeFormatted } : null,
      ctaKey
    },
    secondaryActions
  };
}
