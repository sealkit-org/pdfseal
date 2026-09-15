<template>
  <div class="min-h-screen flex flex-col justify-between bg-slate-50 text-slate-800 font-sans selection:bg-blue-500 selection:text-white">
    <!-- Offline Bar -->
    <div 
      v-if="!isOnline" 
      class="bg-emerald-700 text-white text-xs py-1.5 px-4 text-center font-medium shadow-sm transition-all"
    >
      <span>{{ t('offline_banner') }}</span>
    </div>

    <!-- Header Navbar -->
    <Navbar 
      :active-tab="activeTab" 
      @switch-tab="switchTool" 
      @open-feedback="isFeedbackOpen = true" 
      @open-privacy="isPrivacyOpen = true"
      @open-settings="isSettingsOpen = true"
      @open-logs="isLogsOpen = true"
      @open-enterprise="isEnterpriseOpen = true"
    />

    <!-- Main Workspace (Clean, Uncluttered, 100% Focused) -->
    <main 
      :class="[
        'flex-1 w-full mx-auto px-3 sm:px-5 lg:px-6 py-2 sm:py-2.5 flex flex-col transition-all duration-300',
        hasActiveFile ? 'max-w-screen-2xl' : 'max-w-7xl'
      ]"
    >
      <router-view v-slot="{ Component }">
        <KeepAlive :max="3">
          <component 
            :is="Component" 
            :share-id="activeShareId" 
            :key-url-safe="activeShareKey"
            @send-to-tool="switchTool" 
            @exit-receive="switchTool('merge')"
            @open-enterprise="isEnterpriseOpen = true"
          />
        </KeepAlive>
      </router-view>
    </main>

    <!-- Ultra-Slim Minimalist Footer (Web Only: Hidden in PWA/Desktop or when File is Active) -->
    <Footer 
      v-if="!isStandalone && !hasActiveFile"
      @open-feedback="isFeedbackOpen = true" 
      @open-privacy="isPrivacyOpen = true"
      @open-enterprise="isEnterpriseOpen = true"
    />

    <!-- Diagnostic Logs Modal -->
    <DiagnosticLogModal 
      :is-open="isLogsOpen" 
      @close="isLogsOpen = false" 
    />

    <!-- Global Preferences Modal -->
    <GlobalSettingsModal 
      :is-open="isSettingsOpen" 
      @close="isSettingsOpen = false" 
    />

    <!-- Feedback Modal -->
    <FeedbackModal 
      :is-open="isFeedbackOpen" 
      @close="isFeedbackOpen = false" 
    />

    <!-- Enterprise & Pro Modal -->
    <EnterpriseModal 
      :is-open="isEnterpriseOpen" 
      @close="isEnterpriseOpen = false" 
    />

    <!-- Privacy & Speed Guarantee Manifesto Modal -->
    <PrivacyModal 
      :is-open="isPrivacyOpen" 
      @close="isPrivacyOpen = false" 
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, provide, onMounted, onUnmounted, defineAsyncComponent } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Navbar from './components/Navbar.vue';
import Footer from './components/Footer.vue';
const FeedbackModal = defineAsyncComponent(() => import('./components/FeedbackModal.vue'));
const PrivacyModal = defineAsyncComponent(() => import('./components/PrivacyModal.vue'));
const GlobalSettingsModal = defineAsyncComponent(() => import('./components/GlobalSettingsModal.vue'));
const DiagnosticLogModal = defineAsyncComponent(() => import('./components/DiagnosticLogModal.vue'));
const EnterpriseModal = defineAsyncComponent(() => import('./components/EnterpriseModal.vue'));
import { TOOL_ROUTES } from './router';
import { t } from './i18n';
import { initCertificateStore } from './utils/security/certificateStore';

const route = useRoute();
const router = useRouter();

const isSettingsOpen = ref(false);

const isLogsOpen = ref(false);
const isFeedbackOpen = ref(false);
const isPrivacyOpen = ref(false);
const isEnterpriseOpen = ref(false);
const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true);

// Standalone mode detection (PWA installed standalone or Tauri/Electron desktop wrapper)
const isStandalone = ref(false);

// Active file state (True when any tool currently has a file loaded in workspace)
const hasActiveFile = ref(false);

function checkStandalone() {
  if (typeof window !== 'undefined') {
    isStandalone.value = window.matchMedia('(display-mode: standalone)').matches 
      || window.navigator.standalone === true 
      || window.__TAURI__ !== undefined 
      || window.electron !== undefined;
  }
}

// Provide workspace state to all descendant tool components
provide('workspaceActiveState', {
  hasActiveFile,
  setActiveFile(val) {
    hasActiveFile.value = Boolean(val);
  }
});

// When user navigates between tools, reset active file presence until the target tool reports its state
watch(() => route?.path, () => {
  hasActiveFile.value = false;
});

const activeTab = computed(() => {
  return route?.meta?.toolId || route?.name || 'merge';
});

const activeShareId = computed(() => {
  return (route?.query?.share || route?.query?.sid || '');
});

const activeShareKey = computed(() => {
  return (route?.query?.key || '');
});

function switchTool(tabId) {
  const tool = typeof tabId === 'object' && tabId !== null ? tabId.tool : tabId;
  const query = typeof tabId === 'object' && tabId !== null ? tabId.query : undefined;
  const targetPath = TOOL_ROUTES[tool] || '/merge-pdf';
  if (router) {
    if (route?.path !== targetPath || query) {
      router.push(query ? { path: targetPath, query } : targetPath);
    }
  }
}

function updateOnlineStatus() {
  if (typeof navigator !== 'undefined') {
    isOnline.value = navigator.onLine;
  }
}

let mqlStandalone = null;

onMounted(() => {
  initCertificateStore();
  checkStandalone();
  if (typeof window !== 'undefined') {
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    mqlStandalone = window.matchMedia('(display-mode: standalone)');
    mqlStandalone?.addEventListener?.('change', checkStandalone);
  }
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('online', updateOnlineStatus);
    window.removeEventListener('offline', updateOnlineStatus);
    mqlStandalone?.removeEventListener?.('change', checkStandalone);
  }
});
</script>
