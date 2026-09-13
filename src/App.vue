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
    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 flex flex-col">
      <router-view v-slot="{ Component }">
        <KeepAlive>
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

    <!-- Ultra-Slim Minimalist Footer -->
    <Footer 
      @open-feedback="isFeedbackOpen = true" 
      @open-privacy="isPrivacyOpen = true"
      @open-enterprise="isEnterpriseOpen = true"
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
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Navbar from './components/Navbar.vue';
import Footer from './components/Footer.vue';
import FeedbackModal from './components/FeedbackModal.vue';
import PrivacyModal from './components/PrivacyModal.vue';
import GlobalSettingsModal from './components/GlobalSettingsModal.vue';
import DiagnosticLogModal from './components/DiagnosticLogModal.vue';
import EnterpriseModal from './components/EnterpriseModal.vue';
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

onMounted(() => {
  initCertificateStore();
  if (typeof window !== 'undefined') {
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
  }
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('online', updateOnlineStatus);
    window.removeEventListener('offline', updateOnlineStatus);
  }
});
</script>
