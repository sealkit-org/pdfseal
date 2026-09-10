/**
 * Global Site Configuration & Feature Flags
 * 
 * Provides centralized branding, link configuration, and modular feature toggles.
 * Clean, white-label friendly architecture following open-source best practices.
 */

import { reactive, ref } from 'vue';

export const OFFICIAL_DOMAIN = 'pdf.sealkit.org';

/**
 * Determine if current host is local development or self-hosted
 */
export function checkIsDevOrLocal() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host.endsWith('.local') || Boolean(import.meta.env.DEV);
}

/**
 * Check whether official website mode is active
 */
function checkInitialOfficialMode() {
  // 1. Explicit env flag in build / .env (e.g. VITE_FORCE_OFFICIAL_MODE=true)
  if (import.meta.env.VITE_FORCE_OFFICIAL_MODE === 'true' || import.meta.env.VITE_FORCE_OFFICIAL_MODE === true) return true;
  if (import.meta.env.VITE_FORCE_OFFICIAL_MODE === 'false' || import.meta.env.VITE_FORCE_OFFICIAL_MODE === false) return false;

  if (typeof window !== 'undefined') {
    try {
      // 2. Quick URL parameter override for testing: ?official=1 or ?official=0
      const params = new URLSearchParams(window.location.search);
      const officialParam = params.get('official');
      if (officialParam === '1' || officialParam === 'true') {
        localStorage.setItem('pdfseal_dev_official_mode', 'true');
        return true;
      }
      if (officialParam === '0' || officialParam === 'false') {
        localStorage.removeItem('pdfseal_dev_official_mode');
        return false;
      }

      // 3. LocalStorage persistence (e.g. toggled from Settings modal)
      const stored = localStorage.getItem('pdfseal_dev_official_mode');
      if (stored === 'true') return true;
      if (stored === 'false') return false;

      // 4. Production domain matching: official site
      const host = window.location.hostname;
      if (host === OFFICIAL_DOMAIN || host.endsWith('.sealkit.org')) {
        return true;
      }
    } catch (e) {}
  }

  // 5. Default on localhost / self-hosting: FALSE (Clean open-source mode)
  return false;
}

export const isDevOrLocal = checkIsDevOrLocal();
export const isOfficialMode = ref(checkInitialOfficialMode());

export function setOfficialMode(enabled) {
  isOfficialMode.value = Boolean(enabled);
  if (typeof window !== 'undefined') {
    try {
      if (enabled) {
        localStorage.setItem('pdfseal_dev_official_mode', 'true');
      } else {
        localStorage.removeItem('pdfseal_dev_official_mode');
      }
    } catch (e) {}
  }
}

export const siteConfig = reactive({
  // Brand Identity
  brandName: import.meta.env.VITE_BRAND_NAME || 'PDFSeal',
  brandTagline: import.meta.env.VITE_BRAND_TAGLINE || '100% Private, Fast, In-Browser PDF Toolkit',
  officialDomain: OFFICIAL_DOMAIN,
  officialUrl: import.meta.env.VITE_OFFICIAL_URL || 'https://pdf.sealkit.org',

  // External Support & Repository Links (Config-driven: empty by default in open-source)
  githubRepoUrl: import.meta.env.VITE_GITHUB_REPO_URL || '',
  kofiUrl: import.meta.env.VITE_KOFI_URL || '',
  enterpriseContactEmail: import.meta.env.VITE_ENTERPRISE_EMAIL || '',
  feedbackUrl: import.meta.env.VITE_FEEDBACK_URL || '',

  // Official Support & Licensing Gateway (Configurable Plans)
  plans: {
    annual: {
      tier: 'pro_annual',
      checkoutUrl: import.meta.env.VITE_PLAN_ANNUAL_URL || ''
    },
    lifetime: {
      tier: 'pro_lifetime',
      checkoutUrl: import.meta.env.VITE_PLAN_LIFETIME_URL || ''
    }
  },

  // Verification Gateway Endpoints
  licenseApiEndpoint: import.meta.env.VITE_LICENSE_API_ENDPOINT || 'https://api.lemonsqueezy.com/v1/licenses',

  // Privacy-first, cookie-free web analytics (Cloudflare Web Analytics or Umami)
  analytics: {
    cloudflareBeaconToken: import.meta.env.VITE_CF_BEACON_TOKEN || '',
    umamiSiteId: import.meta.env.VITE_UMAMI_SITE_ID || '',
    umamiScriptUrl: import.meta.env.VITE_UMAMI_SCRIPT_URL || ''
  },

  // Dynamic Feature Toggles: Strictly content-driven (Only active when official mode is on AND URL is configured)
  features: {
    // Show official community support & coffee donation button:
    // Requires official mode + a valid kofiUrl configured
    get enableDonations() {
      if (!siteConfig.kofiUrl) return false;
      if (import.meta.env.VITE_ENABLE_DONATIONS !== undefined && import.meta.env.VITE_ENABLE_DONATIONS !== '') {
        return import.meta.env.VITE_ENABLE_DONATIONS === 'true' || import.meta.env.VITE_ENABLE_DONATIONS === true;
      }
      return isOfficialMode.value;
    },

    // Show built-in feedback modal:
    // Requires official mode + a valid feedbackUrl configured (or explicitly enabled)
    get enableFeedback() {
      if (!siteConfig.feedbackUrl && import.meta.env.VITE_ENABLE_FEEDBACK !== 'true') return false;
      if (import.meta.env.VITE_ENABLE_FEEDBACK !== undefined && import.meta.env.VITE_ENABLE_FEEDBACK !== '') {
        return import.meta.env.VITE_ENABLE_FEEDBACK === 'true' || import.meta.env.VITE_ENABLE_FEEDBACK === true;
      }
      return isOfficialMode.value;
    },

    // Show Enterprise & Pro Commercial license inquiry portal:
    // Requires official mode + at least one valid checkout URL or enterprise contact email
    get enableEnterprisePortal() {
      const hasCommercialTarget = Boolean(
        siteConfig.plans.annual.checkoutUrl || 
        siteConfig.plans.lifetime.checkoutUrl || 
        siteConfig.enterpriseContactEmail
      );
      if (!hasCommercialTarget) return false;
      if (import.meta.env.VITE_ENABLE_ENTERPRISE !== undefined && import.meta.env.VITE_ENABLE_ENTERPRISE !== '') {
        return import.meta.env.VITE_ENABLE_ENTERPRISE === 'true' || import.meta.env.VITE_ENABLE_ENTERPRISE === true;
      }
      return isOfficialMode.value;
    },

    // Show Pro Standalone Desktop App suggestion during heavy batch workflows
    get enableProDesktopSuggestion() {
      if (!this.enableEnterprisePortal) return false;
      if (import.meta.env.VITE_ENABLE_PRO_DESKTOP !== undefined && import.meta.env.VITE_ENABLE_PRO_DESKTOP !== '') {
        return import.meta.env.VITE_ENABLE_PRO_DESKTOP === 'true' || import.meta.env.VITE_ENABLE_PRO_DESKTOP === true;
      }
      return isOfficialMode.value;
    },

    // Workload threshold to trigger friendly native desktop suggestion (number of files)
    batchWorkloadThreshold: 4
  }
});
