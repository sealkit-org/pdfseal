<template>
  <section class="w-full flex-1 flex flex-col">
    <!-- Main Assembly Container -->
    <div class="bg-white rounded-3xl p-5 sm:p-7 shadow-xl border border-slate-100 flex flex-col flex-1">
      <!-- Top Title Header -->
      <div class="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0 shadow-2xs">
            <Unlock class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
              {{ t('unlock_title') }}
            </h2>
            <p class="text-xs text-slate-400 font-medium hidden sm:block mt-0.5">
              {{ t('unlock_desc') }}
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
          isDragOver ? 'border-emerald-500 bg-emerald-50/50 scale-[0.99]' : 'border-slate-200 hover:border-emerald-400 bg-slate-50/50'
        ]"
      >
        <input 
          ref="fileInputRef" 
          type="file" 
          accept="application/pdf" 
          class="hidden" 
          @change="onFileSelected" 
        >

        <div class="w-16 h-16 bg-emerald-100/60 text-emerald-600 rounded-3xl flex items-center justify-center mb-4 shadow-sm">
          <Unlock class="w-8 h-8" />
        </div>
        <h3 class="text-base sm:text-lg font-bold text-slate-800">
          {{ t('unlock_drop_title') }}
        </h3>
        <p class="text-xs text-slate-400 mt-1 max-w-sm">
          {{ t('unlock_drop_subtitle') }}
        </p>

        <!-- Dual-Source Import Action Buttons -->
        <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
          <!-- From Local Computer -->
          <button 
            type="button" 
            @click="fileInputRef.click()"
            class="bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition flex items-center space-x-2 shadow-md hover:shadow-emerald-600/25 cursor-pointer"
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
            <FolderLock class="w-4 h-4 text-emerald-600" />
            <span>{{ t('merge_btn_from_vault') || 'Pick from Vault' }}</span>
          </button>
        </div>
      </div>

      <!-- 2. ACTIVE UNLOCK WORKSPACE -->
      <div v-else class="flex-1 flex flex-col justify-between pt-4">
        <div class="space-y-4">
          <!-- File Summary Card -->
          <div class="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/80">
            <div class="flex items-center space-x-3 min-w-0">
              <div class="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                PDF
              </div>
              <div class="min-w-0">
                <p class="text-xs font-bold text-slate-800 truncate max-w-xs sm:max-w-md" :title="filename">
                  {{ filename }}
                </p>
                <div class="flex items-center space-x-2 text-[11px] text-slate-400 font-mono mt-0.5">
                  <span class="font-bold text-slate-600">{{ originalSizeMb }} MB</span>
                  <span>•</span>
                  <span>{{ totalPages }} {{ t('pages_label') || 'pages' }}</span>
                </div>
              </div>
            </div>

            <!-- Replace Button -->
            <button 
              @click="reset" 
              class="text-xs text-slate-500 hover:text-slate-800 font-semibold px-2.5 py-1.5 rounded-xl hover:bg-slate-200/60 transition cursor-pointer"
            >
              {{ t('btn_reset_file') || 'Reset / Change File' }}
            </button>
          </div>

          <!-- Security Status & Decryption Input Card -->
          <div class="p-4 rounded-2xl border bg-slate-50/60 border-slate-200 space-y-3">
            <!-- Case 1: Unencrypted file -->
            <div v-if="!isEncrypted" class="flex items-center space-x-2.5 text-xs text-slate-600 font-medium p-3 rounded-xl bg-white border border-slate-200/80">
              <CheckCircle2 class="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{{ t('unlock_status_unencrypted') }}</span>
            </div>

            <!-- Case 2: Owner restriction only (no open password needed) -->
            <div v-else-if="isOwnerOnly" class="flex items-start space-x-2.5 text-xs text-emerald-800 font-medium p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <Sparkles class="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{{ t('unlock_status_owner_only') }}</span>
            </div>

            <!-- Case 3: Open Password Required -->
            <div v-else class="space-y-2">
              <div class="flex items-center space-x-2 text-xs font-bold text-amber-800">
                <Lock class="w-4 h-4 text-amber-600 shrink-0" />
                <span>{{ t('unlock_prompt_full', 'This document is protected by an open password. Please enter the password to completely remove restrictions:') }}</span>
              </div>
              <div class="relative">
                <input 
                  v-model="inputPassword"
                  :type="showPassword ? 'text' : 'password'"
                  :placeholder="t('unlock_pwd_placeholder')"
                  @keydown.enter="executeUnlock"
                  class="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2.5 pr-10 focus:ring-2 focus:ring-emerald-500 outline-hidden font-medium text-slate-800 shadow-2xs"
                >
                <button 
                  type="button"
                  data-testid="toggle-pwd-btn"
                  title="Toggle password visibility"
                  @click="showPassword = !showPassword"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <Eye v-if="!showPassword" class="w-4 h-4" />
                  <EyeOff v-else class="w-4 h-4" />
                </button>
              </div>
              <p v-if="unlockError" class="text-xs text-rose-600 font-semibold flex items-center space-x-1">
                <AlertCircle class="w-3.5 h-3.5 shrink-0" />
                <span>{{ unlockError }}</span>
              </p>
            </div>

            <!-- Legal Authorization Affirmation & Disclaimer (when document is encrypted/restricted) -->
            <div v-if="isEncrypted" class="pt-3 border-t border-slate-200/80 flex items-start space-x-2.5">
              <input 
                type="checkbox" 
                id="unlock-affirmation-checkbox"
                v-model="hasAffirmedRight"
                class="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer mt-0.5 shrink-0"
              >
              <label for="unlock-affirmation-checkbox" class="text-xs text-slate-700 cursor-pointer select-none leading-tight">
                <span class="font-bold text-slate-800">{{ t('unlock_disclaimer_checkbox') }}</span>
                <span class="block text-[11px] text-slate-400 mt-0.5">{{ t('unlock_disclaimer_subtext') }}</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Next Action Relay Banner -->
        <NextActionBanner 
          v-if="showNextActions && lastExportedFile"
          :current-tool="'unlock'"
          :file="lastExportedFile"
          @send-to-tool="(tId) => emit('send-to-tool', tId)"
          @close="showNextActions = false"
          class="mb-3"
        />

        <!-- Bottom Execution & Output Settings Bar -->
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
                class="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-medium text-slate-700 w-44 sm:w-56"
              >
            </div>

            <!-- Auto-save to Vault Checkbox -->
            <label class="flex items-center space-x-1.5 text-xs text-slate-600 cursor-pointer select-none">
              <input 
                type="checkbox" 
                v-model="autoSaveToVault"
                class="w-3.5 h-3.5 rounded-sm border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              >
              <FolderLock class="w-3.5 h-3.5 text-emerald-600" />
              <span>{{ t('vault_autosave_checkbox') }}</span>
            </label>
          </div>

          <!-- Main Unlock Action Button -->
          <button 
            @click="executeUnlock" 
            :disabled="isProcessing || (isEncrypted && !hasAffirmedRight)"
            :class="[
              'w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs sm:text-sm font-bold px-6 py-2.5 rounded-xl transition flex items-center justify-center space-x-2 shadow-md hover:shadow-emerald-600/25',
              (isProcessing || (isEncrypted && !hasAffirmedRight)) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            ]"
          >
            <Loader2 v-if="isProcessing" class="w-4 h-4 animate-spin" />
            <Unlock v-else class="w-4 h-4" />
            <span>{{ t('unlock_btn_action') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Vault File Picker Modal (Single-select mode) -->
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
  Unlock, 
  Plus, 
  Lock, 
  FolderLock, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Loader2 
} from 'lucide-vue-next';
import * as pdfjsLib from 'pdfjs-dist';
import { t } from '../i18n';
import { triggerDownload } from '../utils/download';
import { verifyPdfSecurity, loadCleanPdfDocument } from '../utils/pdfSecurity';
import { consumePendingFile } from '../utils/toolBridge';
import { saveFile } from '../utils/vaultDb';
import { userSettings } from '../utils/userSettings';
import { logger } from '../utils/logger';
import { generateExportFileName } from '../utils/filenameUtils';
import VaultFilePickerModal from '../components/VaultFilePickerModal.vue';
import NextActionBanner from '../components/NextActionBanner.vue';

const emit = defineEmits(['send-to-tool']);

const lastExportedFile = ref(null);
const showNextActions = ref(false);

const fileInputRef = ref(null);
const docBytes = ref(null);
const filename = ref('');
const totalPages = ref(0);
const isDragOver = ref(false);
const isProcessing = ref(false);
const isVaultPickerOpen = ref(false);

const originalSizeMb = ref('0.00');
const isEncrypted = ref(false);
const isOwnerOnly = ref(false);
const inputPassword = ref('');
const showPassword = ref(false);
const unlockError = ref('');
const hasAffirmedRight = ref(false);

// Export settings
const customOutputBaseName = ref('');
const autoSaveToVault = ref(userSettings.autoSaveToVault);

watch(() => userSettings.autoSaveToVault, (newVal) => {
  autoSaveToVault.value = Boolean(newVal);
}, { immediate: true });

const defaultFileNamePlaceholder = computed(() => {
  return generateExportFileName(filename.value, '');
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
  const rawBuffer = await file.arrayBuffer();

  docBytes.value = new Uint8Array(rawBuffer);
  filename.value = file.name;
  originalSizeMb.value = (rawBuffer.byteLength / (1024 * 1024)).toFixed(2);
  inputPassword.value = password;
  unlockError.value = '';
  hasAffirmedRight.value = false;

  customOutputBaseName.value = generateExportFileName(file.name, '');
  showNextActions.value = false;
  lastExportedFile.value = null;

  // Analyze encryption
  const sec = await verifyPdfSecurity(rawBuffer, password);
  isEncrypted.value = sec.isEncrypted;
  isOwnerOnly.value = sec.isEncrypted && !sec.isOpenPasswordRequired;

  // Try to count pages
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
}

function reset() {
  docBytes.value = null;
  filename.value = '';
  totalPages.value = 0;
  originalSizeMb.value = '0.00';
  isEncrypted.value = false;
  isOwnerOnly.value = false;
  inputPassword.value = '';
  unlockError.value = '';
  hasAffirmedRight.value = false;
  customOutputBaseName.value = '';
  showNextActions.value = false;
  lastExportedFile.value = null;
}

async function executeUnlock() {
  if (!docBytes.value) return;
  if (isEncrypted.value && !hasAffirmedRight.value) {
    unlockError.value = t('unlock_err_need_affirmation') || 'Please confirm that you have the legal right to unlock this document';
    return;
  }
  isProcessing.value = true;
  unlockError.value = '';

  try {
    const pwd = inputPassword.value || '';
    if (!isOwnerOnly.value) {
      const sec = await verifyPdfSecurity(docBytes.value, pwd);
      if (sec.isOpenPasswordRequired && !sec.isValid) {
        throw new Error('Incorrect password');
      }
    }
    const cleanDoc = await loadCleanPdfDocument(docBytes.value, pwd);
    const unlockedBytes = await cleanDoc.save({ useObjectStreams: true });

    let outName = (customOutputBaseName.value.trim() || generateExportFileName(filename.value, ''));
    if (!outName.toLowerCase().endsWith('.pdf')) {
      outName += '.pdf';
    }

    triggerDownload(new Blob([unlockedBytes], { type: 'application/pdf' }), outName);
    logger.info('UNLOCK', `PDF unlocked successfully: ${outName}`);

    lastExportedFile.value = {
      name: outName,
      arrayBuffer: unlockedBytes.buffer ? unlockedBytes.buffer.slice(unlockedBytes.byteOffset, unlockedBytes.byteOffset + unlockedBytes.byteLength) : unlockedBytes
    };
    showNextActions.value = true;

    // Auto-save to Vault if checked (with isEncrypted: false)
    if (autoSaveToVault.value) {
      await saveFile({
        name: outName,
        arrayBuffer: unlockedBytes,
        folderId: 'default',
        category: 'export',
        pageCount: totalPages.value,
        isEncrypted: false
      });
      logger.info('VAULT', `Unlocked PDF auto-saved to Vault: ${outName} (isEncrypted=false)`);
    }
  } catch (err) {
    logger.error('UNLOCK', `Unlock failed: ${err.message}`);
    unlockError.value = t('pwd_error_wrong') || 'Incorrect password. Please verify and try again.';
  } finally {
    isProcessing.value = false;
  }
}

function checkIncomingFile() {
  const incoming = consumePendingFile('unlock');
  if (incoming) {
    const file = new File([incoming.arrayBuffer], incoming.name, { type: 'application/pdf' });
    loadFile(file, incoming.password || '');
  }
}

onMounted(checkIncomingFile);
onActivated(checkIncomingFile);
</script>
