/**
 * Privacy-First, Zero-Cookie Analytics Engine
 * 
 * Supports:
 * - Cloudflare Web Analytics (Cookie-free, edge-calculated, GDPR compliant)
 * - Umami Analytics (Self-hosted, cookie-free, privacy focused)
 * 
 * Respects user privacy: NEVER stores cookies, NEVER tracks personal identifiers.
 */

import { siteConfig } from '../config/siteConfig';
import { logger } from './logger';

let isInitialized = false;

export function initAnalytics() {
  if (typeof window === 'undefined' || isInitialized) return;

  const { cloudflareBeaconToken, umamiSiteId, umamiScriptUrl } = siteConfig.analytics;

  // 1. Cloudflare Web Analytics Beacon (Zero Cookies)
  if (cloudflareBeaconToken) {
    try {
      const script = document.createElement('script');
      script.defer = true;
      script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
      script.setAttribute('data-cf-beacon', JSON.stringify({ token: cloudflareBeaconToken, spa: true }));
      document.head.appendChild(script);
      logger.info('ANALYTICS', 'Cloudflare Web Analytics (Zero-Cookie) initialized');
    } catch (e) {
      logger.warn('ANALYTICS', `Failed to inject Cloudflare Beacon: ${e.message}`);
    }
  }

  // 2. Umami Analytics (Zero Cookies)
  if (umamiSiteId && umamiScriptUrl) {
    try {
      const script = document.createElement('script');
      script.async = true;
      script.defer = true;
      script.src = umamiScriptUrl;
      script.setAttribute('data-website-id', umamiSiteId);
      document.head.appendChild(script);
      logger.info('ANALYTICS', 'Umami Analytics initialized');
    } catch (e) {
      logger.warn('ANALYTICS', `Failed to inject Umami script: ${e.message}`);
    }
  }

  isInitialized = true;
}

export function trackVirtualPageView(path, title) {
  if (typeof window === 'undefined') return;

  // Umami virtual pageview tracking
  if (window.umami && typeof window.umami.track === 'function') {
    try {
      window.umami.track((props) => ({
        ...props,
        url: path,
        title: title || document.title
      }));
    } catch (e) {}
  }
}
