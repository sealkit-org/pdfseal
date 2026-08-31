<template>
  <section class="tool-panel w-full">
    <div class="mb-5 text-center max-w-xl mx-auto">
      <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{{ t('split_title') }}</h2>
      <p class="text-sm text-slate-600 mt-1">{{ t('split_desc') }}</p>
    </div>

    <!-- Dropzone -->
    <div 
      v-if="!docBytes"
      @dragover.prevent="isDragOver = true"
      @dragleave.prevent="isDragOver = false"
      @drop.prevent="onDrop"
      :class="[
        'border-2 border-dashed rounded-3xl p-12 text-center transition cursor-pointer shadow-xs max-w-3xl mx-auto bg-white',
        isDragOver ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-300 hover:border-emerald-500'
      ]"
      @click="fileInputRef.click()"
    >
      <input 
        ref="fileInputRef" 
        type="file" 
        accept="application/pdf" 
        class="hidden" 
        @change="onFileSelected"
      >
      <div class="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
        <Scissors class="w-8 h-8" />
      </div>
      <h3 class="text-base font-bold text-slate-800">{{ t('split_drop_title') }}</h3>
      <p class="text-xs text-slate-500 mt-1">{{ t('split_drop_subtitle') }}</p>
      <button 
        type="button" 
        class="mt-4 inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition shadow-sm"
      >
        <FileUp class="w-4 h-4" />
        <span>{{ t('btn_choose_pdf') }}</span>
      </button>
    </div>

    <!-- Workspace -->
    <div v-else class="w-full">
      <!-- Top Control Bar -->
      <div class="bg-white rounded-2xl border border-slate-200 p-4 mb-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center space-x-3">
          <span class="text-xs bg-emerald-50 text-emerald-700 font-bold px-3 py-1.5 rounded-lg border border-emerald-200">
            {{ totalPages }} {{ t('pages_total') }}
          </span>
          <span class="text-xs font-semibold text-slate-700">
            {{ selectedIndices.size }} {{ t('pages_label') }} {{ t('selected_label') }}
          </span>
          <span v-if="unlockedPassword" class="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
            🔒 Unlocked
          </span>
        </div>

        <div class="flex items-center space-x-2">
          <button 
            @click="selectAll" 
            class="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3.5 py-2 rounded-xl transition shadow-xs"
          >
            {{ t('select_all') }}
          </button>
          <button 
            @click="clearAll" 
            class="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3.5 py-2 rounded-xl transition shadow-xs"
          >
            {{ t('clear_selection') }}
          </button>
          <button 
            @click="reset" 
            class="text-xs text-rose-600 hover:bg-rose-50 font-medium px-3.5 py-2 rounded-xl transition"
          >
            {{ t('btn_reset_file') }}
          </button>
        </div>
      </div>

      <!-- Quick Range Selector -->
      <div class="bg-slate-100/80 rounded-2xl p-3.5 mb-6 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div class="flex items-center space-x-2 flex-1 min-w-[280px]">
          <span class="font-bold text-slate-700">{{ t('page_range_label') }}:</span>
          <input 
            v-model="rangeInput" 
            @keyup.enter="applyRange"
            type="text" 
            placeholder="e.g. 1-3, 5, 8-10" 
            class="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden flex-1 font-mono"
          >
          <button 
            @click="applyRange" 
            class="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-4 py-1.5 rounded-xl transition shadow-xs"
          >
            {{ t('apply_range') }}
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="py-20 text-center text-xs text-slate-500 font-medium">
        <Loader2 class="w-7 h-7 animate-spin mx-auto mb-3 text-emerald-600" />
        <span>Rendering page cards...</span>
      </div>

      <!-- Visual Select Grid -->
      <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 min-h-[250px]">
        <div 
          v-for="p in pages" 
          :key="p.index"
          @click="toggleSelection(p.index)"
          :class="[
            'rounded-2xl border p-3 flex flex-col items-center relative cursor-pointer transition select-none',
            selectedIndices.has(p.index) 
              ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20 shadow-md' 
              : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
          ]"
        >
          <div class="w-full flex items-center justify-between mb-2">
            <span :class="[
              'text-[11px] font-extrabold px-2 py-0.5 rounded-md',
              selectedIndices.has(p.index) ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
            ]">
              {{ currentLang === 'zh' ? `第 ${p.index + 1} 页` : `Page ${p.index + 1}` }}
            </span>
            <div 
              :class="[
                'w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-bold transition',
                selectedIndices.has(p.index) ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white text-transparent'
              ]"
            >
              ✓
            </div>
          </div>
          <div class="overflow-hidden rounded-lg border border-slate-100 flex items-center justify-center bg-slate-50 w-full h-44">
            <img :src="p.dataUrl" class="max-h-full max-w-full object-contain pointer-events-none">
          </div>
        </div>
      </div>

      <!-- Bottom Export Bar -->
      <div 
        v-if="!isLoading && pages.length > 0"
        class="sticky bottom-6 mt-8 max-w-md mx-auto bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-4 shadow-2xl border border-slate-800 flex items-center justify-between z-30 animate-in fade-in slide-in-from-bottom-4 duration-300"
      >
        <div class="text-xs text-slate-300">
          <span>{{ selectedIndices.size }} {{ t('pages_label') }} {{ t('selected_label') }}</span>
        </div>
        <button 
          :disabled="isProcessing || isLoading || selectedIndices.size === 0"
          @click="executeSplit" 
          class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition flex items-center space-x-1.5 shadow-md disabled:opacity-50"
        >
          <span v-if="!isProcessing">{{ t('extract_selected') }}</span>
          <span v-else>Extracting...</span>
          <Download v-if="!isProcessing" class="w-4 h-4" />
          <Loader2 v-else class="w-4 h-4 animate-spin" />
        </button>
      </div>
    </div>

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
import { ref } from 'vue';
import { Scissors, FileUp, Download, Loader2 } from 'lucide-vue-next';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { t, currentLang } from '../i18n';
import { triggerDownload } from '../utils/download';
import PasswordModal from '../components/PasswordModal.vue';

const fileInputRef = ref(null);
const docBytes = ref(null);
const pages = ref([]);
const totalPages = ref(0);
const selectedIndices = ref(new Set());
const rangeInput = ref('');
const isDragOver = ref(false);
const isLoading = ref(false);
const isProcessing = ref(false);

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

async function loadFile(file, password = '') {
  isLoading.value = true;
  pendingFileName.value = file.name;
  pendingFileObj = file;
  const rawBuffer = await file.arrayBuffer();
  docBytes.value = new Uint8Array(rawBuffer);
  selectedIndices.value.clear();
  rangeInput.value = '';

  try {
    const pdfDataForViewer = new Uint8Array(rawBuffer.slice(0));
    const loadingTask = pdfjsLib.getDocument({ 
      data: pdfDataForViewer,
      password: password || undefined
    });
    
    const pdf = await loadingTask.promise;
    totalPages.value = pdf.numPages;
    pages.value = [];
    unlockedPassword = password;
    isPasswordOpen.value = false;
    passwordError.value = '';

    for (let i = 1; i <= totalPages.value; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 0.5 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;

      pages.value.push({
        index: i - 1,
        dataUrl: canvas.toDataURL()
      });
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
  pages.value = [];
  selectedIndices.value.clear();
  rangeInput.value = '';
  totalPages.value = 0;
  unlockedPassword = '';
}

async function executeSplit() {
  if (!docBytes.value || selectedIndices.value.size === 0) return;
  isProcessing.value = true;
  try {
    const srcPdf = await PDFDocument.load(docBytes.value, {
      password: unlockedPassword || undefined,
      ignoreEncryption: !unlockedPassword
    });
    const newPdf = await PDFDocument.create();

    const sortedIndices = Array.from(selectedIndices.value).sort((a, b) => a - b);
    const copiedPages = await newPdf.copyPages(srcPdf, sortedIndices);
    copiedPages.forEach(p => newPdf.addPage(p));

    const outBytes = await newPdf.save();
    triggerDownload(new Blob([outBytes], { type: 'application/pdf' }), `PDFSeal_Split_${Date.now()}.pdf`);
  } catch (err) {
    alert('Failed to split PDF: ' + err.message);
  } finally {
    isProcessing.value = false;
  }
}
</script>
