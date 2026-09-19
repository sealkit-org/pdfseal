<template>
  <section class="w-full flex-1 flex flex-col">
    <!-- Main Assembly Container -->
    <div class="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-7 shadow-xl border border-slate-100 flex flex-col flex-1">
      <!-- Universal File Input -->
      <input 
        ref="fileInputRef" 
        type="file" 
        accept="image/jpeg,image/png,image/webp,image/gif,image/*" 
        multiple
        class="hidden" 
        @change="onFilesSelected" 
      >

      <!-- Top Title Header (Fused Compact Header with Dynamic Subtitle & Action Bar) -->
      <div class="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 sm:pb-3 border-b border-slate-100 shrink-0">
        <div class="flex items-center space-x-3 min-w-0">
          <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold shrink-0 shadow-2xs">
            <Images class="w-5 h-5" />
          </div>
          <div class="min-w-0">
            <h2 class="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
              {{ t('img2pdf_title') }}
            </h2>
            <!-- Dynamic Subtitle: Image selection count when active, otherwise tool description -->
            <div v-if="imageList.length > 0 && !isProcessing && !lastExportedFile" class="flex items-center space-x-2 mt-0.5">
              <span class="text-xs sm:text-sm font-extrabold text-slate-800">
                {{ t('img2pdf_selected', 'Selected') }} <span class="font-mono text-violet-600">{{ imageList.length }}</span> {{ t('img2pdf_images', 'images') }}
              </span>
              <span class="text-[11px] text-slate-400 font-medium hidden sm:inline">
                {{ t('img2pdf_selected_hint') }}
              </span>
            </div>
            <p v-else class="text-xs text-slate-400 font-medium hidden sm:block mt-0.5">
              {{ t('img2pdf_desc') }}
            </p>
          </div>
        </div>

        <!-- Quick Action Buttons (Fused into Top Header when images are active) -->
        <div v-if="imageList.length > 0 && !isProcessing && !lastExportedFile" class="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          <!-- Add More Images -->
          <button 
            @click="fileInputRef.click()"
            class="text-xs text-violet-600 hover:bg-violet-50 font-semibold px-2.5 py-1.5 rounded-xl border border-violet-200 transition flex items-center space-x-1 cursor-pointer"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>{{ t('img2pdf_add_more', 'Add More') }}</span>
          </button>

          <!-- Reverse Order -->
          <button 
            @click="reverseImages" 
            class="text-xs text-slate-600 hover:bg-slate-100 font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 transition flex items-center space-x-1 cursor-pointer"
            :title="t('merge_btn_reverse')"
          >
            <ArrowUpDown class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">{{ t('merge_btn_reverse') }}</span>
          </button>

          <!-- Clear All -->
          <button 
            @click="clearAll" 
            class="text-xs text-rose-600 hover:bg-rose-50 font-semibold px-2.5 py-1.5 rounded-xl transition cursor-pointer"
          >
            {{ t('img2pdf_clear_all', 'Clear All') }}
          </button>
        </div>
      </div>

      <!-- 1. EMPTY STATE DROPZONE (Spacious Multi-image selector) -->
      <div 
        v-if="imageList.length === 0"
        @dragover.prevent="isDragOver = true"
        @dragleave.prevent="isDragOver = false"
        @drop.prevent="onDrop"
        :class="[
          'flex-1 border-2 border-dashed rounded-2xl sm:rounded-3xl p-6 sm:p-14 text-center transition flex flex-col items-center justify-center my-3 sm:my-4',
          isDragOver ? 'border-violet-500 bg-violet-50/50 scale-[0.99]' : 'border-slate-200 hover:border-violet-400 bg-slate-50/50'
        ]"
      >
        <div class="w-14 h-14 sm:w-16 sm:h-16 bg-violet-100/60 text-violet-600 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-3 sm:mb-4 shadow-sm">
          <Images class="w-7 h-7 sm:w-8 sm:h-8" />
        </div>
        <h3 class="text-base sm:text-lg font-bold text-slate-800">
          {{ t('img2pdf_drop_title') }}
        </h3>
        <p class="text-xs text-slate-400 mt-1 max-w-sm hidden sm:block">
          {{ t('img2pdf_drop_subtitle') }}
        </p>

        <!-- Action Button -->
        <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button 
            type="button" 
            @click="fileInputRef.click()"
            class="bg-violet-600 hover:bg-violet-700 active:scale-98 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition flex items-center space-x-2 shadow-md hover:shadow-violet-600/25 cursor-pointer"
          >
            <Plus class="w-4 h-4" />
            <span>{{ t('img2pdf_btn_choose') || 'Choose Images' }}</span>
          </button>
        </div>
      </div>

      <!-- 2. ACTIVE ASSEMBLY WORKSPACE OR UNIFIED RESULT DELIVERY -->
      <div v-else :class="['flex-1 flex flex-col justify-between min-h-0', isProcessing || lastExportedFile ? 'pt-4' : 'pt-2.5 sm:pt-3']">
        <!-- 2A. Unified Processing & Result Delivery View -->
        <ResultDeliveryView 
          v-if="isProcessing || lastExportedFile"
          :is-processing="isProcessing"
          :progress-percent="progressPercent"
          :progress-message="progressMessage"
          :file="lastExportedFile"
          source-tool="image_to_pdf"
          :page-count="imageList.length"
          @redownload="handleReDownload"
          @new-task="handleNewTask"
          @back-to-edit="handleBackToEdit"
          @send-to-tool="(tId) => emit('send-to-tool', tId)"
        >
          <template #metrics>
            <span class="inline-flex items-center space-x-1 text-xs font-semibold text-violet-700 bg-violet-50 px-2.5 py-1 rounded-lg border border-violet-200/60 shadow-2xs">
              <Images class="w-3.5 h-3.5 text-violet-600" />
              <span>{{ t('img2pdf_metric_count', { count: lastExportedCount || imageList.length }, `Compiled from ${lastExportedCount || imageList.length} images`) }}</span>
            </span>
          </template>
        </ResultDeliveryView>

        <!-- 2B. Staging Workspace & Bottom Execution Bar -->
        <div v-else class="flex-1 flex flex-col justify-between min-h-0">

        <!-- Mobile Compact Settings Capsule (Visible only on mobile < lg) -->
        <div 
          @click="isMobileSettingsOpen = true"
          class="lg:hidden my-2.5 flex items-center justify-between p-2.5 rounded-xl bg-violet-50/80 hover:bg-violet-100/70 border border-violet-200/80 text-xs cursor-pointer active:scale-98 transition shadow-2xs select-none"
        >
          <div class="flex items-center space-x-2 min-w-0 pr-2">
            <SlidersHorizontal class="w-3.5 h-3.5 text-violet-600 shrink-0" />
            <span class="font-bold text-slate-700 truncate text-[11px]">
              {{ currentSettingsSummary }}
            </span>
          </div>
          <span class="text-[10px] font-bold text-violet-700 bg-white px-2 py-0.5 rounded-lg border border-violet-200 shrink-0 flex items-center space-x-0.5 shadow-2xs">
            <span>{{ t('settings_btn_label', 'Settings') }}</span>
            <ChevronRight class="w-3 h-3" />
          </span>
        </div>

        <!-- Main Workspace (Left: Image Card Grid, Right: Layout Settings) -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 my-2 sm:my-2.5 flex-1 min-h-[220px]">
          <!-- Left: Image Cards (8 cols desktop, full width mobile) -->
          <div class="lg:col-span-8 bg-slate-50/70 rounded-2xl p-2 sm:p-4 border border-slate-200/80 overflow-y-auto min-h-[160px] max-h-[calc(100vh-280px)] md:max-h-[calc(100vh-320px)]">
            <div class="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 gap-2 sm:gap-3">
              <div 
                v-for="(img, idx) in imageList" 
                :key="img.id"
                draggable="true"
                @dragstart="onDragStart(idx)"
                @dragover.prevent
                @drop="onDropReorder(idx)"
                class="bg-white rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 border border-slate-200/80 shadow-2xs hover:border-violet-400 hover:shadow-md transition flex flex-col justify-between group relative select-none"
              >
                <!-- Page Number Tag -->
                <div class="absolute top-1.5 left-1.5 z-10 bg-slate-900/75 backdrop-blur-xs text-white text-[9px] sm:text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md">
                  P{{ idx + 1 }}
                </div>

                <!-- Delete Button -->
                <button 
                  @click.stop="removeImage(idx)"
                  class="absolute top-1.5 right-1.5 z-10 w-6 h-6 sm:w-5 sm:h-5 rounded-full bg-rose-500/90 text-white flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition cursor-pointer hover:bg-rose-600 shadow-xs"
                  :title="t('action_delete', 'Delete')"
                >
                  <X class="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                </button>

                <!-- Thumbnail -->
                <div class="h-24 sm:h-32 rounded-lg sm:rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center relative mb-1.5">
                  <img 
                    :src="img.previewUrl" 
                    :style="{ transform: `rotate(${img.rotation}deg)` }"
                    class="max-h-full max-w-full object-contain transition-transform duration-200 pointer-events-none"
                  >
                </div>

                <!-- Info & Actions -->
                <div class="space-y-1">
                  <p class="text-[10px] sm:text-[11px] font-bold text-slate-700 truncate" :title="img.name">
                    {{ img.name }}
                  </p>
                  <div class="hidden sm:flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{{ (img.file.size / 1024).toFixed(0) }} KB</span>
                    <span>{{ img.width }}x{{ img.height }}</span>
                  </div>

                  <!-- Quick Controls -->
                  <div class="flex items-center justify-between pt-1 border-t border-slate-100">
                    <div class="flex items-center space-x-0.5 sm:space-x-1">
                      <button 
                        @click="moveImage(idx, -1)" 
                        :disabled="idx === 0"
                        class="p-1 rounded-md hover:bg-slate-100 disabled:opacity-20 transition text-slate-500 cursor-pointer"
                        :title="t('action_move_up', 'Move Up')"
                      >
                        <ChevronLeft class="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </button>
                      <button 
                        @click="moveImage(idx, 1)" 
                        :disabled="idx === imageList.length - 1"
                        class="p-1 rounded-md hover:bg-slate-100 disabled:opacity-20 transition text-slate-500 cursor-pointer"
                        :title="t('action_move_down', 'Move Down')"
                      >
                        <ChevronRight class="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </button>
                    </div>

                    <button 
                      @click="rotateImage(idx)"
                      class="p-1 rounded-md hover:bg-violet-50 text-violet-600 transition flex items-center space-x-0.5 cursor-pointer text-[10px] font-semibold"
                      :title="t('action_rotate_90', 'Rotate 90°')"
                    >
                      <RotateCw class="w-3 h-3" />
                      <span class="hidden sm:inline">90°</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: Page & Layout Settings (4 cols, desktop wide screen only) -->
          <div class="hidden lg:flex lg:col-span-4 bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 flex-col justify-between space-y-4">
            <div class="space-y-4">
              <!-- Page Size -->
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-2">
                  {{ t('img2pdf_page_size') }}
                </label>
                <div class="space-y-1.5">
                  <label 
                    v-for="ps in pageSizeOptions" 
                    :key="ps.id"
                    @click="pageSize = ps.id"
                    :class="[
                      'p-2.5 rounded-xl border flex items-center justify-between text-xs transition cursor-pointer',
                      pageSize === ps.id ? 'bg-violet-50 border-violet-400 text-violet-900 font-bold ring-1 ring-violet-300' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    ]"
                  >
                    <span>{{ ps.label }}</span>
                    <span class="text-[10px] text-slate-400 font-sans">{{ ps.desc }}</span>
                  </label>
                </div>
              </div>

              <!-- Orientation -->
              <div v-if="pageSize !== 'fit'">
                <label class="block text-xs font-bold text-slate-700 mb-2">
                  {{ t('img2pdf_orientation') }}
                </label>
                <div class="grid grid-cols-3 gap-1.5">
                  <button 
                    v-for="o in orientationOptions" 
                    :key="o.id"
                    @click="orientation = o.id"
                    :class="[
                      'py-2 rounded-xl text-xs text-center border font-semibold transition cursor-pointer',
                      orientation === o.id ? 'bg-violet-50 border-violet-400 text-violet-900 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    ]"
                  >
                    {{ o.label }}
                  </button>
                </div>
              </div>

              <!-- Margin -->
              <div v-if="pageSize !== 'fit'">
                <label class="block text-xs font-bold text-slate-700 mb-2">
                  {{ t('img2pdf_margin') }}
                </label>
                <div class="grid grid-cols-3 gap-1.5">
                  <button 
                    v-for="m in marginOptions" 
                    :key="m.id"
                    @click="margin = m.id"
                    :class="[
                      'py-2 rounded-xl text-xs text-center border font-semibold transition cursor-pointer',
                      margin === m.id ? 'bg-violet-50 border-violet-400 text-violet-900 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    ]"
                  >
                    {{ m.label }}
                  </button>
                </div>
              </div>
            </div>

            <div class="p-2.5 rounded-xl bg-violet-50/60 border border-violet-100 text-[11px] text-violet-900 leading-relaxed">
              💡 {{ t('img2pdf_hint', 'Hint: US Letter or A4 is recommended for documents. Fit to Image is recommended for photos.') }}
            </div>
          </div>
        </div>

        <!-- Bottom Cluster: Output Settings & Sticky Bottom Action Bar -->
        <div class="shrink-0 pt-2.5 sm:pt-3 sticky bottom-14 md:static z-20 bg-white/95 backdrop-blur-md -mx-3.5 sm:mx-0 px-3.5 sm:px-0 pb-1 sm:pb-0 border-t border-slate-100 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] md:shadow-none">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <!-- Output Filename & Vault Auto-Save Setting (Hidden on mobile, preserved on desktop) -->
            <div class="hidden sm:flex flex-wrap items-center gap-3">
              <div class="flex items-center space-x-1.5">
                <label class="text-xs text-slate-500 font-semibold shrink-0">
                  {{ t('vault_field_name') }}:
                </label>
                <input 
                  v-model="customOutputBaseName"
                  type="text" 
                  :placeholder="defaultFileNamePlaceholder"
                  class="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:bg-white focus:ring-2 focus:ring-violet-500 outline-hidden font-medium text-slate-700 w-44 sm:w-56"
                >
              </div>

              <!-- Auto-save to Vault Checkbox -->
              <label class="flex items-center space-x-1.5 text-xs text-slate-600 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  v-model="autoSaveToVault"
                  class="w-3.5 h-3.5 rounded-sm border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                >
                <FolderLock class="w-3.5 h-3.5 text-violet-600" />
                <span>{{ t('vault_autosave_checkbox') }}</span>
              </label>
            </div>

            <!-- Main Export Action Button (Always prominent and thumb-friendly) -->
            <button 
              @click="executeExport" 
              :disabled="isProcessing || imageList.length === 0"
              class="w-full sm:w-auto sm:ml-auto bg-violet-600 hover:bg-violet-700 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold px-6 py-2.5 rounded-xl transition flex items-center justify-center space-x-2 shadow-lg hover:shadow-violet-600/25 cursor-pointer"
            >
              <Loader2 v-if="isProcessing" class="w-4 h-4 animate-spin" />
              <Images v-else class="w-4 h-4" />
              <span>{{ isProcessing ? (t('loading') || 'Processing...') : `${t('img2pdf_btn_action')} (${imageList.length})` }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Mobile Settings Bottom Sheet (Drawer) -->
  <Teleport to="body">
    <div 
      v-if="isMobileSettingsOpen" 
      class="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-xs lg:hidden select-none"
      @click.self="isMobileSettingsOpen = false"
    >
      <div class="bg-white rounded-t-3xl max-w-lg w-full p-5 shadow-2xl border-t border-slate-100 flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-200 max-h-[85vh] overflow-y-auto">
        <!-- Sheet Header -->
        <div class="flex items-center justify-between pb-2 border-b border-slate-100">
          <div class="flex items-center space-x-2">
            <SlidersHorizontal class="w-4 h-4 text-violet-600" />
            <h3 class="text-sm font-extrabold text-slate-800">{{ t('img2pdf_page_size') }} / {{ t('settings_btn_label', 'Settings') }}</h3>
          </div>
          <button 
            @click="isMobileSettingsOpen = false" 
            class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Page Size -->
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5">
            {{ t('img2pdf_page_size') }}
          </label>
          <div class="space-y-1.5">
            <label 
              v-for="ps in pageSizeOptions" 
              :key="ps.id"
              @click="pageSize = ps.id"
              :class="[
                'p-2.5 rounded-xl border flex items-center justify-between text-xs transition cursor-pointer',
                pageSize === ps.id ? 'bg-violet-50 border-violet-400 text-violet-900 font-bold ring-1 ring-violet-300' : 'bg-white border-slate-200 text-slate-600'
              ]"
            >
              <span>{{ ps.label }}</span>
              <span class="text-[10px] text-slate-400 font-sans">{{ ps.desc }}</span>
            </label>
          </div>
        </div>

        <!-- Orientation -->
        <div v-if="pageSize !== 'fit'">
          <label class="block text-xs font-bold text-slate-700 mb-1.5">
            {{ t('img2pdf_orientation') }}
          </label>
          <div class="grid grid-cols-3 gap-1.5">
            <button 
              v-for="o in orientationOptions" 
              :key="o.id"
              @click="orientation = o.id"
              :class="[
                'py-2 rounded-xl text-xs text-center border font-semibold transition cursor-pointer',
                orientation === o.id ? 'bg-violet-50 border-violet-400 text-violet-900 font-bold' : 'bg-white border-slate-200 text-slate-600'
              ]"
            >
              {{ o.label }}
            </button>
          </div>
        </div>

        <!-- Margin -->
        <div v-if="pageSize !== 'fit'">
          <label class="block text-xs font-bold text-slate-700 mb-1.5">
            {{ t('img2pdf_margin') }}
          </label>
          <div class="grid grid-cols-3 gap-1.5">
            <button 
              v-for="m in marginOptions" 
              :key="m.id"
              @click="margin = m.id"
              :class="[
                'py-2 rounded-xl text-xs text-center border font-semibold transition cursor-pointer',
                margin === m.id ? 'bg-violet-50 border-violet-400 text-violet-900 font-bold' : 'bg-white border-slate-200 text-slate-600'
              ]"
            >
              {{ m.label }}
            </button>
          </div>
        </div>

        <!-- Hint -->
        <div class="p-2.5 rounded-xl bg-violet-50/60 border border-violet-100 text-[11px] text-violet-900 leading-relaxed">
          💡 {{ t('img2pdf_hint', 'Hint: US Letter or A4 is recommended for documents. Fit to Image is recommended for photos.') }}
        </div>

        <!-- Done Button -->
        <button 
          type="button"
          @click="isMobileSettingsOpen = false" 
          class="w-full bg-violet-600 hover:bg-violet-700 active:scale-98 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer shadow-md"
        >
          {{ t('action_done') }}
        </button>
      </div>
    </div>
  </Teleport>
</section>
</template>

<script setup>
import { ref, computed, watch, inject, onActivated } from 'vue';
import { 
  Images, 
  Plus, 
  Lock, 
  FolderLock, 
  X, 
  RotateCw, 
  ChevronLeft, 
  ChevronRight, 
  FileDown, 
  Loader2,
  SlidersHorizontal,
  ArrowUpDown
} from 'lucide-vue-next';
import { PDFDocument } from 'pdf-lib';
import { t } from '../i18n';
import { triggerDownload } from '../utils/download';
import { saveFile } from '../utils/vaultDb';
import { userSettings } from '../utils/userSettings';
import { logger } from '../utils/logger';
import ResultDeliveryView from '../components/ResultDeliveryView.vue';

const emit = defineEmits(['send-to-tool']);

const workspaceState = inject('workspaceActiveState', null);

const lastExportedFile = ref(null);
const lastExportedCount = ref(0);
const progressPercent = ref(0);
const progressMessage = ref('');
let cachedPdfBlob = null;
let cachedPdfName = '';

const fileInputRef = ref(null);
const isDragOver = ref(false);
const isProcessing = ref(false);

// Image item: { id, file, name, previewUrl, width, height, rotation }
const imageList = ref([]);

watch(() => imageList.value.length > 0, (active) => {
  workspaceState?.setActiveFile(active);
}, { immediate: true });

onActivated(() => {
  workspaceState?.setActiveFile(imageList.value.length > 0);
});

// Layout configurations
const pageSize = ref('a4'); // 'a4' | 'letter' | 'fit'
const orientation = ref('auto'); // 'auto' | 'portrait' | 'landscape'
const margin = ref('standard'); // 'none' | 'small' | 'standard'

const pageSizeOptions = computed(() => [
  { id: 'a4', label: t('img2pdf_size_a4') || 'A4 (Global / Europe)', desc: '210 × 297 mm' },
  { id: 'letter', label: t('img2pdf_size_letter') || 'US Letter (North America)', desc: '8.5 × 11 in' },
  { id: 'fit', label: t('img2pdf_size_fit') || 'Fit to Image', desc: t('img2pdf_desc_fit', 'Original aspect ratio') }
]);

const orientationOptions = computed(() => [
  { id: 'auto', label: t('img2pdf_orient_auto') || 'Auto' },
  { id: 'portrait', label: t('img2pdf_orient_portrait') || 'Portrait' },
  { id: 'landscape', label: t('img2pdf_orient_landscape') || 'Landscape' }
]);

const marginOptions = computed(() => [
  { id: 'none', label: t('img2pdf_margin_none') || 'No Margin' },
  { id: 'small', label: t('img2pdf_margin_small') || 'Small' },
  { id: 'standard', label: t('img2pdf_margin_standard') || 'Standard' }
]);

const isMobileSettingsOpen = ref(false);

const currentSettingsSummary = computed(() => {
  const sizeObj = pageSizeOptions.value.find(p => p.id === pageSize.value);
  const sizeName = sizeObj ? sizeObj.label.split(' ')[0] : 'A4';
  
  let orientName = '';
  if (pageSize.value !== 'fit') {
    const oObj = orientationOptions.value.find(o => o.id === orientation.value);
    orientName = oObj ? ` · ${oObj.label}` : '';
  }

  let marginName = '';
  if (pageSize.value !== 'fit') {
    const mObj = marginOptions.value.find(m => m.id === margin.value);
    marginName = mObj ? ` · ${mObj.label}` : '';
  }

  return `${sizeName}${orientName}${marginName}`;
});

// Export Settings
const customOutputBaseName = ref('');
const autoSaveToVault = ref(userSettings.autoSaveToVault);

watch(() => userSettings.autoSaveToVault, (newVal) => {
  autoSaveToVault.value = Boolean(newVal);
}, { immediate: true });

const defaultFileNamePlaceholder = computed(() => {
  const prefix = userSettings.defaultExportPrefix || 'PDFSeal';
  return `${prefix}_Images_${Date.now()}`;
});

async function onFilesSelected(e) {
  const files = Array.from(e.target.files || []);
  if (files.length > 0) {
    await processAddedFiles(files);
  }
  e.target.value = '';
}

async function onDrop(e) {
  isDragOver.value = false;
  const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
  if (files.length > 0) {
    await processAddedFiles(files);
  }
}

async function processAddedFiles(files) {
  lastExportedFile.value = null;
  for (const f of files) {
    const previewUrl = URL.createObjectURL(f);
    const { width, height } = await getImageDimensions(previewUrl);
    imageList.value.push({
      id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      file: f,
      name: f.name,
      previewUrl,
      width,
      height,
      rotation: 0
    });
  }

  if (!customOutputBaseName.value) {
    const prefix = userSettings.defaultExportPrefix || 'PDFSeal';
    const firstClean = imageList.value[0]?.name.replace(/\.[^/.]+$/, '') || 'Document';
    customOutputBaseName.value = `${prefix}_${firstClean}`;
  }
}

function getImageDimensions(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 800, height: 600 });
    img.src = url;
  });
}

function removeImage(idx) {
  const removed = imageList.value.splice(idx, 1);
  if (removed[0]?.previewUrl) {
    URL.revokeObjectURL(removed[0].previewUrl);
  }
}

function clearAll() {
  imageList.value.forEach(img => URL.revokeObjectURL(img.previewUrl));
  imageList.value = [];
  customOutputBaseName.value = '';
  lastExportedFile.value = null;
  lastExportedCount.value = 0;
  cachedPdfBlob = null;
  cachedPdfName = '';
  progressMessage.value = '';
  progressPercent.value = 0;
}

function rotateImage(idx) {
  const item = imageList.value[idx];
  if (item) {
    item.rotation = (item.rotation + 90) % 360;
  }
}

function moveImage(idx, delta) {
  const target = idx + delta;
  if (target < 0 || target >= imageList.value.length) return;
  const temp = imageList.value[idx];
  imageList.value[idx] = imageList.value[target];
  imageList.value[target] = temp;
}

function reverseImages() {
  imageList.value.reverse();
}

// Drag & Drop Reorder
let draggedIdx = -1;
function onDragStart(idx) {
  draggedIdx = idx;
}

function onDropReorder(targetIdx) {
  if (draggedIdx === -1 || draggedIdx === targetIdx) return;
  const item = imageList.value.splice(draggedIdx, 1)[0];
  imageList.value.splice(targetIdx, 0, item);
  draggedIdx = -1;
}

// Conversion Execution
async function executeExport() {
  if (imageList.value.length === 0) return;
  isProcessing.value = true;
  progressPercent.value = 0;
  const total = imageList.value.length;
  progressMessage.value = t('img2pdf_progress_embedding', { current: 1, total });

  try {
    const doc = await PDFDocument.create();

    for (let i = 0; i < total; i++) {
      const item = imageList.value[i];
      progressMessage.value = t('img2pdf_progress_embedding', { current: i + 1, total });
      progressPercent.value = Math.round((i / total) * 85);
      // Yield to event loop for smooth UI reactivity and animation
      await new Promise(resolve => setTimeout(resolve, 0));

      // 1. Render image with rotation to canvas
      const canvas = document.createElement('canvas');
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = item.previewUrl;
      });

      const isSideways = item.rotation === 90 || item.rotation === 270;
      const naturalW = isSideways ? img.naturalHeight : img.naturalWidth;
      const naturalH = isSideways ? img.naturalWidth : img.naturalHeight;

      // Smart downscaling protection:
      // For ultra-high-resolution mobile camera photos (e.g. 48MP/108MP, 8000x6000),
      // downscale to max 2400px (standard A4 at ~290 DPI is ultra-sharp print quality).
      // This saves ~85% canvas memory, prevents mobile Safari OOM crashes,
      // and keeps PDF export fast and lightweight.
      const MAX_DIMENSION = 2400;
      let scaleFactor = 1;
      if (Math.max(naturalW, naturalH) > MAX_DIMENSION) {
        scaleFactor = MAX_DIMENSION / Math.max(naturalW, naturalH);
      }

      const drawW = Math.round(naturalW * scaleFactor);
      const drawH = Math.round(naturalH * scaleFactor);

      canvas.width = drawW;
      canvas.height = drawH;
      const ctx = canvas.getContext('2d');

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((item.rotation * Math.PI) / 180);
      const renderW = Math.round(img.naturalWidth * scaleFactor);
      const renderH = Math.round(img.naturalHeight * scaleFactor);
      ctx.drawImage(img, -renderW / 2, -renderH / 2, renderW, renderH);

      const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.90);
      const binary = atob(jpegDataUrl.split(',')[1]);
      const imgBytes = new Uint8Array(binary.length);
      for (let k = 0; k < binary.length; k++) {
        imgBytes[k] = binary.charCodeAt(k);
      }

      const embeddedImg = await doc.embedJpg(imgBytes);

      // 2. Determine target page size
      let pageW, pageH;
      if (pageSize.value === 'fit') {
        pageW = drawW;
        pageH = drawH;
      } else {
        // Points: A4 = 595.28 x 841.89, Letter = 612 x 792
        const baseW = pageSize.value === 'letter' ? 612 : 595.28;
        const baseH = pageSize.value === 'letter' ? 792 : 841.89;

        let isLandscape = false;
        if (orientation.value === 'landscape') {
          isLandscape = true;
        } else if (orientation.value === 'auto' && drawW > drawH) {
          isLandscape = true;
        }

        pageW = isLandscape ? Math.max(baseW, baseH) : Math.min(baseW, baseH);
        pageH = isLandscape ? Math.min(baseW, baseH) : Math.max(baseW, baseH);
      }

      // 3. Margin in points
      let m = 0;
      if (pageSize.value !== 'fit') {
        if (margin.value === 'small') m = 15;
        if (margin.value === 'standard') m = 36;
      }

      const availW = pageW - 2 * m;
      const availH = pageH - 2 * m;

      // Scale to fit within available box while preserving aspect ratio
      const scale = Math.min(availW / drawW, availH / drawH);
      const finalW = drawW * scale;
      const finalH = drawH * scale;

      const finalX = m + (availW - finalW) / 2;
      const finalY = m + (availH - finalH) / 2;

      const page = doc.addPage([pageW, pageH]);
      page.drawImage(embeddedImg, {
        x: finalX,
        y: finalY,
        width: finalW,
        height: finalH
      });
    }

    progressMessage.value = t('img2pdf_progress_saving', 'Generating & optimizing PDF document...');
    progressPercent.value = 90;
    await new Promise(resolve => setTimeout(resolve, 0));

    const outBytes = await doc.save({ useObjectStreams: true });
    let outName = (customOutputBaseName.value.trim() || `PDFSeal_Images_${Date.now()}`);
    if (!outName.toLowerCase().endsWith('.pdf')) {
      outName += '.pdf';
    }

    const pdfBlob = new Blob([outBytes], { type: 'application/pdf' });
    cachedPdfBlob = pdfBlob;
    cachedPdfName = outName;
    progressPercent.value = 100;

    triggerDownload(pdfBlob, outName);
    logger.info('IMG2PDF', `Images successfully converted to PDF: ${outName} (${total} pages)`);

    // Auto-save to Vault if checked
    if (autoSaveToVault.value) {
      try {
        await saveFile({
          name: outName,
          arrayBuffer: outBytes.buffer ? outBytes.buffer.slice(outBytes.byteOffset, outBytes.byteOffset + outBytes.byteLength) : outBytes,
          folderId: 'default',
          category: 'export',
          pageCount: total
        });
        logger.info('VAULT', `Image PDF auto-saved to Vault: ${outName}`);
      } catch (e) {
        logger.warn('VAULT', `Failed to auto-save PDF to Vault: ${e.message}`);
      }
    }

    lastExportedCount.value = total;
    lastExportedFile.value = {
      name: outName,
      size: outBytes.length,
      arrayBuffer: outBytes.buffer ? outBytes.buffer.slice(outBytes.byteOffset, outBytes.byteOffset + outBytes.byteLength) : outBytes,
      blob: pdfBlob
    };
  } catch (err) {
    logger.error('IMG2PDF', `Failed to convert images: ${err.message}`);
    alert('Failed to convert images to PDF: ' + err.message);
  } finally {
    isProcessing.value = false;
  }
}

function handleReDownload() {
  if (cachedPdfBlob && cachedPdfName) {
    triggerDownload(cachedPdfBlob, cachedPdfName);
  }
}

function handleNewTask() {
  clearAll();
}

function handleBackToEdit() {
  lastExportedFile.value = null;
}
</script>
