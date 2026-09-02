<template>
  <section class="w-full flex-1 flex flex-col">
    <!-- Main Card Container matching Merge & Organize tools -->
    <div class="bg-white rounded-3xl p-5 sm:p-7 shadow-xl border border-slate-100 flex flex-col flex-1">
      <!-- Integrated Header with Badge -->
      <div class="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 shrink-0">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-2xs">
            <Scissors class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
              {{ t('split_title') }}
            </h2>
            <p class="text-xs text-slate-500 mt-0.5">
              {{ t('split_desc') }}
            </p>
          </div>
        </div>

        <div class="hidden sm:flex items-center space-x-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50/80 px-3 py-1.5 rounded-full border border-emerald-100 shadow-2xs">
          <Lock class="w-3.5 h-3.5" />
          <span>{{ t('processed_locally') || '纯浏览器本地内存处理' }}</span>
        </div>
      </div>

      <!-- State A: Empty State (Dual Source Dropzone: Local & Vault) -->
      <div 
        v-if="!docBytes"
        @dragover.prevent="isDragOver = true"
        @dragleave.prevent="isDragOver = false"
        @drop.prevent="onDrop"
        :class="[
          'border-2 border-dashed rounded-3xl p-8 sm:p-14 text-center transition flex-1 flex flex-col items-center justify-center relative select-none',
          isDragOver ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200/90 hover:border-emerald-400 bg-slate-50/40 hover:bg-slate-50/80'
        ]"
      >
        <input 
          ref="fileInputRef" 
          type="file" 
          accept="application/pdf" 
          class="hidden" 
          @change="onFileSelected" 
        >
        
        <div class="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mb-3 shadow-inner">
          <Scissors class="w-8 h-8" />
        </div>
        
        <h3 class="text-base sm:text-lg font-bold text-slate-800">{{ t('split_drop_title') }}</h3>
        <p class="text-xs text-slate-400 mt-1 max-w-sm">{{ t('split_drop_subtitle') }}</p>
        
        <!-- Dual Source Selection Buttons -->
        <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button 
            type="button" 
            @click="fileInputRef.click()"
            class="bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition flex items-center space-x-2 shadow-md hover:shadow-emerald-600/25 cursor-pointer"
          >
            <Plus class="w-4 h-4" />
            <span>{{ t('merge_btn_from_local') || '从电脑本地添加' }}</span>
          </button>
          
          <button 
            type="button" 
            @click="isVaultPickerOpen = true"
            class="bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center space-x-2 border border-slate-200 shadow-2xs hover:border-slate-300 cursor-pointer"
          >
            <FolderLock class="w-4 h-4 text-emerald-600" />
            <span>{{ t('merge_btn_from_vault') || '从海豹收纳箱挑选' }}</span>
          </button>
        </div>
      </div>

      <!-- State B: Active Document Workspace -->
      <div v-else class="flex-1 flex flex-col justify-between overflow-hidden">
        <!-- Top Toolbar & Status Bar -->
        <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 shrink-0">
          <div class="flex items-center space-x-2 min-w-0 flex-1">
            <span class="text-xs bg-emerald-50 text-emerald-700 font-extrabold px-2.5 py-1 rounded-lg border border-emerald-200 shrink-0">
              {{ totalPages }} {{ t('pages_label') || '页' }}
            </span>
            <span class="text-xs bg-blue-50 text-blue-700 font-extrabold px-2.5 py-1 rounded-lg border border-blue-200 shrink-0">
              {{ selectedIndices.size }} {{ t('pages_label') }} {{ t('selected_label') }}
            </span>
            <span class="text-xs font-bold text-slate-700 truncate max-w-xs" :title="filename">
              {{ filename }}
            </span>
            <span 
              v-if="unlockedPassword" 
              class="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-bold flex items-center shrink-0"
            >
              <Unlock class="w-3 h-3 mr-0.5" />
              {{ t('badge_unlocked') || '已解密' }}
            </span>
          </div>

          <!-- Quick Action Buttons -->
          <div class="flex items-center space-x-1.5 sm:space-x-2">
            <!-- Select All -->
            <button 
              @click="selectAll" 
              class="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200/80 transition flex items-center space-x-1 cursor-pointer"
            >
              <CheckSquare class="w-3.5 h-3.5 text-slate-600" />
              <span>{{ t('btn_select_all') || '全选' }}</span>
            </button>

            <!-- Deselect All -->
            <button 
              @click="clearAll" 
              class="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200/80 transition flex items-center space-x-1 cursor-pointer"
            >
              <Square class="w-3.5 h-3.5 text-slate-600" />
              <span>{{ t('btn_deselect_all') || '取消全选' }}</span>
            </button>

            <!-- Choose Another Local File -->
            <button 
              @click="fileInputRef.click()"
              class="text-xs text-emerald-600 hover:bg-emerald-50 font-semibold px-2.5 py-1.5 rounded-xl border border-emerald-200 transition flex items-center space-x-1 cursor-pointer"
            >
              <RefreshCw class="w-3.5 h-3.5" />
              <span>{{ t('btn_choose_another') || '更换文件' }}</span>
            </button>

            <!-- Choose From Vault -->
            <button 
              @click="isVaultPickerOpen = true"
              class="text-xs text-slate-700 hover:bg-slate-100 font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 transition flex items-center space-x-1 cursor-pointer"
            >
              <FolderLock class="w-3.5 h-3.5 text-emerald-600" />
              <span>{{ t('merge_btn_from_vault') || '从收纳箱选取' }}</span>
            </button>

            <!-- Clear / Reset -->
            <button 
              @click="reset" 
              class="text-xs text-rose-600 hover:bg-rose-50 font-semibold px-2.5 py-1.5 rounded-xl transition cursor-pointer"
            >
              {{ t('btn_clear_all') || '清空' }}
            </button>
          </div>
        </div>

        <!-- Range Selection Bar -->
        <div class="bg-slate-50/80 rounded-2xl p-2.5 my-2 border border-slate-200/80 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div class="flex items-center space-x-2 flex-1 min-w-[280px]">
            <span class="font-bold text-slate-700 shrink-0">{{ t('custom_page_range') || '自定义提取页码范围：' }}</span>
            <input 
              v-model="rangeInput" 
              @keyup.enter="applyRange"
              type="text" 
              :placeholder="t('range_placeholder') || '例如 1-3, 5, 8'" 
              class="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden flex-1 font-mono"
            >
            <button 
              @click="applyRange" 
              class="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-3.5 py-1.5 rounded-xl transition shadow-xs cursor-pointer"
            >
              {{ t('apply_range') || '应用区间' }}
            </button>
          </div>
          <span class="text-[11px] text-slate-400 hidden md:block">
            点击下方卡片即可直接选中或取消
          </span>
        </div>

        <input 
          ref="fileInputRef" 
          type="file" 
          accept="application/pdf" 
          class="hidden" 
          @change="onFileSelected" 
        >

        <!-- Loading State -->
        <div v-if="isLoading" class="flex-1 flex flex-col items-center justify-center py-20 text-center text-xs text-slate-500 font-medium">
          <Loader2 class="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-600" />
          <span>{{ t('rendering_pages') }}...</span>
        </div>

        <!-- Interactive Selection Cards Grid (Natural Card Height with Top Alignment) -->
        <div 
          v-else 
          class="flex-1 my-2 overflow-y-auto max-h-[440px] pr-1 grid content-start items-start grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 select-none"
        >
          <div 
            v-for="p in pages" 
            :key="p.index"
            @click="toggleSelection(p.index)"
            :class="[
              'rounded-2xl border p-2.5 flex flex-col items-center relative group transition cursor-pointer select-none',
              selectedIndices.has(p.index) 
                ? 'bg-emerald-50/70 border-emerald-400 shadow-md ring-2 ring-emerald-500/20' 
                : 'bg-slate-50/70 hover:bg-white border-slate-200/80 hover:border-slate-300 shadow-2xs'
            ]"
          >
            <!-- Card Header: Page Index Badge + Selection Status -->
            <div class="w-full flex items-center justify-between mb-1.5">
              <span :class="[
                'text-[11px] font-extrabold px-2 py-0.5 rounded-md',
                selectedIndices.has(p.index) ? 'bg-emerald-600 text-white' : 'bg-slate-200/80 text-slate-700'
              ]">
                {{ t('page_card_prefix') || '第' }} {{ p.index + 1 }} {{ t('page_card_suffix') || '页' }}
              </span>
              
              <div 
                :class="[
                  'w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-bold transition shrink-0',
                  selectedIndices.has(p.index) ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white text-transparent'
                ]"
              >
                ✓
              </div>
            </div>

            <!-- Page Canvas Preview -->
            <div class="overflow-hidden rounded-xl border border-slate-200/60 flex items-center justify-center bg-white w-full h-40 relative">
              <img 
                :src="p.dataUrl" 
                class="max-h-full max-w-full object-contain pointer-events-none"
              >
            </div>
          </div>
        </div>

        <!-- Assembly Bottom Action & Export Configuration Bar -->
        <div class="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <!-- Left: Output Filename & Auto-save Checkbox -->
          <div class="flex flex-wrap items-center gap-3">
            <div class="flex items-center space-x-1.5">
              <label class="text-xs text-slate-500 font-semibold shrink-0">
                {{ t('vault_field_name') }}:
              </label>
              <input 
                v-model="customOutputBaseName"
                type="text" 
                :placeholder="t('vault_filename_placeholder') || '自定义导出文件名 (可选)'"
                class="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-medium text-slate-700 w-44 sm:w-64"
              >
            </div>

            <label class="flex items-center space-x-1.5 text-xs text-slate-600 font-semibold cursor-pointer select-none">
              <input 
                type="checkbox" 
                v-model="autoSaveToVault" 
                class="w-4 h-4 text-emerald-600 rounded-md border-slate-300 focus:ring-emerald-500 cursor-pointer"
              >
              <span>{{ t('vault_autosave_checkbox') }}</span>
            </label>
          </div>

          <!-- Right: Execution Button -->
          <button 
            :disabled="isProcessing || isLoading || selectedIndices.size === 0"
            @click="executeSplit" 
            class="bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs sm:text-sm font-bold px-6 py-2.5 rounded-xl transition flex items-center justify-center space-x-2 shadow-md hover:shadow-emerald-600/25 disabled:opacity-50 cursor-pointer ml-auto"
          >
            <span v-if="!isProcessing">
              {{ t('extract_selected') || '提取所选页面' }} ({{ selectedIndices.size }})
            </span>
            <span v-else>{{ t('loading') || '提取中...' }}</span>
            <Download v-if="!isProcessing" class="w-4 h-4" />
            <Loader2 v-else class="w-4 h-4 animate-spin" />
          </button>
        </div>
      </div>
    </div>

    <!-- Vault File Picker Modal (Single-select mode for Split) -->
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
import { ref, watch, onMounted, onActivated } from 'vue';
import { 
  Scissors, 
  Plus, 
  Download, 
  Loader2, 
  FolderLock, 
  Lock, 
  Unlock, 
  RefreshCw,
  CheckSquare,
  Square
} from 'lucide-vue-next';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { t } from '../i18n';
import { triggerDownload } from '../utils/download';
import { verifyPdfSecurity, loadCleanPdfDocument } from '../utils/pdfSecurity';
import { consumePendingFile } from '../utils/toolBridge';
import { saveFile } from '../utils/vaultDb';
import { userSettings } from '../utils/userSettings';
import { logger } from '../utils/logger';
import PasswordModal from '../components/PasswordModal.vue';
import VaultFilePickerModal from '../components/VaultFilePickerModal.vue';

const fileInputRef = ref(null);
const docBytes = ref(null);
const filename = ref('');
const pages = ref([]);
const totalPages = ref(0);
const selectedIndices = ref(new Set());
const rangeInput = ref('');
const isDragOver = ref(false);
const isLoading = ref(false);
const isProcessing = ref(false);
const isVaultPickerOpen = ref(false);

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

  const prefix = userSettings.defaultExportPrefix || 'PDFSeal';
  const cleanBase = file.name.replace(/\.[^/.]+$/, '');
  customOutputBaseName.value = `${prefix}_Split_${cleanBase}`;

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
  selectedIndices.value.clear();
  rangeInput.value = '';

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
    pages.value = [];
    unlockedPassword = password;
    isPasswordOpen.value = false;
    passwordError.value = '';

    for (let i = 1; i <= totalPages.value; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 0.45 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;

      pages.value.push({
        index: i - 1,
        dataUrl: canvas.toDataURL()
      });
      // By default select all pages on load so user can easily deselect or specify
      selectedIndices.value.add(i - 1);
    }
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

function toggleSelection(idx) {
  if (selectedIndices.value.has(idx)) {
    selectedIndices.value.delete(idx);
  } else {
    selectedIndices.value.add(idx);
  }
}

function selectAll() {
  pages.value.forEach(p => selectedIndices.value.add(p.index));
}

function clearAll() {
  selectedIndices.value.clear();
}

function applyRange() {
  if (!rangeInput.value.trim()) return;
  selectedIndices.value.clear();
  const parts = rangeInput.value.split(',');
  parts.forEach(part => {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const [start, end] = trimmed.split('-').map(n => parseInt(n, 10));
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
          if (i >= 1 && i <= totalPages.value) selectedIndices.value.add(i - 1);
        }
      }
    } else {
      const num = parseInt(trimmed, 10);
      if (!isNaN(num) && num >= 1 && num <= totalPages.value) {
        selectedIndices.value.add(num - 1);
      }
    }
  });
}

function reset() {
  docBytes.value = null;
  filename.value = '';
  pages.value = [];
  selectedIndices.value.clear();
  rangeInput.value = '';
  totalPages.value = 0;
  unlockedPassword = '';
}

async function generateSplitBytes() {
  if (!docBytes.value || selectedIndices.value.size === 0) return null;
  const preserveWatermarks = userSettings.preserveWatermarks !== false;
  const cleanDoc = await loadCleanPdfDocument(docBytes.value, {
    password: unlockedPassword || '',
    preserveWatermarks
  });

  const newPdf = await PDFDocument.create();
  const sortedIndices = Array.from(selectedIndices.value).sort((a, b) => a - b);
  const copiedPages = await newPdf.copyPages(cleanDoc, sortedIndices);
  copiedPages.forEach(p => newPdf.addPage(p));

  const outBytes = await newPdf.save();
  
  let outName = (customOutputBaseName.value.trim() || `PDFSeal_Split_${Date.now()}`);
  if (!outName.toLowerCase().endsWith('.pdf')) {
    outName += '.pdf';
  }

  return { outBytes, outName, pageCount: sortedIndices.length };
}

async function executeSplit() {
  if (!docBytes.value || selectedIndices.value.size === 0) return;
  isProcessing.value = true;
  try {
    const result = await generateSplitBytes();
    if (!result) return;
    const { outBytes, outName, pageCount } = result;

    triggerDownload(new Blob([outBytes], { type: 'application/pdf' }), outName);

    // Auto-save to Vault if checked
    if (autoSaveToVault.value) {
      await saveFile({
        name: outName,
        arrayBuffer: outBytes,
        folderId: 'default',
        category: 'export',
        pageCount
      });
      logger.info('VAULT', `Extracted split result auto-saved to Vault: ${outName}`);
    }
  } catch (err) {
    logger.error('SPLIT', `Split execution failed: ${err.message}`);
    alert('Failed to split PDF: ' + err.message);
  } finally {
    isProcessing.value = false;
  }
}

function checkIncomingFile() {
  const incoming = consumePendingFile('split');
  if (incoming) {
    const file = new File([incoming.arrayBuffer], incoming.name, { type: 'application/pdf' });
    loadFile(file, incoming.password || '');
  }
}

onMounted(checkIncomingFile);
onActivated(checkIncomingFile);
</script>
