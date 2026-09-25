<template>
  <header class="bg-white border-b border-slate-200/90 sticky top-0 z-40 shadow-2xs select-none">
    <!-- 1. MOBILE VIEW ONLY (< 768px): Ultra-Clean, Non-Overlapping Header -->
    <div class="flex md:hidden max-w-screen-2xl mx-auto px-3 h-14 items-center justify-between gap-2 w-full">
      <!-- Mobile Left: Brand & Local Trust Mini Badge -->
      <div class="flex items-center space-x-2 shrink-0">
        <div class="flex items-center space-x-1.5 cursor-pointer active:opacity-80 transition" @click="$emit('switch-tab', 'home')">
          <span class="text-2xl select-none">🦭</span>
          <span class="font-extrabold text-base text-slate-900 tracking-tight">PDFSeal</span>
        </div>

        <!-- Interactive Privacy Guarantee Mini Pill -->
        <button 
          @click.stop="$emit('open-privacy')"
          class="text-[10px] bg-emerald-50 active:bg-emerald-100 text-emerald-800 border border-emerald-300/80 px-2 py-0.5 rounded-full font-bold flex items-center cursor-pointer transition shadow-2xs shrink-0"
          :title="t('privacy_modal_title', '100% Local Processing Guarantee')"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
          <span>{{ t('local_badge') }}</span>
        </button>
      </div>

      <!-- Mobile Right: Language, Settings & Tools Menu -->
      <div class="flex items-center space-x-1.5 shrink-0">
        <!-- Language Selector -->
        <div class="relative shrink-0">
          <select 
            :value="currentLang" 
            @change="setLanguage($event.target.value)"
            class="text-xs bg-slate-100 text-slate-700 font-bold py-1.5 pl-2 pr-5 rounded-xl border border-slate-200/80 focus:outline-hidden transition cursor-pointer appearance-none"
            :title="t('select_language', 'Select Language')"
          >
            <option value="en">English</option>
            <option value="de">Deutsch</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="ja">日本語</option>
            <option value="zh">简体中文</option>
          </select>
          <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-slate-400">
            <ChevronDown class="w-2.5 h-2.5" />
          </div>
        </div>

        <!-- Global Settings Button -->
        <button 
          @click="$emit('open-settings')" 
          class="p-2 text-slate-600 active:bg-slate-100 rounded-xl transition cursor-pointer shrink-0 border border-slate-200/80 shadow-2xs"
          :title="t('settings_modal_title', 'Global Preferences')"
        >
          <Settings class="w-4 h-4 text-slate-600 shrink-0" />
        </button>

        <!-- All Tools Menu Button (Drawer trigger) -->
        <button 
          @click="$emit('open-drawer')" 
          class="p-2 text-blue-600 active:bg-blue-50 rounded-xl transition cursor-pointer shrink-0 border border-blue-200/80 bg-blue-50/50 shadow-2xs"
          :title="t('nav_all_tools', 'All Tools')"
        >
          <Sparkles class="w-4 h-4 text-amber-500 shrink-0" />
        </button>
      </div>
    </div>

    <!-- 2. DESKTOP VIEW ONLY (>= 768px): Full-Featured Desktop Bar -->
    <div class="hidden md:flex max-w-screen-2xl mx-auto px-3 sm:px-5 lg:px-6 h-14 items-center justify-between gap-2 sm:gap-4">
      
      <!-- 1. Left: Brand & Local Trust Mini Badge -->
      <div class="flex items-center space-x-2 sm:space-x-3 shrink-0">
        <div class="flex items-center space-x-2 cursor-pointer group" @click="$emit('switch-tab', 'home')">
          <span class="text-2xl group-hover:rotate-12 transition-transform duration-300 select-none">🦭</span>
          <span class="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">PDFSeal</span>
        </div>

        <!-- Interactive Privacy Guarantee Mini Pill -->
        <button 
          @click.stop="$emit('open-privacy')"
          class="text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300/80 px-2 sm:px-2.5 py-0.5 rounded-full font-bold flex items-center cursor-pointer transition shadow-2xs group shrink-0"
          :title="t('privacy_modal_title', '100% Local Processing Guarantee')"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 sm:mr-1.5 animate-pulse"></span>
          <span class="hidden md:inline">{{ t('local_badge') }}</span>
          <ShieldCheck class="w-3 h-3 sm:ml-1 text-emerald-700 opacity-70 group-hover:opacity-100" />
        </button>
      </div>

      <!-- 2. Center: Core Tools Navigation Pills & Shortcuts -->
      <div class="flex items-center space-x-1 sm:space-x-1.5 py-1 min-w-0 flex-1 justify-center overflow-visible px-1 sm:px-2">
        <!-- 5 Core Tools -->
        <button 
          v-for="tool in primaryTools" 
          :key="tool.id"
          @click="selectPrimaryTool(tool.id)"
          :class="[
            'flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm transition whitespace-nowrap cursor-pointer select-none shrink-0',
            activeTab === tool.id 
              ? 'bg-blue-50 text-blue-700 font-bold shadow-2xs border border-blue-200/60' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium'
          ]"
          :title="t(`${tool.id}_title`, t(tool.labelKey))"
        >
          <component :is="tool.icon" class="w-3.5 h-3.5 shrink-0" :class="activeTab === tool.id ? 'text-blue-600' : 'text-slate-500'" />
          <span :class="activeTab === tool.id ? 'inline' : 'hidden xl:inline'">{{ t(tool.labelKey) }}</span>
        </button>

        <!-- More Tools Dropdown -->
        <div class="relative shrink-0" ref="moreMenuRef">
          <button 
            @click.stop="toggleMore"
            :class="[
              'flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm transition whitespace-nowrap cursor-pointer select-none',
              isMoreActive
                ? 'bg-blue-50 text-blue-700 font-bold shadow-2xs border border-blue-200/60' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium'
            ]"
            :title="t('more_tools_tooltip', 'More Useful PDF Tools')"
          >
            <component :is="activeMoreIcon || Sparkles" class="w-3.5 h-3.5 shrink-0" :class="isMoreActive ? 'text-blue-600' : 'text-slate-500'" />
            <span>{{ activeMoreToolName || t('tab_more') }}</span>
            <ChevronDown class="w-3 h-3 transition-transform duration-150" :class="{ 'rotate-180': isMoreOpen }" />
          </button>

          <!-- Dropdown Popover -->
          <div 
            v-if="isMoreOpen"
            class="absolute left-0 top-full mt-1.5 z-50 w-48 bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-1.5 text-xs font-semibold text-slate-700 animate-in fade-in zoom-in-95 duration-150 text-left space-y-0.5"
          >
            <button 
              v-for="tool in moreTools"
              :key="tool.id"
              @click="selectMoreTool(tool.id)"
              :class="[
                'w-full text-left px-3 py-2 rounded-xl transition flex items-center space-x-2.5 cursor-pointer',
                activeTab === tool.id 
                  ? 'bg-blue-50 text-blue-700 font-bold' 
                  : 'hover:bg-slate-50 hover:text-slate-900 text-slate-700'
              ]"
              :title="t(`${tool.id}_title`, t(tool.labelKey))"
            >
              <component :is="tool.icon" class="w-4 h-4 shrink-0" :class="tool.color" />
              <span class="truncate">{{ t(tool.labelKey) }}</span>
            </button>
          </div>
        </div>

        <!-- Divider line -->
        <div class="h-4 w-px bg-slate-200/80 mx-1 shrink-0 hidden md:block"></div>

        <!-- Pipeline shortcut -->
        <button 
          @click="$emit('switch-tab', 'pipeline')"
          :class="[
            'flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer shrink-0',
            activeTab === 'pipeline' 
              ? 'bg-indigo-600 text-white shadow-xs' 
              : 'text-indigo-700 hover:bg-indigo-50 border border-indigo-200/80 bg-indigo-50/40 shadow-2xs'
          ]"
          :title="t('pipeline_title', t('tab_pipeline'))"
        >
          <Zap class="w-3.5 h-3.5 shrink-0" :class="activeTab === 'pipeline' ? 'text-white' : 'text-indigo-600'" />
          <span :class="activeTab === 'pipeline' ? 'inline' : 'hidden 2xl:inline'">{{ t('tab_pipeline') || 'Pipeline' }}</span>
        </button>

        <!-- Vault shortcut (icon-only; label shown in tooltip) -->
        <button
          @click="$emit('switch-tab', 'vault')"
          :class="[
            'flex items-center justify-center px-2 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0',
            activeTab === 'vault'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-700 hover:text-blue-600 hover:bg-slate-100 border border-slate-200/80 bg-white shadow-2xs'
          ]"
          :title="t('vault_title', t('tab_vault'))"
          :aria-label="t('tab_vault')"
        >
          <FolderLock class="w-4 h-4 shrink-0" :class="activeTab === 'vault' ? 'text-white' : 'text-blue-600'" />
        </button>
      </div>

      <!-- 3. Right: Utility Controls & Settings -->
      <div class="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
        <!-- PWA Install Button (When prompt available) -->
        <button 
          v-if="canInstallPwa"
          @click="installPwa"
          class="flex items-center space-x-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300/90 px-2 sm:px-2.5 py-1.5 rounded-xl transition font-bold cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
          :title="t('install_app_btn', 'Install App')"
        >
          <DownloadCloud class="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span class="hidden xl:inline">{{ t('install_app_btn', 'Install App') }}</span>
        </button>

        <!-- Pro / Supporter Badge (If active) -->
        <button 
          v-if="isProSupporter"
          @click="$emit('open-settings')"
          class="flex items-center space-x-1 text-xs px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-indigo-500/15 text-slate-800 border border-amber-300 font-bold shrink-0 shadow-2xs cursor-pointer"
          :title="`${activeTierLabel} (${t('nav_active_tooltip_hint', 'Click to manage license')})`"
        >
          <Crown class="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span class="hidden xl:inline">{{ activeTierLabel }}</span>
        </button>

        <!-- Language Selector -->
        <div class="relative shrink-0 flex items-center">
          <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400">
            <Globe class="w-3.5 h-3.5" />
          </div>
          <select 
            :value="currentLang" 
            @change="setLanguage($event.target.value)"
            class="text-xs bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold py-1.5 pl-7 pr-6 rounded-xl border border-slate-200/80 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition cursor-pointer appearance-none"
            :title="t('select_language', 'Select Language')"
          >
            <option value="en">English</option>
            <option value="de">Deutsch</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="ja">日本語</option>
            <option value="zh">简体中文</option>
          </select>
          <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-slate-400">
            <ChevronDown class="w-3 h-3" />
          </div>
        </div>

        <!-- About Dropdown Menu -->
        <div class="relative shrink-0" ref="aboutMenuRef">
          <button 
            @click.stop="toggleAbout" 
            class="flex items-center space-x-1 sm:space-x-1.5 py-1.5 px-2.5 rounded-xl transition cursor-pointer shrink-0 border border-slate-200/80 shadow-2xs select-none"
            :class="isAboutOpen ? 'bg-blue-50 text-blue-700 border-blue-200/80' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'"
            :title="t('navbar_about_title', 'About & Legal Terms')"
          >
            <Info class="w-3.5 h-3.5 shrink-0" :class="isAboutOpen ? 'text-blue-600' : 'text-slate-600'" />
            <span class="hidden sm:inline text-xs font-semibold">{{ t('navbar_about', 'About') }}</span>
            <ChevronDown class="w-3 h-3 text-slate-400 transition-transform duration-150" :class="{ 'rotate-180': isAboutOpen }" />
          </button>

          <!-- Dropdown Popover (Aligned Right) -->
          <div 
            v-if="isAboutOpen"
            class="absolute right-0 top-full mt-1.5 z-50 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-2 text-xs text-slate-700 animate-in fade-in zoom-in-95 duration-150 text-left space-y-1"
          >
            <!-- Popover Header: Brand & Local Offline Badge -->
            <div class="p-3 bg-gradient-to-r from-blue-50/70 via-slate-50 to-indigo-50/50 rounded-xl border border-blue-100/60 mb-1.5">
              <div class="flex items-center space-x-2.5">
                <span class="text-2xl select-none">🦭</span>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center space-x-1.5">
                    <h4 class="font-extrabold text-slate-900 text-sm">PDFSeal</h4>
                    <span class="text-[10px] bg-slate-900 text-white px-1.5 py-0.2 rounded-full font-mono font-bold">v{{ siteConfig.version }}</span>
                  </div>
                  <p class="text-[11px] text-emerald-700 font-medium mt-0.5 flex items-center">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 shrink-0"></span>
                    {{ t('brand_footer_claim', '100% Client-Side Local · Zero Data Upload') }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Menu Item 1: Privacy Guarantee Manifesto Modal -->
            <button
              type="button"
              @click="isAboutOpen = false; $emit('open-privacy')"
              class="w-full text-left px-2.5 py-2 rounded-xl transition flex items-center justify-between hover:bg-slate-50 hover:text-slate-900 cursor-pointer group"
            >
              <div class="flex items-center space-x-2.5 min-w-0">
                <ShieldCheck class="w-4 h-4 text-emerald-600 shrink-0" />
                <span class="font-semibold text-slate-700 group-hover:text-slate-900">{{ t('footer_privacy', 'Privacy Commitment') }}</span>
              </div>
              <span class="text-[10px] text-slate-400 group-hover:text-slate-600">🛡️</span>
            </button>

            <!-- Menu Item 2: Open Source AGPL-3.0 License -->
            <a
              :href="siteConfig.githubRepoUrl ? `${siteConfig.githubRepoUrl}/blob/main/LICENSE` : 'https://www.gnu.org/licenses/agpl-3.0.en.html'"
              target="_blank"
              rel="noopener noreferrer"
              @click="isAboutOpen = false"
              class="w-full text-left px-2.5 py-2 rounded-xl transition flex items-center justify-between hover:bg-slate-50 hover:text-slate-900 cursor-pointer group"
            >
              <div class="flex items-center space-x-2.5 min-w-0">
                <FileText class="w-4 h-4 text-emerald-600 shrink-0" />
                <div class="truncate">
                  <span class="font-semibold text-slate-700 group-hover:text-slate-900">{{ t('about_agpl_title', 'AGPL-3.0 Open Source License') }}</span>
                </div>
              </div>
              <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">AGPLv3 ↗</span>
            </a>

            <!-- Menu Item 3: Commercial License (v-if="siteConfig.features.enableEnterprisePortal") -->
            <button
              v-if="siteConfig.features.enableEnterprisePortal"
              type="button"
              @click="isAboutOpen = false; $emit('open-enterprise')"
              class="w-full text-left px-2.5 py-2 rounded-xl transition flex items-center justify-between hover:bg-slate-50 hover:text-slate-900 cursor-pointer group"
            >
              <div class="flex items-center space-x-2.5 min-w-0">
                <Building2 class="w-4 h-4 text-indigo-600 shrink-0" />
                <span class="font-semibold text-slate-700 group-hover:text-slate-900">{{ t('about_commercial_title', 'Commercial & Pro Licensing') }}</span>
              </div>
              <span class="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">Pro</span>
            </button>

            <!-- Menu Item 4: GitHub Repo (v-if="siteConfig.githubRepoUrl") -->
            <a
              v-if="siteConfig.githubRepoUrl"
              :href="siteConfig.githubRepoUrl"
              target="_blank"
              rel="noopener noreferrer"
              @click="isAboutOpen = false"
              class="w-full text-left px-2.5 py-2 rounded-xl transition flex items-center justify-between hover:bg-slate-50 hover:text-slate-900 cursor-pointer group"
            >
              <div class="flex items-center space-x-2.5 min-w-0">
                <Github class="w-4 h-4 text-slate-800 shrink-0" />
                <span class="font-semibold text-slate-700 group-hover:text-slate-900">{{ t('about_github_title', 'Open Source GitHub Repository') }}</span>
              </div>
              <span class="text-[10px] text-slate-400 group-hover:text-slate-600">↗</span>
            </a>

            <!-- Menu Item 5: Feedback (v-if="siteConfig.features.enableFeedback") -->
            <button
              v-if="siteConfig.features.enableFeedback"
              type="button"
              @click="isAboutOpen = false; $emit('open-feedback')"
              class="w-full text-left px-2.5 py-2 rounded-xl transition flex items-center justify-between hover:bg-slate-50 hover:text-slate-900 cursor-pointer group"
            >
              <div class="flex items-center space-x-2.5 min-w-0">
                <MessageSquare class="w-4 h-4 text-blue-600 shrink-0" />
                <span class="font-semibold text-slate-700 group-hover:text-slate-900">{{ t('about_feedback_title', 'User Feedback & Support') }}</span>
              </div>
              <span class="text-[10px] text-blue-500 font-semibold">Tally ↗</span>
            </button>

            <!-- Menu Item 6: Diagnostic Logs -->
            <button
              type="button"
              @click="isAboutOpen = false; $emit('open-logs')"
              class="w-full text-left px-2.5 py-2 rounded-xl transition flex items-center justify-between hover:bg-slate-50 hover:text-slate-900 cursor-pointer group"
            >
              <div class="flex items-center space-x-2.5 min-w-0">
                <Terminal class="w-4 h-4 text-slate-600 shrink-0" />
                <span class="font-semibold text-slate-700 group-hover:text-slate-900">{{ t('about_logs_title', 'Client-Side Diagnostic Logs') }}</span>
              </div>
              <span class="text-[10px] font-mono text-slate-400">LOGS</span>
            </button>

            <!-- Menu Item 7: Ko-fi / Donate (v-if="siteConfig.features.enableDonations") -->
            <a
              v-if="siteConfig.features.enableDonations"
              :href="siteConfig.kofiUrl"
              target="_blank"
              rel="noopener noreferrer"
              @click="isAboutOpen = false"
              class="w-full text-left px-2.5 py-2 rounded-xl transition flex items-center justify-between hover:bg-amber-50 hover:text-amber-950 cursor-pointer group border-t border-slate-100 pt-2 mt-1"
            >
              <div class="flex items-center space-x-2.5 min-w-0">
                <Coffee class="w-4 h-4 text-amber-600 shrink-0" />
                <span class="font-semibold text-amber-900">{{ t('about_kofi_title', 'Feed the Seal') }}</span>
              </div>
              <span class="text-[10px] text-amber-600 font-bold bg-amber-100/70 px-1.5 py-0.5 rounded">☕ ↗</span>
            </a>
          </div>
        </div>

        <!-- Global Settings Button (Opens Preferences) -->
        <button 
          @click="$emit('open-settings')" 
          class="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer shrink-0 border border-slate-200/80 shadow-2xs"
          :title="t('settings_modal_title', 'Global Preferences')"
        >
          <Settings class="w-4 h-4 text-slate-600 shrink-0" />
        </button>
      </div>

    </div>
  </header>
</template>

<script setup>
import { 
  ChevronDown, 
  Layers, 
  Minimize2,
  LayoutGrid, 
  Scissors,
  Stamp,
  ShieldCheck,
  EyeOff,
  FolderLock,
  Zap,
  Lock,
  Settings,
  Info,
  Sparkles,
  PenTool,
  Unlock,
  Images,
  ImageDown,
  DownloadCloud,
  Crown,
  ListOrdered,
  FileText,
  Building2,
  Github,
  MessageSquare,
  Terminal,
  Coffee,
  Globe
} from 'lucide-vue-next';
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { currentLang, setLanguage, t } from '../i18n';
import { recordToolUsage } from '../utils/usageTracker';
import { siteConfig } from '../config/siteConfig';
import { isProSupporter, activeTierLabel } from '../utils/security/certificateStore';
import { usePwaInstall } from '../utils/usePwaInstall';

const props = defineProps({
  activeTab: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['switch-tab', 'open-feedback', 'open-privacy', 'open-settings', 'open-about', 'open-logs', 'open-enterprise', 'open-drawer']);

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
  { id: 'pdf_to_image', labelKey: 'tab_pdf_to_image', icon: ImageDown, color: 'text-cyan-600' },
  { id: 'watermark', labelKey: 'tab_watermark', icon: Stamp, color: 'text-amber-600' },
  { id: 'page_number', labelKey: 'tab_page_number', icon: ListOrdered, color: 'text-violet-600' },
  { id: 'sanitize', labelKey: 'tab_sanitize', icon: ShieldCheck, color: 'text-blue-600' },
  { id: 'redact', labelKey: 'tab_redact', icon: EyeOff, color: 'text-slate-700' }
];

const isMoreOpen = ref(false);
const moreMenuRef = ref(null);

const isAboutOpen = ref(false);
const aboutMenuRef = ref(null);

const isMoreActive = computed(() => moreTools.some(t => t.id === props.activeTab));

const activeMoreTool = computed(() => moreTools.find(t => t.id === props.activeTab));
const activeMoreToolName = computed(() => activeMoreTool.value ? t(activeMoreTool.value.labelKey) : null);
const activeMoreIcon = computed(() => activeMoreTool.value ? activeMoreTool.value.icon : null);

function toggleMore() {
  isAboutOpen.value = false;
  isMoreOpen.value = !isMoreOpen.value;
}

function toggleAbout() {
  isMoreOpen.value = false;
  isAboutOpen.value = !isAboutOpen.value;
}

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
  if (aboutMenuRef.value && !aboutMenuRef.value.contains(e.target)) {
    isAboutOpen.value = false;
  }
}

// PWA Install State & Logic
const { canInstallPwa, installPwa } = usePwaInstall();

onMounted(() => {
  document.addEventListener('click', handleOutsideClick);
});

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick);
});
</script>
