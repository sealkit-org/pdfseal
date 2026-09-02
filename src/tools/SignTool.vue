<template>
  <section class="w-full flex-1 flex flex-col">
    <!-- Main Assembly Container -->
    <div class="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-xl border border-slate-100 flex flex-col flex-1">
      <!-- Top Title Header -->
      <div class="flex items-center justify-between pb-2.5 border-b border-slate-100 shrink-0">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0 shadow-2xs">
            <PenTool class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
              {{ t('sign_title') }}
            </h2>
            <p class="text-xs text-slate-400 font-medium hidden sm:block mt-0.5">
              {{ t('sign_desc') }}
            </p>
          </div>
        </div>

        <div class="text-xs text-slate-400 font-mono hidden md:flex items-center space-x-1.5">
          <Lock class="w-3.5 h-3.5 text-emerald-600" />
          <span>{{ t('processed_locally') }}</span>
        </div>
      </div>

      <!-- 1. EMPTY STATE DROPZONE (Spacious with Dual-Source Import) -->
      <div 
        v-if="!docBytes"
        @dragover.prevent="isDragOver = true"
        @dragleave.prevent="isDragOver = false"
        @drop.prevent="onDrop"
        :class="[
          'flex-1 border-2 border-dashed rounded-3xl p-8 sm:p-14 text-center transition flex flex-col items-center justify-center my-4',
          isDragOver ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]' : 'border-slate-200 hover:border-indigo-400 bg-slate-50/50'
        ]"
      >
        <input 
          ref="fileInputRef" 
          type="file" 
          accept="application/pdf" 
          class="hidden" 
          @change="onFileSelected" 
        >

        <div class="w-16 h-16 bg-indigo-100/60 text-indigo-600 rounded-3xl flex items-center justify-center mb-4 shadow-sm">
          <PenTool class="w-8 h-8" />
        </div>
        <h3 class="text-base sm:text-lg font-bold text-slate-800">
          {{ t('sign_drop_title') }}
        </h3>
        <p class="text-xs text-slate-400 mt-1 max-w-sm">
          {{ t('sign_drop_subtitle') }}
        </p>

        <!-- Dual-Source Import Action Buttons -->
        <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
          <!-- From Local Computer -->
          <button 
            type="button" 
            @click="fileInputRef.click()"
            class="bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition flex items-center space-x-2 shadow-md hover:shadow-indigo-600/25 cursor-pointer"
          >
            <Plus class="w-4 h-4" />
            <span>{{ t('merge_btn_from_local') || '选择本地 PDF 文件' }}</span>
          </button>

          <!-- From Local Vault -->
          <button 
            type="button" 
            @click="isVaultPickerOpen = true"
            class="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-slate-400 text-xs font-bold px-5 py-2.5 rounded-xl transition flex items-center space-x-2 shadow-2xs cursor-pointer"
          >
            <FolderLock class="w-4 h-4 text-indigo-600" />
            <span>{{ t('merge_btn_from_vault') || '从海豹收纳箱中选取' }}</span>
          </button>
        </div>
      </div>

      <!-- 2. ACTIVE SIGNING WORKSPACE -->
      <div v-else class="flex-1 flex flex-col justify-between pt-2">
        <!-- Top File Summary Bar & Page Switcher -->
        <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 shrink-0">
          <div class="flex items-center space-x-3 min-w-0">
            <div class="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
              PDF
            </div>
            <div class="min-w-0">
              <p class="text-xs font-bold text-slate-800 truncate max-w-[200px] sm:max-w-xs" :title="filename">
                {{ filename }}
              </p>
              <div class="text-[11px] text-slate-400 font-mono">
                <span>{{ (docBytes.byteLength / 1024 / 1024).toFixed(2) }} MB</span>
                <span> • </span>
                <span>{{ totalPages }} {{ t('pages_label') || '页' }}</span>
              </div>
            </div>
          </div>

          <!-- Page Switcher -->
          <div class="flex items-center space-x-2">
            <button 
              @click="prevPage" 
              :disabled="currentPage <= 1"
              class="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
            >
              <ChevronLeft class="w-4 h-4 text-slate-600" />
            </button>
            <span class="text-xs font-mono font-bold text-slate-700 px-2.5 py-1 bg-slate-100 rounded-lg">
              {{ currentPage }} / {{ totalPages }}
            </span>
            <button 
              @click="nextPage" 
              :disabled="currentPage >= totalPages"
              class="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
            >
              <ChevronRight class="w-4 h-4 text-slate-600" />
            </button>

            <button 
              @click="reset" 
              class="text-xs text-slate-500 hover:text-slate-800 font-semibold px-2 py-1 rounded-lg hover:bg-slate-100 transition cursor-pointer ml-2"
            >
              {{ t('btn_reset_file') || '更换' }}
            </button>
          </div>
        </div>

        <!-- Signing Workspace Grid (Left: Sign Studio, Right: Document Viewer) -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-3 py-2 flex-1 min-h-[320px]">
          <!-- Left: Signature Studio Panel (4 cols) -->
          <div class="lg:col-span-4 bg-slate-50/80 rounded-2xl p-3 border border-slate-200/80 flex flex-col justify-between space-y-2.5">
            <div>
              <!-- Tab Selector -->
              <div class="flex items-center space-x-1 p-1 bg-slate-200/60 rounded-xl mb-3 text-xs font-semibold text-slate-600">
                <button 
                  @click="activeSignTab = 'draw'"
                  :class="['flex-1 py-1.5 rounded-lg transition text-center cursor-pointer', activeSignTab === 'draw' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'hover:text-slate-900']"
                >
                  {{ t('sign_tab_draw') }}
                </button>
                <button 
                  @click="activeSignTab = 'type'"
                  :class="['flex-1 py-1.5 rounded-lg transition text-center cursor-pointer', activeSignTab === 'type' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'hover:text-slate-900']"
                >
                  {{ t('sign_tab_type') }}
                </button>
                <button 
                  @click="activeSignTab = 'upload'"
                  :class="['flex-1 py-1.5 rounded-lg transition text-center cursor-pointer', activeSignTab === 'upload' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'hover:text-slate-900']"
                >
                  {{ t('sign_tab_upload') }}
                </button>
                <button 
                  @click="activeSignTab = 'date'"
                  :class="['flex-1 py-1.5 rounded-lg transition text-center cursor-pointer', activeSignTab === 'date' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'hover:text-slate-900']"
                >
                  {{ t('sign_tab_date') }}
                </button>
              </div>

              <!-- Color Presets (For Draw & Type) -->
              <div v-if="activeSignTab === 'draw' || activeSignTab === 'type'" class="flex items-center justify-between mb-2.5">
                <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">墨水颜色:</span>
                <div class="flex items-center space-x-2">
                  <button 
                    v-for="c in colorOptions" 
                    :key="c.value"
                    @click="activeColor = c.value"
                    :style="{ backgroundColor: c.value }"
                    :class="[
                      'w-5 h-5 rounded-full border-2 transition cursor-pointer shadow-2xs',
                      activeColor === c.value ? 'border-indigo-600 scale-110 ring-2 ring-indigo-200' : 'border-white hover:scale-105'
                    ]"
                    :title="c.label"
                  ></button>
                </div>
              </div>

              <!-- Content 1: Draw Canvas -->
              <div v-show="activeSignTab === 'draw'" class="space-y-2">
                <div class="relative bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <canvas 
                    ref="drawCanvasRef"
                    width="320" 
                    height="115"
                    class="w-full h-[115px] cursor-crosshair touch-none bg-white"
                    @pointerdown="startDrawing"
                    @pointermove="drawStroke"
                    @pointerup="stopDrawing"
                    @pointerleave="stopDrawing"
                  ></canvas>
                  <button 
                    @click="clearDrawCanvas" 
                    class="absolute top-2 right-2 text-[10px] text-slate-400 hover:text-rose-600 bg-white/90 hover:bg-rose-50 px-2 py-0.5 rounded-md border border-slate-200 font-semibold transition cursor-pointer"
                  >
                    {{ t('sign_btn_clear') }}
                  </button>
                </div>
                <button 
                  @click="addDrawnSignature"
                  :disabled="!hasDrawn"
                  class="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-98 disabled:opacity-40 text-white text-xs font-bold py-2 rounded-xl transition flex items-center justify-center space-x-1.5 shadow-2xs cursor-pointer"
                >
                  <Plus class="w-3.5 h-3.5" />
                  <span>添加手绘签名到页面</span>
                </button>
              </div>

              <!-- Content 2: Type Cursive Signature -->
              <div v-show="activeSignTab === 'type'" class="space-y-2">
                <input 
                  v-model="typedName" 
                  type="text"
                  :placeholder="t('sign_type_placeholder')"
                  class="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
                >

                <!-- Signature Style Selector Tabs -->
                <div class="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl">
                  <button 
                    v-for="st in signatureStyles" 
                    :key="st.id"
                    type="button"
                    @click="selectedSignatureStyle = st.id"
                    :class="[
                      'py-1 text-[11px] font-bold rounded-lg transition text-center cursor-pointer',
                      selectedSignatureStyle === st.id 
                        ? 'bg-white text-indigo-600 shadow-2xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    ]"
                  >
                    {{ st.label }}
                  </button>
                </div>

                <!-- Cursive Font Preview Box -->
                <div 
                  class="h-[85px] sm:h-[95px] bg-white border border-slate-200 rounded-xl flex items-center justify-center p-2.5 overflow-hidden shadow-2xs select-none"
                  :style="{ color: activeColor }"
                >
                  <span 
                    class="text-3xl sm:text-4xl text-center truncate" 
                    :class="{ 'italic': currentSignatureStyle.slant }"
                    :style="{ fontFamily: currentSignatureStyle.fontFamily }"
                  >
                    {{ typedName || '您的艺术签名' }}
                  </span>
                </div>
                <button 
                  @click="addTypedSignature"
                  :disabled="!typedName.trim()"
                  class="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-98 disabled:opacity-40 text-white text-xs font-bold py-2 rounded-xl transition flex items-center justify-center space-x-1.5 shadow-2xs cursor-pointer"
                >
                  <Plus class="w-3.5 h-3.5" />
                  <span>添加艺术字签名到页面</span>
                </button>
              </div>

              <!-- Content 3: Upload Signature Stamp Image -->
              <div v-show="activeSignTab === 'upload'" class="space-y-2">
                <input 
                  ref="stampImageInputRef" 
                  type="file" 
                  accept="image/png,image/jpeg,image/webp" 
                  class="hidden" 
                  @change="onStampFileSelected"
                >
                <div 
                  @click="stampImageInputRef.click()"
                  class="h-[95px] bg-white border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl flex flex-col items-center justify-center p-2.5 text-center cursor-pointer transition"
                >
                  <div v-if="uploadedStampDataUrl" class="h-full flex items-center justify-center overflow-hidden">
                    <img :src="uploadedStampDataUrl" class="max-h-full max-w-full object-contain" />
                  </div>
                  <div v-else class="text-slate-400 text-xs flex flex-col items-center">
                    <Upload class="w-5 h-5 mb-1 text-slate-400" />
                    <span>点击上传透明 PNG 签名或印章</span>
                  </div>
                </div>
                <button 
                  @click="addUploadedSignature"
                  :disabled="!uploadedStampDataUrl"
                  class="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-98 disabled:opacity-40 text-white text-xs font-bold py-2 rounded-xl transition flex items-center justify-center space-x-1.5 shadow-2xs cursor-pointer"
                >
                  <Plus class="w-3.5 h-3.5" />
                  <span>添加印章到页面</span>
                </button>
              </div>

              <!-- Content 4: Date Stamp -->
              <div v-show="activeSignTab === 'date'" class="space-y-2">
                <div class="space-y-1.5">
                  <label 
                    v-for="df in dateFormats" 
                    :key="df.id"
                    @click="selectedDateFormat = df.id"
                    :class="[
                      'w-full flex items-center justify-between p-2 rounded-xl border text-xs font-mono transition cursor-pointer',
                      selectedDateFormat === df.id ? 'bg-indigo-50 border-indigo-400 text-indigo-900 font-bold' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    ]"
                  >
                    <span>{{ df.sample }}</span>
                    <span class="text-[10px] text-slate-400 font-sans">{{ df.label }}</span>
                  </label>
                </div>
                <button 
                  @click="addDateStamp"
                  class="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-bold py-2 rounded-xl transition flex items-center justify-center space-x-1.5 shadow-2xs cursor-pointer"
                >
                  <Plus class="w-3.5 h-3.5" />
                  <span>添加日期戳到页面</span>
                </button>
              </div>
            </div>

            <!-- Hint: Drag and Resize -->
            <div class="p-2 rounded-xl bg-indigo-50/60 border border-indigo-100 text-[10.5px] text-indigo-900 flex items-start space-x-1.5">
              <CheckCircle2 class="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
              <span>签名放置后可直接在页面上拖拽移动位置，拖动右下角可任意缩放大小。</span>
            </div>
          </div>

          <!-- Right: Interactive PDF Page Viewer & Stamping Board (8 cols) -->
          <div class="lg:col-span-8 bg-slate-100/70 rounded-2xl p-2 sm:p-3 border border-slate-200/80 flex flex-col items-center justify-center overflow-auto relative select-none min-h-[320px] max-h-[460px]">
            <!-- Interactive Stamping Canvas Board -->
            <div 
              ref="boardContainerRef"
              class="relative bg-white shadow-md border border-slate-300 rounded-lg overflow-hidden"
              :style="{ width: `${boardWidth}px`, height: `${boardHeight}px` }"
            >
              <!-- PDF Page Render Base Canvas -->
              <canvas ref="pdfCanvasRef" class="w-full h-full block"></canvas>

              <!-- Placed Signatures on Current Page -->
              <div 
                v-for="sig in currentPageSignatures" 
                :key="sig.id"
                :style="{
                  left: `${sig.x}px`,
                  top: `${sig.y}px`,
                  width: `${sig.width}px`,
                  height: `${sig.height}px`
                }"
                class="absolute cursor-move border-2 border-dashed border-indigo-500 bg-indigo-50/15 group hover:border-indigo-600 transition-colors select-none"
                @pointerdown="startDragSig(sig, $event)"
              >
                <!-- Render Stamp Image -->
                <img :src="sig.dataUrl" class="w-full h-full object-contain pointer-events-none select-none" />

                <!-- Delete Badge -->
                <button 
                  @click.stop="removeSignature(sig.id)"
                  class="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md hover:bg-rose-600 transition cursor-pointer z-10"
                  title="删除"
                >
                  <X class="w-3 h-3" />
                </button>

                <!-- Resize Handle (Bottom Right) -->
                <div 
                  @pointerdown.stop="startResizeSig(sig, $event)"
                  class="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-indigo-600 border border-white rounded-full cursor-nwse-resize shadow-xs z-10"
                  title="缩放大小"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom Execution & Output Settings Bar (Matching PDFSeal Standard) -->
        <div class="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <!-- Left: Output Filename & Vault Auto-Save Setting -->
          <div class="flex flex-wrap items-center gap-3">
            <div class="flex items-center space-x-1.5">
              <label class="text-xs text-slate-500 font-semibold shrink-0">
                {{ t('vault_field_name') }}:
              </label>
              <input 
                v-model="customOutputBaseName"
                type="text" 
                :placeholder="defaultFileNamePlaceholder"
                class="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden font-medium text-slate-700 w-44 sm:w-56"
              >
            </div>

            <!-- Auto-save to Vault Checkbox -->
            <label class="flex items-center space-x-1.5 text-xs text-slate-600 cursor-pointer select-none">
              <input 
                type="checkbox" 
                v-model="autoSaveToVault"
                class="w-3.5 h-3.5 rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              >
              <FolderLock class="w-3.5 h-3.5 text-indigo-600" />
              <span>{{ t('vault_autosave_checkbox') }}</span>
            </label>
          </div>

          <!-- Main Sign & Export Action Button -->
          <button 
            @click="executeSign" 
            :disabled="isProcessing || placedSignatures.length === 0"
            class="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold px-6 py-2.5 rounded-xl transition flex items-center justify-center space-x-2 shadow-md hover:shadow-indigo-600/25 cursor-pointer"
          >
            <Loader2 v-if="isProcessing" class="w-4 h-4 animate-spin" />
            <PenTool v-else class="w-4 h-4" />
            <span>{{ t('sign_btn_action') }} ({{ placedSignatures.length }})</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <PasswordModal 
      :is-open="isPasswordOpen"
      :filename="pendingFileName"
      :error-message="passwordError"
      :is-unlocking="isUnlocking"
      @submit="handlePasswordSubmit"
      @cancel="handlePasswordCancel"
    />

    <VaultFilePickerModal 
      :is-open="isVaultPickerOpen"
      :multiple="false"
      @select-files="handleVaultFilesSelected"
      @close="isVaultPickerOpen = false"
    />
  </section>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, onActivated, nextTick } from 'vue';
import { 
  PenTool, 
  Plus, 
  Lock, 
  FolderLock, 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Upload, 
  CheckCircle2 
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
const stampImageInputRef = ref(null);
const pdfCanvasRef = ref(null);
const drawCanvasRef = ref(null);
const boardContainerRef = ref(null);

const docBytes = ref(null);
const filename = ref('');
const totalPages = ref(0);
const currentPage = ref(1);
const isDragOver = ref(false);
const isProcessing = ref(false);
const isVaultPickerOpen = ref(false);

const activeSignTab = ref('draw'); // 'draw' | 'type' | 'upload' | 'date'
const activeColor = ref('#0f172a');
const colorOptions = [
  { value: '#0f172a', label: '碳黑' },
  { value: '#1e3a8a', label: '商务蓝' },
  { value: '#dc2626', label: '印章红' }
];

// Draw Tab State
const hasDrawn = ref(false);
let isDrawing = false;
let lastX = 0;
let lastY = 0;

// Type Tab State
const typedName = ref('');
const signatureStyles = [
  {
    id: 'xingkai',
    label: '商务行楷',
    fontFamily: '"Zhi Mang Xing", "STXingkai", "华文行楷", "Xingkai SC", "FZXingKai-S04S", "KaiTi", "楷体", cursive',
    slant: true,
  },
  {
    id: 'mashan',
    label: '毛笔手书',
    fontFamily: '"Ma Shan Zheng", "FZShuTi", "方正舒体", "STKaiti", "华文楷体", "KaiTi", "楷体", cursive',
    slant: false,
  },
  {
    id: 'kaiti',
    label: '端庄正楷',
    fontFamily: '"STKaiti", "华文楷体", "KaiTi", "楷体", "Kaiti SC", serif',
    slant: false,
  },
  {
    id: 'cursive',
    label: '连笔花体',
    fontFamily: '"Great Vibes", "Dancing Script", "Brush Script MT", "Segoe Script", "Zhi Mang Xing", "STXingkai", cursive',
    slant: true,
  }
];
const selectedSignatureStyle = ref('xingkai');
const currentSignatureStyle = computed(() => signatureStyles.find(s => s.id === selectedSignatureStyle.value) || signatureStyles[0]);

// Upload Tab State
const uploadedStampDataUrl = ref('');

// Date Tab State
const selectedDateFormat = ref('us');
const dateFormats = computed(() => {
  const d = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthStr = months[d.getMonth()];
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return [
    { id: 'us', sample: `${monthStr} ${day}, ${year}`, label: '欧美月日年' },
    { id: 'iso', sample: `${year}-${String(d.getMonth() + 1).padStart(2, '0')}-${day}`, label: '国际标准' },
    { id: 'eu', sample: `${day}/${String(d.getMonth() + 1).padStart(2, '0')}/${year}`, label: '欧洲日月年' }
  ];
});

// Board View Dimensions
const boardWidth = ref(450);
const boardHeight = ref(600);
let currentPdfPageObj = null;

// Placed Signatures Array
// Item: { id, pageIndex, x, y, width, height, dataUrl, origWidth, origHeight }
const placedSignatures = ref([]);

const currentPageSignatures = computed(() => {
  return placedSignatures.value.filter(s => s.pageIndex === currentPage.value);
});

// Output settings
const customOutputBaseName = ref('');
const autoSaveToVault = ref(userSettings.autoSaveToVault);

watch(() => userSettings.autoSaveToVault, (newVal) => {
  autoSaveToVault.value = Boolean(newVal);
}, { immediate: true });

// Password State
const isPasswordOpen = ref(false);
const passwordError = ref('');
const isUnlocking = ref(false);
let pendingFileObj = null;
const pendingFileName = ref('');
let unlockedPassword = '';

const defaultFileNamePlaceholder = computed(() => {
  const prefix = userSettings.defaultExportPrefix || 'PDFSeal';
  const base = filename.value ? filename.value.replace(/\.[^/.]+$/, '') : 'Document';
  return `${prefix}_Signed_${base}`;
});

function onFileSelected(e) {
  const file = e.target.files?.[0];
  if (file) loadFile(file);
  e.target.value = '';
}

function onDrop(e) {
  const file = e.dataTransfer.files?.[0];
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
  pendingFileName.value = file.name;
  pendingFileObj = file;

  const rawBuffer = await file.arrayBuffer();

  // Security check
  const security = await verifyPdfSecurity(rawBuffer, password);
  if (security.isEncrypted && !security.isValid) {
    isPasswordOpen.value = true;
    if (password) {
      passwordError.value = t('pwd_error_wrong');
    }
    return;
  }

  unlockedPassword = password;
  isPasswordOpen.value = false;
  passwordError.value = '';

  docBytes.value = new Uint8Array(rawBuffer);
  filename.value = file.name;

  const prefix = userSettings.defaultExportPrefix || 'PDFSeal';
  const cleanBase = file.name.replace(/\.[^/.]+$/, '');
  customOutputBaseName.value = `${prefix}_Signed_${cleanBase}`;

  currentPage.value = 1;
  placedSignatures.value = [];

  // Read page count via pdf.js
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(rawBuffer.slice(0)),
      password: password || undefined,
      cMapUrl: '/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: '/standard_fonts/'
    });
    const pdf = await loadingTask.promise;
    totalPages.value = pdf.numPages;
    await renderCurrentPage(pdf);
  } catch (e) {
    totalPages.value = 1;
  }
}

async function renderCurrentPage(pdfDocObj = null) {
  if (!docBytes.value) return;
  await nextTick();

  try {
    let pdf = pdfDocObj;
    if (!pdf) {
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(docBytes.value.slice(0)),
        password: unlockedPassword || undefined,
        cMapUrl: '/cmaps/',
        cMapPacked: true,
        standardFontDataUrl: '/standard_fonts/'
      });
      pdf = await loadingTask.promise;
    }

    const page = await pdf.getPage(currentPage.value);
    currentPdfPageObj = page;

    // Scale to fit nicely on screen without overflowing viewport and hiding footer
    const baseViewport = page.getViewport({ scale: 1.0 });
    const availableH = typeof window !== 'undefined'
      ? Math.max(280, Math.min(380, window.innerHeight - 440))
      : 360;
    const targetHeight = availableH;
    const scale = targetHeight / baseViewport.height;
    const viewport = page.getViewport({ scale });

    boardWidth.value = Math.round(viewport.width);
    boardHeight.value = Math.round(viewport.height);

    await nextTick();
    const canvas = pdfCanvasRef.value;
    if (!canvas) return;

    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext('2d');

    await page.render({
      canvasContext: ctx,
      viewport
    }).promise;
  } catch (err) {
    logger.warn('SIGN', `Failed to render page: ${err.message}`);
  }
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--;
    renderCurrentPage();
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    renderCurrentPage();
  }
}

// ----------------- DRAWING CANVAS ENGINE -----------------
function startDrawing(e) {
  isDrawing = true;
  const canvas = drawCanvasRef.value;
  const rect = canvas.getBoundingClientRect();
  lastX = (e.clientX - rect.left) * (canvas.width / rect.width);
  lastY = (e.clientY - rect.top) * (canvas.height / rect.height);
}

function drawStroke(e) {
  if (!isDrawing) return;
  const canvas = drawCanvasRef.value;
  const rect = canvas.getBoundingClientRect();
  const currentX = (e.clientX - rect.left) * (canvas.width / rect.width);
  const currentY = (e.clientY - rect.top) * (canvas.height / rect.height);

  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = activeColor.value;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(currentX, currentY);
  ctx.stroke();

  lastX = currentX;
  lastY = currentY;
  hasDrawn.value = true;
}

function stopDrawing() {
  isDrawing = false;
}

function clearDrawCanvas() {
  const canvas = drawCanvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  hasDrawn.value = false;
}

function addDrawnSignature() {
  const canvas = drawCanvasRef.value;
  if (!canvas || !hasDrawn.value) return;
  const dataUrl = canvas.toDataURL('image/png');
  placeNewSignature(dataUrl, 140, 60);
}

// ----------------- TYPE SIGNATURE ENGINE -----------------
function addTypedSignature() {
  if (!typedName.value.trim()) return;

  // Render cursive text into an offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = 500;
  canvas.height = 180;
  const ctx = canvas.getContext('2d');

  const st = currentSignatureStyle.value;
  const isItalic = st.slant ? 'italic' : 'normal';
  ctx.font = `${isItalic} 54px ${st.fontFamily}`;
  ctx.fillStyle = activeColor.value;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Apply subtle organic pen shear if slanted style
  if (st.slant) {
    ctx.transform(1, 0, -0.08, 1, 0, 0);
  }

  ctx.fillText(typedName.value.trim(), 250, 90);

  const dataUrl = canvas.toDataURL('image/png');
  placeNewSignature(dataUrl, 160, 60);
}

// ----------------- UPLOAD STAMP ENGINE -----------------
function onStampFileSelected(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    uploadedStampDataUrl.value = evt.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function addUploadedSignature() {
  if (!uploadedStampDataUrl.value) return;
  placeNewSignature(uploadedStampDataUrl.value, 120, 80);
}

// ----------------- DATE STAMP ENGINE -----------------
function addDateStamp() {
  const format = dateFormats.value.find(d => d.id === selectedDateFormat.value) || dateFormats.value[0];
  const dateStr = format.sample;

  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');

  ctx.font = 'bold 24px monospace';
  ctx.fillStyle = activeColor.value;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(dateStr, 150, 40);

  const dataUrl = canvas.toDataURL('image/png');
  placeNewSignature(dataUrl, 130, 35);
}

// ----------------- PLACEMENT & DRAGGING ENGINE -----------------
function placeNewSignature(dataUrl, defaultW = 140, defaultH = 60) {
  const id = `sig_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  // Place centrally on current board
  const x = Math.max(10, Math.round((boardWidth.value - defaultW) / 2));
  const y = Math.max(10, Math.round((boardHeight.value - defaultH) / 2));

  placedSignatures.value.push({
    id,
    pageIndex: currentPage.value,
    x,
    y,
    width: defaultW,
    height: defaultH,
    dataUrl
  });
}

function removeSignature(id) {
  placedSignatures.value = placedSignatures.value.filter(s => s.id !== id);
}

// Drag Signature
let draggingSig = null;
let dragStartX = 0;
let dragStartY = 0;
let sigInitialX = 0;
let sigInitialY = 0;

function startDragSig(sig, e) {
  draggingSig = sig;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  sigInitialX = sig.x;
  sigInitialY = sig.y;

  window.addEventListener('pointermove', onDragSigMove);
  window.addEventListener('pointerup', onDragSigEnd);
}

function onDragSigMove(e) {
  if (!draggingSig) return;
  const dx = e.clientX - dragStartX;
  const dy = e.clientY - dragStartY;

  const newX = Math.max(0, Math.min(boardWidth.value - draggingSig.width, sigInitialX + dx));
  const newY = Math.max(0, Math.min(boardHeight.value - draggingSig.height, sigInitialY + dy));

  draggingSig.x = Math.round(newX);
  draggingSig.y = Math.round(newY);
}

function onDragSigEnd() {
  draggingSig = null;
  window.removeEventListener('pointermove', onDragSigMove);
  window.removeEventListener('pointerup', onDragSigEnd);
}

// Resize Signature
let resizingSig = null;
let resizeStartX = 0;
let resizeStartY = 0;
let sigInitialW = 0;
let sigInitialH = 0;

function startResizeSig(sig, e) {
  resizingSig = sig;
  resizeStartX = e.clientX;
  resizeStartY = e.clientY;
  sigInitialW = sig.width;
  sigInitialH = sig.height;

  window.addEventListener('pointermove', onResizeSigMove);
  window.addEventListener('pointerup', onResizeSigEnd);
}

function onResizeSigMove(e) {
  if (!resizingSig) return;
  const dx = e.clientX - resizeStartX;
  const dy = e.clientY - resizeStartY;

  const newW = Math.max(50, Math.min(boardWidth.value - resizingSig.x, sigInitialW + dx));
  const newH = Math.max(20, Math.min(boardHeight.value - resizingSig.y, sigInitialH + dy));

  resizingSig.width = Math.round(newW);
  resizingSig.height = Math.round(newH);
}

function onResizeSigEnd() {
  resizingSig = null;
  window.removeEventListener('pointermove', onResizeSigMove);
  window.removeEventListener('pointerup', onResizeSigEnd);
}

// ----------------- FINAL PDF EXPORT ENGINE -----------------
async function executeSign() {
  if (!docBytes.value || placedSignatures.value.length === 0) return;
  isProcessing.value = true;

  try {
    const cleanDoc = await loadCleanPdfDocument(docBytes.value, unlockedPassword);
    const pages = cleanDoc.getPages();

    // Group signatures by pageIndex
    for (const sig of placedSignatures.value) {
      const targetPageIndex = sig.pageIndex - 1;
      if (targetPageIndex < 0 || targetPageIndex >= pages.length) continue;
      const targetPage = pages[targetPageIndex];
      const { width: pdfPageWidth, height: pdfPageHeight } = targetPage.getSize();

      // Convert board coordinates to PDF point coordinates
      const scaleX = pdfPageWidth / boardWidth.value;
      const scaleY = pdfPageHeight / boardHeight.value;

      const pdfX = sig.x * scaleX;
      const pdfW = sig.width * scaleX;
      const pdfH = sig.height * scaleY;
      // In PDF, (0, 0) is bottom-left, so pdfY = pdfPageHeight - (domY + domH)
      const pdfY = pdfPageHeight - ((sig.y + sig.height) * scaleY);

      // Convert dataUrl to binary PNG
      const base64Data = sig.dataUrl.split(',')[1];
      const binaryStr = atob(base64Data);
      const pngBytes = new Uint8Array(binaryStr.length);
      for (let k = 0; k < binaryStr.length; k++) {
        pngBytes[k] = binaryStr.charCodeAt(k);
      }

      const embeddedPng = await cleanDoc.embedPng(pngBytes);
      targetPage.drawImage(embeddedPng, {
        x: pdfX,
        y: pdfY,
        width: pdfW,
        height: pdfH
      });
    }

    const outBytes = await cleanDoc.save({ useObjectStreams: true });
    let outName = (customOutputBaseName.value.trim() || `PDFSeal_Signed_${Date.now()}`);
    if (!outName.toLowerCase().endsWith('.pdf')) {
      outName += '.pdf';
    }

    triggerDownload(new Blob([outBytes], { type: 'application/pdf' }), outName);
    logger.info('SIGN', `PDF signed successfully with ${placedSignatures.value.length} signature(s): ${outName}`);

    // Auto-save to Vault if checked
    if (autoSaveToVault.value) {
      await saveFile({
        name: outName,
        arrayBuffer: outBytes,
        folderId: 'default',
        category: 'export',
        pageCount: pages.length
      });
      logger.info('VAULT', `Signed document auto-saved to Vault: ${outName}`);
    }
  } catch (err) {
    logger.error('SIGN', `Failed to stamp signatures onto PDF: ${err.message}`);
    alert('Failed to stamp signatures: ' + err.message);
  } finally {
    isProcessing.value = false;
  }
}

async function handlePasswordSubmit(pwd) {
  if (!pendingFileObj) return;
  isUnlocking.value = true;
  await loadFile(pendingFileObj, pwd);
  isUnlocking.value = false;
}

function handlePasswordCancel() {
  isPasswordOpen.value = false;
  passwordError.value = '';
  pendingFileObj = null;
  reset();
}

function reset() {
  docBytes.value = null;
  filename.value = '';
  totalPages.value = 0;
  currentPage.value = 1;
  unlockedPassword = '';
  customOutputBaseName.value = '';
  placedSignatures.value = [];
  clearDrawCanvas();
}

function checkIncomingFile() {
  const incoming = consumePendingFile('sign');
  if (incoming) {
    const file = new File([incoming.arrayBuffer], incoming.name, { type: 'application/pdf' });
    loadFile(file, incoming.password || '');
  }
}

function handleWindowResize() {
  if (docBytes.value && currentPdfPageObj) {
    renderCurrentPage();
  }
}

onMounted(() => {
  checkIncomingFile();
  window.addEventListener('resize', handleWindowResize);
});
onUnmounted(() => {
  window.removeEventListener('resize', handleWindowResize);
});
onActivated(checkIncomingFile);
</script>
