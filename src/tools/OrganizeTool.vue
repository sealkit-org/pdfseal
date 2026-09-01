<template>
  <section class="tool-panel w-full">
    <div class="mb-5 text-center max-w-xl mx-auto">
      <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{{ t('organize_title') }}</h2>
      <p class="text-sm text-slate-600 mt-1">{{ t('organize_desc') }}</p>
    </div>

    <!-- Dropzone -->
    <div 
      v-if="!docBytes"
      @dragover.prevent="isDragOver = true"
      @dragleave.prevent="isDragOver = false"
      @drop.prevent="onDrop"
      :class="[
        'border-2 border-dashed rounded-3xl p-12 text-center transition cursor-pointer shadow-xs max-w-3xl mx-auto bg-white',
        isDragOver ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-300 hover:border-indigo-500'
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
      <div class="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
        <LayoutGrid class="w-8 h-8" />
      </div>
      <h3 class="text-base font-bold text-slate-800">{{ t('organize_drop_title') }}</h3>
      <p class="text-xs text-slate-500 mt-1">{{ t('organize_drop_subtitle') }}</p>
      <button 
        type="button" 
        class="mt-4 inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition shadow-sm"
      >
        <FileUp class="w-4 h-4" />
        <span>{{ t('btn_choose_pdf') }}</span>
      </button>
    </div>

    <!-- Workspace -->
    <div v-else class="w-full">
      <!-- Control Toolbar -->
      <div class="bg-white rounded-2xl border border-slate-200 p-4 mb-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center space-x-3">
          <span class="text-xs bg-indigo-50 text-indigo-700 font-bold px-3 py-1.5 rounded-lg border border-indigo-200">
            {{ pages.length }} {{ t('pages_total') }}
          </span>
          <span class="text-xs font-medium text-slate-600 truncate max-w-md">{{ filename }}</span>
          <span v-if="unlockedPassword" class="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
            🔒 Unlocked
          </span>
        </div>

        <div class="flex items-center space-x-2">
          <button 
            @click="rotateAllPages(90)" 
            class="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3.5 py-2 rounded-xl transition flex items-center space-x-1.5 shadow-xs"
          >
            <RotateCw class="w-3.5 h-3.5" />
            <span>{{ t('rotate_all_90') }}</span>
          </button>
          <button 
            @click="reset" 
            class="text-xs text-rose-600 hover:bg-rose-50 font-medium px-3.5 py-2 rounded-xl transition"
          >
            {{ t('btn_reset_file') }}
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="py-20 text-center text-xs text-slate-500 font-medium">
        <Loader2 class="w-7 h-7 animate-spin mx-auto mb-3 text-indigo-600" />
        <span>{{ t('rendering_pages') }}</span>
      </div>

      <!-- Thumbnail Grid (Wide Responsive Columns) -->
      <div v-else ref="gridRef" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 min-h-[250px]">
        <div 
          v-for="(p, idx) in pages" 
          :key="p.pageIndex"
          class="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs flex flex-col items-center relative group hover:shadow-md transition cursor-grab active:cursor-grabbing"
        >
          <div class="w-full flex items-center justify-between mb-2">
            <span class="text-[11px] font-extrabold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
              {{ t('page_card_prefix') }} {{ idx + 1 }}{{ t('page_card_suffix') }}
            </span>
            <div class="flex items-center space-x-1">
              <button 
                @click.stop="rotatePage(idx, 90)" 
                title="Rotate 90° Clockwise" 
                class="p-1 hover:bg-slate-100 rounded-md text-slate-600 transition"
              >
                <RotateCw class="w-3.5 h-3.5" />
              </button>
              <button 
                @click.stop="deletePage(idx)" 
                title="Delete Page" 
                class="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-md transition"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div class="overflow-hidden rounded-lg border border-slate-100 flex items-center justify-center bg-slate-50 w-full h-48">
            <img 
              :src="p.dataUrl" 
              :style="{ transform: `rotate(${p.rotation}deg)` }" 
              class="max-h-full max-w-full object-contain transition-transform duration-200"
            >
          </div>
        </div>
      </div>

      <!-- Floating Bottom Export Bar -->
      <div 
        v-if="!isLoading && pages.length > 0"
        class="sticky bottom-6 mt-8 max-w-md mx-auto bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-4 shadow-2xl border border-slate-800 flex items-center justify-between z-30 animate-in fade-in slide-in-from-bottom-4 duration-300"
      >
        <div class="text-xs text-slate-300">
          <span>{{ t('ready_to_save') }}</span>
        </div>
        <button 
          :disabled="isProcessing || isLoading"
          @click="executeExport" 
          class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition flex items-center space-x-1.5 shadow-md disabled:opacity-50"
        >
          <span v-if="!isProcessing">{{ t('seal_and_download') }}</span>
          <span v-else>{{ t('sealing_state') }}</span>
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
import { ref, nextTick } from 'vue';
import { LayoutGrid, FileUp, RotateCw, Trash2, Download, Loader2 } from 'lucide-vue-next';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, degrees } from 'pdf-lib';
import Sortable from 'sortablejs';
import { t, currentLang } from '../i18n';
import { triggerDownload } from '../utils/download';
import { verifyPdfSecurity } from '../utils/pdfSecurity';
import PasswordModal from '../components/PasswordModal.vue';

const fileInputRef = ref(null);
const gridRef = ref(null);
const docBytes = ref(null);
const filename = ref('');
const pages = ref([]);
const isDragOver = ref(false);
const isLoading = ref(false);
const isProcessing = ref(false);

// Password Unlock State
const isPasswordOpen = ref(false);
const passwordError = ref('');
const isUnlocking = ref(false);
const pendingFileName = ref('');
let pendingFileObj = null;
let unlockedPassword = '';

let sortableInstance = null;

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
  filename.value = file.name;
  pendingFileName.value = file.name;
  pendingFileObj = file;
  isLoading.value = true;
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
      password: password || undefined
    });
    
    const pdf = await loadingTask.promise;
    pages.value = [];
    unlockedPassword = password;
    isPasswordOpen.value = false;
    passwordError.value = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 0.6 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;

      pages.value.push({
        pageIndex: i - 1,
        rotation: 0,
        dataUrl: canvas.toDataURL()
      });
    }

    nextTick(() => {
      if (gridRef.value) {
        sortableInstance = new Sortable(gridRef.value, {
          animation: 150,
          ghostClass: 'ghost-card',
          onEnd: (evt) => {
            const item = pages.value.splice(evt.oldIndex, 1)[0];
            pages.value.splice(evt.newIndex, 0, item);
          }
        });
      }
    });
  } catch (err) {
    if (err.name === 'PasswordException' || err.message?.toLowerCase().includes('password')) {
      docBytes.value = null; // Clear until unlocked
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

function rotatePage(idx, deg) {
  pages.value[idx].rotation = (pages.value[idx].rotation + deg) % 360;
}

function rotateAllPages(deg) {
  pages.value.forEach(p => { p.rotation = (p.rotation + deg) % 360; });
}

function deletePage(idx) {
  if (pages.value.length <= 1) {
    alert(t('alert_cannot_delete_last_page'));
    return;
  }
  pages.value.splice(idx, 1);
}

function reset() {
  docBytes.value = null;
  pages.value = [];
  unlockedPassword = '';
  if (sortableInstance) sortableInstance.destroy();
}

async function executeExport() {
  if (!docBytes.value || pages.value.length === 0) return;
  isProcessing.value = true;
  try {
    const srcPdf = await PDFDocument.load(docBytes.value, { 
      password: unlockedPassword || undefined,
      ignoreEncryption: !unlockedPassword
    });
    const newPdf = await PDFDocument.create();

    for (const item of pages.value) {
      const [copied] = await newPdf.copyPages(srcPdf, [item.pageIndex]);
      const currentRot = copied.getRotation().angle;
      copied.setRotation(degrees(currentRot + item.rotation));
      newPdf.addPage(copied);
    }

    const outBytes = await newPdf.save();
    triggerDownload(new Blob([outBytes], { type: 'application/pdf' }), `PDFSeal_Organized_${Date.now()}.pdf`);
  } catch (err) {
    alert('Failed to export organized PDF: ' + err.message);
  } finally {
    isProcessing.value = false;
  }
}
</script>
