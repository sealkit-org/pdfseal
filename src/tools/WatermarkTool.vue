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

    <!-- Workspace (Expanded Grid) -->
    <div v-else class="w-full">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        <!-- Left Controls (4 cols on lg) -->
        <div class="lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 class="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
              <Sliders class="w-4 h-4 text-amber-600" />
              <span>{{ t('wm_controls') }}</span>
            </h4>
            <button @click="reset" class="text-xs text-slate-400 hover:text-rose-600 font-medium">
              {{ t('btn_reset_file') }}
            </button>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">{{ t('wm_text_label') }}</label>
            <input 
              type="text" 
              v-model="wmText" 
              @input="renderPreview"
              class="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-amber-500 outline-hidden font-bold"
            >
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">{{ t('wm_size_label') }} ({{ wmSize }}px)</label>
              <input 
                type="range" 
                min="16" 
                max="100" 
                v-model.number="wmSize" 
                @input="renderPreview"
                class="w-full accent-amber-600"
              >
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">{{ t('wm_opacity_label') }} ({{ wmOpacity }}%)</label>
              <input 
                type="range" 
                min="5" 
                max="90" 
                v-model.number="wmOpacity" 
                @input="renderPreview"
                class="w-full accent-amber-600"
              >
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">{{ t('wm_rotation_label') }}</label>
            <div class="grid grid-cols-3 gap-2 text-xs">
              <button 
                type="button" 
                @click="setAngle(-45)"
                :class="[
                  'py-2 rounded-lg font-medium transition',
                  wmAngle === -45 ? 'bg-amber-50 text-amber-800 border border-amber-300 shadow-xs' : 'bg-slate-100 text-slate-700'
                ]"
              >
                {{ t('wm_angle_diag_neg') }}
              </button>
              <button 
                type="button" 
                @click="setAngle(0)"
                :class="[
                  'py-2 rounded-lg font-medium transition',
                  wmAngle === 0 ? 'bg-amber-50 text-amber-800 border border-amber-300 shadow-xs' : 'bg-slate-100 text-slate-700'
                ]"
              >
                {{ t('wm_angle_horiz') }}
              </button>
              <button 
                type="button" 
                @click="setAngle(45)"
                :class="[
                  'py-2 rounded-lg font-medium transition',
                  wmAngle === 45 ? 'bg-amber-50 text-amber-800 border border-amber-300 shadow-xs' : 'bg-slate-100 text-slate-700'
                ]"
              >
                {{ t('wm_angle_diag_pos') }}
              </button>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">{{ t('wm_color_preset') }}</label>
            <div class="flex items-center space-x-3 pt-1">
              <button 
                v-for="color in colorPresets" 
                :key="color"
                type="button"
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
              <span v-else>Stamping...</span>
              <Download v-if="!isProcessing" class="w-4 h-4" />
              <Loader2 v-else class="w-4 h-4 animate-spin" />
            </button>
          </div>
        </div>

        <!-- Right Live Canvas Preview (8 cols on lg) -->
        <div class="lg:col-span-8 bg-slate-200/70 rounded-3xl p-6 sm:p-8 border border-slate-300/80 flex flex-col items-center justify-center min-h-[550px]">
          <span class="text-xs font-semibold text-slate-500 mb-4 bg-white/70 px-3 py-1 rounded-full border border-slate-200/80 shadow-2xs">
            {{ t('live_preview') }}
          </span>
          <div class="relative bg-white shadow-xl rounded-xl overflow-hidden border border-slate-300/80 flex items-center justify-center">
            <canvas ref="previewCanvasRef" class="max-w-full max-h-[620px] object-contain block"></canvas>
          </div>
        </div>

      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue';
import { Stamp, FileUp, Sliders, Download, Loader2 } from 'lucide-vue-next';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { t } from '../i18n';
import { triggerDownload } from '../utils/download';

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

async function loadFile(file) {
  isLoading.value = true;
  const rawBuffer = await file.arrayBuffer();
  docBytes.value = new Uint8Array(rawBuffer);
  try {
    const pdfDataForViewer = new Uint8Array(rawBuffer.slice(0));
    const pdf = await pdfjsLib.getDocument({ data: pdfDataForViewer }).promise;
    const page1 = await pdf.getPage(1);
    const viewport = page1.getViewport({ scale: 1.2 });

    page1Canvas = document.createElement('canvas');
    const ctx = page1Canvas.getContext('2d');
    page1Canvas.width = viewport.width;
    page1Canvas.height = viewport.height;
    await page1.render({ canvasContext: ctx, viewport }).promise;

    renderPreview();
  } catch (err) {
    alert('Failed to load PDF: ' + err.message);
  } finally {
    isLoading.value = false;
  }
}

function setAngle(deg) {
  wmAngle.value = deg;
  renderPreview();
}

function setColor(hex) {
  wmColor.value = hex;
  renderPreview();
}

function reset() {
  docBytes.value = null;
  page1Canvas = null;
}

function renderPreview() {
  if (!page1Canvas || !previewCanvasRef.value) return;
  const canvas = previewCanvasRef.value;
  const ctx = canvas.getContext('2d');
  canvas.width = page1Canvas.width;
  canvas.height = page1Canvas.height;

  // Draw background page
  ctx.drawImage(page1Canvas, 0, 0);

  // Draw watermark
  const opacity = wmOpacity.value / 100;
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((wmAngle.value * Math.PI) / 180);
  ctx.globalAlpha = opacity;
  ctx.fillStyle = wmColor.value;
  ctx.font = `bold ${wmSize.value * 1.5}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(wmText.value || 'CONFIDENTIAL', 0, 0);
  ctx.restore();
}

async function executeWatermark() {
  if (!docBytes.value) return;
  isProcessing.value = true;
  try {
    const pdfDoc = await PDFDocument.load(docBytes.value);
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const text = wmText.value || 'CONFIDENTIAL';
    const size = wmSize.value;
    const opacity = wmOpacity.value / 100;

    const r = parseInt(wmColor.value.slice(1, 3), 16) / 255;
    const g = parseInt(wmColor.value.slice(3, 5), 16) / 255;
    const b = parseInt(wmColor.value.slice(5, 7), 16) / 255;

    const pages = pdfDoc.getPages();
    for (const page of pages) {
      const { width, height } = page.getSize();
      page.drawText(text, {
        x: width / 2 - (font.widthOfTextAtSize(text, size) / 2) * Math.cos((wmAngle.value * Math.PI) / 180),
        y: height / 2 - (size / 2) * Math.sin((wmAngle.value * Math.PI) / 180),
        size: size,
        font: font,
        color: rgb(r, g, b),
        opacity: opacity,
        rotate: degrees(wmAngle.value),
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
