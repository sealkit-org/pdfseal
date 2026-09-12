<template>
  <section class="w-full flex-1 flex flex-col">
    <!-- Main Assembly Container -->
    <div class="bg-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-100 flex flex-col flex-1">
      <!-- Top Title Header -->
      <div class="flex items-center justify-between pb-3.5 border-b border-slate-100 shrink-0">
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
            <span>{{ t('merge_btn_from_local') || 'Add from Computer' }}</span>
          </button>

          <!-- From Local Vault -->
          <button 
            type="button" 
            @click="isVaultPickerOpen = true"
            class="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-slate-400 text-xs font-bold px-5 py-2.5 rounded-xl transition flex items-center space-x-2 shadow-2xs cursor-pointer"
          >
            <FolderLock class="w-4 h-4 text-amber-600" />
            <span>{{ t('merge_btn_from_vault') || 'Pick from Vault' }}</span>
          </button>
        </div>
      </div>

      <!-- 2. ACTIVE COMPRESSION WORKSPACE OR UNIFIED RESULT DELIVERY -->
      <div v-else class="flex-1 flex flex-col justify-between pt-3 sm:pt-3.5">
        <!-- 2A. Unified Result Delivery View upon Completion -->
        <ResultDeliveryView 
          v-if="lastExportedFile && !isProcessing"
          :file="lastExportedFile"
          source-tool="compress"
          :page-count="totalPages"
          @redownload="handleReDownload"
          @new-task="reset"
          @back-to-edit="handleBackToEdit"
          @send-to-tool="(tId) => emit('send-to-tool', tId)"
        >
          <template #extra-actions>
            <button 
              v-if="originalThumbnailUrl && compressedThumbnailUrl"
              type="button" 
              @click="isDiffModalOpen = true"
              class="text-xs font-bold text-indigo-700 bg-white hover:bg-indigo-50/90 px-3 py-1.5 rounded-xl border border-indigo-200/90 shadow-2xs hover:shadow-xs transition cursor-pointer flex items-center space-x-1.5 active:scale-98"
            >
              <Eye class="w-4 h-4 text-indigo-600" />
              <span>{{ t('compress_btn_view_diff') }}</span>
            </button>
          </template>

          <template #metrics>
            <span class="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80 shadow-2xs">
              {{ originalSizeMb }} MB ➔ {{ compressedSizeMb }} MB (-{{ savedPercent }}%)
            </span>
          </template>
        </ResultDeliveryView>

        <!-- 2B. Interactive Compression Settings Workspace & Bottom Execution Bar -->
        <div v-else class="flex-1 flex flex-col justify-between min-h-0">
          <div class="space-y-2.5 sm:space-y-3">
            <!-- Top Loaded File Summary Bar (with integrated smart detection badge) -->
            <div class="flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/80">
              <div class="flex items-center space-x-3 min-w-0 flex-1">
                <div class="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0">
                  PDF
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center space-x-2 flex-wrap gap-y-1">
                    <p class="text-xs font-bold text-slate-800 truncate max-w-xs sm:max-w-sm" :title="filename">
                      {{ filename }}
                    </p>
                    <!-- Smart Auto-Detection Inline Badge -->
                    <span 
                      v-if="detectedType" 
                      :class="[
                        'inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 border transition',
                        detectedType === 'vector' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      ]"
                      :title="detectedType === 'vector' ? t('compress_detected_vector') : t('compress_detected_scanned')"
                    >
                      <Sparkles class="w-2.5 h-2.5" />
                      <span>{{ detectedType === 'vector' ? t('compress_badge_vector', 'Vector') : t('compress_badge_scanned', 'Scanned') }}</span>
                    </span>
                  </div>
                  <div class="flex items-center space-x-2 text-[11px] text-slate-400 font-mono mt-0.5 flex-wrap">
                    <span class="font-bold text-slate-600">{{ originalSizeMb }} MB</span>
                    <span>•</span>
                    <span>{{ totalPages }} {{ t('pages_label') || 'pages' }}</span>
                    <template v-if="detectedType">
                      <span class="text-slate-300">•</span>
                      <span class="text-slate-500 font-sans text-[10.5px]">
                        {{ detectedType === 'vector' ? t('compress_detected_vector_short') : t('compress_detected_scanned_short') }}
                      </span>
                    </template>
                  </div>
                </div>
              </div>

              <!-- Replace Button -->
              <button 
                @click="reset" 
                class="text-xs text-slate-500 hover:text-slate-800 font-semibold px-2.5 py-1.5 rounded-xl hover:bg-slate-200/60 transition cursor-pointer shrink-0 ml-2"
              >
                {{ t('btn_reset_file') || 'Reset / Change File' }}
              </button>
            </div>

            <!-- Compression Preset Selector Cards (4 Options) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                <!-- 1. Balanced Compression (Recommended) -->
                <div 
                  @click="selectedLevel = 'balanced'"
                  :class="[
                    'p-3 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between relative select-none',
                    selectedLevel === 'balanced' 
                      ? 'border-amber-500 bg-amber-50/40 shadow-sm' 
                      : 'border-slate-200 hover:border-amber-300 bg-white'
                  ]"
                >
                  <div>
                    <div class="flex items-start justify-between gap-1.5 mb-1">
                      <div class="flex items-start space-x-1.5 min-w-0 flex-1">
                        <span class="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1"></span>
                        <span class="text-xs sm:text-sm font-extrabold text-slate-800 leading-snug">
                          {{ t('compress_mode_balanced_title') }}
                        </span>
                      </div>
                      <span class="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded-md shrink-0 whitespace-nowrap">
                        -50% ~ -75%
                      </span>
                    </div>
                    <p class="text-[11px] text-slate-500 font-medium leading-relaxed">
                      {{ t('compress_mode_balanced_desc') }}
                    </p>
                  </div>
                  <div class="text-[10px] font-mono text-slate-400 mt-2 font-semibold">
                    ~200-300 DPI
                  </div>
                </div>

                <!-- 2. Extreme Compression -->
                <div 
                  @click="selectedLevel = 'extreme'"
                  :class="[
                    'p-3 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between relative select-none',
                    selectedLevel === 'extreme' 
                      ? 'border-amber-500 bg-amber-50/40 shadow-sm' 
                      : 'border-slate-200 hover:border-amber-300 bg-white'
                  ]"
                >
                  <div>
                    <div class="flex items-start justify-between gap-1.5 mb-1">
                      <div class="flex items-start space-x-1.5 min-w-0 flex-1">
                        <span class="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1"></span>
                        <span class="text-xs sm:text-sm font-extrabold text-slate-800 leading-snug">
                          {{ t('compress_mode_extreme_title') }}
                        </span>
                      </div>
                      <span class="text-[10px] font-bold text-rose-700 bg-rose-100/80 px-1.5 py-0.5 rounded-md shrink-0 whitespace-nowrap">
                        -75% ~ -90%
                      </span>
                    </div>
                    <p class="text-[11px] text-slate-500 font-medium leading-relaxed">
                      {{ t('compress_mode_extreme_desc') }}
                    </p>
                  </div>
                  <div class="text-[10px] font-mono text-slate-400 mt-2 font-semibold">
                    ~120-150 DPI
                  </div>
                </div>

                <!-- 3. Target Size Approximation (Sprint 3.2 Feature) -->
                <div 
                  @click="selectedLevel = 'target'"
                  :class="[
                    'p-3 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between relative select-none',
                    selectedLevel === 'target' 
                      ? 'border-amber-500 bg-amber-50/40 shadow-sm' 
                      : 'border-slate-200 hover:border-amber-300 bg-white'
                  ]"
                >
                  <div>
                    <div class="flex items-start justify-between gap-1.5 mb-1">
                      <div class="flex items-start space-x-1.5 min-w-0 flex-1">
                        <span class="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1"></span>
                        <span class="text-xs sm:text-sm font-extrabold text-slate-800 leading-snug">
                          {{ t('compress_mode_target_title') }}
                        </span>
                      </div>
                      <span class="text-[10px] font-bold text-indigo-700 bg-indigo-100/80 px-1.5 py-0.5 rounded-md shrink-0 whitespace-nowrap">
                        ≤ {{ targetSizeMb }} MB
                      </span>
                    </div>
                    <p class="text-[11px] text-slate-500 font-medium leading-relaxed">
                      {{ t('compress_mode_target_desc') }}
                    </p>
                  </div>
                  <div class="text-[10px] font-mono text-indigo-600 mt-2 font-bold flex items-center space-x-1">
                    <Target class="w-3 h-3" />
                    <span>{{ t('compress_target_badge') }}</span>
                  </div>
                </div>

                <!-- 4. Lossless Optimization -->
                <div 
                  @click="selectedLevel = 'lossless'"
                  :class="[
                    'p-3 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between relative select-none',
                    selectedLevel === 'lossless' 
                      ? 'border-amber-500 bg-amber-50/40 shadow-sm' 
                      : 'border-slate-200 hover:border-amber-300 bg-white'
                  ]"
                >
                  <div>
                    <div class="flex items-start justify-between gap-1.5 mb-1">
                      <div class="flex items-start space-x-1.5 min-w-0 flex-1">
                        <span class="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1"></span>
                        <span class="text-xs sm:text-sm font-extrabold text-slate-800 leading-snug">
                          {{ t('compress_mode_lossless_title') }}
                        </span>
                      </div>
                      <span class="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded-md shrink-0 whitespace-nowrap">
                        100% {{ t('compress_badge_lossless_ratio', 'Lossless') }}
                      </span>
                    </div>
                    <p class="text-[11px] text-slate-500 font-medium leading-relaxed">
                      {{ t('compress_mode_lossless_desc') }}
                    </p>
                  </div>
                  <div class="text-[10px] font-mono text-slate-400 mt-2 font-semibold">
                    {{ t('compress_lossless_hint') }}
                  </div>
                </div>
            </div>

            <!-- Target Size Configuration Drawer (When 'target' mode is active) -->
            <div 
              v-if="selectedLevel === 'target'"
              class="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50/70 via-blue-50/50 to-indigo-50/70 border border-indigo-200/80 animate-in fade-in slide-in-from-top-2 duration-200"
            >
              <div class="flex flex-wrap items-center justify-between gap-2.5">
                <!-- Left: Target Size Input & Explanation -->
                <div class="flex items-center space-x-2.5 flex-wrap gap-y-1.5">
                  <div class="flex items-center space-x-1.5">
                    <Target class="w-4 h-4 text-indigo-600 shrink-0" />
                    <label class="text-xs font-bold text-indigo-950 shrink-0">
                      {{ t('compress_target_label') }}:
                    </label>
                  </div>

                  <!-- Number Stepper Input -->
                  <div class="flex items-center shadow-2xs">
                    <input 
                      type="number" 
                      v-model.number="targetSizeMb" 
                      min="0.1" 
                      max="100" 
                      step="0.1"
                      class="w-20 sm:w-24 text-xs font-mono font-bold px-2.5 py-1.5 bg-white border border-indigo-200 rounded-l-xl focus:ring-2 focus:ring-indigo-500 outline-hidden text-slate-800"
                    />
                    <span class="text-xs font-bold bg-indigo-100/80 text-indigo-800 border border-indigo-200 border-l-0 px-2.5 py-1.5 rounded-r-xl select-none">
                      MB
                    </span>
                  </div>

                  <!-- Quick Preset Chips -->
                  <div class="flex items-center space-x-1 sm:space-x-1.5">
                    <button 
                      v-for="preset in [1, 2, 5, 10]" 
                      :key="preset"
                      type="button"
                      @click="targetSizeMb = preset"
                      :class="[
                        'text-[11px] font-bold px-2 py-1 rounded-lg border transition cursor-pointer',
                        targetSizeMb === preset 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs' 
                          : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                      ]"
                    >
                      {{ preset }} MB
                    </button>
                  </div>
                </div>

                <!-- Right: Calculation & Guidance Hint -->
                <div class="text-[11px] text-indigo-700/90 font-medium">
                  <span v-if="parseFloat(originalSizeMb) <= targetSizeMb" class="text-emerald-700 font-semibold">
                    ✓ {{ t('compress_target_smaller_hint', 'Original is already smaller than target; will optimize structure losslessly!') }}
                  </span>
                  <span v-else>
                    {{ t('compress_target_shrink_hint', 'Will dynamically search best quality setting to satisfy ≤ target MB.') }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Scanned Doc Lossless Warning Tip -->
            <div 
              v-if="detectedType === 'scanned' && selectedLevel === 'lossless'" 
              class="p-2.5 sm:p-3 rounded-xl bg-amber-50/90 border border-amber-200 text-xs text-amber-900 flex items-start space-x-2 animate-in fade-in duration-200"
            >
              <Sparkles class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p class="leading-relaxed">
                💡 <strong>{{ t('compress_scanned_warn_title', 'Scanned Document Hint') }}</strong>: {{ t('compress_scanned_warn_desc', 'This document consists mostly of images. "Lossless" mode will NOT compress image pixels. To significantly reduce size, please switch to "High Quality (200~300 DPI)", which preserves print quality while shrinking the file by 50%~75%!') }}
              </p>
            </div>

            <!-- Progress Bar during compression -->
            <div v-if="isProcessing" class="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 animate-in fade-in duration-200">
              <div class="flex items-center justify-between text-xs font-bold text-amber-900 mb-1.5">
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
          <div class="shrink-0 pt-3 sm:pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
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
              class="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold px-6 py-2.5 rounded-xl transition flex items-center justify-center space-x-2 shadow-md hover:shadow-amber-600/25 cursor-pointer ml-auto"
            >
              <Loader2 v-if="isProcessing" class="w-4 h-4 animate-spin" />
              <Minimize2 v-else class="w-4 h-4" />
              <span>{{ t('compress_btn_action') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <DiffPreviewModal 
      :is-open="isDiffModalOpen"
      :original-thumbnail-url="originalThumbnailUrl"
      :compressed-thumbnail-url="compressedThumbnailUrl"
      :original-size-mb="originalSizeMb"
      :compressed-size-mb="compressedSizeMb"
      :saved-percent="savedPercent"
      @close="isDiffModalOpen = false"
    />

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
  Loader2,
  Eye,
  CheckCircle2,
  Download,
  Target
} from 'lucide-vue-next';
import * as pdfjsLib from 'pdfjs-dist';
import { t } from '../i18n';
import { triggerDownload } from '../utils/download';
import { verifyPdfSecurity } from '../utils/pdfSecurity';
import { detectDocumentType, compressPdf, renderPdfPagePreview } from '../utils/pdfCompress';
import { consumePendingFile } from '../utils/toolBridge';
import { saveFile } from '../utils/vaultDb';
import { userSettings } from '../utils/userSettings';
import { logger } from '../utils/logger';
import { generateExportFileName } from '../utils/filenameUtils';
import PasswordModal from '../components/PasswordModal.vue';
import VaultFilePickerModal from '../components/VaultFilePickerModal.vue';
import NextActionBanner from '../components/NextActionBanner.vue';
import DiffPreviewModal from '../components/DiffPreviewModal.vue';
import ResultDeliveryView from '../components/ResultDeliveryView.vue';

const emit = defineEmits(['send-to-tool']);

const fileInputRef = ref(null);
const docBytes = ref(null);
const filename = ref('');
const totalPages = ref(0);
const isDragOver = ref(false);
const isProcessing = ref(false);
const isVaultPickerOpen = ref(false);

const originalSizeMb = ref('0.00');
const compressedSizeMb = ref('0.00');
const savedPercent = ref(0);
const detectedType = ref(null); // 'vector' | 'scanned'
const selectedLevel = ref('balanced'); // 'extreme' | 'balanced' | 'target' | 'lossless'
const targetSizeMb = ref(2.0);

// Diff Preview Modal & Thumbnails State
const isDiffModalOpen = ref(false);
const originalThumbnailUrl = ref('');
const compressedThumbnailUrl = ref('');

// Progress
const progressPercent = ref(0);
const progressMessage = ref('');

// Export options
const customOutputBaseName = ref('');
const autoSaveToVault = ref(userSettings.autoSaveToVault);

// Next Action Relay State
const lastExportedFile = ref(null);
const showNextActions = ref(false);

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
  return generateExportFileName(filename.value, 'Compressed');
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
  showNextActions.value = false;
  lastExportedFile.value = null;
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

  customOutputBaseName.value = generateExportFileName(file.name, 'Compressed');

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

  // Render high-res thumbnail of Page 1 for Before/After Diff comparison
  originalThumbnailUrl.value = '';
  compressedThumbnailUrl.value = '';
  try {
    originalThumbnailUrl.value = await renderPdfPagePreview(rawBuffer, 1, 1.5, password);
  } catch (e) {
    originalThumbnailUrl.value = '';
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
  compressedSizeMb.value = '0.00';
  savedPercent.value = 0;
  detectedType.value = null;
  unlockedPassword = '';
  customOutputBaseName.value = '';
  progressPercent.value = 0;
  progressMessage.value = '';
  showNextActions.value = false;
  lastExportedFile.value = null;
  originalThumbnailUrl.value = '';
  compressedThumbnailUrl.value = '';
  isDiffModalOpen.value = false;
}

function handleReDownload() {
  if (!lastExportedFile.value) return;
  triggerDownload(
    new Blob([lastExportedFile.value.arrayBuffer], { type: 'application/pdf' }),
    lastExportedFile.value.name
  );
}

function handleBackToEdit() {
  lastExportedFile.value = null;
  showNextActions.value = false;
}

async function executeCompress() {
  if (!docBytes.value) return;
  isProcessing.value = true;
  progressPercent.value = 10;
  progressMessage.value = t('compress_status_processing');

  try {
    const onProgress = (current, total) => {
      if (typeof total === 'string') {
        progressPercent.value = Math.min(95, Math.max(10, Math.round(Number(current) || 10)));
        progressMessage.value = total;
      } else if (typeof current === 'number' && typeof total === 'number' && total > 0) {
        progressPercent.value = Math.min(95, Math.round((current / total) * 90) + 10);
        progressMessage.value = `${t('compress_status_processing')} (${current}/${total})`;
      } else if (typeof current === 'number') {
        progressPercent.value = Math.min(95, Math.max(10, Math.round(current)));
        progressMessage.value = t('compress_status_processing');
      }
    };

    const compressedBytes = await compressPdf(
      docBytes.value, 
      selectedLevel.value, 
      { 
        password: unlockedPassword,
        targetSizeMb: targetSizeMb.value 
      }, 
      onProgress
    );

    progressPercent.value = 100;

    let outName = (customOutputBaseName.value.trim() || generateExportFileName(filename.value, 'Compressed'));
    if (!outName.toLowerCase().endsWith('.pdf')) {
      outName += '.pdf';
    }

    triggerDownload(new Blob([compressedBytes], { type: 'application/pdf' }), outName);

    lastExportedFile.value = {
      name: outName,
      arrayBuffer: compressedBytes,
      size: compressedBytes.byteLength
    };
    showNextActions.value = true;

    compressedSizeMb.value = (compressedBytes.byteLength / (1024 * 1024)).toFixed(2);
    savedPercent.value = Math.max(0, Math.round((1 - compressedBytes.byteLength / docBytes.value.byteLength) * 100));
    logger.info('COMPRESS', `Compressed ${filename.value} (${originalSizeMb.value} MB -> ${compressedSizeMb.value} MB, saved ${savedPercent.value}%)`);

    // Render Page 1 thumbnail of compressed PDF for Diff comparison slider
    try {
      compressedThumbnailUrl.value = await renderPdfPagePreview(compressedBytes, 1, 1.5, unlockedPassword);
    } catch (e) {
      compressedThumbnailUrl.value = '';
    }

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
