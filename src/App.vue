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
    />

    <!-- Main Workspace (Expanded Max Width) -->
    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <KeepAlive>
        <component :is="activeToolComponent" />
      </KeepAlive>

      <!-- Trust Bar Highlighting Privacy & Speed Advantages -->
      <TrustBar />
    </main>

    <!-- Ultra-Slim Minimalist Footer -->
    <Footer @open-feedback="isFeedbackOpen = true" />

    <!-- Feedback Modal -->
    <FeedbackModal 
      :is-open="isFeedbackOpen" 
      @close="isFeedbackOpen = false" 
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import Navbar from './components/Navbar.vue';
import Footer from './components/Footer.vue';
import FeedbackModal from './components/FeedbackModal.vue';
import TrustBar from './components/TrustBar.vue';

import MergeTool from './tools/MergeTool.vue';
import OrganizeTool from './tools/OrganizeTool.vue';
import SplitTool from './tools/SplitTool.vue';
import WatermarkTool from './tools/WatermarkTool.vue';
import SanitizeTool from './tools/SanitizeTool.vue';
import { t } from './i18n';

const toolComponents = {
  merge: MergeTool,
  organize: OrganizeTool,
  split: SplitTool,
  watermark: WatermarkTool,
  sanitize: SanitizeTool,
};

// Sync active tab with URL hash for Cloudflare Web Analytics tracking & bookmarking
function getInitialTab() {
  const hash = window.location.hash.replace('#', '').toLowerCase();
  if (toolComponents[hash]) return hash;
  return 'merge';
}

const activeTab = ref(getInitialTab());
const isFeedbackOpen = ref(false);
const isOnline = ref(navigator.onLine);

const activeToolComponent = computed(() => toolComponents[activeTab.value] || MergeTool);

function switchTool(tabId) {
  activeTab.value = tabId;
  window.location.hash = `#${tabId}`;
}

function onHashChange() {
  const hash = window.location.hash.replace('#', '').toLowerCase();
  if (toolComponents[hash] && activeTab.value !== hash) {
    activeTab.value = hash;
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
