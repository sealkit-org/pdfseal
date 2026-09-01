<template>
  <section class="tool-panel w-full">
    <div class="mb-5 text-center max-w-xl mx-auto">
      <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{{ t('watermark_title') }}</h2>
      <p class="text-sm text-slate-600 mt-1">{{ t('watermark_desc') }}</p>
    </div>

    <!-- Dropzone -->
    <div 
      v-if="!docBytes"
      @dragover.prevent="isDragOver = true"
      @dragleave.prevent="isDragOver = false"
      @drop.prevent="onDrop"
      :class="[
        'border-2 border-dashed rounded-3xl p-12 text-center transition cursor-pointer shadow-xs max-w-3xl mx-auto bg-white',
        isDragOver ? 'border-amber-500 bg-amber-50/50' : 'border-slate-300 hover:border-amber-500'
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
      <div class="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
        <Stamp class="w-8 h-8" />
      </div>
      <h3 class="text-base font-bold text-slate-800">{{ t('watermark_drop_title') }}</h3>
      <p class="text-xs text-slate-500 mt-1">{{ t('watermark_drop_subtitle') }}</p>
      <button 
        type="button" 
        class="mt-4 inline-flex items-center space-x-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition shadow-sm"
      >
        <FileUp class="w-4 h-4" />
        <span>{{ t('btn_choose_pdf') }}</span>
      </button>
    </div>

    <!-- Workspace (Expanded Grid on Large Screens) -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
      <!-- Left Controls (4 cols on lg) -->
      <div class="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <div class="flex items-center space-x-2 font-bold text-slate-800 text-sm">
            <Sliders class="w-4 h-4 text-amber-600" />
            <span>{{ t('wm_controls') }}</span>
            <span v-if="unlockedPassword" class="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
              🔒 Unlocked
            </span>
          </div>
          <button @click="reset" class="text-xs text-rose-600 hover:underline">
            {{ t('btn_reset_file') }}
          </button>
        </div>

        <!-- Watermark Text Input -->
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5">{{ t('wm_text_label') }}</label>
          <input 
            v-model="wmText" 
            @input="renderPreview"
            type="text" 
            placeholder="e.g. CONFIDENTIAL"
            class="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-amber-500 focus:bg-white outline-hidden font-medium"
          >
        </div>

        <!-- Size & Opacity -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <div class="flex justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>{{ t('wm_size_label') }}</span>
              <span class="text-slate-500">{{ wmSize }}px</span>
            </div>
            <input 
              v-model.number="wmSize" 
              @input="renderPreview"
              type="range" 
              min="16" 
              max="96" 
              class="w-full accent-amber-600"
            >
          </div>
          <div>
            <div class="flex justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>{{ t('wm_opacity_label') }}</span>
              <span class="text-slate-500">{{ wmOpacity }}%</span>
            </div>
            <input 
              v-model.number="wmOpacity" 
              @input="renderPreview"
              type="range" 
              min="5" 
              max="90" 
              class="w-full accent-amber-600"
            >
          </div>
        </div>

        <!-- Rotation Angle Presets -->
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5">{{ t('wm_rotation_label') }}</label>
          <div class="grid grid-cols-3 gap-2">
            <button 
              @click="setAngle(-45)"
              :class="[
                'text-xs py-2 rounded-xl border transition font-medium',
                wmAngle === -45 ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              ]"
            >
              {{ t('wm_angle_diag_neg') }}
            </button>
            <button 
              @click="setAngle(0)"
              :class="[
                'text-xs py-2 rounded-xl border transition font-medium',
                wmAngle === 0 ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              ]"
            >
              {{ t('wm_angle_horiz') }}
            </button>
            <button 
              @click="setAngle(45)"
              :class="[
                'text-xs py-2 rounded-xl border transition font-medium',
                wmAngle === 45 ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              ]"
            >
              {{ t('wm_angle_diag_pos') }}
            </button>
          </div>
        </div>

        <!-- Color Palette -->
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5">{{ t('wm_color_preset') }}</label>
          <div class="flex items-center space-x-3">
            <button 
              v-for="color in colorPresets" 
              :key="color"
              @click="setColor(color)"
              :style="{ backgroundColor: color }"
              :class="[
                'w-8 h-8 rounded-full ring-2 ring-offset-2 transition',
                wmColor === color ? 'ring-slate-900 scale-110' : 'ring-transparent'
              ]"
            ></button>
          </div>
        </div>

        <div class="pt-3 border-t border-slate-100">
          <button 
            :disabled="isProcessing || isLoading"
            @click="executeWatermark"
            class="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-3.5 rounded-xl transition flex items-center justify-center space-x-2 shadow-md hover:shadow-amber-600/25 disabled:opacity-50 active:scale-98"
          >
            <span v-if="!isProcessing">{{ t('stamp_and_download') }}</span>
            <span v-else>{{ t('stamping_state') }}</span>
            <Download v-if="!isProcessing" class="w-4 h-4" />
            <Loader2 v-else class="w-4 h-4 animate-spin" />
          </button>
        </div>
      </div>

      <!-- Right Live Canvas Preview (8 cols on lg) -->
      <div class="lg:col-span-8 bg-slate-200/70 rounded-3xl p-6 sm:p-8 border border-slate-300/80 flex flex-col items-center justify-center min-h-[550px]">
        <div class="flex items-center space-x-2 text-xs font-bold text-slate-600 mb-4 self-start">
          <span class="w-2 h-2 rounded-full bg-amber-500"></span>
          <span>{{ t('live_preview') }}</span>
        </div>
        <div class="bg-white p-2 rounded-2xl shadow-xl border border-slate-200/90 max-w-full overflow-hidden flex items-center justify-center">
          <canvas ref="previewCanvasRef" class="max-h-[620px] max-w-full object-contain rounded-lg"></canvas>
        </div>
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
import { Stamp, FileUp, Sliders, Download, Loader2 } from 'lucide-vue-next';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { t } from '../i18n';
import { triggerDownload } from '../utils/download';
import { verifyPdfSecurity } from '../utils/pdfSecurity';
import PasswordModal from '../components/PasswordModal.vue';

const fileInputRef = ref(null);
const previewCanvasRef = ref(null);
const docBytes = ref(null);
const isDragOver = ref(false);
const isProcessing = ref(false);

const wmText = ref('CONFIDENTIAL');
const wmSize = ref(48);
const wmOpacity = ref(30);
const wmAngle = ref(-45);
const wmColor = ref('#dc2626');
const colorPresets = ['#dc2626', '#475569', '#2563eb', '#059669'];

const isLoading = ref(false);

// Password State
const isPasswordOpen = ref(false);
const passwordError = ref('');
const isUnlocking = ref(false);
const pendingFileName = ref('');
let pendingFileObj = null;
let unlockedPassword = '';

let page1Canvas = null;

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
    const page1 = await pdf.getPage(1);
    const viewport = page1.getViewport({ scale: 1.2 });

    page1Canvas = document.createElement('canvas');
    const ctx = page1Canvas.getContext('2d');
    page1Canvas.width = viewport.width;
    page1Canvas.height = viewport.height;
    await page1.render({ canvasContext: ctx, viewport }).promise;

    unlockedPassword = password;
    isPasswordOpen.value = false;
    passwordError.value = '';

    renderPreview();
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

function setAngle(deg) {
  wmAngle.value = deg;
  renderPreview();
}

function setColor(hex) {
  wmColor.value = hex;
  renderPreview();
}

function renderPreview() {
  if (!page1Canvas || !previewCanvasRef.value) return;

  const canvas = previewCanvasRef.value;
  const ctx = canvas.getContext('2d');
  canvas.width = page1Canvas.width;
  canvas.height = page1Canvas.height;

  // 1. Draw page 1 original content
  ctx.drawImage(page1Canvas, 0, 0);

  // 2. Draw watermark layer on top
  if (!wmText.value.trim()) return;

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((wmAngle.value * Math.PI) / 180);
  ctx.font = `bold ${wmSize.value * 1.2}px sans-serif`;
  ctx.fillStyle = wmColor.value;
  ctx.globalAlpha = wmOpacity.value / 100;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(wmText.value, 0, 0);
  ctx.restore();
}

function reset() {
  docBytes.value = null;
  page1Canvas = null;
  unlockedPassword = '';
}

function hexToRgb01(hex) {
  const num = parseInt(hex.replace('#', ''), 16);
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255
  };
}

async function executeWatermark() {
  if (!docBytes.value) return;
  isProcessing.value = true;
  try {
    const pdfDoc = await PDFDocument.load(docBytes.value, {
      password: unlockedPassword || undefined,
      ignoreEncryption: !unlockedPassword
    });
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();
    const color = hexToRgb01(wmColor.value);

    for (const page of pages) {
      const { width, height } = page.getSize();
      const textWidth = helveticaFont.widthOfTextAtSize(wmText.value, wmSize.value);
      const textHeight = helveticaFont.heightAtSize(wmSize.value);

      page.drawText(wmText.value, {
        x: width / 2 - textWidth / 2,
        y: height / 2 - textHeight / 2,
        size: wmSize.value,
        font: helveticaFont,
        color: rgb(color.r, color.g, color.b),
        opacity: wmOpacity.value / 100,
        rotate: degrees(wmAngle.value)
      });
    }

    const outBytes = await pdfDoc.save();
    triggerDownload(new Blob([outBytes], { type: 'application/pdf' }), `PDFSeal_Watermarked_${Date.now()}.pdf`);
  } catch (err) {
    alert('Failed to stamp watermark: ' + err.message);
  } finally {
    isProcessing.value = false;
  }
}
</script>
