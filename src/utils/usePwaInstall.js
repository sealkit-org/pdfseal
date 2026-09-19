import { ref, computed } from 'vue';

const deferredPrompt = ref(null);
const isInstalled = ref(false);

if (typeof window !== 'undefined') {
  const checkStandalone = () => {
    return Boolean(
      (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)')?.matches) ||
      window.navigator?.standalone === true ||
      (typeof document !== 'undefined' && document.referrer?.includes('android-app://'))
    );
  };

  isInstalled.value = checkStandalone();

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt.value = e;
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt.value = null;
    isInstalled.value = true;
  });
}

export function usePwaInstall() {
  const canInstallPwa = computed(() => Boolean(deferredPrompt.value));

  const isIos = computed(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    return /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  });

  async function installPwa() {
    if (!deferredPrompt.value) return false;
    deferredPrompt.value.prompt();
    const { outcome } = await deferredPrompt.value.userChoice;
    if (outcome === 'accepted') {
      deferredPrompt.value = null;
      isInstalled.value = true;
      return true;
    }
    return false;
  }

  return {
    canInstallPwa,
    isInstalled,
    isIos,
    installPwa
  };
}
