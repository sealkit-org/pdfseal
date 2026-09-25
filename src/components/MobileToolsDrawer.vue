<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
      <!-- Backdrop Overlay -->
      <div 
        class="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-200"
        @click="close"
      ></div>

      <!-- Drawer Bottom Sheet Content -->
      <div 
        class="relative z-10 bg-white rounded-t-3xl shadow-2xl border-t border-slate-200/80 max-h-[88vh] flex flex-col animate-in slide-in-from-bottom duration-250 select-none"
        style="padding-bottom: max(1rem, env(safe-area-inset-bottom));"
      >
        <!-- Drag Handle Indicator -->
        <div class="flex justify-center pt-3 pb-1 cursor-pointer" @click="close">
          <div class="w-10 h-1.5 rounded-full bg-slate-300"></div>
        </div>

        <!-- Header -->
        <div class="px-5 py-2.5 flex items-center justify-between border-b border-slate-100">
          <div class="flex items-center space-x-2">
            <span class="text-xl">🦭</span>
            <h3 class="font-extrabold text-slate-900 text-base">
              {{ t('nav_all_tools', 'All PDF Tools') }}
            </h3>
            <span class="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
              {{ t('local_badge', '100% Local') }}
            </span>
          </div>
          <button 
            type="button" 
            @click="close"
            class="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Scrollable Tools Grid Body -->
        <div class="overflow-y-auto px-4 py-3 space-y-4 flex-1">
          <!-- PWA Offline App Card (Visible if not running standalone) -->
          <div 
            v-if="!isInstalled" 
            class="p-2.5 rounded-2xl bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-violet-50/80 border border-indigo-100 flex items-center justify-between shadow-2xs"
          >
            <div class="flex items-center space-x-2.5 min-w-0 pr-2">
              <div class="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs font-bold text-sm">
                🦭
              </div>
              <div class="min-w-0">
                <div class="text-xs font-bold text-slate-800 leading-tight truncate">
                  {{ t('pwa_install_title') }}
                </div>
                <div class="text-[10px] text-slate-500 truncate mt-0.5">
                  {{ t('pwa_install_desc') }}
                </div>
              </div>
            </div>

            <!-- Action Button -->
            <button 
              type="button" 
              @click="handleInstallClick"
              class="shrink-0 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-xl shadow-2xs transition cursor-pointer flex items-center space-x-1"
            >
              <DownloadCloud v-if="canInstallPwa" class="w-3.5 h-3.5" />
              <Share2 v-else class="w-3.5 h-3.5" />
              <span>{{ canInstallPwa ? t('pwa_install_btn') : t('pwa_add_home_btn') }}</span>
            </button>
          </div>

          <!-- Category 1: Assembly & Pages -->
          <div>
            <h4 class="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 px-1">
              {{ t('drawer_cat_assembly', 'Pages & Documents') }}
            </h4>
            <div class="grid grid-cols-2 gap-2">
              <button 
                v-for="tool in assemblyTools" 
                :key="tool.id"
                type="button"
                @click="selectTool(tool.id)"
                :class="[
                  'flex items-center space-x-2.5 p-2.5 rounded-2xl border transition text-left cursor-pointer active:scale-98',
                  activeTab === tool.id 
                    ? 'bg-blue-50 border-blue-200/80 text-blue-900 font-bold shadow-2xs' 
                    : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200/60 text-slate-800'
                ]"
              >
                <div :class="['w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs', tool.bgClass]">
                  <component :is="tool.icon" :class="['w-5 h-5', tool.colorClass]" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="text-xs font-bold truncate leading-tight">{{ t(tool.labelKey) }}</div>
                  <div class="text-[10px] text-slate-400 truncate mt-0.5">{{ t(tool.descKey, '') }}</div>
                </div>
              </button>
            </div>
          </div>

          <!-- Category 2: Security & Privacy -->
          <div>
            <h4 class="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 px-1">
              {{ t('drawer_cat_security', 'Security & Signatures') }}
            </h4>
            <div class="grid grid-cols-2 gap-2">
              <button 
                v-for="tool in securityTools" 
                :key="tool.id"
                type="button"
                @click="selectTool(tool.id)"
                :class="[
                  'flex items-center space-x-2.5 p-2.5 rounded-2xl border transition text-left cursor-pointer active:scale-98',
                  activeTab === tool.id 
                    ? 'bg-indigo-50 border-indigo-200/80 text-indigo-900 font-bold shadow-2xs' 
                    : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200/60 text-slate-800'
                ]"
              >
                <div :class="['w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs', tool.bgClass]">
                  <component :is="tool.icon" :class="['w-5 h-5', tool.colorClass]" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="text-xs font-bold truncate leading-tight">{{ t(tool.labelKey) }}</div>
                  <div class="text-[10px] text-slate-400 truncate mt-0.5">{{ t(tool.descKey, '') }}</div>
                </div>
              </button>
            </div>
          </div>

          <!-- Category 3: Optimize & Edit -->
          <div>
            <h4 class="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 px-1">
              {{ t('drawer_cat_edit', 'Optimize & Edit') }}
            </h4>
            <div class="grid grid-cols-2 gap-2">
              <button 
                v-for="tool in editTools" 
                :key="tool.id"
                type="button"
                @click="selectTool(tool.id)"
                :class="[
                  'flex items-center space-x-2.5 p-2.5 rounded-2xl border transition text-left cursor-pointer active:scale-98',
                  activeTab === tool.id 
                    ? 'bg-blue-50 border-blue-200/80 text-blue-900 font-bold shadow-2xs' 
                    : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200/60 text-slate-800'
                ]"
              >
                <div :class="['w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs', tool.bgClass]">
                  <component :is="tool.icon" :class="['w-5 h-5', tool.colorClass]" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="text-xs font-bold truncate leading-tight">{{ t(tool.labelKey) }}</div>
                  <div class="text-[10px] text-slate-400 truncate mt-0.5">{{ t(tool.descKey, '') }}</div>
                </div>
              </button>
            </div>
          </div>

          <!-- Category 4: Advanced Utilities -->
          <div>
            <h4 class="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 px-1">
              {{ t('drawer_cat_advanced', 'Advanced Utilities') }}
            </h4>
            <div class="grid grid-cols-2 gap-2">
              <button 
                v-for="tool in advancedTools" 
                :key="tool.id"
                type="button"
                @click="selectTool(tool.id)"
                :class="[
                  'flex items-center space-x-2.5 p-2.5 rounded-2xl border transition text-left cursor-pointer active:scale-98',
                  activeTab === tool.id 
                    ? 'bg-indigo-50 border-indigo-200/80 text-indigo-900 font-bold shadow-2xs' 
                    : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200/60 text-slate-800'
                ]"
              >
                <div :class="['w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs', tool.bgClass]">
                  <component :is="tool.icon" :class="['w-5 h-5', tool.colorClass]" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="text-xs font-bold truncate leading-tight">{{ t(tool.labelKey) }}</div>
                  <div class="text-[10px] text-slate-400 truncate mt-0.5">{{ t(tool.descKey, '') }}</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        <!-- Drawer Quick Footer & Utilities -->
        <div class="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <!-- Language Selector -->
          <div class="relative">
            <select 
              :value="currentLang" 
              @change="setLanguage($event.target.value)"
              class="text-xs bg-white text-slate-700 font-bold py-1 pl-2 pr-6 rounded-lg border border-slate-200 appearance-none focus:outline-hidden cursor-pointer shadow-2xs"
            >
              <option value="en">English</option>
              <option value="de">Deutsch</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="ja">日本語</option>
              <option value="zh">简体中文</option>
            </select>
            <ChevronDown class="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <!-- Shortcuts: Privacy, Settings, About -->
          <div class="flex items-center space-x-2">
            <button 
              type="button" 
              @click="close(); $emit('open-privacy')"
              class="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-white rounded-lg transition"
              :title="t('footer_privacy', 'Privacy Commitment')"
            >
              <ShieldCheck class="w-4 h-4 text-emerald-600" />
            </button>
            <button 
              type="button" 
              @click="close(); $emit('open-settings')"
              class="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-white rounded-lg transition"
              :title="t('settings_modal_title', 'Preferences')"
            >
              <Settings class="w-4 h-4 text-slate-600" />
            </button>
            <button 
              type="button" 
              @click="close(); $emit('open-logs')"
              class="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition"
              :title="t('about_logs_title', 'Logs')"
            >
              <Terminal class="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>
      </div>

      <!-- iOS Add to Home Screen Guide Modal -->
      <div 
        v-if="showIosGuide" 
        class="fixed inset-0 z-60 flex items-end sm:items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
        @click.self="showIosGuide = false"
      >
        <div class="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div class="flex items-center justify-between pb-2 border-b border-slate-100">
            <div class="flex items-center space-x-2">
              <span class="text-xl">🦭</span>
              <h3 class="text-sm font-extrabold text-slate-800">{{ t('pwa_ios_guide_title') }}</h3>
            </div>
            <button @click="showIosGuide = false" class="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer">
              <X class="w-4 h-4" />
            </button>
          </div>

          <div class="space-y-2.5 text-xs text-slate-600">
            <div class="flex items-start space-x-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <div class="w-5 h-5 rounded-md bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs mt-0.5">1</div>
              <p class="leading-relaxed">{{ t('pwa_ios_step1') }}</p>
            </div>
            <div class="flex items-start space-x-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <div class="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-xs mt-0.5">2</div>
              <p class="leading-relaxed">{{ t('pwa_ios_step2') }}</p>
            </div>
            <div class="flex items-start space-x-2.5 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/70">
              <div class="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-xs mt-0.5">3</div>
              <p class="leading-relaxed font-semibold text-emerald-900">{{ t('pwa_ios_step3') }}</p>
            </div>
          </div>

          <button 
            type="button"
            @click="showIosGuide = false" 
            class="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
          >
            {{ t('btn_confirm', 'OK') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue';
import { 
  X, 
  Layers, 
  Scissors, 
  LayoutGrid, 
  Images, 
  ImageDown,
  PenTool, 
  Lock, 
  Unlock, 
  EyeOff, 
  ShieldCheck, 
  Minimize2, 
  Stamp, 
  ListOrdered,
  Zap,
  FolderLock,
  ChevronDown,
  Settings,
  Terminal,
  DownloadCloud,
  Share2
} from 'lucide-vue-next';
import { currentLang, setLanguage, t } from '../i18n';
import { recordToolUsage } from '../utils/usageTracker';
import { usePwaInstall } from '../utils/usePwaInstall';

const { canInstallPwa, isInstalled, installPwa } = usePwaInstall();
const showIosGuide = ref(false);

async function handleInstallClick() {
  if (canInstallPwa.value) {
    const success = await installPwa();
    if (success) close();
  } else {
    showIosGuide.value = true;
  }
}

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  activeTab: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['close', 'switch-tab', 'open-privacy', 'open-settings', 'open-logs']);

function close() {
  emit('close');
}

function selectTool(id) {
  recordToolUsage(id);
  emit('switch-tab', id);
  close();
}

// 1. Pages & Assembly
const assemblyTools = [
  { id: 'merge', labelKey: 'tab_merge', descKey: 'merge_title', icon: Layers, bgClass: 'bg-blue-100/80', colorClass: 'text-blue-600' },
  { id: 'split', labelKey: 'tab_split', descKey: 'split_title', icon: Scissors, bgClass: 'bg-blue-100/80', colorClass: 'text-blue-600' },
  { id: 'organize', labelKey: 'tab_organize', descKey: 'organize_title', icon: LayoutGrid, bgClass: 'bg-blue-100/80', colorClass: 'text-blue-600' },
  { id: 'image_to_pdf', labelKey: 'tab_image_to_pdf', descKey: 'img2pdf_title', icon: Images, bgClass: 'bg-violet-100/80', colorClass: 'text-violet-600' },
  { id: 'pdf_to_image', labelKey: 'tab_pdf_to_image', descKey: 'pdf2img_title', icon: ImageDown, bgClass: 'bg-cyan-100/80', colorClass: 'text-cyan-600' }
];

// 2. Security & Signatures
const securityTools = [
  { id: 'sign', labelKey: 'tab_sign', descKey: 'sign_title', icon: PenTool, bgClass: 'bg-indigo-100/80', colorClass: 'text-indigo-600' },
  { id: 'redact', labelKey: 'tab_redact', descKey: 'redact_title', icon: EyeOff, bgClass: 'bg-slate-200', colorClass: 'text-slate-700' },
  { id: 'protect', labelKey: 'tab_protect', descKey: 'protect_title', icon: Lock, bgClass: 'bg-rose-100/80', colorClass: 'text-rose-600' },
  { id: 'unlock', labelKey: 'tab_unlock', descKey: 'unlock_title', icon: Unlock, bgClass: 'bg-emerald-100/80', colorClass: 'text-emerald-600' },
  { id: 'sanitize', labelKey: 'tab_sanitize', descKey: 'sanitize_title', icon: ShieldCheck, bgClass: 'bg-blue-100/80', colorClass: 'text-blue-600' }
];

// 3. Optimize & Edit
const editTools = [
  { id: 'compress', labelKey: 'tab_compress', descKey: 'compress_title', icon: Minimize2, bgClass: 'bg-emerald-100/80', colorClass: 'text-emerald-600' },
  { id: 'watermark', labelKey: 'tab_watermark', descKey: 'watermark_title', icon: Stamp, bgClass: 'bg-amber-100/80', colorClass: 'text-amber-600' },
  { id: 'page_number', labelKey: 'tab_page_number', descKey: 'page_number_title', icon: ListOrdered, bgClass: 'bg-violet-100/80', colorClass: 'text-violet-600' }
];

// 4. Advanced
const advancedTools = [
  { id: 'pipeline', labelKey: 'tab_pipeline', descKey: 'pipeline_title', icon: Zap, bgClass: 'bg-indigo-100/80', colorClass: 'text-indigo-600' },
  { id: 'vault', labelKey: 'tab_vault', descKey: 'vault_title', icon: FolderLock, bgClass: 'bg-blue-100/80', colorClass: 'text-blue-600' }
];
</script>
