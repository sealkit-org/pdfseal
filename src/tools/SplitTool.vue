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

    <!-- Split Workspace -->
    <div v-else class="w-full">
      <div class="bg-white rounded-2xl border border-slate-200 p-5 mb-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div class="flex-1 w-full">
          <label class="block text-xs font-bold text-slate-700 mb-1">{{ t('custom_page_range') }}</label>
          <div class="flex items-center space-x-2">
            <input 
              type="text" 
              v-model="rangeInput" 
              :placeholder="t('range_placeholder')" 
              @input="onRangeChange"
              class="text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 w-full max-w-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
            >
            <button 
              @click="selectAll(true)" 
              class="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3 py-2 rounded-xl transition whitespace-nowrap"
            >
              {{ t('btn_select_all') }}
            </button>
            <button 
              @click="selectAll(false)" 
              class="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3 py-2 rounded-xl transition whitespace-nowrap"
            >
              {{ t('btn_deselect_all') }}
            </button>
          </div>
        </div>

        <div class="text-right">
          <span class="text-xs text-slate-500">
            {{ t('selected_label') }} 
            <strong class="text-emerald-600 font-bold">{{ selectedIndices.size }}</strong> / {{ totalPages }} {{ t('pages_label') }}
          </span>
        </div>
      </div>

      <!-- Thumbnail Grid -->
      <div v-if="isLoading" class="py-20 text-center text-xs text-slate-500 font-medium">
        <Loader2 class="w-7 h-7 animate-spin mx-auto mb-3 text-emerald-600" />
        <span>Generating previews...</span>
      </div>

      <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-4">
        <div 
          v-for="page in pages" 
          :key="page.index"
          @click="toggleSelection(page.index)"
          :class="[
            'bg-white rounded-2xl border-2 p-3 shadow-xs flex flex-col items-center relative cursor-pointer transition select-none',
            selectedIndices.has(page.index) ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-200 hover:border-emerald-400'
          ]"
        >
          <div class="w-full flex items-center justify-between mb-2">
            <span class="text-[11px] font-bold text-slate-700">
              {{ currentLang === 'zh' ? `第 ${page.index + 1} 页` : `Page ${page.index + 1}` }}
            </span>
            <div 
              :class="[
                'w-4 h-4 rounded-md border flex items-center justify-center text-xs font-bold transition',
                selectedIndices.has(page.index) ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
              ]"
            >
              <span v-if="selectedIndices.has(page.index)">✓</span>
            </div>
          </div>
          <div class="overflow-hidden rounded-lg border border-slate-100 flex items-center justify-center bg-slate-50 w-full h-44 pointer-events-none">
            <img :src="page.dataUrl" class="max-h-full max-w-full object-contain">
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
  </section>
</template>

<script setup>
import { ref } from 'vue';
import { Scissors, FileUp, Download, Loader2 } from 'lucide-vue-next';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { t, currentLang } from '../i18n';
import { triggerDownload } from '../utils/download';

const fileInputRef = ref(null);
const docBytes = ref(null);
const pages = ref([]);
const totalPages = ref(0);
const selectedIndices = ref(new Set());
const rangeInput = ref('');
const isDragOver = ref(false);
const isLoading = ref(false);
const isProcessing = ref(false);

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

async function loadFile(file) {
  isLoading.value = true;
  const rawBuffer = await file.arrayBuffer();
  docBytes.value = new Uint8Array(rawBuffer);
  selectedIndices.value.clear();
  rangeInput.value = '';

  try {
    const pdfDataForViewer = new Uint8Array(rawBuffer.slice(0));
    const pdf = await pdfjsLib.getDocument({ data: pdfDataForViewer }).promise;
    totalPages.value = pdf.numPages;
    pages.value = [];

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
    alert('Failed to load PDF: ' + err.message);
  } finally {
    isLoading.value = false;
  }
}

function toggleSelection(idx) {
  if (selectedIndices.value.has(idx)) {
    selectedIndices.value.delete(idx);
  } else {
    selectedIndices.value.add(idx);
  }
}

function selectAll(select) {
  if (select) {
    for (let i = 0; i < totalPages.value; i++) selectedIndices.value.add(i);
  } else {
    selectedIndices.value.clear();
  }
}

function onRangeChange() {
  selectedIndices.value.clear();
  if (!rangeInput.value.trim()) return;

  const parts = rangeInput.value.split(',');
  for (const p of parts) {
    const range = p.trim().split('-');
    if (range.length === 1) {
      const num = parseInt(range[0]);
      if (!isNaN(num) && num >= 1 && num <= totalPages.value) {
        selectedIndices.value.add(num - 1);
      }
    } else if (range.length === 2) {
      const start = parseInt(range[0]);
      const end = parseInt(range[1]);
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
          if (i >= 1 && i <= totalPages.value) selectedIndices.value.add(i - 1);
        }
      }
    }
  }
}

async function executeSplit() {
  if (selectedIndices.value.size === 0) return;
  isProcessing.value = true;
  try {
    const srcPdf = await PDFDocument.load(docBytes.value);
    const newPdf = await PDFDocument.create();
    const indices = Array.from(selectedIndices.value).sort((a, b) => a - b);
    const copied = await newPdf.copyPages(srcPdf, indices);
    copied.forEach(p => newPdf.addPage(p));

    const outBytes = await newPdf.save();
    triggerDownload(new Blob([outBytes], { type: 'application/pdf' }), `PDFSeal_Extracted_${Date.now()}.pdf`);
  } catch (err) {
    alert('Failed to split PDF: ' + err.message);
  } finally {
    isProcessing.value = false;
  }
}
</script>
