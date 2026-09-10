import { t, currentLang, onLanguageChange } from '../i18n';
import { trackVirtualPageView } from './analytics';

let lastToolId = 'merge';

// Automatically update SEO meta tags when user switches language
onLanguageChange(() => {
  if (typeof document !== 'undefined') {
    updateSeoMeta(lastToolId);
  }
});

function setMetaTag(selector, attrName, attrValue, contentValue) {
  if (typeof document === 'undefined') return;
  let element = document.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attrName, attrValue);
    document.head.appendChild(element);
  }
  element.setAttribute('content', contentValue);
}

function setCanonical(href) {
  if (typeof document === 'undefined') return;
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

/**
 * Updates SEO document title, meta descriptions, canonical link, and Open Graph tags.
 * @param {object|string} routeOrToolId Vue router route object or toolId string
 */
export function updateSeoMeta(routeOrToolId) {
  if (typeof document === 'undefined') return;

  let toolId = 'merge';
  let path = '/merge-pdf';

  if (typeof routeOrToolId === 'string') {
    toolId = routeOrToolId;
  } else if (routeOrToolId && typeof routeOrToolId === 'object') {
    toolId = routeOrToolId.meta?.toolId || routeOrToolId.name || 'merge';
    path = routeOrToolId.path || window.location?.pathname || '/merge-pdf';
  }

  lastToolId = toolId;

  const titleKey = `seo_title_${toolId}`;
  const descKey = `seo_desc_${toolId}`;

  const title = t(titleKey, t('page_title'));
  const description = t(descKey, t('hero_subtitle'));

  // Update HTML document title & language
  document.title = title;
  if (document.documentElement) {
    document.documentElement.setAttribute('lang', currentLang.value);
  }

  // Update Standard Meta
  setMetaTag('meta[name="description"]', 'name', 'description', description);

  // Update Open Graph (OG)
  setMetaTag('meta[property="og:title"]', 'property', 'og:title', title);
  setMetaTag('meta[property="og:description"]', 'property', 'og:description', description);
  if (typeof window !== 'undefined') {
    const fullUrl = `${window.location.origin}${path}`;
    setMetaTag('meta[property="og:url"]', 'property', 'og:url', fullUrl);
    setCanonical(fullUrl);
  }

  // Update Twitter Card
  setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', title);
  setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', description);

  // Track virtual page view for privacy analytics
  trackVirtualPageView(path, title);
}

export function getCurrentToolId() {
  return lastToolId;
}
