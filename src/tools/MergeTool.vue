<template>
  <section class="w-full flex-1 flex flex-col">
    <!-- Main Assembly Container -->
    <div class="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-7 shadow-xl border border-slate-100 flex flex-col flex-1">
      <!-- Top Title Header -->
      <div class="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-100 shrink-0">
        <div class="flex items-center space-x-3">
          <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0 shadow-2xs">
            <Files class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
              {{ t('merge_title') }}
            </h2>
            <p class="text-xs text-slate-400 font-medium hidden sm:block mt-0.5">
              {{ t('merge_desc') }}
            </p>
          </div>
        </div>

      </div>

      <!-- 1. EMPTY STATE DROPZONE (Spacious with Dual-Source Import) -->
      <div 
        v-if="files.length === 0"
        @dragover.prevent="isDragOver = true"
        @dragleave.prevent="isDragOver = false"
        @drop.prevent="onDrop"
        :class="[
          'flex-1 border-2 border-dashed rounded-2xl sm:rounded-3xl p-6 sm:p-14 text-center transition flex flex-col items-center justify-center my-3 sm:my-4',
          isDragOver ? 'border-blue-500 bg-blue-50/50 scale-[0.99]' : 'border-slate-200 hover:border-blue-400 bg-slate-50/50'
        ]"
      >
        <input 
          ref="fileInputRef" 
          type="file" 
          multiple 
          accept="application/pdf,.pdf" 
          class="hidden" 
          @change="onFileSelected" 
        >

        <div class="w-14 h-14 sm:w-16 sm:h-16 bg-blue-100/60 text-blue-600 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-3 sm:mb-4 shadow-sm">
          <Files class="w-7 h-7 sm:w-8 sm:h-8" />
        </div>
        <h3 class="text-base sm:text-lg font-bold text-slate-800">
          {{ t('merge_drop_title') }}
        </h3>
        <p class="text-xs text-slate-400 mt-1 max-w-sm hidden sm:block">
          {{ t('merge_drop_subtitle') }}
        </p>

        <!-- Dual-Source Import Action Buttons -->
        <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
          <!-- From Local Computer -->
          <button 
            type="button" 
            @click="fileInputRef.click()"
            class="bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition flex items-center space-x-2 shadow-md hover:shadow-blue-600/25 cursor-pointer"
          >
            <Plus class="w-4 h-4" />
            <span>{{ t('merge_btn_from_local') }}</span>
          </button>

          <!-- From Local Vault -->
          <button 
            type="button" 
            @click="isVaultPickerOpen = true"
            class="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-slate-400 text-xs font-bold px-5 py-2.5 rounded-xl transition flex items-center space-x-2 shadow-2xs cursor-pointer"
          >
            <FolderLock class="w-4 h-4 text-blue-600" />
            <span>{{ t('merge_btn_from_vault') }}</span>
          </button>
        </div>
      </div>

      <!-- 2. ACTIVE ASSEMBLY WORKSPACE OR UNIFIED RESULT DELIVERY -->
      <div v-else class="flex-1 flex flex-col justify-between pt-4">
        <!-- 2A. Unified Processing & Result Delivery View -->
        <ResultDeliveryView 
          v-if="isProcessing || lastExportedFile"
          :is-processing="isProcessing"
          :progress-percent="progressPercent"
          :progress-message="progressMessage"
          :file="lastExportedFile"
          source-tool="merge"
          :page-count="lastExportedPageCount"
          @redownload="handleReDownload"
          @new-task="handleNewTask"
          @back-to-edit="handleBackToEdit"
          @send-to-tool="(tId) => emit('send-to-tool', tId)"
        >
          <template #metrics>
            <span class="inline-flex items-center space-x-1 text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/60 shadow-2xs">
              <Layers class="w-3.5 h-3.5 text-blue-600" />
              <span>{{ t('result_metric_merged', { count: files.length }, `Combined from ${files.length} individual files`) }}</span>
            </span>
          </template>
        </ResultDeliveryView>

        <!-- 2B. Staging Workspace & Bottom Execution Bar -->
        <div v-else class="flex-1 flex flex-col justify-between min-h-0">
          <!-- Assembly Control Bar -->
          <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 shrink-0">
            <div class="flex items-center space-x-2">
              <span class="text-xs sm:text-sm font-extrabold text-slate-800">
                {{ t('merge_selected_title') }} ({{ files.length }})
              </span>
              <span class="text-[11px] text-slate-400 font-medium hidden sm:inline">
                {{ t('merge_selected_hint') }}
              </span>
            </div>

            <!-- Quick Action Buttons -->
            <div class="flex items-center space-x-1.5 sm:space-x-2">
              <!-- Add from Computer -->
              <button 
                @click="fileInputRef.click()"
                class="text-xs text-blue-600 hover:bg-blue-50 font-semibold px-2.5 py-1.5 rounded-xl border border-blue-200 transition flex items-center space-x-1 cursor-pointer"
              >
                <Plus class="w-3.5 h-3.5" />
                <span>{{ t('merge_btn_from_local') }}</span>
              </button>

              <!-- Add from Vault -->
              <button 
                @click="isVaultPickerOpen = true"
                class="text-xs text-slate-700 hover:bg-slate-100 font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 transition flex items-center space-x-1 cursor-pointer"
              >
                <FolderLock class="w-3.5 h-3.5 text-blue-600" />
                <span>{{ t('merge_btn_from_vault') }}</span>
              </button>

              <!-- Reverse Order -->
              <button 
                @click="reverseFiles" 
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
                {{ t('btn_clear_all') }}
              </button>
            </div>
          </div>

          <input 
            ref="fileInputRef" 
            type="file" 
            multiple 
            accept="application/pdf,.pdf" 
            class="hidden" 
            @change="onFileSelected" 
          >

          <!-- Sortable Assembly Cards Board -->
          <div class="flex-1 my-3 overflow-y-auto min-h-[200px] max-h-[calc(100vh-350px)] pr-1 space-y-2">
            <div 
              v-for="(f, idx) in files" 
              :key="f.id || f.name + idx"
              class="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 hover:bg-white border border-slate-200/80 hover:border-blue-300 hover:shadow-md transition cursor-grab active:cursor-grabbing group select-none"
            >
              <!-- Left Info & Sequence -->
              <div class="flex items-center space-x-3 min-w-0 flex-1">
                <!-- Drag Handle -->
                <GripVertical class="w-4 h-4 text-slate-400 group-hover:text-slate-700 shrink-0" />
                
                <!-- Sequence Number -->
                <div class="w-8 h-8 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center font-extrabold text-xs font-mono shrink-0 shadow-2xs">
                  {{ String(idx + 1).padStart(2, '0') }}
                </div>

                <!-- Details -->
                <div class="min-w-0 truncate">
                  <div class="flex items-center space-x-2">
                    <p class="text-xs font-bold text-slate-800 truncate" :title="f.name">
                      {{ f.name }}
                    </p>
                    <!-- Source Indicator -->
                    <span 
                      v-if="f.source === 'vault'" 
                      class="text-[9px] font-bold px-1.5 py-0.2 bg-blue-50 text-blue-700 border border-blue-200/60 rounded-md shrink-0"
                    >
                      🗂️ {{ t('source_vault') }}
                    </span>
                    <span 
                      v-else 
                      class="text-[9px] font-bold px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded-md shrink-0"
                    >
                      💻 {{ t('source_local') }}
                    </span>
                  </div>

                  <div class="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center space-x-2">
                    <span>{{ (f.size / 1024 / 1024).toFixed(2) }} MB</span>
                    <span>•</span>
                    <!-- Encryption / Unlock Badge -->
                    <span 
                      v-if="encryptedFiles.has(f.name)" 
                      class="inline-flex items-center space-x-1 text-emerald-600 font-semibold"
                    >
                      <Unlock class="w-3 h-3 text-emerald-600" />
                      <span>{{ t('state_unlocked') }}</span>
                    </span>
                    <span 
                      v-else 
                      class="text-slate-400"
                    >
                      {{ t('state_no_password') }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Reordering & Removal Controls -->
              <div class="flex items-center space-x-1 shrink-0 ml-3">
                <!-- Move Up -->
                <button 
                  @click.stop="moveUp(idx)" 
                  :disabled="idx === 0"
                  class="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg disabled:opacity-25 disabled:hover:bg-transparent transition cursor-pointer"
                  :title="t('action_move_up', 'Move Up')"
                >
                  <ArrowUp class="w-3.5 h-3.5" />
                </button>

                <!-- Move Down -->
                <button 
                  @click.stop="moveDown(idx)" 
                  :disabled="idx === files.length - 1"
                  class="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg disabled:opacity-25 disabled:hover:bg-transparent transition cursor-pointer"
                  :title="t('action_move_down', 'Move Down')"
                >
                  <ArrowDown class="w-3.5 h-3.5" />
                </button>

                <!-- Remove -->
                <button 
                  @click.stop="removeFile(idx)" 
                  class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer ml-1"
                  :title="t('btn_delete')"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <!-- Bottom Execution & Output Settings Bar -->
          <div class="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <!-- Output Filename & Vault Auto-Save Setting -->
            <div class="flex flex-wrap items-center gap-3">
              <div class="flex items-center space-x-1.5">
                <span class="text-xs text-slate-500 font-semibold shrink-0">{{ t('merge_output_filename') }}:</span>
                <div class="flex items-center shadow-2xs">
                  <input 
                    v-model="customOutputBaseName" 
                    type="text" 
                    placeholder="PDFSeal_Merged"
                    class="text-xs bg-slate-50 border border-slate-200 rounded-l-xl px-3 py-1.5 font-mono focus:ring-2 focus:ring-blue-500 focus:bg-white outline-hidden w-44 sm:w-56 border-r-0"
                  >
                  <span class="bg-slate-100 border border-slate-200 rounded-r-xl px-2.5 py-1.5 text-slate-500 font-mono text-xs select-none font-bold">
                    .pdf
                  </span>
                </div>
              </div>

              <label class="flex items-center space-x-1.5 text-xs text-slate-600 font-semibold cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  v-model="autoSaveToVault" 
                  class="w-4 h-4 text-blue-600 rounded-md border-slate-300 focus:ring-blue-500 cursor-pointer"
                >
                <span>{{ t('merge_save_to_vault_opt') }}</span>
              </label>
            </div>

            <!-- Primary Merge Execution Button -->
            <button 
              :disabled="isProcessing || files.length < 2"
              @click="executeMerge" 
              class="bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs sm:text-sm font-bold px-6 py-2.5 rounded-xl transition flex items-center justify-center space-x-2 shadow-md hover:shadow-blue-600/25 disabled:opacity-50 cursor-pointer ml-auto"
            >
              <Loader2 v-if="isProcessing" class="w-4 h-4 animate-spin" />
              <Layers v-else class="w-4 h-4" />
              <span>{{ isProcessing ? (t('loading') || 'Processing...') : t('seal_and_merge') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Vault File Picker Modal -->
    <VaultFilePickerModal 
      :is-open="isVaultPickerOpen"
      :multiple="true"
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
  Files, Plus, GripVertical, Trash2, Lock, Unlock, Download, 
  Loader2, FolderLock, ArrowUpDown, ArrowUp, ArrowDown, Layers
} from 'lucide-vue-next';
import { PDFDocument } from 'pdf-lib';
import Sortable from 'sortablejs';
import { t } from '../i18n';
import { triggerDownload } from '../utils/download';
import { verifyPdfSecurity, loadCleanPdfDocument } from '../utils/pdfSecurity';
import { consumePendingFile } from '../utils/toolBridge';
import { saveFile } from '../utils/vaultDb';
import PasswordModal from '../components/PasswordModal.vue';
import VaultFilePickerModal from '../components/VaultFilePickerModal.vue';
import NextActionBanner from '../components/NextActionBanner.vue';
import ResultDeliveryView from '../components/ResultDeliveryView.vue';
import { userSettings } from '../utils/userSettings';
import { logger } from '../utils/logger';

const emit = defineEmits(['send-to-tool']);

const workspaceState = inject('workspaceActiveState', null);

const fileInputRef = ref(null);
const files = ref([]);
const filePasswords = ref({});
const encryptedFiles = ref(new Set());
const isDragOver = ref(false);
const isProcessing = ref(false);
const isVaultPickerOpen = ref(false);

watch(() => files.value.length > 0, (active) => {
  workspaceState?.setActiveFile(active);
}, { immediate: true });

onActivated(() => {
  workspaceState?.setActiveFile(files.value.length > 0);
});

const customOutputBaseName = ref(`${userSettings.defaultExportPrefix || 'PDFSeal'}_Merged_${new Date().toISOString().slice(0, 10)}`);
const autoSaveToVault = ref(userSettings.autoSaveToVault !== false);

// Next Action Relay State & Result View
const lastExportedFile = ref(null);
const lastExportedPageCount = ref(0);
const showNextActions = ref(false);
const progressPercent = ref(0);
const progressMessage = ref('');

function handleReDownload() {
  if (!lastExportedFile.value) return;
  triggerDownload(
    new Blob([lastExportedFile.value.arrayBuffer], { type: 'application/pdf' }),
    lastExportedFile.value.name
  );
}

function handleNewTask() {
  clearAll();
  lastExportedFile.value = null;
  lastExportedPageCount.value = 0;
  showNextActions.value = false;
  progressPercent.value = 0;
  progressMessage.value = '';
  customOutputBaseName.value = `${userSettings.defaultExportPrefix || 'PDFSeal'}_Merged_${new Date().toISOString().slice(0, 10)}`;
}

function handleBackToEdit() {
  lastExportedFile.value = null;
  showNextActions.value = false;
  progressPercent.value = 0;
  progressMessage.value = '';
}

watch(() => userSettings.autoSaveToVault, (newVal) => {
  autoSaveToVault.value = Boolean(newVal);
}, { immediate: true });

let sortableInstance = null;

// Password Modal State
const isPasswordOpen = ref(false);
const passwordError = ref('');
const isUnlocking = ref(false);
const pendingFileName = ref('');
let pendingFileObj = null;

function onFileSelected(e) {
  addFiles(e.target.files, 'local');
  e.target.value = '';
}

function onDrop(e) {
  isDragOver.value = false;
  addFiles(e.dataTransfer.files, 'local');
}

function handleVaultFilesSelected(vaultFiles) {
  isVaultPickerOpen.value = false;
  if (vaultFiles && vaultFiles.length > 0) {
    addFiles(vaultFiles, 'vault');
  }
}

async function addFiles(newFiles, defaultSource = 'local') {
  showNextActions.value = false;
  lastExportedFile.value = null;
  const list = Array.from(newFiles || []);
  for (const f of list) {
    if (f.type === 'application/pdf' || f.name.endsWith('.pdf')) {
      f.source = f.source || defaultSource;
      f.id = f.id || 'merge_f_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      files.value.push(f);

      const buffer = await f.arrayBuffer();
      const security = await verifyPdfSecurity(buffer);
      if (security.isEncrypted) {
        encryptedFiles.value.add(f.name);
      }
    }
  }
}

function removeFile(index) {
  const removed = files.value.splice(index, 1)[0];
  if (removed && filePasswords.value[removed.name]) {
    delete filePasswords.value[removed.name];
  }
}

function moveUp(index) {
  if (index <= 0) return;
  const item = files.value.splice(index, 1)[0];
  files.value.splice(index - 1, 0, item);
}

function moveDown(index) {
  if (index >= files.value.length - 1) return;
  const item = files.value.splice(index, 1)[0];
  files.value.splice(index + 1, 0, item);
}

function reverseFiles() {
  files.value.reverse();
}

function clearAll() {
  files.value = [];
  filePasswords.value = {};
  encryptedFiles.value.clear();
  showNextActions.value = false;
  lastExportedFile.value = null;
}

watch(files, () => {
  nextTick(() => {
    const listEl = document.querySelector('.space-y-2');
    if (listEl && !sortableInstance) {
      sortableInstance = new Sortable(listEl, {
        animation: 150,
        ghostClass: 'ghost-card',
        onEnd: (evt) => {
          const item = files.value.splice(evt.oldIndex, 1)[0];
          files.value.splice(evt.newIndex, 0, item);
        }
      });
    }
  });
}, { deep: true });

let isAwaitingPasswordForMerge = false;

function openUnlockForFile(file) {
  pendingFileName.value = file.name;
  pendingFileObj = file;
  passwordError.value = '';
  isPasswordOpen.value = true;
}

async function generateMergedBytes(onProgress = null) {
  if (files.value.length < 2) {
    alert(t('alert_min_2_files'));
    return null;
  }

  // 1. Phase 1: Security Scan
  if (onProgress) onProgress(10, t('merge_progress_check', 'Verifying input document security...'));
  await new Promise(r => setTimeout(r, 60));

  for (const file of files.value) {
    const arrayBuffer = await file.arrayBuffer();
    const security = await verifyPdfSecurity(arrayBuffer, filePasswords.value[file.name] || '');
    if (security.isEncrypted && !security.isValid) {
      isAwaitingPasswordForMerge = true;
      openUnlockForFile(file);
      return null;
    }
  }

  // 2. Phase 2: In-Memory Infallible Decryption & Page Assembly
  const mergedPdf = await PDFDocument.create();
  const totalFiles = files.value.length;
  for (let i = 0; i < totalFiles; i++) {
    const file = files.value[i];
    const pct = Math.min(85, Math.round(20 + ((i + 1) / totalFiles) * 60));
    if (onProgress) {
      onProgress(pct, t('merge_progress_assembling', { current: i + 1, total: totalFiles, name: file.name }));
    }
    await new Promise(r => setTimeout(r, 80));

    const arrayBuffer = await file.arrayBuffer();
    const pwd = filePasswords.value[file.name] || '';

    const cleanDoc = await loadCleanPdfDocument(arrayBuffer, pwd);
    const copiedPages = await mergedPdf.copyPages(cleanDoc, cleanDoc.getPageIndices());
    copiedPages.forEach(p => mergedPdf.addPage(p));
  }

  if (onProgress) onProgress(90, t('merge_progress_saving', 'Finalizing and saving merged PDF...'));
  await new Promise(r => setTimeout(r, 60));

  const mergedBytes = await mergedPdf.save();
  const cleanBase = (customOutputBaseName.value?.trim() || `PDFSeal_Merged_${Date.now()}`).replace(/\.pdf$/i, '');
  const finalName = `${cleanBase}.pdf`;

  if (onProgress) onProgress(100, t('merge_progress_done', 'Merge complete!'));
  return { mergedBytes, finalName, pageCount: mergedPdf.getPageCount() };
}

async function executeMerge() {
  if (files.value.length < 2) {
    alert(t('alert_min_2_files'));
    return;
  }

  isProcessing.value = true;
  progressPercent.value = 10;
  progressMessage.value = t('merge_progress_check', 'Verifying input document security...');

  logger.info('MERGE_START', `Executing merge for ${files.value.length} files`, {
    fileList: files.value.map(f => f.name)
  });

  try {
    const onProgress = (pct, msg) => {
      progressPercent.value = pct;
      if (msg) progressMessage.value = msg;
    };
    const result = await generateMergedBytes(onProgress);
    if (!result) return;
    const { mergedBytes, finalName, pageCount } = result;

    // Download merged result
    triggerDownload(new Blob([mergedBytes], { type: 'application/pdf' }), finalName);

    lastExportedPageCount.value = pageCount;
    lastExportedFile.value = {
      name: finalName,
      arrayBuffer: mergedBytes,
      size: mergedBytes.byteLength
    };
    showNextActions.value = true;

    logger.info('MERGE_SUCCESS', `Merged PDF generated: ${finalName} (${(mergedBytes.byteLength / 1024).toFixed(1)} KB, ${pageCount} pages)`);

    // Auto-archive in Vault if enabled
    if (autoSaveToVault.value) {
      await saveFile({
        name: finalName,
        arrayBuffer: mergedBytes,
        folderId: 'default',
        category: 'export',
        pageCount
      });
      logger.info('VAULT', `Merged result auto-saved to Vault: ${finalName}`);
    }
  } catch (err) {
    logger.error('MERGE_FAIL', `Failed to merge PDFs: ${err.message}`, { stack: err.stack });
    alert('Failed to merge PDFs: ' + err.message);
  } finally {
    isProcessing.value = false;
  }
}

function checkIncomingFile() {
  const incoming = consumePendingFile('merge');
  if (incoming) {
    const file = new File([incoming.arrayBuffer], incoming.name, { type: 'application/pdf' });
    file.source = 'vault';
    if (incoming.password) {
      filePasswords.value[incoming.name] = incoming.password;
    }
    addFiles([file], 'vault');
  }
}

onMounted(checkIncomingFile);
onActivated(checkIncomingFile);

async function handlePasswordSubmit(pwd) {
  if (!pendingFileObj) return;
  isUnlocking.value = true;
  try {
    const bytes = await pendingFileObj.arrayBuffer();
    const security = await verifyPdfSecurity(bytes, pwd);
    if (!security.isValid) {
      passwordError.value = t('pwd_error_wrong');
      isUnlocking.value = false;
      return;
    }

    filePasswords.value[pendingFileObj.name] = pwd;
    isPasswordOpen.value = false;
    passwordError.value = '';
    const shouldResumeMerge = isAwaitingPasswordForMerge;
    isAwaitingPasswordForMerge = false;
    pendingFileObj = null;
    isUnlocking.value = false;

    // Seamlessly resume merge execution if triggered by merge button
    if (shouldResumeMerge) {
      executeMerge();
    }
  } catch (err) {
    passwordError.value = t('pwd_error_wrong');
    isUnlocking.value = false;
  }
}

function handlePasswordCancel() {
  isPasswordOpen.value = false;
  passwordError.value = '';
  pendingFileObj = null;
  isAwaitingPasswordForMerge = false;
  isProcessing.value = false;
}
</script>
