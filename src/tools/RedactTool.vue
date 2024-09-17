<template>
  <section class="w-full flex-1 flex flex-col">
    <div class="bg-white rounded-3xl p-5 sm:p-7 shadow-xl border border-slate-100 flex flex-col flex-1 min-h-0">
      <!-- Header: slate-800 badge (privacy family, distinct from Sanitize cyan shield) -->
      <div class="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
        <div class="flex items-center space-x-3">
          <div class="w-9 h-9 rounded-2xl bg-slate-800 text-white flex items-center justify-center font-bold shadow-2xs">
            <EyeOff class="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 class="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
              {{ t('redact_title') }}
              <span v-if="filename" class="font-semibold text-slate-400 text-xs">· {{ filename }}</span>
            </h2>
            <p class="text-xs text-slate-500 mt-0.5">{{ t('redact_desc') }}</p>
          </div>
        </div>
        <button
          v-if="docBytes"
          @click="reset"
          class="text-xs text-slate-600 hover:bg-slate-100 font-semibold px-3 py-1.5 rounded-xl border border-slate-200 transition flex items-center space-x-1 cursor-pointer shrink-0"
        >
          <RotateCcw class="w-3.5 h-3.5" />
          <span>{{ t('redact_reset') }}</span>
        </button>
      </div>

      <!-- State A: Empty (Dual Source Dropzone: Local & Vault) -->
      <div
        v-if="!docBytes"
        @dragover.prevent="isDragOver = true"
        @dragleave.prevent="isDragOver = false"
        @drop.prevent="onDrop"
        :class="[
          'flex-1 border-2 border-dashed rounded-3xl p-8 sm:p-14 text-center transition flex flex-col items-center justify-center my-4 relative select-none',
          isDragOver ? 'border-red-400 bg-red-50/40' : 'border-slate-200/90 hover:border-slate-400 bg-slate-50/40 hover:bg-slate-50/80'
        ]"
      >
        <input ref="fileInputRef" type="file" accept="application/pdf" class="hidden" @change="onFileSelected">

        <div class="w-16 h-16 bg-slate-800 text-white rounded-3xl flex items-center justify-center mb-3 shadow-inner">
          <EyeOff class="w-8 h-8" />
        </div>
        <h3 class="text-base sm:text-lg font-bold text-slate-800">{{ t('redact_drop_title') }}</h3>
        <p class="text-xs text-slate-400 mt-1 max-w-sm">{{ t('redact_drop_subtitle') }}</p>

        <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            @click="fileInputRef.click()"
            class="bg-red-600 hover:bg-red-700 active:scale-98 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition flex items-center space-x-2 shadow-md hover:shadow-red-600/25 cursor-pointer"
          >
            <Plus class="w-4 h-4" />
            <span>{{ t('merge_btn_from_local') || 'Add from Computer' }}</span>
          </button>
          <button
            type="button"
            @click="isVaultPickerOpen = true"
            class="bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center space-x-2 border border-slate-200 shadow-2xs hover:border-slate-300 cursor-pointer"
          >
            <FolderLock class="w-4 h-4 text-slate-600" />
            <span>{{ t('merge_btn_from_vault') || 'Pick from Vault' }}</span>
          </button>
        </div>

        <div class="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-emerald-700 font-semibold">
          <ShieldCheck class="w-3.5 h-3.5" />
          <span>{{ t('redact_privacy_note') }}</span>
        </div>
      </div>

      <!-- State B Editor / Unified Processing & Result -->
      <div v-else class="flex-1 flex flex-col pt-3 sm:pt-3.5 overflow-hidden min-h-0">
        <ResultDeliveryView
          v-if="isProcessing || lastExportedFile"
          :is-processing="isProcessing"
          :progress-percent="progressPercent"
          :progress-message="progressMessage"
          :file="lastExportedFile"
          source-tool="redact"
          :page-count="totalPages"
          @redownload="handleReDownload"
          @new-task="handleNewTask"
          @back-to-edit="handleBackToEdit"
          @send-to-tool="(tId) => emit('send-to-tool', tId)"
        >
          <template #metrics>
            <span class="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60 shadow-2xs">
              <CheckCircle2 class="w-3.5 h-3.5 text-emerald-600" />
              <span>{{ t('redact_metric_badge', '{ops} text items erased · {pages} pages rasterized · zero residue verified', { ops: lastReport?.totalRemovedOps ?? 0, pages: lastReport?.rasterPages?.length ?? 0 }) }}</span>
            </span>
          </template>
        </ResultDeliveryView>

        <!-- Editor -->
        <div v-else class="flex-1 flex flex-col min-h-0">
          <!-- Loading -->
          <div v-if="isLoading" class="flex-1 flex flex-col items-center justify-center py-16 text-center text-xs text-slate-500 font-medium">
            <Loader2 class="w-8 h-8 animate-spin mx-auto mb-3 text-slate-700" />
            <span>{{ t('rendering_pages') }}...</span>
          </div>

          <!-- Part 1: Editor control bar (page nav · draw options) -->
          <div class="flex items-center justify-between flex-wrap gap-2 pt-1 pb-2.5 border-b border-slate-100 shrink-0">
            <div class="flex items-center gap-2 text-xs font-bold text-slate-600">
              <button
                @click="goPage(-1)"
                :disabled="pageIndex === 0"
                class="w-7 h-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:border-slate-400 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft class="w-3.5 h-3.5" />
              </button>
              <span class="tabular-nums">{{ t('redact_page_label', 'Page {current} / {total}', { current: pageIndex + 1, total: totalPages }) }}</span>
              <button
                @click="goPage(1)"
                :disabled="pageIndex >= totalPages - 1"
                class="w-7 h-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:border-slate-400 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight class="w-3.5 h-3.5" />
              </button>
            </div>
            <div class="flex items-center gap-2">
              <button
                @click="snapToText = !snapToText"
                :class="[
                  'text-[11px] font-bold rounded-lg px-2.5 py-1.5 border transition flex items-center gap-1.5 cursor-pointer',
                  snapToText ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-white text-slate-500 border-slate-200'
                ]"
              >
                <Magnet class="w-3.5 h-3.5" />
                <span>{{ t('redact_snap_toggle') }}</span>
              </button>
              <button
                @click="clearPage"
                :disabled="!currentRects.length"
                class="text-[11px] font-bold rounded-lg px-2.5 py-1.5 border border-slate-200 bg-white text-slate-500 hover:text-rose-600 hover:border-rose-200 transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Trash2 class="w-3.5 h-3.5" />
                <span>{{ t('redact_clear_page') }}</span>
              </button>
            </div>
          </div>

          <!-- Part 2: Workspace — config left · preview right (fit one screen, no page scroll) -->
          <div class="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 my-2.5 min-h-0 overflow-hidden">
            <!-- Left: Config (mask style · redaction list · summary) -->
            <div class="lg:col-span-4 flex flex-col gap-3 min-h-0">
              <!-- Mask Style Cards -->
              <div class="flex gap-2 shrink-0">
                <button
                  v-for="opt in styleOptions"
                  :key="opt.value"
                  @click="style = opt.value"
                  :class="[
                    'flex-1 border-[1.5px] rounded-xl p-2 text-center transition cursor-pointer',
                    style === opt.value ? 'border-slate-800 bg-slate-50' : 'border-slate-200 hover:border-slate-400'
                  ]"
                >
                  <div
                    :class="[
                      'h-6 rounded-md mb-1.5 flex items-center justify-center text-[10px] font-extrabold tracking-wide',
                      opt.demoClass
                    ]"
                  >{{ opt.value === 'stamp' ? 'REDACTED' : '' }}</div>
                  <span class="text-[11px] font-bold text-slate-600">{{ t(opt.labelKey) }}</span>
                </button>
              </div>

              <!-- Redaction List -->
              <div class="border border-slate-200 rounded-2xl p-3 flex flex-col min-h-0 flex-1">
                <h5 class="text-xs font-extrabold text-slate-700 mb-2 flex items-center justify-between shrink-0">
                  <span class="flex items-center gap-1.5">
                    <ListOrdered class="w-3.5 h-3.5 text-slate-500" />
                    {{ t('redact_list_title') }}
                  </span>
                  <span class="text-slate-400 font-semibold">{{ t('redact_list_count', '{count} on this page', { count: currentRects.length }) }}</span>
                </h5>
                <div class="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
                  <div
                    v-for="r in currentRects"
                    :key="r.id"
                    :class="[
                      'flex items-center justify-between gap-2 text-[11px] bg-slate-50 border rounded-lg px-2.5 py-1.5 cursor-pointer transition',
                      selectedRectId === r.id ? 'border-blue-400 bg-blue-50/60' : 'border-slate-200 hover:border-slate-300'
                    ]"
                    @click="selectedRectId = r.id"
                  >
                    <span class="text-slate-600 font-semibold truncate">
                      {{ r.snapped ? r.snapped : t('redact_rect_mark', 'Mark {index}', { index: currentRects.indexOf(r) + 1 }) }}
                    </span>
                    <button
                      class="text-slate-400 hover:text-rose-600 font-extrabold shrink-0 cursor-pointer"
                      @click.stop="deleteRect(r.id)"
                    >✕</button>
                  </div>
                  <p v-if="!currentRects.length" class="text-[11px] text-slate-400 text-center py-3">{{ t('redact_snap_hint', 'Drag to draw · release to snap to text · {key} deletes selection', { key: 'Del' }) }}</p>
                </div>
                <p v-if="otherPagesCount" class="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 shrink-0">
                  {{ t('redact_list_other_pages', '{count} more marks on other pages', { count: otherPagesCount }) }}
                </p>
              </div>

              <!-- Summary -->
              <div class="border border-slate-200 rounded-2xl p-3 shrink-0">
                <h5 class="text-xs font-extrabold text-slate-700 mb-2 flex items-center gap-1.5">
                  <BarChart3 class="w-3.5 h-3.5 text-slate-500" />
                  {{ t('redact_summary_title') }}
                </h5>
                <div class="text-xs text-slate-600 space-y-1">
                  <div class="flex justify-between"><span>{{ t('redact_summary_rects') }}</span><b class="text-slate-900 tabular-nums">{{ totalRects }} / {{ markedPageCount }} {{ t('page_unit', 'pages') }}</b></div>
                  <div class="flex justify-between"><span>{{ t('redact_summary_text_ops') }}</span><b class="text-slate-900 tabular-nums">{{ textOpsCount }}</b></div>
                  <div class="flex justify-between"><span>{{ t('redact_summary_raster') }}</span><b class="text-slate-900 tabular-nums">{{ rasterWarnPages.length }}</b></div>
                </div>
                <div
                  v-if="rasterWarnPages.length"
                  class="mt-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-[11px] text-amber-800 leading-relaxed"
                >
                  {{ t('redact_raster_warning', 'Page {pages} contains scanned/image content: the whole page will be rasterized and burned in, and its text will no longer be selectable.', { pages: rasterWarnPages.map(p => p + 1).join(', ') }) }}
                </div>
                <div class="mt-2.5 flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold">
                  <ShieldCheck class="w-3.5 h-3.5" />
                  <span>{{ t('redact_verify_ok') }}</span>
                </div>
              </div>
            </div>

            <!-- Right: Preview (page canvas + interaction overlay) -->
            <div class="lg:col-span-8 flex flex-col bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/80 min-h-[380px] lg:min-h-0">
              <div ref="stageAreaRef" class="flex-1 min-h-0 flex items-center justify-center">
                <div
                  ref="stageBoxRef"
                  class="relative bg-white rounded-lg shadow-md overflow-hidden"
                  :style="stageBoxStyle"
                >
                  <canvas ref="pageCanvasRef" class="w-full h-full block select-none" />
                  <!-- Interaction overlay: rects stored in user space, rendered as % of viewport -->
                  <div
                    ref="overlayRef"
                    class="absolute inset-0 cursor-crosshair touch-none"
                    data-testid="redact-overlay"
                    @pointerdown="onPointerDown"
                    @pointermove="onPointerMove"
                    @pointerup="onPointerUp"
                    @pointercancel="onPointerUp"
                  >
                    <!-- Draft rect while drawing -->
                    <div
                      v-if="draftRect"
                      class="absolute bg-slate-900/70 border border-slate-900 rounded-[2px]"
                      :style="rectStyle(draftRect)"
                    />
                    <!-- Committed rects -->
                    <div
                      v-for="r in currentRects"
                      :key="r.id"
                      :class="[
                        'absolute bg-slate-900/90 rounded-[2px]',
                        selectedRectId === r.id ? 'outline-2 outline-dashed outline-blue-500 outline-offset-2' : ''
                      ]"
                      :style="rectStyle(r.canvas)"
                      @pointerdown.stop
                    >
                      <template v-if="selectedRectId === r.id">
                        <span
                          v-for="h in ['nw','ne','sw','se']"
                          :key="h"
                          class="absolute w-2 h-2 bg-white border-2 border-blue-500 rounded-[2px] cursor-nwse-resize"
                          :class="handlePos[h]"
                          @pointerdown.stop.prevent="onHandleDown($event, r.id, h)"
                        />
                        <span
                          v-if="r.snapped"
                          class="absolute -top-6 left-0 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap max-w-[240px] truncate pointer-events-none"
                        >{{ r.snapped }}</span>
                      </template>
                    </div>
                    <!-- Draw hint -->
                    <div
                      v-if="!currentRects.length && !draftRect"
                      class="absolute bottom-2.5 left-1/2 -translate-x-1/2 text-[10.5px] text-slate-400 bg-white/90 border border-slate-200 px-2.5 py-1 rounded-lg whitespace-nowrap pointer-events-none"
                    >
                      {{ t('redact_snap_hint', 'Drag to draw · release to snap to text · {key} deletes selection', { key: 'Del' }) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Part 3: Execution bar (privacy note · burn) -->
          <div class="pt-2.5 border-t border-slate-200/70 flex items-center justify-between flex-wrap gap-2.5 shrink-0">
            <span class="text-[11px] text-slate-400">{{ t('redact_privacy_note') }}</span>
            <button
              @click="openConfirm"
              :disabled="!totalRects"
              :title="!totalRects ? t('redact_err_no_rects') : ''"
              data-testid="redact-burn-btn"
              class="bg-red-600 hover:bg-red-700 active:scale-98 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl transition flex items-center space-x-2 shadow-md hover:shadow-red-600/25 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed cursor-pointer"
            >
              <Flame class="w-4 h-4" />
              <span>{{ t('redact_btn_burn', 'Burn Redaction ({count} marks)', { count: totalRects }) }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- State C: Burn Confirmation Modal -->
    <div
      v-if="showConfirm"
      class="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-6"
      @click.self="showConfirm = false"
    >
      <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
        <h4 class="text-base font-extrabold text-slate-900 flex items-center gap-2.5">
          <span class="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle class="w-4 h-4" />
          </span>
          {{ t('redact_confirm_title') }}
        </h4>
        <p class="text-xs text-slate-600 leading-relaxed mt-2.5">{{ t('redact_confirm_body') }}</p>
        <div class="mt-3 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 space-y-1 text-xs text-slate-600">
          <div class="flex justify-between"><span>{{ t('redact_confirm_erase') }}</span><b class="text-slate-900 tabular-nums">{{ textOpsCount }} / {{ markedPageCount }}</b></div>
          <div class="flex justify-between"><span>{{ t('redact_confirm_raster') }}</span><b class="text-slate-900 tabular-nums">{{ rasterWarnPages.length ? rasterWarnPages.map(p => p + 1).join(', ') : '0' }}</b></div>
          <div class="flex justify-between"><span>{{ t('redact_confirm_style') }}</span><b class="text-slate-900">{{ t(currentStyleLabelKey) }}</b></div>
          <div class="flex justify-between"><span>{{ t('redact_confirm_verify') }}</span><b class="text-slate-900">{{ t('redact_confirm_verify_auto') }}</b></div>
        </div>
        <div class="flex justify-end gap-2.5 mt-4">
          <button
            @click="showConfirm = false"
            class="bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-200 transition cursor-pointer"
          >{{ t('redact_confirm_cancel') }}</button>
          <button
            @click="executeBurn"
            data-testid="redact-confirm-btn"
            class="bg-red-600 hover:bg-red-700 active:scale-98 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl transition shadow-md hover:shadow-red-600/25 cursor-pointer"
          >{{ t('redact_confirm_proceed') }}</button>
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

    <!-- Vault File Picker Modal (Single-Select) -->
    <VaultFilePickerModal
      :is-open="isVaultPickerOpen"
      :multiple="false"
      @select-files="handleVaultFilesSelected"
      @close="isVaultPickerOpen = false"
    />
  </section>
</template>

<script setup>
import { ref, computed, watch, inject, onMounted, onActivated, onUnmounted, nextTick } from 'vue';
import {
  EyeOff, Plus, Loader2, FolderLock, RotateCcw, Trash2, Flame, AlertTriangle,
  CheckCircle2, ChevronLeft, ChevronRight, Magnet, ListOrdered, BarChart3, ShieldCheck
} from 'lucide-vue-next';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, PDFName, PDFDict, PDFRef } from 'pdf-lib';
import { t } from '../i18n';
import { triggerDownload } from '../utils/download';
import { verifyPdfSecurity } from '../utils/pdfSecurity';
import { consumePendingFile } from '../utils/toolBridge';
import { saveFile } from '../utils/vaultDb';
import { userSettings } from '../utils/userSettings';
import { logger } from '../utils/logger';
import PasswordModal from '../components/PasswordModal.vue';
import VaultFilePickerModal from '../components/VaultFilePickerModal.vue';
import ResultDeliveryView from '../components/ResultDeliveryView.vue';
import { redactPdf } from '../utils/redaction/redactEngine.js';
import {
  textItemToUserBBox, userRectToCanvas, canvasRectToUser, rectsIntersect, shouldRemoveOp
} from '../utils/redaction/coords.js';

const emit = defineEmits(['send-to-tool']);
const workspaceState = inject('workspaceActiveState', null);

// ---------- File / doc state ----------
const fileInputRef = ref(null);
const pageCanvasRef = ref(null);
const overlayRef = ref(null);
const stageBoxRef = ref(null);

const docBytes = ref(null); // ArrayBuffer (original, never mutated by the UI)
const filename = ref('');
const totalPages = ref(0);
const pageIndex = ref(0);
const unlockedPassword = ref('');

let pdfjsDoc = null; // pdf.js document proxy (preview only, never fed to the engine)
let currentViewport = null; // pdf.js viewport @ scale 1.5 (canvas pixel space)
const viewportTick = ref(0); // forces canvas-space recomputes after render

// ---------- Stage fit-to-area (one screen, no page scroll) ----------
const stageAreaRef = ref(null);
const stageBoxSize = ref({ w: 0, h: 0 });

const stageBoxStyle = computed(() => {
  if (stageBoxSize.value.w && stageBoxSize.value.h) {
    return { width: `${stageBoxSize.value.w}px`, height: `${stageBoxSize.value.h}px` };
  }
  void viewportTick.value; // fallback before first measurement: fill width by page ratio
  const ratio = currentViewport ? currentViewport.width / currentViewport.height : 0.707;
  return {
    width: '100%',
    maxWidth: `${ratio * 100}%`,
    aspectRatio: currentViewport ? `${currentViewport.width} / ${currentViewport.height}` : '210 / 297'
  };
});

function fitStageBox() {
  const el = stageAreaRef.value;
  if (!el || !currentViewport || !el.clientWidth || !el.clientHeight) return;
  const scale = Math.min(el.clientWidth / currentViewport.width, el.clientHeight / currentViewport.height);
  stageBoxSize.value = { w: Math.floor(currentViewport.width * scale), h: Math.floor(currentViewport.height * scale) };
}

let stageRO = null;
watch(stageAreaRef, (el) => {
  stageRO?.disconnect();
  stageRO = null;
  if (el) {
    stageRO = new ResizeObserver(fitStageBox);
    stageRO.observe(el);
  }
  fitStageBox();
});


watch(() => Boolean(docBytes.value), (active) => {
  workspaceState?.setActiveFile(active);
}, { immediate: true });
onActivated(() => {
  workspaceState?.setActiveFile(Boolean(docBytes.value));
});

const isDragOver = ref(false);
const isLoading = ref(false);
const isProcessing = ref(false);
const isVaultPickerOpen = ref(false);

// Password modal state
const isPasswordOpen = ref(false);
const passwordError = ref('');
const isUnlocking = ref(false);
const pendingFileName = ref('');
let pendingFileObj = null;

// ---------- Editor state ----------
/** { [pageIndex]: [{ id, x, y, w, h, snapped? }] } — user space (y-up, engine coordinate system) */
const rectsByPage = ref({});
const selectedRectId = ref(null);
const snapToText = ref(true);
const style = ref('black');
const draftRect = ref(null); // viewport-space rect while drawing
const textOpsCount = ref(0);
/** pages whose resources contain image XObjects (rasterization risk hint) */
const imagePages = ref([]);

const styleOptions = [
  { value: 'black', labelKey: 'redact_style_black', demoClass: 'bg-slate-900' },
  { value: 'white', labelKey: 'redact_style_white', demoClass: 'bg-white border border-slate-300' },
  { value: 'stamp', labelKey: 'redact_style_stamp', demoClass: 'bg-white border-[1.5px] border-red-600 text-red-600' }
];
const currentStyleLabelKey = computed(() =>
  styleOptions.find(o => o.value === style.value)?.labelKey || 'redact_style_black'
);

// ---------- Text item cache (LRU 8 pages, for snapping & summary) ----------
const textItemCache = new Map();
async function getTextItems(idx) {
  if (textItemCache.has(idx)) return textItemCache.get(idx);
  const page = await pdfjsDoc.getPage(idx + 1);
  const tc = await page.getTextContent();
  const items = tc.items
    .filter((it) => it.str && it.str.trim())
    .map((it) => ({ str: it.str, bbox: textItemToUserBBox(it) }));
  textItemCache.set(idx, items);
  if (textItemCache.size > 8) textItemCache.delete(textItemCache.keys().next().value);
  return items;
}

// ---------- Delivery state ----------
const lastExportedFile = ref(null);
const progressPercent = ref(0);
const progressMessage = ref('');
let cachedPdfBlob = null;
let cachedPdfName = '';
let lastReport = null;

function handleReDownload() {
  if (cachedPdfBlob && cachedPdfName) triggerDownload(cachedPdfBlob, cachedPdfName);
}
function handleNewTask() {
  reset();
}
function handleBackToEdit() {
  lastExportedFile.value = null;
}

// ---------- Computed: list & summary ----------
const currentRects = computed(() => {
  void viewportTick.value;
  const list = rectsByPage.value[pageIndex.value] || [];
  if (!currentViewport) return list.map((r) => ({ id: r.id, canvas: r, snapped: r.snapped }));
  return list.map((r) => ({ id: r.id, canvas: userRectToCanvas(r, currentViewport), snapped: r.snapped }));
});
const totalRects = computed(() =>
  Object.values(rectsByPage.value).reduce((n, list) => n + (list?.length || 0), 0)
);

/** 选中标记四角 resize 手柄的定位 class */
const handlePos = {
  nw: '-top-1 -left-1',
  ne: '-top-1 -right-1',
  sw: '-bottom-1 -left-1',
  se: '-bottom-1 -right-1'
};

/** canvas 像素 rect → overlay 内的绝对定位百分比样式（canvas 与 overlay 同区域） */
function rectStyle(c) {
  if (!currentViewport || !c) return {};
  void viewportTick.value; // viewport 变更时重算
  return {
    left: `${(c.x / currentViewport.width) * 100}%`,
    top: `${(c.y / currentViewport.height) * 100}%`,
    width: `${(c.w / currentViewport.width) * 100}%`,
    height: `${(c.h / currentViewport.height) * 100}%`
  };
}

const markedPageIndexes = computed(() =>
  Object.keys(rectsByPage.value).filter((k) => rectsByPage.value[k]?.length > 0).map(Number)
);
const markedPageCount = computed(() => markedPageIndexes.value.length);
const otherPagesCount = computed(() => totalRects.value - currentRects.value.length);
const rasterWarnPages = computed(() => markedPageIndexes.value.filter((p) => imagePages.value.includes(p)));

// Debounced summary recompute: text ops that would be destroyed
let summaryTimer = null;
watch([rectsByPage], () => {
  clearTimeout(summaryTimer);
  summaryTimer = setTimeout(recomputeSummary, 150);
}, { deep: true });

async function recomputeSummary() {
  if (!pdfjsDoc) { textOpsCount.value = 0; return; }
  let n = 0;
  for (const pi of markedPageIndexes.value) {
    const rects = rectsByPage.value[pi];
    if (!rects?.length) continue;
    try {
      const items = await getTextItems(pi);
      n += items.filter((it) => shouldRemoveOp(it.bbox, rects)).length;
    } catch (e) {
      logger.warn('REDACT', `Summary extraction failed on page ${pi + 1}: ${e.message}`);
    }
  }
  textOpsCount.value = n;
}

// ---------- Rendering ----------
function goPage(delta) {
  const next = pageIndex.value + delta;
  if (next < 0 || next >= totalPages.value) return;
  pageIndex.value = next;
  selectedRectId.value = null;
  renderPage();
}

async function renderPage() {
  if (!pdfjsDoc || !pageCanvasRef.value) return;
  try {
    const page = await pdfjsDoc.getPage(pageIndex.value + 1);
    const viewport = page.getViewport({ scale: 1.5 });
    currentViewport = viewport;
    fitStageBox();
    const canvas = pageCanvasRef.value;
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    viewportTick.value++;
  } catch (e) {
    logger.error('REDACT', `Page render failed: ${e.message}`);
  }
}

// ---------- Overlay interactions (viewport space) ----------
let drag = null; // { mode:'new'|'move'|'resize', startPt, origRect, rectId, handle }

function eventToViewportPt(e) {
  const box = overlayRef.value.getBoundingClientRect();
  return {
    x: ((e.clientX - box.left) / box.width) * currentViewport.width,
    y: ((e.clientY - box.top) / box.height) * currentViewport.height
  };
}

function hitTestRect(pt) {
  const list = rectsByPage.value[pageIndex.value] || [];
  for (let i = list.length - 1; i >= 0; i--) {
    const c = userRectToCanvas(list[i], currentViewport);
    if (pt.x >= c.x && pt.x <= c.x + c.w && pt.y >= c.y && pt.y <= c.y + c.h) {
      return { rect: list[i], canvas: c };
    }
  }
  return null;
}

function onPointerDown(e) {
  if (!currentViewport || e.button !== 0) return;
  const pt = eventToViewportPt(e);
  const hit = hitTestRect(pt);
  if (hit) {
    selectedRectId.value = hit.rect.id;
    drag = { mode: 'move', startPt: pt, origCanvas: { ...hit.canvas }, rectId: hit.rect.id };
  } else {
    selectedRectId.value = null;
    drag = { mode: 'new', startPt: pt };
    draftRect.value = { x: pt.x, y: pt.y, w: 0, h: 0 };
  }
  overlayRef.value.setPointerCapture(e.pointerId);
}

function onHandleDown(e, rectId, handle) {
  if (!currentViewport) return;
  const pt = eventToViewportPt(e);
  const rect = (rectsByPage.value[pageIndex.value] || []).find((r) => r.id === rectId);
  if (!rect) return;
  selectedRectId.value = rectId;
  drag = {
    mode: 'resize',
    startPt: pt,
    origCanvas: { ...userRectToCanvas(rect, currentViewport) },
    rectId,
    handle
  };
  overlayRef.value.setPointerCapture(e.pointerId);
}

function onPointerMove(e) {
  if (!drag || !currentViewport) return;
  const pt = eventToViewportPt(e);
  if (drag.mode === 'new') {
    draftRect.value = {
      x: Math.min(drag.startPt.x, pt.x),
      y: Math.min(drag.startPt.y, pt.y),
      w: Math.abs(pt.x - drag.startPt.x),
      h: Math.abs(pt.y - drag.startPt.y)
    };
  } else if (drag.mode === 'move') {
    const dx = pt.x - drag.startPt.x;
    const dy = pt.y - drag.startPt.y;
    // live-update the stored rect via viewport round-trip
    const moved = {
      x: drag.origCanvas.x + dx,
      y: drag.origCanvas.y + dy,
      w: drag.origCanvas.w,
      h: drag.origCanvas.h
    };
    commitViewportRect(drag.rectId, moved, 'move');
  } else if (drag.mode === 'resize') {
    const dx = pt.x - drag.startPt.x;
    const dy = pt.y - drag.startPt.y;
    const o = drag.origCanvas;
    let { x, y, w, h } = o;
    if (drag.handle.includes('e')) w = o.w + dx;
    if (drag.handle.includes('s')) h = o.h + dy;
    if (drag.handle.includes('w')) { x = o.x + dx; w = o.w - dx; }
    if (drag.handle.includes('n')) { y = o.y + dy; h = o.h - dy; }
    // normalize negative sizes while dragging across the origin
    const moved = {
      x: Math.min(x, x + w), y: Math.min(y, y + h),
      w: Math.abs(w), h: Math.abs(h)
    };
    commitViewportRect(drag.rectId, moved, 'resize');
  }
}

function commitViewportRect(rectId, canvasRect, phase) {
  const list = rectsByPage.value[pageIndex.value];
  const rect = list?.find((r) => r.id === rectId);
  if (!rect) return;
  const user = canvasRectToUser(canvasRect, currentViewport);
  rect.x = user.x; rect.y = user.y; rect.w = user.w; rect.h = user.h;
  if (phase === 'move') rect.snapped = undefined; // manual move breaks the snap provenance
}

async function onPointerUp() {
  if (!drag) return;
  const d = drag;
  drag = null;
  // pointer capture 由浏览器在 pointerup 隐式释放，无需显式 release

  if (d.mode === 'new') {
    const dr = draftRect.value;
    draftRect.value = null;
    if (!dr || dr.w < 3 || dr.h < 3) return; // ignore accidental micro-drags

    let userRect = canvasRectToUser(dr, currentViewport);
    let snappedPreview = null;

    if (snapToText.value && pdfjsDoc) {
      try {
        const items = await getTextItems(pageIndex.value);
        const hits = items.filter((it) => rectsIntersect(it.bbox, userRect));
        if (hits.length) {
          const x1 = Math.min(...hits.map((h) => h.bbox.x));
          const y1 = Math.min(...hits.map((h) => h.bbox.y));
          const x2 = Math.max(...hits.map((h) => h.bbox.x + h.bbox.w));
          const y2 = Math.max(...hits.map((h) => h.bbox.y + h.bbox.h));
          userRect = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
          snappedPreview = hits.map((h) => h.str).join(' ').slice(0, 40);
        }
      } catch (e) {
        logger.warn('REDACT', `Snap extraction failed: ${e.message}`);
      }
    }

    const id = `r${pageIndex.value}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    if (!rectsByPage.value[pageIndex.value]) rectsByPage.value[pageIndex.value] = [];
    rectsByPage.value[pageIndex.value].push({
      id, x: userRect.x, y: userRect.y, w: userRect.w, h: userRect.h,
      ...(snappedPreview ? { snapped: snappedPreview } : {})
    });
    selectedRectId.value = id;
  }
}

function deleteRect(id) {
  const list = rectsByPage.value[pageIndex.value] || [];
  const idx = list.findIndex((r) => r.id === id);
  if (idx >= 0) list.splice(idx, 1);
  if (!list.length) delete rectsByPage.value[pageIndex.value];
  if (selectedRectId.value === id) selectedRectId.value = null;
}

function clearPage() {
  delete rectsByPage.value[pageIndex.value];
  selectedRectId.value = null;
}

function onKeydown(e) {
  if (isProcessing.value || lastExportedFile.value) return;
  const tag = e.target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedRectId.value) {
    e.preventDefault();
    deleteRect(selectedRectId.value);
  } else if (e.key === 'Escape') {
    selectedRectId.value = null;
    showConfirm.value = false;
  }
}

// ---------- Burn flow ----------
const showConfirm = ref(false);
function openConfirm() {
  if (!totalRects.value) return;
  recomputeSummary();
  showConfirm.value = true;
}

const PHASE_KEYS = {
  analyzing: 'redact_progress_analyzing',
  vector: 'redact_progress_burning',
  saving: 'redact_progress_burning',
  raster: 'redact_progress_raster',
  verify: 'redact_progress_verify'
};

async function executeBurn() {
  showConfirm.value = false;
  if (!docBytes.value || !totalRects.value) return;
  isProcessing.value = true;
  progressPercent.value = 5;
  progressMessage.value = t('redact_progress_analyzing');

  try {
    const pages = {};
    for (const [k, list] of Object.entries(rectsByPage.value)) {
      if (list?.length) {
        pages[Number(k)] = { rects: list.map(({ x, y, w, h }) => ({ x, y, w, h })) };
      }
    }

    const { bytes: outBytes, report } = await redactPdf(docBytes.value.slice(0), {
      pages,
      style: style.value
    }, {
      password: unlockedPassword.value || '',
      onProgress: (p, phase) => {
        progressPercent.value = Math.max(5, Math.round(p * 100));
        progressMessage.value = t(PHASE_KEYS[phase] || 'redact_progress_burning');
      }
    });

    if (!report.ok) {
      // Engine already retried with forced raster; residue remains -> keep original, surface failure
      logger.error('REDACT', `Verification failed: ${JSON.stringify(report.verify?.leftovers || [])}`);
      alert(t('redact_verify_failed'));
      return;
    }
    lastReport = {
      totalRemovedOps: (report.pages || []).reduce((n, p) => n + (p.removedOps || 0), 0),
      rasterPages: report.rasterPages || []
    };

    const prefix = userSettings.defaultExportPrefix || 'PDFSeal';
    const base = filename.value.replace(/\.[^/.]+$/, '');
    let outName = `${prefix}_Redacted_${base}`;
    if (!outName.toLowerCase().endsWith('.pdf')) outName += '.pdf';

    const pdfBlob = new Blob([outBytes], { type: 'application/pdf' });
    cachedPdfBlob = pdfBlob;
    cachedPdfName = outName;
    triggerDownload(pdfBlob, outName);
    logger.info('REDACT', `Burn complete: ${outName} (removed ${lastReport.totalRemovedOps} ops, raster pages: [${lastReport.rasterPages.join(', ')}])`);

    const ab = outBytes.buffer
      ? outBytes.buffer.slice(outBytes.byteOffset, outBytes.byteOffset + outBytes.byteLength)
      : outBytes;
    lastExportedFile.value = {
      name: outName,
      size: outBytes.byteLength || outBytes.length,
      arrayBuffer: ab,
      blob: pdfBlob
    };

    if (userSettings.autoSaveToVault) {
      try {
        await saveFile({
          name: outName,
          arrayBuffer: ab,
          folderId: 'default',
          category: 'export',
          pageCount: totalPages.value,
          isEncrypted: false
        });
        logger.info('VAULT', `Redacted result auto-saved to Vault: ${outName}`);
      } catch (e) {
        logger.warn('VAULT', `Failed to auto-save to Vault: ${e.message}`);
      }
    }
  } catch (err) {
    logger.error('REDACT', `Burn failed: ${err.message}`);
    alert('Redaction failed: ' + err.message);
  } finally {
    isProcessing.value = false;
  }
}

// ---------- Image page detection (rasterization risk hint) ----------
function scanImagePages(pdfDoc) {
  const found = [];
  pdfDoc.getPages().forEach((page, idx) => {
    if (pageResourcesContainImage(page.node, pdfDoc.context, 0)) found.push(idx);
  });
  return found;
}

function pageResourcesContainImage(node, context, depth) {
  let res = node.get ? node.get(PDFName.of('Resources')) : null;
  if (res instanceof PDFRef) res = context.lookup(res);
  if (!(res instanceof PDFDict) || depth > 3) return false;
  let xo = res.get(PDFName.of('XObject'));
  if (xo instanceof PDFRef) xo = context.lookup(xo);
  if (!(xo instanceof PDFDict)) return false;
  for (const [, val] of xo.entries()) {
    let obj = val instanceof PDFRef ? context.lookup(val) : val;
    if (!obj) continue;
    const dict = obj.dict instanceof PDFDict ? obj.dict : (obj instanceof PDFDict ? obj : null);
    if (!dict) continue;
    const subtype = dict.get(PDFName.of('Subtype'));
    if (subtype === PDFName.of('Image')) return true;
    if (subtype === PDFName.of('Form') && pageResourcesContainImage({ get: (n) => dict.get(n) }, context, depth + 1)) {
      return true; // image nested inside a Form XObject
    }
  }
  return false;
}

// ---------- File loading ----------
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
  if (selectedFiles && selectedFiles.length > 0) loadFile(selectedFiles[0]);
}

async function loadFile(file, password = '') {
  isLoading.value = true;
  pendingFileName.value = file.name;
  pendingFileObj = file;
  try {
    const rawBytes = await file.arrayBuffer();

    const security = await verifyPdfSecurity(rawBytes, password);
    if (security.isEncrypted && !security.isValid) {
      isUnlocking.value = false;
      docBytes.value = null;
      isPasswordOpen.value = true;
      if (password) passwordError.value = t('pwd_error_wrong');
      return;
    }

    // Preview document (pdf.js): rendered pages only, engine always starts from original bytes
    const loadingTask = pdfjsLib.getDocument({
      data: rawBytes.slice(0),
      password: password || undefined,
      cMapUrl: '/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: '/standard_fonts/'
    });
    if (pdfjsDoc) { try { await pdfjsDoc.destroy(); } catch (e) {} }
    pdfjsDoc = await loadingTask.promise;

    // Rasterization-risk scan (pdf-lib): pages whose resources embed image XObjects
    let imgPages = [];
    try {
      const probe = await PDFDocument.load(rawBytes, {
        password: password || undefined,
        ignoreEncryption: true,
        updateMetadata: false
      });
      imgPages = scanImagePages(probe);
    } catch (e) {
      logger.warn('REDACT', `Image page scan skipped: ${e.message}`);
    }

    docBytes.value = rawBytes;
    filename.value = file.name;
    totalPages.value = pdfjsDoc.numPages;
    imagePages.value = imgPages;
    pageIndex.value = 0;
    rectsByPage.value = {};
    selectedRectId.value = null;
    textOpsCount.value = 0;
    textItemCache.clear();
    lastExportedFile.value = null;
    lastReport = null;
    cachedPdfBlob = null;
    cachedPdfName = '';
    unlockedPassword.value = password;
    isPasswordOpen.value = false;
    passwordError.value = '';

    logger.info('REDACT', `Loaded PDF for redaction: ${file.name} (${totalPages.value} pages, image pages: [${imgPages.join(', ')}])`);
  } catch (err) {
    if (err.name === 'PasswordException' || err.message?.toLowerCase().includes('password')) {
      docBytes.value = null;
      isPasswordOpen.value = true;
      if (password) passwordError.value = t('pwd_error_wrong');
    } else {
      logger.error('REDACT', `Failed to load PDF: ${err.message}`);
      alert('Failed to load PDF: ' + err.message);
    }
  } finally {
    isLoading.value = false;
    isUnlocking.value = false;
    await nextTick();
    await renderPage();
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
  docBytes.value = null;
  unlockedPassword.value = '';
}

function reset() {
  if (pdfjsDoc) { try { pdfjsDoc.destroy()?.catch(() => {}); } catch (e) {} }
  pdfjsDoc = null;
  currentViewport = null;
  docBytes.value = null;
  filename.value = '';
  totalPages.value = 0;
  pageIndex.value = 0;
  imagePages.value = [];
  rectsByPage.value = {};
  selectedRectId.value = null;
  textItemCache.clear();
  textOpsCount.value = 0;
  pendingFileName.value = '';
  pendingFileObj = null;
  unlockedPassword.value = '';
  lastExportedFile.value = null;
  lastReport = null;
  cachedPdfBlob = null;
  cachedPdfName = '';
  progressPercent.value = 0;
  progressMessage.value = '';
  showConfirm.value = false;
  draftRect.value = null;
  drag = null;
  if (fileInputRef.value) fileInputRef.value.value = '';
}

// ---------- Tool bridge (Vault / other tools -> redact) ----------
function checkIncomingFile() {
  const incoming = consumePendingFile('redact');
  if (incoming) {
    const file = new File([incoming.arrayBuffer], incoming.name, { type: 'application/pdf' });
    loadFile(file, incoming.password || '');
  }
}

onMounted(() => {
  checkIncomingFile();
  window.addEventListener('keydown', onKeydown);
});
onActivated(checkIncomingFile);
onUnmounted(() => {
  stageRO?.disconnect();
  window.removeEventListener('keydown', onKeydown);
  if (pdfjsDoc) { try { pdfjsDoc.destroy()?.catch(() => {}); } catch (e) {} }
  pdfjsDoc = null;
  clearTimeout(summaryTimer);
});
</script>
