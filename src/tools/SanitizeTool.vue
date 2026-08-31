<template>
  <section class="tool-panel">
    <div class="mb-6 text-center max-w-xl mx-auto">
      <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{{ t('sanitize_title') }}</h2>
      <p class="text-sm text-slate-600 mt-1">{{ t('sanitize_desc') }}</p>
    </div>

    <!-- Dropzone -->
    <div 
      v-if="!docBytes"
      @dragover.prevent="isDragOver = true"
      @dragleave.prevent="isDragOver = false"
      @drop.prevent="onDrop"
      :class="[
        'border-2 border-dashed rounded-3xl p-10 text-center transition cursor-pointer shadow-xs max-w-2xl mx-auto bg-white',
        isDragOver ? 'border-teal-500 bg-teal-50/50' : 'border-slate-300 hover:border-teal-500'
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
      <div class="w-16 h-16 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
        <ShieldCheck class="w-8 h-8" />
      </div>
      <h3 class="text-base font-bold text-slate-800">{{ t('sanitize_drop_title') }}</h3>
      <p class="text-xs text-slate-500 mt-1">{{ t('sanitize_drop_subtitle') }}</p>
      <button 
        type="button" 
        class="mt-4 inline-flex items-center space-x-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-sm"
      >
        <FileUp class="w-4 h-4" />
        <span>{{ t('btn_choose_pdf') }}</span>
      </button>
    </div>

    <!-- Workspace -->
    <div v-else class="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
      <div class="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h4 class="font-bold text-slate-900 text-sm">{{ t('detected_metadata') }}</h4>
          <p class="text-xs text-slate-500">{{ t('detected_subtitle') }}</p>
        </div>
        <span class="text-xs bg-rose-100 text-rose-700 font-semibold px-2.5 py-1 rounded-full">{{ t('has_metadata_badge') }}</span>
      </div>

      <div class="my-6 space-y-2.5 font-mono text-xs">
        <div 
          v-for="(val, key) in metadata" 
          :key="key"
          class="flex justify-between py-2 px-3 bg-slate-50 rounded-xl border border-slate-100"
        >
          <span class="text-slate-500 font-medium font-sans">{{ key }}:</span>
          <span :class="val !== noneText ? 'text-rose-600 font-bold' : 'text-slate-400'" class="truncate max-w-xs">{{ val }}</span>
        </div>
      </div>

      <div class="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs text-slate-600 mb-6 space-y-1">
        <p class="font-semibold text-slate-800">{{ t('what_will_be_stripped') }}</p>
        <p>{{ t('strip_item_1') }}</p>
        <p>{{ t('strip_item_2') }}</p>
        <p>{{ t('strip_item_3') }}</p>
      </div>

      <div class="flex items-center justify-between pt-4 border-t border-slate-100">
        <button @click="docBytes = null" class="text-xs text-slate-500 hover:text-slate-800 font-medium">
          {{ t('btn_choose_another') }}
        </button>
        <button 
          :disabled="isProcessing"
          @click="executeSanitize"
          class="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition flex items-center space-x-2 shadow-md disabled:opacity-50"
        >
          <span v-if="!isProcessing">{{ t('sanitize_and_download') }}</span>
          <span v-else>Sanitizing...</span>
          <Download v-if="!isProcessing" class="w-4 h-4" />
          <Loader2 v-else class="w-4 h-4 animate-spin" />
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ShieldCheck, FileUp, Download, Loader2 } from 'lucide-vue-next';
import { PDFDocument } from 'pdf-lib';
import { t, currentLang } from '../i18n';
import { triggerDownload } from '../utils/download';

const fileInputRef = ref(null);
const docBytes = ref(null);
const metadata = ref({});
const isDragOver = ref(false);
const isProcessing = ref(false);

const noneText = computed(() => currentLang.value === 'zh' ? '无' : 'None');

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
  docBytes.value = await file.arrayBuffer();
  try {
    const pdfDoc = await PDFDocument.load(docBytes.value);
    const n = noneText.value;

    metadata.value = {
      'Title': pdfDoc.getTitle() || n,
      'Author': pdfDoc.getAuthor() || n,
      'Subject': pdfDoc.getSubject() || n,
      'Keywords': pdfDoc.getKeywords() || n,
      'Producer': pdfDoc.getProducer() || n,
      'Creator': pdfDoc.getCreator() || n,
      'Creation Date': pdfDoc.getCreationDate() ? pdfDoc.getCreationDate().toISOString() : n,
      'Modification Date': pdfDoc.getModificationDate() ? pdfDoc.getModificationDate().toISOString() : n
    };
  } catch (err) {
    alert('Failed to inspect metadata: ' + err.message);
  }
}

async function executeSanitize() {
  if (!docBytes.value) return;
  isProcessing.value = true;
  try {
    const pdfDoc = await PDFDocument.load(docBytes.value);
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('');
    pdfDoc.setCreator('');

    const outBytes = await pdfDoc.save({ updateMetadata: false });
    triggerDownload(new Blob([outBytes], { type: 'application/pdf' }), `PDFSeal_Sanitized_${Date.now()}.pdf`);
  } catch (err) {
    alert('Failed to sanitize PDF: ' + err.message);
  } finally {
    isProcessing.value = false;
  }
}
</script>
