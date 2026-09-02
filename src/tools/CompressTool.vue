<template>
  <section class="w-full flex-1 flex flex-col">
    <!-- Main Assembly Container -->
    <div class="bg-white rounded-3xl p-5 sm:p-7 shadow-xl border border-slate-100 flex flex-col flex-1">
      <!-- Top Title Header -->
      <div class="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0 shadow-2xs">
            <Minimize2 class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
              {{ t('compress_title') }}
            </h2>
            <p class="text-xs text-slate-400 font-medium hidden sm:block mt-0.5">
              {{ t('compress_desc') }}
            </p>
          </div>
        </div>

        <div class="text-xs text-slate-400 font-mono hidden md:flex items-center space-x-1.5">
          <Lock class="w-3.5 h-3.5 text-emerald-600" />
          <span>{{ t('processed_locally') }}</span>
        </div>
      </div>

      <!-- 1. EMPTY STATE DROPZONE (Spacious with Dual-Source Import) -->
      <div 
        v-if="!docBytes"
        @dragover.prevent="isDragOver = true"
        @dragleave.prevent="isDragOver = false"
        @drop.prevent="onDrop"
        :class="[
          'flex-1 border-2 border-dashed rounded-3xl p-8 sm:p-14 text-center transition flex flex-col items-center justify-center my-4',
          isDragOver ? 'border-amber-500 bg-amber-50/50 scale-[0.99]' : 'border-slate-200 hover:border-amber-400 bg-slate-50/50'
        ]"
      >
        <input 
          ref="fileInputRef" 
          type="file" 
          accept="application/pdf" 
          class="hidden" 
          @change="onFileSelected" 
        >

        <div class="w-16 h-16 bg-amber-100/60 text-amber-600 rounded-3xl flex items-center justify-center mb-4 shadow-sm">
          <Minimize2 class="w-8 h-8" />
        </div>
        <h3 class="text-base sm:text-lg font-bold text-slate-800">
          {{ t('compress_drop_title') }}
        </h3>
        <p class="text-xs text-slate-400 mt-1 max-w-sm">
          {{ t('compress_drop_subtitle') }}
        </p>

        <!-- Dual-Source Import Action Buttons -->
        <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
          <!-- From Local Computer -->
          <button 
            type="button" 
            @click="fileInputRef.click()"
            class="bg-amber-600 hover:bg-amber-700 active:scale-98 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition flex items-center space-x-2 shadow-md hover:shadow-amber-600/25 cursor-pointer"
          >
            <Plus class="w-4 h-4" />
            <span>{{ t('merge_btn_from_local') || '选择本地 PDF 文件' }}</span>
          </button>

          <!-- From Local Vault -->
          <button 
            type="button" 
            @click="isVaultPickerOpen = true"
            class="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-slate-400 text-xs font-bold px-5 py-2.5 rounded-xl transition flex items-center space-x-2 shadow-2xs cursor-pointer"
          >
            <FolderLock class="w-4 h-4 text-amber-600" />
            <span>{{ t('merge_btn_from_vault') || '从海豹收纳箱中选取' }}</span>
          </button>
        </div>
      </div>

      <!-- 2. ACTIVE COMPRESSION WORKSPACE -->
      <div v-else class="flex-1 flex flex-col justify-between pt-4">
        <div class="space-y-4">
          <!-- Top Loaded File Summary Bar -->
          <div class="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/80">
            <div class="flex items-center space-x-3 min-w-0">
              <div class="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0">
                PDF
              </div>
              <div class="min-w-0">
                <p class="text-xs font-bold text-slate-800 truncate max-w-xs sm:max-w-md" :title="filename">
                  {{ filename }}
                </p>
                <div class="flex items-center space-x-2 text-[11px] text-slate-400 font-mono mt-0.5">
                  <span class="font-bold text-slate-600">{{ originalSizeMb }} MB</span>
                  <span>•</span>
                  <span>{{ totalPages }} {{ t('pages_label') || '页' }}</span>
                </div>
              </div>
            </div>

            <!-- Replace Button -->
            <button 
              @click="reset" 
              class="text-xs text-slate-500 hover:text-slate-800 font-semibold px-2.5 py-1.5 rounded-xl hover:bg-slate-200/60 transition cursor-pointer"
            >
              {{ t('btn_reset_file') || '更换文件' }}
            </button>
          </div>

          <!-- Smart Auto-Detection Banner -->
          <div 
            v-if="detectedType"
            :class="[
              'p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200',
              detectedType === 'vector' 
                ? 'bg-emerald-50/80 border-emerald-200/80 text-emerald-800' 
                : 'bg-amber-50/80 border-amber-200/80 text-amber-900'
            ]"
          >
            <div class="flex items-start space-x-2">
              <Sparkles class="w-4 h-4 shrink-0 mt-0.5" :class="detectedType === 'vector' ? 'text-emerald-600' : 'text-amber-600'" />
              <span class="font-medium">
                {{ detectedType === 'vector' ? t('compress_detected_vector') : t('compress_detected_scanned') }}
              </span>
            </div>
            <span class="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/80 border shrink-0 font-bold">
              {{ detectedType === 'vector' ? 'Vector 矢量文档' : 'Scanned 扫描件' }}
            </span>
          </div>

          <!-- Compression Preset Selector Cards -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <!-- 1. Extreme Compression -->
            <div 
              @click="selectedLevel = 'extreme'"
              :class="[
                'p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between relative select-none',
                selectedLevel === 'extreme' 
                  ? 'border-amber-500 bg-amber-50/40 shadow-sm' 
                  : 'border-slate-200 hover:border-amber-300 bg-white'
              ]"
            >
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <span class="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <span class="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span>{{ t('compress_level_extreme') }}</span>
                  </span>
                  <span class="text-[10px] font-mono font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-200/60">
                    -75% ~ -90%
                  </span>
                </div>
                <p class="text-[11px] text-slate-400 leading-relaxed">
                  {{ t('compress_level_extreme_desc') }}
                </p>
              </div>
            </div>

            <!-- 2. Balanced Compression (Recommended) -->
            <div 
              @click="selectedLevel = 'balanced'"
              :class="[
                'p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between relative select-none',
                selectedLevel === 'balanced' 
                  ? 'border-amber-500 bg-amber-50/40 shadow-sm' 
                  : 'border-slate-200 hover:border-amber-300 bg-white'
              ]"
            >
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <span class="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>{{ t('compress_level_balanced') }}</span>
                  </span>
                  <span class="text-[10px] font-mono font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200/60">
                    -50% ~ -75%
                  </span>
                </div>
                <p class="text-[11px] text-slate-400 leading-relaxed">
                  {{ t('compress_level_balanced_desc') }}
                </p>
              </div>
            </div>

            <!-- 3. Lossless Structure Compression -->
            <div 
              @click="selectedLevel = 'lossless'"
              :class="[
                'p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between relative select-none',
                selectedLevel === 'lossless' 
                  ? 'border-amber-500 bg-amber-50/40 shadow-sm' 
                  : 'border-slate-200 hover:border-amber-300 bg-white'
              ]"
            >
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <span class="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>{{ t('compress_level_lossless') }}</span>
                  </span>
                  <span class="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200/60">
                    -15% ~ -35%
                  </span>
                </div>
                <p class="text-[11px] text-slate-400 leading-relaxed">
                  {{ t('compress_level_lossless_desc') }}
                </p>
              </div>
            </div>
          </div>

          <!-- Scanned Doc Lossless Warning Tip -->
          <div 
            v-if="detectedType === 'scanned' && selectedLevel === 'lossless'" 
            class="p-3 rounded-2xl bg-amber-50/90 border border-amber-200 text-xs text-amber-900 flex items-start space-x-2 animate-in fade-in duration-200"
          >
            <Sparkles class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p class="leading-relaxed">
              💡 <strong>扫描件提示</strong>：当前文档体积 95%+ 为内部照片，<strong>无损模式绝不压缩照片像素</strong>。如需显著缩减体积，推荐切换至 <strong>「高清推荐 (200~300 DPI)」</strong>，既能保持印刷级清晰度，又能减小 50%~75%！
            </p>
          </div>

          <!-- Progress Bar during compression -->
          <div v-if="isProcessing" class="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 animate-in fade-in duration-200">
            <div class="flex items-center justify-between text-xs font-bold text-amber-900 mb-2">
              <span class="flex items-center space-x-2">
                <Loader2 class="w-4 h-4 animate-spin text-amber-600" />
                <span>{{ progressMessage || t('compress_status_processing') }}</span>
              </span>
              <span class="font-mono">{{ progressPercent }}%</span>
            </div>
            <div class="w-full bg-amber-200/60 h-2 rounded-full overflow-hidden">
              <div 
                class="bg-amber-600 h-full transition-all duration-200 rounded-full" 
                :style="{ width: `${progressPercent}%` }"
              ></div>
            </div>
          </div>
        </div>

        <!-- Bottom Execution & Output Settings Bar (Identical to MergeTool) -->
        <div class="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <!-- Output Filename & Vault Auto-Save Setting -->
          <div class="flex flex-wrap items-center gap-3">
            <div class="flex items-center space-x-1.5">
              <label class="text-xs text-slate-500 font-semibold shrink-0">
                {{ t('vault_field_name') }}:
              </label>
              <input 
                v-model="customOutputBaseName"
                type="text" 
                :placeholder="defaultFileNamePlaceholder"
                class="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-hidden font-medium text-slate-700 w-44 sm:w-56"
              >
            </div>

            <!-- Auto-save to Vault Checkbox -->
            <label class="flex items-center space-x-1.5 text-xs text-slate-600 cursor-pointer select-none">
              <input 
                type="checkbox" 
                v-model="autoSaveToVault"
                class="w-3.5 h-3.5 rounded-sm border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
              >
              <FolderLock class="w-3.5 h-3.5 text-amber-600" />
              <span>{{ t('vault_autosave_checkbox') }}</span>
            </label>
          </div>

          <!-- Main Compress Action Button -->
          <button 
            @click="executeCompress" 
            :disabled="isProcessing"
            class="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold px-6 py-2.5 rounded-xl transition flex items-center justify-center space-x-2 shadow-md hover:shadow-amber-600/25 cursor-pointer"
          >
            <Loader2 v-if="isProcessing" class="w-4 h-4 animate-spin" />
            <Minimize2 v-else class="w-4 h-4" />
            <span>{{ t('compress_btn_action') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <PasswordModal 
      :is-open="isPasswordOpen"
      :filename="pendingFileName"
      :error-message="passwordError"
      :is-unlocking="isUnlocking"
      @submit="handlePasswordSubmit"
      @cancel="handlePasswordCancel"
    />

    <VaultFilePickerModal 
      :is-open="isVaultPickerOpen"
      :multiple="false"
      @select-files="handleVaultFilesSelected"
      @close="isVaultPickerOpen = false"
    />
  </section>
</template>

<script setup>
import { ref, computed, watch, onMounted, onActivated } from 'vue';
import { 
  Minimize2, 
  Plus, 
  Lock, 
  FolderLock, 
  Sparkles, 
  Loader2 
} from 'lucide-vue-next';
import * as pdfjsLib from 'pdfjs-dist';
import { t } from '../i18n';
import { triggerDownload } from '../utils/download';
import { verifyPdfSecurity } from '../utils/pdfSecurity';
import { detectDocumentType, compressPdf } from '../utils/pdfCompress';
import { consumePendingFile } from '../utils/toolBridge';
import { saveFile } from '../utils/vaultDb';
import { userSettings } from '../utils/userSettings';
import { logger } from '../utils/logger';
import PasswordModal from '../components/PasswordModal.vue';
import VaultFilePickerModal from '../components/VaultFilePickerModal.vue';

const fileInputRef = ref(null);
const docBytes = ref(null);
const filename = ref('');
const totalPages = ref(0);
const isDragOver = ref(false);
const isProcessing = ref(false);
const isVaultPickerOpen = ref(false);

const originalSizeMb = ref('0.00');
const detectedType = ref(null); // 'vector' | 'scanned'
const selectedLevel = ref('balanced'); // 'extreme' | 'balanced' | 'lossless'

// Progress
const progressPercent = ref(0);
const progressMessage = ref('');

// Export options
const customOutputBaseName = ref('');
const autoSaveToVault = ref(userSettings.autoSaveToVault);

watch(() => userSettings.autoSaveToVault, (newVal) => {
  autoSaveToVault.value = Boolean(newVal);
}, { immediate: true });

// Password State
const isPasswordOpen = ref(false);
const passwordError = ref('');
const isUnlocking = ref(false);
let pendingFileObj = null;
const pendingFileName = ref('');
let unlockedPassword = '';

const defaultFileNamePlaceholder = computed(() => {
  const prefix = userSettings.defaultExportPrefix || 'PDFSeal';
  const base = filename.value ? filename.value.replace(/\.[^/.]+$/, '') : 'Document';
  return `${prefix}_Compressed_${base}`;
});

function onFileSelected(e) {
  const file = e.target.files?.[0];
  if (file) loadFile(file);
  e.target.value = '';
}

function onDrop(e) {
  const file = e.dataTransfer.files?.[0];
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
  pendingFileName.value = file.name;
  pendingFileObj = file;

  const rawBuffer = await file.arrayBuffer();

  // Security check
  const security = await verifyPdfSecurity(rawBuffer, password);
  if (security.isEncrypted && !security.isValid) {
    isPasswordOpen.value = true;
    if (password) {
      passwordError.value = t('pwd_error_wrong');
    }
    return;
  }

  unlockedPassword = password;
  isPasswordOpen.value = false;
  passwordError.value = '';

  docBytes.value = new Uint8Array(rawBuffer);
  filename.value = file.name;
  originalSizeMb.value = (rawBuffer.byteLength / (1024 * 1024)).toFixed(2);

  const prefix = userSettings.defaultExportPrefix || 'PDFSeal';
  const cleanBase = file.name.replace(/\.[^/.]+$/, '');
  customOutputBaseName.value = `${prefix}_Compressed_${cleanBase}`;

  // Read page count via pdf.js
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(rawBuffer.slice(0)),
      password: password || undefined,
      cMapUrl: '/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: '/standard_fonts/'
    });
    const pdf = await loadingTask.promise;
    totalPages.value = pdf.numPages;
  } catch (e) {
    totalPages.value = 1;
  }

  // Run intelligent auto-detection
  try {
    const detection = await detectDocumentType(rawBuffer, password);
    detectedType.value = detection.type;
    // Auto-select mode according to detection
    if (detection.type === 'vector') {
      selectedLevel.value = 'lossless';
    } else {
      selectedLevel.value = 'balanced';
    }
  } catch (e) {
    detectedType.value = 'vector';
    selectedLevel.value = 'balanced';
  }
}

async function handlePasswordSubmit(pwd) {
  if (!pendingFileObj) return;
  isUnlocking.value = true;
  await loadFile(pendingFileObj, pwd);
  isUnlocking.value = false;
}

function handlePasswordCancel() {
  isPasswordOpen.value = false;
  passwordError.value = '';
  pendingFileObj = null;
  reset();
}

function reset() {
  docBytes.value = null;
  filename.value = '';
  totalPages.value = 0;
  originalSizeMb.value = '0.00';
  detectedType.value = null;
  unlockedPassword = '';
  customOutputBaseName.value = '';
  progressPercent.value = 0;
  progressMessage.value = '';
}

async function executeCompress() {
  if (!docBytes.value) return;
  isProcessing.value = true;
  progressPercent.value = 10;
  progressMessage.value = t('compress_status_processing');

  try {
    const onProgress = (current, total) => {
      progressPercent.value = Math.min(95, Math.round((current / total) * 90) + 10);
      progressMessage.value = `${t('compress_status_processing')} (${current}/${total})`;
    };

    const compressedBytes = await compressPdf(
      docBytes.value, 
      selectedLevel.value, 
      { password: unlockedPassword }, 
      onProgress
    );

    progressPercent.value = 100;

    let outName = (customOutputBaseName.value.trim() || `PDFSeal_Compressed_${Date.now()}`);
    if (!outName.toLowerCase().endsWith('.pdf')) {
      outName += '.pdf';
    }

    triggerDownload(new Blob([compressedBytes], { type: 'application/pdf' }), outName);

    const compressedMb = (compressedBytes.byteLength / (1024 * 1024)).toFixed(2);
    const savedPercent = Math.max(0, Math.round((1 - compressedBytes.byteLength / docBytes.value.byteLength) * 100));
    logger.info('COMPRESS', `Compressed ${filename.value} (${originalSizeMb.value} MB -> ${compressedMb} MB, saved ${savedPercent}%)`);

    // Auto-save to Vault if checked
    if (autoSaveToVault.value) {
      await saveFile({
        name: outName,
        arrayBuffer: compressedBytes,
        folderId: 'default',
        category: 'export',
        pageCount: totalPages.value
      });
      logger.info('VAULT', `Compressed result auto-saved to Vault: ${outName}`);
    }
  } catch (err) {
    logger.error('COMPRESS', `Failed to compress PDF: ${err.message}`);
    alert('Failed to compress PDF: ' + err.message);
  } finally {
    isProcessing.value = false;
    progressPercent.value = 0;
    progressMessage.value = '';
  }
}

function checkIncomingFile() {
  const incoming = consumePendingFile('compress');
  if (incoming) {
    const file = new File([incoming.arrayBuffer], incoming.name, { type: 'application/pdf' });
    loadFile(file, incoming.password || '');
  }
}

onMounted(checkIncomingFile);
onActivated(checkIncomingFile);
</script>
