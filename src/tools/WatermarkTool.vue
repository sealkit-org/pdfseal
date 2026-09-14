<template>
  <section class="w-full flex-1 flex flex-col min-h-0">
    <!-- Main Card Container matching Merge, Organize, and Split tools -->
    <div class="bg-white rounded-3xl p-4 sm:p-5 shadow-xl border border-slate-100 flex flex-col flex-1 min-h-0">
      <!-- Integrated Header with Badge -->
      <div class="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
        <div class="flex items-center space-x-3">
          <div class="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shadow-2xs">
            <Stamp class="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 class="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
              {{ t('watermark_title') }}
            </h2>
            <p class="text-xs text-slate-500 mt-0.5">
              {{ t('watermark_desc') }}
            </p>
          </div>
        </div>

      </div>

      <!-- State A: Empty State (Dual Source Dropzone: Local & Vault) -->
      <div 
        v-if="!docBytes"
        @dragover.prevent="isDragOver = true"
        @dragleave.prevent="isDragOver = false"
        @drop.prevent="onDrop"
        :class="[
          'flex-1 border-2 border-dashed rounded-3xl p-8 sm:p-14 text-center transition flex flex-col items-center justify-center my-4 relative select-none',
          isDragOver ? 'border-amber-500 bg-amber-50/50' : 'border-slate-200/90 hover:border-amber-400 bg-slate-50/40 hover:bg-slate-50/80'
        ]"
      >
        <input 
          ref="fileInputRef" 
          type="file" 
          accept="application/pdf" 
          class="hidden" 
          @change="onFileSelected" 
        >
        
        <div class="w-16 h-16 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mb-3 shadow-inner">
          <Stamp class="w-8 h-8" />
        </div>
        
        <h3 class="text-base sm:text-lg font-bold text-slate-800">{{ t('watermark_drop_title') }}</h3>
        <p class="text-xs text-slate-400 mt-1 max-w-sm">{{ t('watermark_drop_subtitle') }}</p>
        
        <!-- Dual Source Selection Buttons -->
        <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button 
            type="button" 
            @click="fileInputRef.click()"
            class="bg-amber-600 hover:bg-amber-700 active:scale-98 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition flex items-center space-x-2 shadow-md hover:shadow-amber-600/25 cursor-pointer"
          >
            <Plus class="w-4 h-4" />
            <span>{{ t('merge_btn_from_local') || 'Add from Computer' }}</span>
          </button>
          
          <button 
            type="button" 
            @click="isVaultPickerOpen = true"
            class="bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center space-x-2 border border-slate-200 shadow-2xs hover:border-slate-300 cursor-pointer"
          >
            <FolderLock class="w-4 h-4 text-amber-600" />
            <span>{{ t('merge_btn_from_vault') || 'Pick from Vault' }}</span>
          </button>
        </div>
      </div>

      <!-- State B: Active Document Workspace OR UNIFIED RESULT DELIVERY -->
      <div v-else class="flex-1 flex flex-col justify-between pt-3 sm:pt-3.5 overflow-hidden">
        <!-- Unified Processing & Result Delivery View -->
        <ResultDeliveryView 
          v-if="isProcessing || lastExportedFile"
          :is-processing="isProcessing"
          :progress-percent="progressPercent"
          :progress-message="progressMessage"
          :file="lastExportedFile"
          source-tool="watermark"
          :page-count="totalPages"
          @redownload="handleReDownload"
          @new-task="handleNewTask"
          @back-to-edit="handleBackToEdit"
          @send-to-tool="(tId) => emit('send-to-tool', tId)"
        >
          <template #metrics>
            <span class="inline-flex items-center space-x-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60 shadow-2xs">
              <Stamp class="w-3.5 h-3.5 text-amber-600" />
              <span>{{ t('wm_metric_badge', { text: wmText || 'CONFIDENTIAL' }, `Watermark "${wmText || 'CONFIDENTIAL'}" applied successfully`) }}</span>
            </span>
          </template>
        </ResultDeliveryView>

        <!-- Staging Workspace & Bottom Execution Bar -->
        <div v-else class="flex-1 flex flex-col justify-between min-h-0">
        <!-- Top Toolbar & Status Bar -->
        <div class="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100 shrink-0">
          <div class="flex items-center space-x-2 min-w-0 flex-1">
            <span class="text-xs bg-amber-50 text-amber-700 font-extrabold px-2.5 py-1 rounded-lg border border-amber-200 shrink-0">
              {{ totalPages }} {{ t('pages_label') || 'pages' }}
            </span>
            <span class="text-xs font-bold text-slate-700 truncate max-w-xs" :title="filename">
              {{ filename }}
            </span>
            <span 
              v-if="unlockedPassword" 
              class="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-bold flex items-center shrink-0"
            >
              <Unlock class="w-3 h-3 mr-0.5" />
              {{ t('badge_unlocked') || 'Unlocked' }}
            </span>
          </div>

          <!-- Quick Action Buttons -->
          <div class="flex items-center space-x-1.5 sm:space-x-2">
            <!-- Choose Another Local File -->
            <button 
              @click="fileInputRef.click()"
              class="text-xs text-amber-600 hover:bg-amber-50 font-semibold px-2.5 py-1.5 rounded-xl border border-amber-200 transition flex items-center space-x-1 cursor-pointer"
            >
              <RefreshCw class="w-3.5 h-3.5" />
              <span>{{ t('btn_choose_another') || 'Choose Another File' }}</span>
            </button>

            <!-- Choose From Vault -->
            <button 
              @click="isVaultPickerOpen = true"
              class="text-xs text-slate-700 hover:bg-slate-100 font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 transition flex items-center space-x-1 cursor-pointer"
            >
              <FolderLock class="w-3.5 h-3.5 text-amber-600" />
              <span>{{ t('merge_btn_from_vault') || 'Pick from Vault' }}</span>
            </button>

            <!-- Clear / Reset -->
            <button 
              @click="reset" 
              data-testid="wm-reset-btn"
              class="text-xs text-rose-600 hover:bg-rose-50 font-semibold px-2.5 py-1.5 rounded-xl transition cursor-pointer"
            >
              {{ t('btn_clear_all') || 'Clear All' }}
            </button>
          </div>
        </div>

        <input 
          ref="fileInputRef" 
          type="file" 
          accept="application/pdf" 
          class="hidden" 
          @change="onFileSelected" 
        >

        <!-- Loading State -->
        <div v-if="isLoading" class="flex-1 flex flex-col items-center justify-center py-16 text-center text-xs text-slate-500 font-medium">
          <Loader2 class="w-8 h-8 animate-spin mx-auto mb-3 text-amber-600" />
          <span>{{ t('rendering_pages') }}...</span>
        </div>

        <!-- Center Workspace: Controls & Live Preview (Calibrated Full Height without Page Scrollbars) -->
        <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-3.5 my-2 flex-1 items-stretch min-h-0 max-h-[calc(100vh-310px)] overflow-hidden">
          <!-- Left Controls (5 cols on lg) -->
          <div class="lg:col-span-5 bg-slate-50/80 rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 flex flex-col justify-between overflow-y-auto custom-scrollbar min-h-0">
            <div class="space-y-2.5">
              <div class="flex items-center space-x-2 font-bold text-slate-800 text-xs border-b border-slate-200/70 pb-1.5">
                <Sliders class="w-3.5 h-3.5 text-amber-600" />
                <span>{{ t('wm_controls') || 'Watermark Controls' }}</span>
              </div>

              <!-- Watermark Text Input -->
              <div>
                <label class="block text-[11px] font-semibold text-slate-700 mb-1">{{ t('wm_text_label') || 'Watermark Text' }}</label>
                <input 
                  v-model="wmText" 
                  @input="renderPreview"
                  type="text" 
                  data-testid="wm-text-input"
                  :placeholder="t('wm_placeholder', 'e.g. CONFIDENTIAL / INTERNAL USE')"
                  class="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-amber-500 focus:bg-white outline-hidden font-medium shadow-2xs"
                >
              </div>

              <!-- Font Size Slider Row -->
              <div>
                <div class="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                  <span>{{ t('wm_size_label') || 'Font Size' }}</span>
                  <span class="text-slate-500 font-mono font-bold">{{ wmSize }}px</span>
                </div>
                <input 
                  v-model.number="wmSize" 
                  @input="renderPreview"
                  type="range" 
                  min="16" 
                  max="96" 
                  class="w-full accent-amber-600 cursor-pointer"
                >
              </div>

              <!-- Opacity Slider Row -->
              <div>
                <div class="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                  <span>{{ t('wm_opacity_label') || 'Opacity' }}</span>
                  <span class="text-slate-500 font-mono font-bold">{{ wmOpacity }}%</span>
                </div>
                <input 
                  v-model.number="wmOpacity" 
                  @input="renderPreview"
                  type="range" 
                  min="5" 
                  max="90" 
                  class="w-full accent-amber-600 cursor-pointer"
                >
              </div>

              <!-- Rotation Angle Presets (8 Angles: ±67.5°, ±45°, ±22.5°, 0°, 90°) -->
              <div>
                <div class="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                  <span>{{ t('wm_rotation_label') || 'Rotation Angle' }}</span>
                  <span class="text-slate-500 font-mono font-bold">{{ wmAngle }}°</span>
                </div>
                <div class="grid grid-cols-4 gap-1.5">
                  <button 
                    v-for="preset in anglePresets"
                    :key="preset.val"
                    @click="setAngle(preset.val)"
                    :class="[
                      'text-[11px] py-1 rounded-xl border transition font-medium cursor-pointer flex items-center justify-center',
                      wmAngle === preset.val 
                        ? 'border-amber-500 bg-amber-100/70 text-amber-900 font-bold shadow-2xs' 
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    ]"
                  >
                    {{ preset.label }}
                  </button>
                </div>
              </div>

              <!-- Color Selection: Compact Swatches + Color Picker + Hex Input -->
              <div>
                <div class="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                  <span>{{ t('wm_color_preset') || 'Color Preset' }}</span>
                  <span class="text-slate-500 font-mono uppercase">{{ wmColor }}</span>
                </div>

                <div class="flex items-center space-x-2">
                  <!-- Swatches -->
                  <div class="flex items-center space-x-1.5 flex-1 overflow-x-auto py-0.5">
                    <button 
                      v-for="color in colorPresets" 
                      :key="color"
                      @click="setColor(color)"
                      :style="{ backgroundColor: color }"
                      :class="[
                        'w-5 h-5 rounded-full ring-2 ring-offset-1 transition cursor-pointer shrink-0',
                        wmColor.toLowerCase() === color.toLowerCase() ? 'ring-slate-900 scale-110 shadow-xs' : 'ring-transparent opacity-85 hover:opacity-100'
                      ]"
                      :title="color"
                    ></button>
                  </div>

                  <!-- Custom Color Picker + Hex Code Input -->
                  <div class="flex items-center space-x-1.5 shrink-0">
                    <div class="relative w-6 h-6 rounded-lg border border-slate-300 overflow-hidden shadow-2xs cursor-pointer flex items-center justify-center">
                      <input 
                        type="color" 
                        v-model="wmColor" 
                        class="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                        :title="t('wm_color_picker', 'Open Color Picker')"
                      >
                      <div class="w-full h-full rounded-md" :style="{ backgroundColor: wmColor }"></div>
                    </div>
                    
                    <div class="relative w-20">
                      <span class="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-[10px]">#</span>
                      <input 
                        :value="wmColor.replace(/^#/, '')" 
                        @input="handleHexInput"
                        type="text" 
                        maxlength="6"
                        placeholder="dc2626"
                        class="w-full text-[11px] bg-white border border-slate-200 rounded-lg pl-4 pr-1.5 py-0.5 focus:ring-2 focus:ring-amber-500 focus:bg-white outline-hidden font-mono uppercase text-slate-700 shadow-2xs font-semibold"
                      >
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Live Canvas Preview (7 cols on lg, Stretches gracefully to fill height) -->
          <div class="lg:col-span-7 bg-slate-100/70 rounded-2xl p-3 sm:p-4 border border-slate-200/80 flex flex-col justify-between overflow-hidden min-h-0">
            <div class="flex items-center space-x-1.5 text-xs font-bold text-slate-600 mb-1.5 self-start shrink-0">
              <span class="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>{{ t('live_preview') || 'Live Page 1 Preview' }}</span>
            </div>
            <div class="bg-white p-2 rounded-2xl shadow-md border border-slate-200/80 max-w-full flex-1 w-full overflow-hidden flex items-center justify-center min-h-0">
              <canvas ref="previewCanvasRef" class="max-h-[calc(100vh-400px)] max-w-full object-contain rounded-lg shadow-2xs"></canvas>
            </div>
          </div>
        </div>

        <!-- Bottom Cluster: Output Settings Bar -->
        <div class="shrink-0 space-y-2.5 pt-2">
          <!-- Assembly Bottom Action & Export Configuration Bar -->
          <div class="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <!-- Left: Output Filename & Auto-save Checkbox -->
            <div class="flex flex-wrap items-center gap-3">
              <div class="flex items-center space-x-1.5">
                <label class="text-xs text-slate-500 font-semibold shrink-0">
                  {{ t('vault_field_name') }}:
                </label>
                <input 
                  v-model="customOutputBaseName"
                  type="text" 
                  data-testid="wm-filename-input"
                  :placeholder="t('vault_filename_placeholder') || 'Custom output filename (optional)'"
                  class="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-hidden font-medium text-slate-700 w-44 sm:w-64"
                >
              </div>

              <label class="flex items-center space-x-1.5 text-xs text-slate-600 font-semibold cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  v-model="autoSaveToVault" 
                  class="w-4 h-4 text-amber-600 rounded-md border-slate-300 focus:ring-amber-500 cursor-pointer"
                >
                <span>{{ t('vault_autosave_checkbox') }}</span>
              </label>
            </div>

            <!-- Right: Execution Button -->
            <button 
              :disabled="isProcessing || isLoading"
              @click="executeWatermark" 
              data-testid="wm-download-btn"
              class="bg-amber-600 hover:bg-amber-700 active:scale-98 text-white text-xs sm:text-sm font-bold px-6 py-2.5 rounded-xl transition flex items-center justify-center space-x-2 shadow-md hover:shadow-amber-600/25 disabled:opacity-50 cursor-pointer ml-auto"
            >
              <span v-if="!isProcessing">{{ t('stamp_and_download') || '🦭 Stamp & Download PDF' }}</span>
              <span v-else>{{ t('loading') || 'Processing...' }}</span>
              <Download v-if="!isProcessing" class="w-4 h-4" />
              <Loader2 v-else class="w-4 h-4 animate-spin" />
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>

    <!-- Vault File Picker Modal (Single-select mode for Watermark) -->
    <VaultFilePickerModal
      :is-open="isVaultPickerOpen"
      :multiple="false"
      @select-files="handleVaultFilesSelected"
      @close="isVaultPickerOpen = false"
    />

    <!-- Password Unlock Modal -->
    <PasswordModal 
      :is-open="isPasswordOpen"
      :filename="pendingFileName"
      :error-message="passwordError"
      :is-unlocking="isUnlocking"
      @submit="handlePasswordSubmit"
      @cancel="handlePasswordCancel"
    />
  </section>
</template>

<script setup>
import { ref, watch, nextTick, inject, onMounted, onActivated } from 'vue';
import { 
  Stamp, 
  Plus, 
  Sliders, 
  Download, 
  Loader2, 
  FolderLock, 
  Lock, 
  Unlock, 
  RefreshCw
} from 'lucide-vue-next';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import { t } from '../i18n';
import { triggerDownload } from '../utils/download';
import { verifyPdfSecurity, loadCleanPdfDocument } from '../utils/pdfSecurity';
import { consumePendingFile } from '../utils/toolBridge';
import { saveFile } from '../utils/vaultDb';
import { userSettings } from '../utils/userSettings';
import { logger } from '../utils/logger';
import { generateExportFileName } from '../utils/filenameUtils';
import PasswordModal from '../components/PasswordModal.vue';
import VaultFilePickerModal from '../components/VaultFilePickerModal.vue';
import ResultDeliveryView from '../components/ResultDeliveryView.vue';

const emit = defineEmits(['send-to-tool']);

const workspaceState = inject('workspaceActiveState', null);

const lastExportedFile = ref(null);
const showNextActions = ref(false);
const progressPercent = ref(0);
const progressMessage = ref('');
let cachedPdfBlob = null;
let cachedPdfName = '';

function handleReDownload() {
  if (cachedPdfBlob && cachedPdfName) {
    triggerDownload(cachedPdfBlob, cachedPdfName);
  }
}

function handleNewTask() {
  reset();
}

async function ensurePage1Rendered() {
  if (page1Canvas) return;
  if (!docBytes.value) return;
  try {
    const pdfDataForViewer = new Uint8Array(docBytes.value.slice(0));
    const loadingTask = pdfjsLib.getDocument({ 
      data: pdfDataForViewer,
      password: unlockedPassword || undefined,
      cMapUrl: '/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: '/standard_fonts/'
    });
    const pdf = await loadingTask.promise;
    totalPages.value = pdf.numPages;
    const page1 = await pdf.getPage(1);
    const viewport = page1.getViewport({ scale: 1.0 });

    page1Canvas = document.createElement('canvas');
    const ctx = page1Canvas.getContext('2d');
    page1Canvas.width = viewport.width;
    page1Canvas.height = viewport.height;
    await page1.render({ canvasContext: ctx, viewport }).promise;
  } catch (err) {
    logger.warn('WATERMARK', `Failed to ensure page 1 rendered: ${err.message}`);
  }
}

async function handleBackToEdit() {
  lastExportedFile.value = null;
  isProcessing.value = false;
  progressPercent.value = 0;
  progressMessage.value = '';
  await nextTick();
  if (!page1Canvas && docBytes.value) {
    await ensurePage1Rendered();
  }
  renderPreview();
  requestAnimationFrame(() => {
    renderPreview();
  });
}

const fileInputRef = ref(null);
const previewCanvasRef = ref(null);
const docBytes = ref(null);

watch(() => Boolean(docBytes.value), (active) => {
  workspaceState?.setActiveFile(active);
}, { immediate: true });

onActivated(() => {
  workspaceState?.setActiveFile(Boolean(docBytes.value));
});
const filename = ref('');
const totalPages = ref(0);
const isDragOver = ref(false);
const isProcessing = ref(false);
const isLoading = ref(false);
const isVaultPickerOpen = ref(false);

const wmText = ref('CONFIDENTIAL');
const wmSize = ref(48);
const wmOpacity = ref(30);
const wmAngle = ref(-45);
const wmColor = ref('#dc2626');
const colorPresets = [
  '#dc2626', // 印章红
  '#e11d48', // 玫瑰红
  '#d97706', // 琥珀金
  '#2563eb', // 商务蓝
  '#059669', // 翡翠绿
  '#7c3aed', // 典雅紫
  '#475569', // 中性灰
  '#0f172a'  // 沉稳黑
];

const anglePresets = [
  { val: -67.5, label: '-67.5°' },
  { val: -45, label: '-45°' },
  { val: -22.5, label: '-22.5°' },
  { val: 0, label: t('wm_angle_0', '0° Horizontal') },
  { val: 22.5, label: '+22.5°' },
  { val: 45, label: '+45°' },
  { val: 67.5, label: '+67.5°' },
  { val: 90, label: t('wm_angle_90', '90° Vertical') }
];

function handleHexInput(e) {
  let val = e.target.value.replace(/[^0-9A-Fa-f]/g, '');
  if (val.length <= 6) {
    wmColor.value = '#' + val;
  }
}

// Reactive live preview updates on any parameter change
watch([wmText, wmSize, wmOpacity, wmAngle, wmColor], () => {
  renderPreview();
});

// Export options (Dynamically synchronized with Global Settings)
const customOutputBaseName = ref('');
const autoSaveToVault = ref(userSettings.autoSaveToVault);

watch(() => userSettings.autoSaveToVault, (newVal) => {
  autoSaveToVault.value = Boolean(newVal);
}, { immediate: true });

// Password State
const isPasswordOpen = ref(false);
const passwordError = ref('');
const isUnlocking = ref(false);
const pendingFileName = ref('');
let pendingFileObj = null;
let unlockedPassword = '';

let page1Canvas = null;

function onFileSelected(e) {
  const file = e.target.files[0];
  if (file) loadFile(file);
  e.target.value = '';
}

function onDrop(e) {
  isDragOver.value = false;
  const file = e.dataTransfer.files[0];
  if (file && file.type === 'application/pdf') loadFile(file);
}

function handleVaultFilesSelected(selectedFiles) {
  isVaultPickerOpen.value = false;
  if (!selectedFiles || selectedFiles.length === 0) return;
  const file = selectedFiles[0];
  if (file) {
    loadFile(file);
  }
}

async function loadFile(file, password = '') {
  isLoading.value = true;
  filename.value = file.name;
  pendingFileName.value = file.name;
  pendingFileObj = file;

  customOutputBaseName.value = generateExportFileName(file.name, 'Watermarked');
  showNextActions.value = false;
  lastExportedFile.value = null;

  const rawBuffer = await file.arrayBuffer();

  // Strict encryption detection & validation
  const security = await verifyPdfSecurity(rawBuffer, password);
  if (security.isEncrypted && !security.isValid) {
    isLoading.value = false;
    isUnlocking.value = false;
    docBytes.value = null;
    isPasswordOpen.value = true;
    if (password) {
      passwordError.value = t('pwd_error_wrong');
    }
    return;
  }

  docBytes.value = new Uint8Array(rawBuffer);

  try {
    const pdfDataForViewer = new Uint8Array(rawBuffer.slice(0));
    const loadingTask = pdfjsLib.getDocument({ 
      data: pdfDataForViewer,
      password: password || undefined,
      cMapUrl: '/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: '/standard_fonts/'
    });
    
    const pdf = await loadingTask.promise;
    totalPages.value = pdf.numPages;
    const page1 = await pdf.getPage(1);
    const viewport = page1.getViewport({ scale: 1.0 });

    page1Canvas = document.createElement('canvas');
    const ctx = page1Canvas.getContext('2d');
    page1Canvas.width = viewport.width;
    page1Canvas.height = viewport.height;
    await page1.render({ canvasContext: ctx, viewport }).promise;

    unlockedPassword = password;
    isPasswordOpen.value = false;
    passwordError.value = '';

    renderPreview();
  } catch (err) {
    if (err.name === 'PasswordException' || err.message?.toLowerCase().includes('password')) {
      docBytes.value = null;
      isPasswordOpen.value = true;
      if (password) {
        passwordError.value = t('pwd_error_wrong');
      }
    } else {
      alert('Failed to load PDF: ' + err.message);
    }
  } finally {
    isLoading.value = false;
    isUnlocking.value = false;
    await nextTick();
    renderPreview();
  }
}

async function handlePasswordSubmit(pwd) {
  if (!pendingFileObj) return;
  isUnlocking.value = true;
  await loadFile(pendingFileObj, pwd);
}

function handlePasswordCancel() {
  isPasswordOpen.value = false;
  passwordError.value = '';
  pendingFileObj = null;
  reset();
}

function setAngle(deg) {
  wmAngle.value = deg;
  renderPreview();
}

function setColor(hex) {
  wmColor.value = hex;
  renderPreview();
}

function renderPreview() {
  if (!page1Canvas || !previewCanvasRef.value) return;

  const canvas = previewCanvasRef.value;
  const ctx = canvas.getContext('2d');
  canvas.width = page1Canvas.width;
  canvas.height = page1Canvas.height;

  // 1. Draw page 1 original content
  ctx.drawImage(page1Canvas, 0, 0);

  // 2. Draw watermark layer on top
  const text = wmText.value.trim();
  if (!text) return;

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((wmAngle.value * Math.PI) / 180);
  ctx.font = `bold ${wmSize.value * 1.2}px "PingFang SC", "Microsoft YaHei", "SimHei", "Heiti SC", sans-serif`;
  ctx.fillStyle = wmColor.value;
  ctx.globalAlpha = wmOpacity.value / 100;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function reset() {
  docBytes.value = null;
  filename.value = '';
  totalPages.value = 0;
  page1Canvas = null;
  unlockedPassword = '';
  showNextActions.value = false;
  lastExportedFile.value = null;
  progressPercent.value = 0;
  progressMessage.value = '';
  cachedPdfBlob = null;
  cachedPdfName = '';
}

async function generateWatermarkedBytes() {
  if (!docBytes.value) return null;
  const preserveWatermarks = userSettings.preserveWatermarks !== false;
  
  progressPercent.value = 5;
  progressMessage.value = t('wm_progress_stamping', { current: 1, total: totalPages.value || 1 });
  await new Promise(resolve => setTimeout(resolve, 0));

  const pdfDoc = await loadCleanPdfDocument(docBytes.value, {
    password: unlockedPassword || '',
    preserveWatermarks
  });

  const pages = pdfDoc.getPages();
  const text = wmText.value.trim();
  if (text) {
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      progressPercent.value = Math.round(((i + 1) / pages.length) * 80);
      progressMessage.value = t('wm_progress_stamping', { current: i + 1, total: pages.length });
      // Yield to event loop for smooth UI animation
      await new Promise(resolve => setTimeout(resolve, 0));

      const { width, height } = page.getSize();
      
      // High-DPI transparent canvas watermark layer supporting all languages (Chinese, English, etc.)
      const scale = 2;
      const stampCanvas = document.createElement('canvas');
      stampCanvas.width = width * scale;
      stampCanvas.height = height * scale;
      const sctx = stampCanvas.getContext('2d');

      sctx.save();
      sctx.scale(scale, scale);
      sctx.translate(width / 2, height / 2);
      sctx.rotate((wmAngle.value * Math.PI) / 180);
      sctx.font = `bold ${wmSize.value}px "PingFang SC", "Microsoft YaHei", "SimHei", "Heiti SC", sans-serif`;
      sctx.fillStyle = wmColor.value;
      sctx.globalAlpha = wmOpacity.value / 100;
      sctx.textAlign = 'center';
      sctx.textBaseline = 'middle';
      sctx.fillText(text, 0, 0);
      sctx.restore();

      const pngBlob = await new Promise(resolve => stampCanvas.toBlob(resolve, 'image/png'));
      const pngBuffer = await pngBlob.arrayBuffer();
      const pngImage = await pdfDoc.embedPng(pngBuffer);

      page.drawImage(pngImage, {
        x: 0,
        y: 0,
        width,
        height
      });
    }
  }

  progressPercent.value = 85;
  progressMessage.value = t('wm_progress_saving', 'Packaging and finalizing watermarked PDF...');
  await new Promise(resolve => setTimeout(resolve, 0));

  let outBytes = await pdfDoc.save();

  let outName = (customOutputBaseName.value.trim() || generateExportFileName(filename.value, 'Watermarked'));
  if (!outName.toLowerCase().endsWith('.pdf')) {
    outName += '.pdf';
  }

  progressPercent.value = 100;
  return { outBytes, outName, pageCount: pages.length };
}

async function executeWatermark() {
  if (!docBytes.value) return;
  isProcessing.value = true;
  try {
    const result = await generateWatermarkedBytes();
    if (!result) return;
    const { outBytes, outName, pageCount } = result;

    const pdfBlob = new Blob([outBytes], { type: 'application/pdf' });
    cachedPdfBlob = pdfBlob;
    cachedPdfName = outName;

    triggerDownload(pdfBlob, outName);

    const ab = outBytes.buffer ? outBytes.buffer.slice(outBytes.byteOffset, outBytes.byteOffset + outBytes.byteLength) : outBytes;

    lastExportedFile.value = {
      name: outName,
      size: outBytes.byteLength || outBytes.length,
      arrayBuffer: ab,
      blob: pdfBlob
    };
    showNextActions.value = true;

    // Auto-save to Vault if checked
    if (autoSaveToVault.value) {
      try {
        await saveFile({
          name: outName,
          arrayBuffer: ab,
          folderId: 'default',
          category: 'export',
          pageCount,
          isEncrypted: false
        });
        logger.info('VAULT', `Watermarked result auto-saved to Vault: ${outName}`);
      } catch (e) {
        logger.warn('VAULT', `Failed to auto-save to Vault: ${e.message}`);
      }
    }
  } catch (err) {
    logger.error('WATERMARK', `Watermark execution failed: ${err.message}`);
    alert('Failed to stamp watermark: ' + err.message);
  } finally {
    isProcessing.value = false;
  }
}

function checkIncomingFile() {
  const incoming = consumePendingFile('watermark');
  if (incoming) {
    const file = new File([incoming.arrayBuffer], incoming.name, { type: 'application/pdf' });
    loadFile(file, incoming.password || '');
  }
}

onMounted(checkIncomingFile);
onActivated(() => {
  checkIncomingFile();
  if (docBytes.value && !lastExportedFile.value) {
    nextTick(() => {
      renderPreview();
    });
  }
});
</script>
