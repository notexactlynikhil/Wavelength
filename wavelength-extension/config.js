/**
 * Wavelength Chrome Extension Configuration Resolver
 *
 * Resolves Supabase credentials safely without committing them to source control.
 *
 * Precedence:
 * 1. globalThis.__ECHOCRM_CONFIG__ (from config.local.js, if present)
 * 2. chrome.storage.local (runtime configured via extension settings)
 * 3. Unconfigured fallback (prompts user to configure)
 */

(function () {
  const DEFAULT_BUCKET = 'meeting-recordings';

  /**
   * Resolves the active Wavelength public configuration asynchronously.
   * @returns {Promise<{ url: string, anonKey: string, bucket: string, isConfigured: boolean }>}
   */
  async function getWavelengthConfig() {
    // 1. Check if global configuration object is set (e.g. from config.local.js)
    if (
      typeof globalThis.__ECHOCRM_CONFIG__ === 'object' &&
      globalThis.__ECHOCRM_CONFIG__ !== null &&
      globalThis.__ECHOCRM_CONFIG__.url &&
      globalThis.__ECHOCRM_CONFIG__.anonKey &&
      !globalThis.__ECHOCRM_CONFIG__.url.includes('your-project')
    ) {
      return {
        url: globalThis.__ECHOCRM_CONFIG__.url.replace(/\/$/, ''),
        anonKey: globalThis.__ECHOCRM_CONFIG__.anonKey,
        bucket: globalThis.__ECHOCRM_CONFIG__.bucket || DEFAULT_BUCKET,
        isConfigured: true
      };
    }

    // 2. Check chrome.storage.local for runtime user/admin configuration
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const stored = await chrome.storage.local.get([
          'wavelength_supabase_url',
          'wavelength_supabase_anon_key',
          'wavelength_supabase_bucket'
        ]);
        if (stored.wavelength_supabase_url && stored.wavelength_supabase_anon_key) {
          return {
            url: stored.wavelength_supabase_url.replace(/\/$/, ''),
            anonKey: stored.wavelength_supabase_anon_key,
            bucket: stored.wavelength_supabase_bucket || DEFAULT_BUCKET,
            isConfigured: true
          };
        }
      }
    } catch (e) {
      /* chrome.storage unavailable */
    }

    // 3. Fallback: Unconfigured
    return {
      url: '',
      anonKey: '',
      bucket: DEFAULT_BUCKET,
      isConfigured: false
    };
  }

  /**
   * Save runtime configuration into chrome.storage.local.
   * @param {{ url: string, anonKey: string, bucket?: string }} config
   */
  async function setWavelengthConfig(config) {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      throw new Error('chrome.storage.local is not available in this context');
    }
    await chrome.storage.local.set({
      wavelength_supabase_url: config.url ? config.url.replace(/\/$/, '') : '',
      wavelength_supabase_anon_key: config.anonKey || '',
      wavelength_supabase_bucket: config.bucket || DEFAULT_BUCKET
    });
  }

  globalThis.getWavelengthConfig = getWavelengthConfig;
  globalThis.setWavelengthConfig = setWavelengthConfig;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getWavelengthConfig, setWavelengthConfig, DEFAULT_BUCKET };
  }
})();
