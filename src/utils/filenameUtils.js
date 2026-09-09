import { userSettings } from './userSettings';

/**
 * Strips duplicate prefixes, security tags (unlocked, protected, etc.), and file extension.
 * Returns a clean semantic base filename for downstream tools and exports.
 * 
 * @param {string} fileName - Original file name (e.g. 'PDFSeal_Protected_Contract.pdf')
 * @param {Object} [options]
 * @param {string} [options.prefix] - Custom prefix to strip from start to prevent duplication
 * @param {boolean} [options.stripSecurityTags=true] - Strip 'protected', 'unlocked', etc.
 * @returns {string} - Clean base name (e.g. 'Contract')
 */
export function sanitizeBaseFileName(fileName, { prefix = null, stripSecurityTags = true } = {}) {
  if (!fileName) return 'Document';
  const effectivePrefix = prefix !== null 
    ? prefix 
    : (typeof userSettings?.defaultExportPrefix === 'string' ? userSettings.defaultExportPrefix : 'PDFSeal');
  let base = fileName.replace(/\.[^/.]+$/, '');

  // Strip security and unlock artifacts (unlocked, protected, etc.)
  if (stripSecurityTags) {
    base = base.replace(/[_-]+(unlocked|protected|encrypted|locked|需密码|已加密|已解锁)/gi, '');
    base = base.replace(/(unlocked|protected|encrypted|locked|需密码|已加密|已解锁)[_-]+/gi, '');
    base = base.replace(/^(unlocked|protected|encrypted|locked|需密码|已加密|已解锁)$/gi, '');
  }

  // Strip prefix to prevent cascading 'PDFSeal_ToolA_PDFSeal_ToolB_...'
  if (effectivePrefix) {
    const prefixStartRegex = new RegExp(`^${effectivePrefix}[_-]+`, 'i');
    base = base.replace(prefixStartRegex, '');
    const prefixInnerRegex = new RegExp(`[_-]+${effectivePrefix}([_-]+|$)`, 'gi');
    base = base.replace(prefixInnerRegex, '$1');
    if (base.toLowerCase() === effectivePrefix.toLowerCase()) {
      base = 'Document';
    }
  }

  // Clean trailing/leading underscores and hyphens
  base = base.replace(/^[_-]+|[_-]+$/g, '').trim();
  return base || 'Document';
}

/**
 * Generates an export filename with prefix and action, avoiding duplication or unwanted tags like 'unlocked'.
 * 
 * @param {string} fileName - Source file name
 * @param {string} [actionTag=''] - Action tag like 'Watermarked', 'Protected', 'Compressed', or empty for unlock
 * @returns {string}
 */
export function generateExportFileName(fileName, actionTag = '') {
  const prefix = typeof userSettings?.defaultExportPrefix === 'string'
    ? userSettings.defaultExportPrefix
    : 'PDFSeal';
  const cleanBase = sanitizeBaseFileName(fileName, { prefix });

  if (actionTag) {
    return prefix ? `${prefix}_${actionTag}_${cleanBase}` : `${actionTag}_${cleanBase}`;
  }
  return prefix ? `${prefix}_${cleanBase}` : cleanBase;
}

