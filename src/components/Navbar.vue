<template>
  <header class="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
    <!-- Top Header -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <!-- Brand -->
      <div class="flex items-center space-x-3 cursor-pointer" @click="$emit('switch-tab', 'merge')">
        <span class="text-3xl hover:rotate-12 transition-transform duration-300">🦭</span>
        <div>
          <div class="flex items-center space-x-2">
            <span class="font-extrabold text-xl text-slate-900 tracking-tight">PDFSeal</span>
            <!-- Interactive Privacy Guarantee Badge -->
            <button 
              @click.stop="$emit('open-privacy')"
              class="text-[11px] bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full font-semibold flex items-center cursor-pointer transition shadow-2xs group"
              title="Click to view Privacy & Security Guarantee"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-ping"></span>
              <span>{{ t('local_badge') }}</span>
              <ShieldCheck class="w-3 h-3 ml-1 text-emerald-700 opacity-70 group-hover:opacity-100" />
            </button>
          </div>
          <p class="text-[11px] text-slate-500 hidden sm:block">{{ t('brand_subtitle') }}</p>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center space-x-2 sm:space-x-3">
        <!-- Language Selector -->
        <div class="relative">
          <select 
            :value="currentLang" 
            @change="setLanguage($event.target.value)"
            class="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-1.5 px-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition cursor-pointer appearance-none pr-7"
          >
            <option value="en">🇺🇸 English</option>
            <option value="zh">🇨🇳 简体中文</option>
            <option value="de">🇩🇪 Deutsch</option>
            <option value="es">🇪🇸 Español</option>
            <option value="fr">🇫🇷 Français</option>
          </select>
          <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
            <ChevronDown class="w-3.5 h-3.5" />
          </div>
        </div>

        <!-- Global Settings Button -->
        <button 
          @click="$emit('open-settings')" 
          class="flex items-center space-x-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200/80 transition font-semibold cursor-pointer whitespace-nowrap shrink-0"
          :title="t('settings_modal_title') || 'Global Preferences'"
        >
          <Settings class="w-4 h-4 text-slate-600 shrink-0" />
          <span class="hidden lg:inline whitespace-nowrap">{{ t('settings_btn_label') || 'Settings' }}</span>
        </button>

        <!-- Diagnostic Log Button -->
        <button 
          @click="$emit('open-logs')" 
          class="flex items-center space-x-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200/80 transition font-semibold cursor-pointer whitespace-nowrap shrink-0"
          :title="t('log_modal_title') || 'Diagnostic Logs Console'"
        >
          <Terminal class="w-4 h-4 text-slate-600 shrink-0" />
          <span class="hidden lg:inline whitespace-nowrap">{{ t('log_btn_label') || 'Logs' }}</span>
        </button>

        <!-- PWA Install Button -->
        <button 
          v-if="canInstallPwa"
          @click="installPwa"
          class="flex items-center space-x-1.5 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 sm:px-3 py-1.5 rounded-xl transition font-semibold cursor-pointer shadow-2xs animate-in fade-in whitespace-nowrap shrink-0"
          :title="t('install_app_btn') || 'Install App'"
        >
          <DownloadCloud class="w-4 h-4 text-emerald-600 shrink-0" />
          <span class="hidden sm:inline whitespace-nowrap">{{ t('install_app_btn') || 'Install App' }}</span>
        </button>

        <!-- Enterprise & Pro Commercial Portal Button -->
        <button 
          v-if="siteConfig.features.enableEnterprisePortal"
          @click="isProSupporter ? $emit('open-settings') : $emit('open-enterprise')" 
          :class="[
            'flex items-center space-x-1.5 text-xs px-2.5 sm:px-3 py-1.5 rounded-xl border transition font-bold cursor-pointer shadow-2xs whitespace-nowrap shrink-0',
            isProSupporter 
              ? 'bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-indigo-500/10 hover:from-amber-500/20 hover:to-emerald-500/20 text-slate-800 border-amber-300/80 shadow-amber-500/10' 
              : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200/80'
          ]"
          :title="isProSupporter ? `${activeTierLabel} (${activeCert?.name || t('enterprise_active_title')}) · ${t('nav_active_tooltip_hint')}` : (t('nav_enterprise_btn') || 'Commercial / Pro')"
        >
          <Crown v-if="isProSupporter" class="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <Building2 v-else class="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span class="hidden md:inline whitespace-nowrap">{{ isProSupporter ? activeTierLabel : (t('nav_enterprise_btn') || 'Commercial / Pro') }}</span>
          <span v-if="isProSupporter" class="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
        </button>

        <!-- Ko-fi (Controlled via siteConfig) -->
        <a 
          v-if="siteConfig.features.enableDonations"
          :href="siteConfig.kofiUrl" 
          target="_blank" 
          class="flex items-center space-x-1.5 text-xs bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-2.5 sm:px-3 py-1.5 rounded-xl transition font-semibold shadow-xs whitespace-nowrap shrink-0"
        >
          <span class="whitespace-nowrap">{{ t('support_coffee') }}</span>
          <span class="hidden xl:inline text-amber-700 whitespace-nowrap">{{ t('support_fish') }}</span>
        </a>

        <!-- Feedback Modal (Controlled via siteConfig) -->
        <button 
          v-if="siteConfig.features.enableFeedback"
          @click="$emit('open-feedback')" 
          class="flex items-center space-x-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 sm:px-3 py-1.5 rounded-xl transition font-medium whitespace-nowrap shrink-0"
        >
          <MessageSquare class="w-4 h-4 text-slate-500 shrink-0" />
          <span class="hidden sm:inline whitespace-nowrap">{{ t('feedback_btn') }}</span>
        </button>

        <!-- GitHub -->
        <a 
          v-if="siteConfig.githubRepoUrl"
          :href="siteConfig.githubRepoUrl" 
          target="_blank" 
          title="View GitHub Repository" 
          class="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition shrink-0"
        >
          <Github class="w-5 h-5" />
        </a>
      </div>
    </div>

    <!-- Tool Navigation Tab Bar with Sleek Micro Trust Strip -->
    <div class="bg-slate-100/90 border-t border-slate-200/80 overflow-x-auto sm:overflow-visible no-scrollbar relative z-30">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between py-2">
        <div class="flex items-center space-x-1 sm:space-x-2">
          <!-- Primary Core Tools (Top 5 Ranked) -->
          <button 
            v-for="tool in primaryTools" 
            :key="tool.id"
            @click="selectPrimaryTool(tool.id)"
            :class="[
              'flex items-center space-x-2 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm transition whitespace-nowrap cursor-pointer',
              activeTab === tool.id 
                ? 'bg-white text-blue-600 shadow-xs font-semibold' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-medium'
            ]"
          >
            <component :is="tool.icon" class="w-4 h-4" />
            <span>{{ t(tool.labelKey) }}</span>
          </button>

          <!-- More Tools Dropdown Menu -->
          <div class="relative" ref="moreMenuRef">
            <button 
              @click.stop="isMoreOpen = !isMoreOpen"
              :class="[
                'flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm transition whitespace-nowrap cursor-pointer select-none',
                isMoreActive
                  ? 'bg-white text-blue-600 shadow-xs font-semibold' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-medium'
              ]"
            >
              <component :is="activeMoreIcon || Sparkles" class="w-3.5 h-3.5" :class="isMoreActive ? 'text-blue-600' : 'text-slate-500'" />
              <span>{{ activeMoreToolName || t('tab_more') }}</span>
              <ChevronDown class="w-3.5 h-3.5 transition-transform duration-150" :class="{ 'rotate-180': isMoreOpen }" />
            </button>

            <!-- Dropdown Popover -->
            <div 
              v-if="isMoreOpen"
              class="absolute left-0 top-full mt-1.5 z-50 w-44 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-1.5 text-xs font-semibold text-slate-700 animate-in fade-in zoom-in-95 duration-150 text-left"
            >
              <button 
                v-for="tool in moreTools"
                :key="tool.id"
                @click="selectMoreTool(tool.id)"
                :class="[
                  'w-full text-left px-3 py-2 rounded-xl transition flex items-center space-x-2 cursor-pointer',
                  activeTab === tool.id 
                    ? 'bg-blue-50 text-blue-700 font-bold' 
                    : 'hover:bg-slate-50 hover:text-slate-900 text-slate-700'
                ]"
              >
                <component :is="tool.icon" class="w-4 h-4" :class="tool.color" />
                <span>{{ t(tool.labelKey) }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Right Side Dedicated Pipeline & Vault Hub -->
        <div class="flex items-center space-x-2 pl-2">
          <button 
            @click="$emit('switch-tab', 'pipeline')"
            :class="[
              'flex items-center space-x-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-sm transition whitespace-nowrap cursor-pointer',
              activeTab === 'pipeline' 
                ? 'bg-indigo-600 text-white shadow-xs font-semibold' 
                : 'bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 shadow-2xs font-semibold'
            ]"
          >
            <Zap class="w-4 h-4" :class="activeTab === 'pipeline' ? 'text-white' : 'text-indigo-600'" />
            <span>{{ t('tab_pipeline') || 'Pipeline' }}</span>
          </button>

          <button 
            @click="$emit('switch-tab', 'vault')"
            :class="[
              'flex items-center space-x-2 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-sm transition whitespace-nowrap cursor-pointer',
              activeTab === 'vault' 
                ? 'bg-blue-600 text-white shadow-xs font-semibold' 
                : 'bg-white/80 hover:bg-white text-slate-700 hover:text-blue-600 border border-slate-200/80 shadow-2xs font-semibold'
            ]"
          >
            <FolderLock class="w-4 h-4" :class="activeTab === 'vault' ? 'text-white' : 'text-blue-600'" />
            <span>{{ t('tab_vault') }}</span>
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { 
  ChevronDown, 
  MessageSquare, 
  Github, 
  Layers, 
  Minimize2,
  LayoutGrid, 
  Scissors, 
  Stamp, 
  ShieldCheck,
  FolderLock,
  Zap,
  Lock,
  Settings,
  Terminal, 
  Sparkles,
  PenTool,
  Unlock,
  Images,
  DownloadCloud,
  Building2,
  Crown
} from 'lucide-vue-next';
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { currentLang, setLanguage, t } from '../i18n';
import { toolUsageCounts, DEFAULT_WEIGHTS, recordToolUsage } from '../utils/usageTracker';
import { siteConfig } from '../config/siteConfig';
import { isProSupporter, activeTierLabel, activeCert } from '../utils/security/certificateStore';

const props = defineProps({
  activeTab: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['switch-tab', 'open-feedback', 'open-privacy', 'open-settings', 'open-logs', 'open-enterprise']);

// Primary Core Tools (Strictly fixed 5 pillars for predictable muscle memory)
const primaryTools = [
  { id: 'merge', labelKey: 'tab_merge', icon: Layers },
  { id: 'compress', labelKey: 'tab_compress', icon: Minimize2 },
  { id: 'organize', labelKey: 'tab_organize', icon: LayoutGrid },
  { id: 'split', labelKey: 'tab_split', icon: Scissors },
  { id: 'sign', labelKey: 'tab_sign', icon: PenTool }
];

// More Secondary Tools Dropdown (Fixed & predictable)
const moreTools = [
  { id: 'protect', labelKey: 'tab_protect', icon: Lock, color: 'text-rose-600' },
  { id: 'unlock', labelKey: 'tab_unlock', icon: Unlock, color: 'text-emerald-600' },
  { id: 'image_to_pdf', labelKey: 'tab_image_to_pdf', icon: Images, color: 'text-violet-600' },
  { id: 'watermark', labelKey: 'tab_watermark', icon: Stamp, color: 'text-amber-600' },
  { id: 'sanitize', labelKey: 'tab_sanitize', icon: ShieldCheck, color: 'text-blue-600' }
];

const isMoreOpen = ref(false);
const moreMenuRef = ref(null);

const isMoreActive = computed(() => moreTools.some(t => t.id === props.activeTab));

const activeMoreTool = computed(() => moreTools.find(t => t.id === props.activeTab));
const activeMoreToolName = computed(() => activeMoreTool.value ? t(activeMoreTool.value.labelKey) : null);
const activeMoreIcon = computed(() => activeMoreTool.value ? activeMoreTool.value.icon : null);

function selectPrimaryTool(id) {
  recordToolUsage(id);
  emit('switch-tab', id);
}

function selectMoreTool(id) {
  isMoreOpen.value = false;
  recordToolUsage(id);
  emit('switch-tab', id);
}

function handleOutsideClick(e) {
  if (moreMenuRef.value && !moreMenuRef.value.contains(e.target)) {
    isMoreOpen.value = false;
  }
}

// PWA Install State & Logic
const deferredInstallPrompt = ref(null);
const canInstallPwa = computed(() => !!deferredInstallPrompt.value);

function handleBeforeInstallPrompt(e) {
  e.preventDefault();
  deferredInstallPrompt.value = e;
}

function handleAppInstalled() {
  deferredInstallPrompt.value = null;
}

async function installPwa() {
  if (!deferredInstallPrompt.value) return;
  deferredInstallPrompt.value.prompt();
  const { outcome } = await deferredInstallPrompt.value.userChoice;
  if (outcome === 'accepted') {
    deferredInstallPrompt.value = null;
  }
}

onMounted(() => {
  document.addEventListener('click', handleOutsideClick);
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  window.addEventListener('appinstalled', handleAppInstalled);
});

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick);
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  window.removeEventListener('appinstalled', handleAppInstalled);
});
</script>
