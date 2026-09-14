/**
 * Reactive Certificate & License State Store
 * Supports both LemonSqueezy license keys (with seat management) and offline ECDSA certificates.
 */

import { ref, computed } from 'vue';
import { verifySupporterCertificate } from './supporterCertificate';
import { activateLemonLicense, deactivateLemonLicense } from './lemonSqueezyLicense';
import { t } from '../../i18n';

const STORAGE_KEY = 'pdfseal_supporter_cert';
const LEMON_RECORD_KEY = 'pdfseal_lemon_license_record';

export const activeCert = ref(null);
export const isVerifying = ref(false);

/**
 * Initialize and verify stored certificate on app startup (100% offline-capable)
 */
export async function initCertificateStore() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;

    // 1. Check LemonSqueezy persistent offline record
    const storedLemonRaw = window.localStorage.getItem(LEMON_RECORD_KEY);
    if (storedLemonRaw) {
      try {
        const cert = JSON.parse(storedLemonRaw);
        // Check expiration if annual
        if (cert.expiresAt && Date.now() > cert.expiresAt) {
          activeCert.value = { ...cert, isExpired: true };
          return null;
        }
        activeCert.value = cert;
        return cert;
      } catch (e) {}
    }

    // 2. Check offline ECDSA Supporter certificate
    const storedRaw = window.localStorage.getItem(STORAGE_KEY);
    if (!storedRaw) {
      activeCert.value = null;
      return null;
    }

    isVerifying.value = true;
    const res = await verifySupporterCertificate(storedRaw);
    if (res.valid) {
      activeCert.value = res.cert;
      return res.cert;
    } else {
      if (res.expired) {
        activeCert.value = { ...res.cert, isExpired: true };
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
        activeCert.value = null;
      }
      return null;
    }
  } catch (e) {
    console.warn('[PDFSeal] Failed to initialize certificate store:', e);
    return null;
  } finally {
    isVerifying.value = false;
  }
}

/**
 * Validates and activates a new certificate string
 * Supports both offline SEAL- ECDSA certificates and LemonSqueezy license keys
 * @param {string} rawString 
 * @returns {Promise<{ success: boolean, cert?: Object, error?: string }>}
 */
export async function activateCertificate(rawString) {
  const trimmed = (rawString || '').trim();
  if (!trimmed) {
    return { success: false, error: 'Please enter a license key or certificate code' };
  }

  isVerifying.value = true;
  try {
    // Branch A: Offline ECDSA Supporter Certificate (starts with SEAL-)
    if (trimmed.startsWith('SEAL-')) {
      const res = await verifySupporterCertificate(trimmed);
      if (res.valid) {
        activeCert.value = res.cert;
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(STORAGE_KEY, res.cert.raw);
          window.localStorage.removeItem(LEMON_RECORD_KEY);
        }
        return { success: true, cert: res.cert };
      } else {
        return { success: false, error: res.error };
      }
    }

    // Branch B: LemonSqueezy License Key
    const lemonRes = await activateLemonLicense(trimmed);
    if (lemonRes.success) {
      activeCert.value = lemonRes.cert;
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(LEMON_RECORD_KEY, JSON.stringify(lemonRes.cert));
        window.localStorage.removeItem(STORAGE_KEY);
      }
      return { success: true, cert: lemonRes.cert };
    } else {
      return { success: false, error: lemonRes.error };
    }
  } finally {
    isVerifying.value = false;
  }
}

/**
 * Revokes / logs out current active certificate and releases device seat
 */
export async function revokeCertificate() {
  const cert = activeCert.value;
  if (cert && cert.provider === 'lemonsqueezy' && cert.instanceId) {
    // Release seat in background
    deactivateLemonLicense(cert.id, cert.instanceId);
  }

  activeCert.value = null;
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LEMON_RECORD_KEY);
  }
}

/**
 * Computed helper checking if user currently has valid Pro or Enterprise status
 */
export const isProSupporter = computed(() => {
  if (!activeCert.value) return false;
  if (activeCert.value.isExpired) return false;
  const tier = activeCert.value.tier;
  return tier === 'pro_annual' || tier === 'pro_lifetime' || tier === 'enterprise';
});

/**
 * Friendly label for current active tier
 */
export const activeTierLabel = computed(() => {
  if (!activeCert.value) return t('tier_community', 'Free');
  if (activeCert.value.isExpired) return t('tier_expired', 'Expired');
  switch (activeCert.value.tier) {
    case 'pro_lifetime':
    case 'pro_annual':
      return t('tier_pro', 'Pro');
    case 'enterprise':
      return t('tier_enterprise', 'Team');
    default:
      return t('tier_community', 'Free');
  }
});
