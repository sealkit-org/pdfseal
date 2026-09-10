<template>
  <section class="w-full flex-1 flex flex-col">
    <!-- Main Assembly Container (Unified White Card) -->
    <div class="bg-white rounded-3xl p-5 sm:p-7 shadow-xl border border-slate-100 flex flex-col flex-1">
      <!-- Top Title Header -->
      <div class="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold shrink-0 shadow-2xs">
            <ImageDown class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
              {{ t('p2i_title') }}
            </h2>
            <p class="text-xs text-slate-400 font-medium hidden sm:block mt-0.5">
              {{ t('p2i_desc') }}
            </p>
          </div>
        </div>
      </div>

      <!-- 1. EMPTY STATE DROPZONE -->
      <div
        v-if="!docBytes"
        @dragover.prevent="isDragOver = true"
        @dragleave.prevent="isDragOver = false"
        @drop.prevent="onDrop"
        :class="[
          'flex-1 border-2 border-dashed rounded-3xl p-8 sm:p-14 text-center transition flex flex-col items-center justify-center my-4',
          isDragOver ? 'border-cyan-500 bg-cyan-50/50 scale-[0.99]' : 'border-slate-200 hover:border-cyan-400 bg-slate-50/50'
        ]"
      >
        <input
          ref="fileInputRef"
          type="file"
          accept="application/pdf"
          class="hidden"
          @change="onFileSelected"
        >

        <div class="w-16 h-16 bg-cyan-100/60 text-cyan-600 rounded-3xl flex items-center justify-center mb-4 shadow-sm">
          <ImageDown class="w-8 h-8" />
        </div>
        <h3 class="text-base sm:text-lg font-bold text-slate-800">
          {{ t('p2i_drop_title') }}
        </h3>
        <p class="text-xs text-slate-400 mt-1 max-w-sm">
          {{ t('p2i_drop_subtitle') }}
        </p>

        <!-- Dual-Source Import Action Buttons -->
        <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            @click="fileInputRef.click()"
            class="bg-cyan-600 hover:bg-cyan-700 active:scale-98 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition flex items-center space-x-2 shadow-md hover:shadow-cyan-600/25 cursor-pointer"
          >
            <Plus class="w-4 h-4" />
            <span>{{ t('merge_btn_from_local') || 'Add from Computer' }}</span>
          </button>

          <button
            type="button"
            @click="isVaultPickerOpen = true"
            class="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-slate-400 text-xs font-bold px-5 py-2.5 rounded-xl transition flex items-center space-x-2 shadow-2xs cursor-pointer"
          >
            <FolderLock class="w-4 h-4 text-cyan-600" />
            <span>{{ t('merge_btn_from_vault') || 'Pick from Vault' }}</span>
          </button>
        </div>
      </div>

      <!-- 2. ACTIVE WORKSPACE -->
      <div v-else class="flex-1 flex flex-col justify-between pt-4">
        <!-- Assembly Control Bar -->
        <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 shrink-0">
          <!-- Left Info Badges -->
          <div class="flex items-center space-x-2 min-w-0">
            <span class="text-xs bg-cyan-50 text-cyan-700 font-extrabold px-2.5 py-1 rounded-xl border border-cyan-200/80 shrink-0">
              {{ pages.length }} {{ t('pages_label') || 'pages' }}
            </span>
            <span class="text-xs font-bold text-slate-800 truncate max-w-[200px] sm:max-w-xs md:max-w-md" :title="filename">
              {{ filename }}
            </span>
            <span
              v-if="unlockedPassword"
              class="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md shrink-0"
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
              class="text-xs text-cyan-600 hover:bg-cyan-50 font-semibold px-2.5 py-1.5 rounded-xl border border-cyan-200 transition flex items-center space-x-1 cursor-pointer"
            >
              <RefreshCw class="w-3.5 h-3.5" />
              <span>{{ t('btn_choose_another') || 'Choose Another File' }}</span>
            </button>

            <!-- Choose From Vault -->
            <button
              @click="isVaultPickerOpen = true"
              class="text-xs text-slate-700 hover:bg-slate-100 font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 transition flex items-center space-x-1 cursor-pointer"
            >
              <FolderLock class="w-3.5 h-3.5 text-cyan-600" />
              <span>{{ t('merge_btn_from_vault') || 'Pick from Vault' }}</span>
            </button>

            <!-- Clear / Reset -->
            <button
              @click="reset"
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

        <!-- Output Configuration: Format + DPI -->
        <div class="flex flex-wrap items-center gap-x-6 gap-y-2.5 py-3 border-b border-slate-100 shrink-0">
          <!-- Image Format -->
          <div class="flex items-center space-x-2">
            <span class="text-xs text-slate-500 font-semibold shrink-0">{{ t('p2i_format_label') }}:</span>
            <div class="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200/80">
              <button
                @click="outputFormat = 'png'"
                :class="[
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1.5',
                  outputFormat === 'png' ? 'bg-white text-cyan-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                ]"
              >
                <FileImage class="w-3.5 h-3.5" />
                <span>{{ t('p2i_format_png') }}</span>
              </button>
              <button
                @click="outputFormat = 'jpg'"
                :class="[
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1.5',
                  outputFormat === 'jpg' ? 'bg-white text-cyan-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                ]"
              >
                <Image class="w-3.5 h-3.5" />
                <span>{{ t('p2i_format_jpg') }}</span>
              </button>
            </div>
          </div>

          <!-- Resolution (DPI) -->
          <div class="flex items-center space-x-2">
            <span class="text-xs text-slate-500 font-semibold shrink-0">{{ t('p2i_dpi_label') }}:</span>
            <div class="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200/80">
              <button
                @click="outputDpi = 150"
                :class="[
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer',
                  outputDpi === 150 ? 'bg-white text-cyan-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                ]"
                :title="t('p2i_dpi_standard_desc')"
              >
                {{ t('p2i_dpi_standard') }}
              </button>
              <button
                @click="outputDpi = 300"
                :class="[
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer',
                  outputDpi === 300 ? 'bg-white text-cyan-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                ]"
                :title="t('p2i_dpi_high_desc')"
              >
                {{ t('p2i_dpi_high') }}
              </button>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="flex-1 flex flex-col items-center justify-center py-20 text-center text-xs text-slate-500 font-medium">
          <Loader2 class="w-8 h-8 animate-spin mx-auto mb-3 text-cyan-600" />
          <span>{{ t('rendering_pages') }}...</span>
        </div>

        <!-- Page Thumbnail Cards Grid -->
        <div
          v-else
          class="flex-1 my-3 overflow-y-auto max-h-[460px] pr-1 grid content-start items-start grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 select-none"
        >
          <div
            v-for="(p, idx) in pages"
            :key="p.pageIndex"
            class="bg-slate-50/90 hover:bg-white rounded-2xl border border-slate-200/80 p-2.5 shadow-2xs flex flex-col items-center relative group hover:shadow-md hover:border-cyan-300 transition"
          >
            <!-- Card Header: Page Index Badge + Download Control -->
            <div class="w-full flex items-center justify-between mb-1.5">
              <span class="text-[11px] font-extrabold bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-md">
                {{ t('page_card_prefix', 'Page') }} {{ idx + 1 }}
              </span>
              <!-- Download this page as image -->
              <button
                @click="downloadPage(idx)"
                :disabled="isRenderingPage !== null || isZipping"
                :title="t('p2i_download_page')"
                class="p-1 hover:bg-cyan-100 text-slate-500 hover:text-cyan-600 rounded-md transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Loader2 v-if="isRenderingPage === idx" class="w-3.5 h-3.5 animate-spin text-cyan-600" />
                <ImageDown v-else class="w-3.5 h-3.5" />
              </button>
            </div>

            <!-- Page Canvas Preview -->
            <div class="overflow-hidden rounded-xl border border-slate-200/60 flex items-center justify-center bg-white w-full h-40 relative">
              <img
                :src="p.dataUrl"
                class="max-h-full max-w-full object-contain transition-transform duration-200"
              >
            </div>
          </div>
        </div>

        <!-- Assembly Bottom Action Bar -->
        <div class="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <!-- Left: Output Filename -->
          <div class="flex flex-wrap items-center gap-3">
            <div class="flex items-center space-x-1.5">
              <label class="text-xs text-slate-500 font-semibold shrink-0">
                {{ t('vault_field_name') }}:
              </label>
              <input
                v-model="customOutputBaseName"
                type="text"
                :placeholder="t('vault_filename_placeholder') || 'Custom output filename (optional)'"
                class="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:bg-white focus:ring-2 focus:ring-cyan-500 outline-hidden font-medium text-slate-700 w-44 sm:w-64"
              >
            </div>
          </div>

          <!-- Right: Big Primary Export Button (All pages as ZIP) -->
          <button
            :disabled="isZipping || isLoading || isRenderingPage !== null || pages.length === 0"
            @click="downloadAllAsZip"
            class="bg-cyan-600 hover:bg-cyan-700 active:scale-98 text-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl transition flex items-center justify-center space-x-2 shadow-lg hover:shadow-cyan-600/25 disabled:opacity-50 cursor-pointer ml-auto"
          >
            <template v-if="!isZipping">
              <span>{{ t('p2i_download_all') }}</span>
              <Package class="w-4 h-4" />
            </template>
            <template v-else>
              <span>{{ t('p2i_zipping') }} ({{ zipProgress }}%)</span>
              <Loader2 class="w-4 h-4 animate-spin" />
            </template>
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
import { ref, onMounted, onActivated, onDeactivated } from 'vue';
import {
  ImageDown,
  Image,
  FileImage,
  Package,
  Plus,
  Loader2,
  FolderLock,
  Unlock,
  RefreshCw
} from 'lucide-vue-next';
import * as pdfjsLib from 'pdfjs-dist';
import { t } from '../i18n';
import { triggerDownload } from '../utils/download';
import { createAndDownloadZip } from '../utils/zipUtils';
import { verifyPdfSecurity } from '../utils/pdfSecurity';
import { consumePendingFile } from '../utils/toolBridge';
import { userSettings } from '../utils/userSettings';
import { logger } from '../utils/logger';
import PasswordModal from '../components/PasswordModal.vue';
import VaultFilePickerModal from '../components/VaultFilePickerModal.vue';

const fileInputRef = ref(null);
const docBytes = ref(null);
const filename = ref('');
const pages = ref([]);
const isDragOver = ref(false);
const isLoading = ref(false);
const isZipping = ref(false);
const zipProgress = ref(0);
const isRenderingPage = ref(null);
const isVaultPickerOpen = ref(false);

// Output Configuration
const outputFormat = ref('png');  // 'png' | 'jpg'
const outputDpi = ref(150);       // 150 (Standard) | 300 (Print)
const JPG_QUALITY = 0.92;

const customOutputBaseName = ref('');

// Password Unlock State
const isPasswordOpen = ref(false);
const passwordError = ref('');
const isUnlocking = ref(false);
const pendingFileName = ref('');
let pendingFileObj = null;
let unlockedPassword = '';

// Live pdf.js document handle for on-demand high-DPI re-rendering
let pdfDoc = null;

async function destroyPdfDoc() {
  if (pdfDoc) {
    try {
      await pdfDoc.destroy();
    } catch (e) {}
    pdfDoc = null;
  }
}

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
  if (file) loadFile(file);
}

async function loadFile(file, password = '') {
  filename.value = file.name;
  pendingFileName.value = file.name;
  pendingFileObj = file;
  isLoading.value = true;

  const prefix = userSettings.defaultExportPrefix || 'PDFSeal_Images_';
  const cleanBase = file.name.replace(/\.pdf$/i, '');
  customOutputBaseName.value = `${prefix}${cleanBase}`;

  const rawBuffer = await file.arrayBuffer();

  // Strict encryption detection & validation
  const security = await verifyPdfSecurity(rawBuffer, password);
  if (security.isEncrypted && (!security.isValid || (security.isOpenPasswordRequired && !password))) {
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
    await destroyPdfDoc();
    const pdfDataForViewer = new Uint8Array(rawBuffer.slice(0));
    const loadingTask = pdfjsLib.getDocument({
      data: pdfDataForViewer,
      password: password || undefined,
      cMapUrl: typeof window !== 'undefined' ? (window.location.origin + '/cmaps/') : '/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: typeof window !== 'undefined' ? (window.location.origin + '/standard_fonts/') : '/standard_fonts/'
    });

    pdfDoc = await loadingTask.promise;
    pages.value = [];
    unlockedPassword = password;
    isPasswordOpen.value = false;
    passwordError.value = '';

    // Lightweight thumbnails only; full-DPI rendering happens on demand at export time
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: 0.6 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({
        canvasContext: ctx,
        viewport,
        intent: 'display'
      }).promise;

      pages.value.push({
        pageIndex: i - 1,
        dataUrl: canvas.toDataURL()
      });
    }

    logger.info('PDF_TO_IMAGE', `Loaded ${pdfDoc.numPages} pages from ${file.name}`);
  } catch (err) {
    if (err.name === 'PasswordException' || err.message?.toLowerCase().includes('password')) {
      docBytes.value = null; // Clear until unlocked
      isPasswordOpen.value = true;
      if (password) {
        passwordError.value = t('pwd_error_wrong');
      }
    } else {
      logger.error('PDF_TO_IMAGE', `Failed to load PDF: ${err.message}`);
      alert(t('p2i_err_load') + ' ' + err.message);
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

function getExt() {
  return outputFormat.value === 'jpg' ? 'jpg' : 'png';
}

function getMimeType() {
  return outputFormat.value === 'jpg' ? 'image/jpeg' : 'image/png';
}

function getBaseName() {
  return (customOutputBaseName.value?.trim() || `PDFSeal_Images_${Date.now()}`).replace(/\.pdf$/i, '');
}

/**
 * Renders a single page at the currently selected DPI and returns a Blob.
 * White background is pre-filled so transparent PDF regions stay readable
 * (JPEG has no alpha channel; PNG gets consistent output too).
 */
async function renderPageBlob(pageIndex) {
  if (!pdfDoc) throw new Error('No PDF document loaded');
  const page = await pdfDoc.getPage(pageIndex + 1);
  const viewport = page.getViewport({ scale: outputDpi.value / 72 });
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({
    canvasContext: ctx,
    viewport,
    intent: 'print'
  }).promise;

  const mime = getMimeType();
  const quality = outputFormat.value === 'jpg' ? JPG_QUALITY : undefined;
  return await new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('canvas.toBlob returned null'))),
      mime,
      quality
    );
  });
}

async function downloadPage(idx) {
  const item = pages.value[idx];
  if (!item || isRenderingPage.value !== null || isZipping.value) return;
  isRenderingPage.value = idx;
  try {
    const blob = await renderPageBlob(item.pageIndex);
    const pageNum = String(idx + 1).padStart(2, '0');
    const outName = `${getBaseName()}_page_${pageNum}.${getExt()}`;
    triggerDownload(blob, outName);
    logger.info('PDF_TO_IMAGE', `Exported page ${idx + 1} as ${outputFormat.value.toUpperCase()} ${outputDpi.value} DPI: ${outName} (${(blob.size / 1024).toFixed(1)} KB)`);
  } catch (err) {
    logger.error('PDF_TO_IMAGE', `Failed to export page ${idx + 1}: ${err.message}`);
    alert(t('p2i_err_export') + ' ' + err.message);
  } finally {
    isRenderingPage.value = null;
  }
}

async function downloadAllAsZip() {
  if (!pdfDoc || pages.value.length === 0 || isZipping.value || isRenderingPage.value !== null) return;
  isZipping.value = true;
  zipProgress.value = 0;
  try {
    const ext = getExt();
    const files = [];
    for (let i = 0; i < pages.value.length; i++) {
      const blob = await renderPageBlob(pages.value[i].pageIndex);
      const pageNum = String(i + 1).padStart(2, '0');
      files.push({ name: `${getBaseName()}_page_${pageNum}.${ext}`, data: blob });
    }

    const zipName = `${getBaseName()}_Images.zip`;
    await createAndDownloadZip(files, zipName, (pct) => {
      zipProgress.value = pct;
    });
    logger.info('PDF_TO_IMAGE', `Exported ${files.length} pages as ZIP: ${zipName}`);
  } catch (err) {
    logger.error('PDF_TO_IMAGE', `Failed to export ZIP bundle: ${err.message}`);
    alert(t('p2i_err_export') + ' ' + err.message);
  } finally {
    isZipping.value = false;
    zipProgress.value = 0;
  }
}

async function reset() {
  docBytes.value = null;
  pages.value = [];
  unlockedPassword = '';
  customOutputBaseName.value = '';
  isRenderingPage.value = null;
  isZipping.value = false;
  await destroyPdfDoc();
}

function checkIncomingFile() {
  const incoming = consumePendingFile('pdf_to_image');
  if (incoming) {
    const file = new File([incoming.arrayBuffer], incoming.name, { type: 'application/pdf' });
    loadFile(file, incoming.password || '');
  }
}

onMounted(checkIncomingFile);
onActivated(checkIncomingFile);
onDeactivated(() => {
  // Free the pdf.js worker resources when navigating away (KeepAlive safe)
  destroyPdfDoc();
});
</script>
