import { ref, computed, onMounted, onUnmounted } from 'vue';

// Global reactive state shared across all components
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1200);
const windowHeight = ref(typeof window !== 'undefined' ? window.innerHeight : 800);
const isCoarsePointer = ref(false);
const hasNoHover = ref(false);
const hasTouchPoints = ref(false);
const isMobileUA = ref(false);
const isStandalone = ref(false);
const isWeChat = ref(false);
const isMetaInApp = ref(false);
const canNativeShare = ref(false);

let isInitialized = false;

function updateMetrics() {
  if (typeof window === 'undefined') return;

  windowWidth.value = window.innerWidth;
  windowHeight.value = window.innerHeight;

  try {
    isCoarsePointer.value = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
    hasNoHover.value = window.matchMedia?.('(hover: none)')?.matches ?? false;
  } catch {
    isCoarsePointer.value = false;
    hasNoHover.value = false;
  }

  hasTouchPoints.value = typeof navigator !== 'undefined' && (navigator.maxTouchPoints > 0 || 'ontouchstart' in window);

  const ua = typeof navigator !== 'undefined' ? (navigator.userAgent || '') : '';
  isMobileUA.value = /Android|iPhone|iPod|Mobile/i.test(ua);
  isWeChat.value = /MicroMessenger/i.test(ua);
  isMetaInApp.value = /FBAN|FBAV|Instagram/i.test(ua);

  // Native Web Share API detection
  canNativeShare.value = typeof navigator !== 'undefined' 
    && typeof navigator.share === 'function'
    && typeof navigator.canShare === 'function';

  // Standalone PWA detection
  isStandalone.value = Boolean(
    window.matchMedia?.('(display-mode: standalone)')?.matches 
    || window.navigator?.standalone === true 
    || window.__TAURI__ !== undefined 
    || window.electron !== undefined
  );
}

export { updateMetrics as updateDeviceMetrics };

export function useDevice() {
  if (typeof window !== 'undefined' && !isInitialized) {
    isInitialized = true;
    updateMetrics();

    window.addEventListener('resize', updateMetrics, { passive: true });
    window.addEventListener('orientationchange', updateMetrics, { passive: true });
  }

  /**
   * Precise Mobile Phone Detection:
   * 1. Portrait phone (width <= 768px) OR Landscape phone (shorter dimension <= 500px)
   * AND
   * 2. Touch pointer + No hover OR Mobile UA OR Touch points
   * Desktop windows pulled narrow will still have precision pointer and hover capability,
   * so they are strictly excluded from mobile view.
   */
  const isMobile = computed(() => {
    const minDimension = Math.min(windowWidth.value, windowHeight.value);
    const isPhoneDimension = minDimension <= 500 || windowWidth.value <= 768;
    const isTouchInteraction = isCoarsePointer.value && hasNoHover.value;
    return isPhoneDimension && (isTouchInteraction || isMobileUA.value || hasTouchPoints.value);
  });

  /**
   * Landscape phone mode: wide but short screen (height < width and height <= 500px)
   */
  const isLandscape = computed(() => {
    return isMobile.value && windowWidth.value > windowHeight.value && windowHeight.value <= 500;
  });

  return {
    windowWidth,
    windowHeight,
    isMobile,
    isLandscape,
    isTouch: hasTouchPoints,
    isCoarsePointer,
    isStandalone,
    isWeChat,
    isMetaInApp,
    canNativeShare
  };
}
