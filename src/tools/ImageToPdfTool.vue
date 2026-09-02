<template>
  <section class="w-full flex-1 flex flex-col">
    <!-- Main Assembly Container -->
    <div class="bg-white rounded-3xl p-5 sm:p-7 shadow-xl border border-slate-100 flex flex-col flex-1">
      <!-- Top Title Header -->
      <div class="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold shrink-0 shadow-2xs">
            <Images class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
              {{ t('img2pdf_title') }}
            </h2>
            <p class="text-xs text-slate-400 font-medium hidden sm:block mt-0.5">
              {{ t('img2pdf_desc') }}
            </p>
          </div>
        </div>

        <div class="text-xs text-slate-400 font-mono hidden md:flex items-center space-x-1.5">
          <Lock class="w-3.5 h-3.5 text-emerald-600" />
          <span>{{ t('processed_locally') }}</span>
        </div>
      </div>

      <!-- 1. EMPTY STATE DROPZONE (Spacious Multi-image selector) -->
      <div 
        v-if="imageList.length === 0"
        @dragover.prevent="isDragOver = true"
        @dragleave.prevent="isDragOver = false"
        @drop.prevent="onDrop"
        :class="[
          'flex-1 border-2 border-dashed rounded-3xl p-8 sm:p-14 text-center transition flex flex-col items-center justify-center my-4',
          isDragOver ? 'border-violet-500 bg-violet-50/50 scale-[0.99]' : 'border-slate-200 hover:border-violet-400 bg-slate-50/50'
        ]"
      >
        <input 
          ref="fileInputRef" 
          type="file" 
          accept="image/jpeg,image/png,image/webp,image/gif" 
          multiple
          class="hidden" 
          @change="onFilesSelected" 
        >

        <div class="w-16 h-16 bg-violet-100/60 text-violet-600 rounded-3xl flex items-center justify-center mb-4 shadow-sm">
          <Images class="w-8 h-8" />
        </div>
        <h3 class="text-base sm:text-lg font-bold text-slate-800">
          {{ t('img2pdf_drop_title') }}
        </h3>
        <p class="text-xs text-slate-400 mt-1 max-w-sm">
          {{ t('img2pdf_drop_subtitle') }}
        </p>

        <!-- Action Button -->
        <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button 
            type="button" 
            @click="fileInputRef.click()"
            class="bg-violet-600 hover:bg-violet-700 active:scale-98 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition flex items-center space-x-2 shadow-md hover:shadow-violet-600/25 cursor-pointer"
          >
            <Plus class="w-4 h-4" />
            <span>{{ t('img2pdf_btn_choose') || '选择图片' }}</span>
          </button>
        </div>
      </div>

      <!-- 2. ACTIVE ASSEMBLY WORKSPACE -->
      <div v-else class="flex-1 flex flex-col justify-between pt-3">
        <!-- Top Toolbar -->
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div class="flex items-center space-x-3">
            <span class="text-xs font-bold text-slate-800">
              已选 <span class="font-mono text-violet-600">{{ imageList.length }}</span> 张图片
            </span>
            <button 
              @click="fileInputRef.click()"
              class="text-xs text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 font-bold px-3 py-1 rounded-xl transition flex items-center space-x-1 cursor-pointer"
            >
              <Plus class="w-3.5 h-3.5" />
              <span>继续添加</span>
            </button>
            <input 
              ref="fileInputRef" 
              type="file" 
              accept="image/jpeg,image/png,image/webp,image/gif" 
              multiple
              class="hidden" 
              @change="onFilesSelected" 
            >
          </div>

          <button 
            @click="clearAll" 
            class="text-xs text-slate-400 hover:text-rose-600 font-semibold px-2.5 py-1 rounded-lg hover:bg-rose-50 transition cursor-pointer"
          >
            清空全部
          </button>
        </div>

        <!-- Main Workspace (Left: Image Card Grid, Right: Layout Settings) -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 py-3 flex-1 min-h-[440px]">
          <!-- Left: Image Cards (8 cols) -->
          <div class="lg:col-span-8 bg-slate-50/70 rounded-2xl p-3 sm:p-4 border border-slate-200/80 overflow-y-auto max-h-[500px]">
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div 
                v-for="(img, idx) in imageList" 
                :key="img.id"
                draggable="true"
                @dragstart="onDragStart(idx)"
                @dragover.prevent
                @drop="onDropReorder(idx)"
                class="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-2xs hover:border-violet-400 hover:shadow-md transition flex flex-col justify-between group relative"
              >
                <!-- Page Number Tag -->
                <div class="absolute top-2 left-2 z-10 bg-slate-900/75 backdrop-blur-xs text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md">
                  P{{ idx + 1 }}
                </div>

                <!-- Delete Button -->
                <button 
                  @click.stop="removeImage(idx)"
                  class="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-rose-500/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer hover:bg-rose-600"
                  title="删除"
                >
                  <X class="w-3 h-3" />
                </button>

                <!-- Thumbnail -->
                <div class="h-32 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center relative mb-2">
                  <img 
                    :src="img.previewUrl" 
                    :style="{ transform: `rotate(${img.rotation}deg)` }"
                    class="max-h-full max-w-full object-contain transition-transform duration-200 pointer-events-none"
                  >
                </div>

                <!-- Info & Actions -->
                <div class="space-y-1.5">
                  <p class="text-[11px] font-bold text-slate-700 truncate" :title="img.name">
                    {{ img.name }}
                  </p>
                  <div class="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{{ (img.file.size / 1024).toFixed(0) }} KB</span>
                    <span>{{ img.width }}x{{ img.height }}</span>
                  </div>

                  <!-- Quick Controls -->
                  <div class="flex items-center justify-between pt-1 border-t border-slate-100">
                    <div class="flex items-center space-x-1">
                      <button 
                        @click="moveImage(idx, -1)" 
                        :disabled="idx === 0"
                        class="p-1 rounded-md hover:bg-slate-100 disabled:opacity-20 transition text-slate-500 cursor-pointer"
                        title="前移"
                      >
                        <ChevronLeft class="w-3.5 h-3.5" />
                      </button>
                      <button 
                        @click="moveImage(idx, 1)" 
                        :disabled="idx === imageList.length - 1"
                        class="p-1 rounded-md hover:bg-slate-100 disabled:opacity-20 transition text-slate-500 cursor-pointer"
                        title="后移"
                      >
                        <ChevronRight class="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button 
                      @click="rotateImage(idx)"
                      class="p-1 rounded-md hover:bg-violet-50 text-violet-600 transition flex items-center space-x-0.5 cursor-pointer text-[10px] font-semibold"
                      title="顺时针旋转90°"
                    >
                      <RotateCw class="w-3 h-3" />
                      <span>90°</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: Page & Layout Settings (4 cols) -->
          <div class="lg:col-span-4 bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 flex flex-col justify-between space-y-4">
            <div class="space-y-4">
              <!-- Page Size -->
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-2">
                  {{ t('img2pdf_page_size') }}
                </label>
                <div class="space-y-1.5">
                  <label 
                    v-for="ps in pageSizeOptions" 
                    :key="ps.id"
                    @click="pageSize = ps.id"
                    :class="[
                      'p-2.5 rounded-xl border flex items-center justify-between text-xs transition cursor-pointer',
                      pageSize === ps.id ? 'bg-violet-50 border-violet-400 text-violet-900 font-bold ring-1 ring-violet-300' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    ]"
                  >
                    <span>{{ ps.label }}</span>
                    <span class="text-[10px] text-slate-400 font-sans">{{ ps.desc }}</span>
                  </label>
                </div>
              </div>

              <!-- Orientation -->
              <div v-if="pageSize !== 'fit'">
                <label class="block text-xs font-bold text-slate-700 mb-2">
                  {{ t('img2pdf_orientation') }}
                </label>
                <div class="grid grid-cols-3 gap-1.5">
                  <button 
                    v-for="o in orientationOptions" 
                    :key="o.id"
                    @click="orientation = o.id"
                    :class="[
                      'py-2 rounded-xl text-xs text-center border font-semibold transition cursor-pointer',
                      orientation === o.id ? 'bg-violet-50 border-violet-400 text-violet-900 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    ]"
                  >
                    {{ o.label }}
                  </button>
                </div>
              </div>

              <!-- Margin -->
              <div v-if="pageSize !== 'fit'">
                <label class="block text-xs font-bold text-slate-700 mb-2">
                  {{ t('img2pdf_margin') }}
                </label>
                <div class="grid grid-cols-3 gap-1.5">
                  <button 
                    v-for="m in marginOptions" 
                    :key="m.id"
                    @click="margin = m.id"
                    :class="[
                      'py-2 rounded-xl text-xs text-center border font-semibold transition cursor-pointer',
                      margin === m.id ? 'bg-violet-50 border-violet-400 text-violet-900 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    ]"
                  >
                    {{ m.label }}
                  </button>
                </div>
              </div>
            </div>

            <div class="p-2.5 rounded-xl bg-violet-50/60 border border-violet-100 text-[11px] text-violet-900 leading-relaxed">
              💡 提示：欧美报税或政府申请建议选择 <strong>US Letter</strong> 或 <strong>A4</strong>，普通拍照展示选择 <strong>适应原图</strong>。
            </div>
          </div>
        </div>

        <!-- Bottom Execution & Output Settings Bar -->
        <div class="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
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
                class="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:bg-white focus:ring-2 focus:ring-violet-500 outline-hidden font-medium text-slate-700 w-44 sm:w-56"
              >
            </div>

            <!-- Auto-save to Vault Checkbox -->
            <label class="flex items-center space-x-1.5 text-xs text-slate-600 cursor-pointer select-none">
              <input 
                type="checkbox" 
                v-model="autoSaveToVault"
                class="w-3.5 h-3.5 rounded-sm border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
              >
              <FolderLock class="w-3.5 h-3.5 text-violet-600" />
              <span>{{ t('vault_autosave_checkbox') }}</span>
            </label>
          </div>

          <!-- Main Export Action Button -->
          <button 
            @click="executeExport" 
            :disabled="isProcessing || imageList.length === 0"
            class="w-full sm:w-auto bg-violet-600 hover:bg-violet-700 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold px-6 py-2.5 rounded-xl transition flex items-center justify-center space-x-2 shadow-md hover:shadow-violet-600/25 cursor-pointer"
          >
            <Loader2 v-if="isProcessing" class="w-4 h-4 animate-spin" />
            <FileDown v-else class="w-4 h-4" />
            <span>{{ t('img2pdf_btn_action') }} ({{ imageList.length }})</span>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { 
  Images, 
  Plus, 
  Lock, 
  FolderLock, 
  X, 
  RotateCw, 
  ChevronLeft, 
  ChevronRight, 
  FileDown, 
  Loader2 
} from 'lucide-vue-next';
import { PDFDocument } from 'pdf-lib';
import { t } from '../i18n';
import { triggerDownload } from '../utils/download';
import { saveFile } from '../utils/vaultDb';
import { userSettings } from '../utils/userSettings';
import { logger } from '../utils/logger';

const fileInputRef = ref(null);
const isDragOver = ref(false);
const isProcessing = ref(false);

// Image item: { id, file, name, previewUrl, width, height, rotation }
const imageList = ref([]);

// Layout configurations
const pageSize = ref('a4'); // 'a4' | 'letter' | 'fit'
const orientation = ref('auto'); // 'auto' | 'portrait' | 'landscape'
const margin = ref('standard'); // 'none' | 'small' | 'standard'

const pageSizeOptions = computed(() => [
  { id: 'a4', label: t('img2pdf_size_a4') || 'A4 (全球/欧洲标准)', desc: '210 × 297 mm' },
  { id: 'letter', label: t('img2pdf_size_letter') || 'US Letter (北美/美国标准)', desc: '8.5 × 11 in' },
  { id: 'fit', label: t('img2pdf_size_fit') || '适应原图 (无变形)', desc: '按原图比例' }
]);

const orientationOptions = computed(() => [
  { id: 'auto', label: t('img2pdf_orient_auto') || '自适应' },
  { id: 'portrait', label: t('img2pdf_orient_portrait') || '纵向' },
  { id: 'landscape', label: t('img2pdf_orient_landscape') || '横向' }
]);

const marginOptions = computed(() => [
  { id: 'none', label: t('img2pdf_margin_none') || '无边距' },
  { id: 'small', label: t('img2pdf_margin_small') || '紧凑' },
  { id: 'standard', label: t('img2pdf_margin_standard') || '标准' }
]);

// Export Settings
const customOutputBaseName = ref('');
const autoSaveToVault = ref(userSettings.autoSaveToVault);

watch(() => userSettings.autoSaveToVault, (newVal) => {
  autoSaveToVault.value = Boolean(newVal);
}, { immediate: true });

const defaultFileNamePlaceholder = computed(() => {
  const prefix = userSettings.defaultExportPrefix || 'PDFSeal';
  return `${prefix}_Images_${Date.now()}`;
});

async function onFilesSelected(e) {
  const files = Array.from(e.target.files || []);
  if (files.length > 0) {
    await processAddedFiles(files);
  }
  e.target.value = '';
}

async function onDrop(e) {
  isDragOver.value = false;
  const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
  if (files.length > 0) {
    await processAddedFiles(files);
  }
}

async function processAddedFiles(files) {
  for (const f of files) {
    const previewUrl = URL.createObjectURL(f);
    const { width, height } = await getImageDimensions(previewUrl);
    imageList.value.push({
      id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      file: f,
      name: f.name,
      previewUrl,
      width,
      height,
      rotation: 0
    });
  }

  if (!customOutputBaseName.value) {
    const prefix = userSettings.defaultExportPrefix || 'PDFSeal';
    const firstClean = imageList.value[0]?.name.replace(/\.[^/.]+$/, '') || 'Document';
    customOutputBaseName.value = `${prefix}_${firstClean}`;
  }
}

function getImageDimensions(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 800, height: 600 });
    img.src = url;
  });
}

function removeImage(idx) {
  const removed = imageList.value.splice(idx, 1);
  if (removed[0]?.previewUrl) {
    URL.revokeObjectURL(removed[0].previewUrl);
  }
}

function clearAll() {
  imageList.value.forEach(img => URL.revokeObjectURL(img.previewUrl));
  imageList.value = [];
  customOutputBaseName.value = '';
}

function rotateImage(idx) {
  const item = imageList.value[idx];
  if (item) {
    item.rotation = (item.rotation + 90) % 360;
  }
}

function moveImage(idx, delta) {
  const target = idx + delta;
  if (target < 0 || target >= imageList.value.length) return;
  const temp = imageList.value[idx];
  imageList.value[idx] = imageList.value[target];
  imageList.value[target] = temp;
}

// Drag & Drop Reorder
let draggedIdx = -1;
function onDragStart(idx) {
  draggedIdx = idx;
}

function onDropReorder(targetIdx) {
  if (draggedIdx === -1 || draggedIdx === targetIdx) return;
  const item = imageList.value.splice(draggedIdx, 1)[0];
  imageList.value.splice(targetIdx, 0, item);
  draggedIdx = -1;
}

// Conversion Execution
async function executeExport() {
  if (imageList.value.length === 0) return;
  isProcessing.value = true;

  try {
    const doc = await PDFDocument.create();

    for (const item of imageList.value) {
      // 1. Render image with rotation to canvas
      const canvas = document.createElement('canvas');
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = item.previewUrl;
      });

      const isSideways = item.rotation === 90 || item.rotation === 270;
      const drawW = isSideways ? img.naturalHeight : img.naturalWidth;
      const drawH = isSideways ? img.naturalWidth : img.naturalHeight;

      canvas.width = drawW;
      canvas.height = drawH;
      const ctx = canvas.getContext('2d');

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((item.rotation * Math.PI) / 180);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

      const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const binary = atob(jpegDataUrl.split(',')[1]);
      const imgBytes = new Uint8Array(binary.length);
      for (let k = 0; k < binary.length; k++) {
        imgBytes[k] = binary.charCodeAt(k);
      }

      const embeddedImg = await doc.embedJpg(imgBytes);

      // 2. Determine target page size
      let pageW, pageH;
      if (pageSize.value === 'fit') {
        pageW = drawW;
        pageH = drawH;
      } else {
        // Points: A4 = 595.28 x 841.89, Letter = 612 x 792
        const baseW = pageSize.value === 'letter' ? 612 : 595.28;
        const baseH = pageSize.value === 'letter' ? 792 : 841.89;

        let isLandscape = false;
        if (orientation.value === 'landscape') {
          isLandscape = true;
        } else if (orientation.value === 'auto' && drawW > drawH) {
          isLandscape = true;
        }

        pageW = isLandscape ? Math.max(baseW, baseH) : Math.min(baseW, baseH);
        pageH = isLandscape ? Math.min(baseW, baseH) : Math.max(baseW, baseH);
      }

      // 3. Margin in points
      let m = 0;
      if (pageSize.value !== 'fit') {
        if (margin.value === 'small') m = 15;
        if (margin.value === 'standard') m = 36;
      }

      const availW = pageW - 2 * m;
      const availH = pageH - 2 * m;

      // Scale to fit within available box while preserving aspect ratio
      const scale = Math.min(availW / drawW, availH / drawH);
      const finalW = drawW * scale;
      const finalH = drawH * scale;

      const finalX = m + (availW - finalW) / 2;
      const finalY = m + (availH - finalH) / 2;

      const page = doc.addPage([pageW, pageH]);
      page.drawImage(embeddedImg, {
        x: finalX,
        y: finalY,
        width: finalW,
        height: finalH
      });
    }

    const outBytes = await doc.save({ useObjectStreams: true });
    let outName = (customOutputBaseName.value.trim() || `PDFSeal_Images_${Date.now()}`);
    if (!outName.toLowerCase().endsWith('.pdf')) {
      outName += '.pdf';
    }

    triggerDownload(new Blob([outBytes], { type: 'application/pdf' }), outName);
    logger.info('IMG2PDF', `Images successfully converted to PDF: ${outName} (${imageList.value.length} pages)`);

    // Auto-save to Vault if checked
    if (autoSaveToVault.value) {
      await saveFile({
        name: outName,
        arrayBuffer: outBytes,
        folderId: 'default',
        category: 'export',
        pageCount: imageList.value.length
      });
      logger.info('VAULT', `Image PDF auto-saved to Vault: ${outName}`);
    }
  } catch (err) {
    logger.error('IMG2PDF', `Failed to convert images: ${err.message}`);
    alert('Failed to convert images to PDF: ' + err.message);
  } finally {
    isProcessing.value = false;
  }
}
</script>
