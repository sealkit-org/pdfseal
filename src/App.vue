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
    />

    <!-- Main Workspace (Clean, Uncluttered, 100% Focused) -->
    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5 flex flex-col">
      <KeepAlive>
        <component :is="activeToolComponent" @send-to-tool="switchTool" />
      </KeepAlive>
    </main>

    <!-- Ultra-Slim Minimalist Footer -->
    <Footer 
      @open-feedback="isFeedbackOpen = true" 
      @open-privacy="isPrivacyOpen = true"
    />

    <!-- Diagnostic Logs Modal -->
    <DiagnosticLogModal 
      :is-open="isLogsOpen" 
      @close="isLogsOpen = false" 
    />

    <!-- Global Settings Modal -->
    <GlobalSettingsModal 
      :is-open="isSettingsOpen" 
      @close="isSettingsOpen = false" 
    />

    <!-- Feedback Modal -->
    <FeedbackModal 
      :is-open="isFeedbackOpen" 
      @close="isFeedbackOpen = false" 
    />

    <!-- Privacy & Speed Guarantee Manifesto Modal -->
    <PrivacyModal 
      :is-open="isPrivacyOpen" 
      @close="isPrivacyOpen = false" 
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import Navbar from './components/Navbar.vue';
import Footer from './components/Footer.vue';
import FeedbackModal from './components/FeedbackModal.vue';
import PrivacyModal from './components/PrivacyModal.vue';
import GlobalSettingsModal from './components/GlobalSettingsModal.vue';
import DiagnosticLogModal from './components/DiagnosticLogModal.vue';

import MergeTool from './tools/MergeTool.vue';
import OrganizeTool from './tools/OrganizeTool.vue';
import SplitTool from './tools/SplitTool.vue';
import WatermarkTool from './tools/WatermarkTool.vue';
import SanitizeTool from './tools/SanitizeTool.vue';
import VaultTool from './tools/VaultTool.vue';
import { t } from './i18n';

const toolComponents = {
  vault: VaultTool,
  merge: MergeTool,
  organize: OrganizeTool,
  split: SplitTool,
  watermark: WatermarkTool,
  sanitize: SanitizeTool,
};

import { recordToolUsage } from './utils/usageTracker';

// Sync active tab with URL hash and localStorage memory, defaulting to 'merge'
function getInitialTab() {
  const hash = window.location.hash.replace('#', '').toLowerCase();
  if (toolComponents[hash]) return hash;

  try {
    const lastTab = localStorage.getItem('pdfseal_last_tab');
    if (lastTab && toolComponents[lastTab]) return lastTab;
  } catch (e) {}

  return 'merge';
}

const activeTab = ref(getInitialTab());
const isSettingsOpen = ref(false);
const isLogsOpen = ref(false);
const isFeedbackOpen = ref(false);
const isPrivacyOpen = ref(false);
const isOnline = ref(navigator.onLine);

const activeToolComponent = computed(() => toolComponents[activeTab.value] || MergeTool);

function switchTool(tabId) {
  activeTab.value = tabId;
  window.location.hash = `#${tabId}`;
  try {
    localStorage.setItem('pdfseal_last_tab', tabId);
  } catch (e) {}
  recordToolUsage(tabId);
}

function onHashChange() {
  const hash = window.location.hash.replace('#', '').toLowerCase();
  if (toolComponents[hash] && activeTab.value !== hash) {
    activeTab.value = hash;
    recordToolUsage(hash);
  }
}

function updateOnlineStatus() {
  isOnline.value = navigator.onLine;
}

onMounted(() => {
  window.addEventListener('hashchange', onHashChange);
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  
  // Ensure hash is set on first load if missing
  if (!window.location.hash) {
    window.location.hash = `#${activeTab.value}`;
  }
});

onUnmounted(() => {
  window.removeEventListener('hashchange', onHashChange);
  window.removeEventListener('online', updateOnlineStatus);
  window.removeEventListener('offline', updateOnlineStatus);
});
</script>
