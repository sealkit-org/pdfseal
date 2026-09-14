/**
 * LemonSqueezy License Gateway & Device Seat Manager
 * 
 * Handles automated activation, 3-device seat limits, and offline fallback persistence.
 * Fully compatible with LemonSqueezy Merchant of Record (MoR) License API.
 */

import { siteConfig } from '../../config/siteConfig';

const API_ENDPOINT = siteConfig.licenseApiEndpoint || 'https://api.lemonsqueezy.com/v1/licenses';

/**
 * Retrieves or creates a persistent device instance ID for seat management
 */
export function getOrCreateInstanceId() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 'PDFSeal-Node-' + Math.random().toString(36).substring(2, 9);
  }

  let id = window.localStorage.getItem('pdfseal_device_instance_id');
  if (!id) {
    const platform = typeof navigator !== 'undefined' ? (navigator.userAgentData?.platform || navigator.platform || 'Device') : 'Device';
    const randomSuffix = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID().substring(0, 8) 
      : Math.random().toString(36).substring(2, 10);
    id = `PDFSeal-${platform}-${randomSuffix}`;
    window.localStorage.setItem('pdfseal_device_instance_id', id);
  }
  return id;
}

/**
 * Activates a LemonSqueezy license key and binds to current device
 * @param {string} licenseKey 
 * @param {string} [customInstanceName]
 * @returns {Promise<{ success: boolean, cert?: Object, error?: string }>}
 */
export async function activateLemonLicense(licenseKey, customInstanceName = null) {
  try {
    const trimmedKey = (licenseKey || '').trim();
    if (!trimmedKey) {
      return { success: false, error: 'License key cannot be empty' };
    }

    const instanceName = customInstanceName || getOrCreateInstanceId();

    const formData = new FormData();
    formData.append('license_key', trimmedKey);
    formData.append('instance_name', instanceName);

    const response = await fetch(`${API_ENDPOINT}/activate`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json'
      },
      body: formData
    });

    const data = await response.json();

    if (data.activated) {
      const lk = data.license_key || {};
      const meta = data.meta || {};
      const isAnnual = Boolean(lk.expires_at);

      const cert = {
        id: lk.key || trimmedKey,
        name: meta.customer_name || meta.user_name || 'LemonSqueezy Supporter',
        email: meta.customer_email || meta.user_email || '',
        tier: isAnnual ? 'pro_annual' : 'pro_lifetime',
        issuedAt: lk.created_at ? new Date(lk.created_at).getTime() : Date.now(),
        expiresAt: lk.expires_at ? new Date(lk.expires_at).getTime() : null,
        provider: 'lemonsqueezy',
        instanceId: data.instance?.id || null,
        instanceName: instanceName,
        raw: trimmedKey
      };

      return { success: true, cert };
    } else {
      // Handle known LemonSqueezy error messages
      const errorMsg = data.error || '';
      if (errorMsg.includes('activation_limit_reached') || errorMsg.includes('limit')) {
        return { 
          success: false, 
          error: 'Maximum device activation limit reached (typically 3 devices). Please deactivate from your previous device first.' 
        };
      }
      if (errorMsg.includes('not_found') || errorMsg.includes('invalid')) {
        return { 
          success: false, 
          error: 'Invalid license key. Please check the License Key in your confirmation email.' 
        };
      }
      if (errorMsg.includes('expired')) {
        return { 
          success: false, 
          error: 'This annual subscription license has expired. Please renew on LemonSqueezy.' 
        };
      }
      return { success: false, error: errorMsg || 'LemonSqueezy activation failed' };
    }
  } catch (err) {
    return { 
      success: false, 
      error: 'Network error or offline. Initial activation requires an internet connection: ' + (err.message || 'Request timed out') 
    };
  }
}

/**
 * Deactivates a LemonSqueezy license key from current device (releases seat)
 * @param {string} licenseKey 
 * @param {string} instanceId 
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function deactivateLemonLicense(licenseKey, instanceId) {
  try {
    const formData = new FormData();
    formData.append('license_key', licenseKey);
    formData.append('instance_id', instanceId);

    const response = await fetch(`${API_ENDPOINT}/deactivate`, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: formData
    });

    const data = await response.json();
    return { success: Boolean(data.deactivated) };
  } catch (err) {
    console.warn('[PDFSeal] Failed to deactivate LemonSqueezy seat:', err);
    return { success: false, error: err.message };
  }
}
