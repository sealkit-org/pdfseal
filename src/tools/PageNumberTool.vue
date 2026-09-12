<template>
  <section class="w-full flex-1 flex flex-col">
    <!-- Main Card Container -->
    <div class="bg-white rounded-3xl p-5 sm:p-7 shadow-xl border border-slate-100 flex flex-col flex-1">
      <!-- Integrated Header with Badge -->
      <div class="flex items-center justify-between pb-3 mb-2.5 border-b border-slate-100 shrink-0">
        <div class="flex items-center space-x-3">
          <div class="w-9 h-9 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold shadow-2xs">
            <ListOrdered class="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 class="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
              {{ t('page_number_title') }}
            </h2>
            <p class="text-xs text-slate-500 mt-0.5">
              {{ t('page_number_desc') }}
            </p>
          </div>
        </div>
      </div>

      <!-- State A: Empty State (Dual Source Dropzone: Local & Vault) -->
      <div 
        v-if="!docBytes"
        @dragover.prevent="isDragOver = true"
        @dragleave.prevent="isDragOver = false"
        @drop.prevent="onDrop"
        :class="[
          'border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition flex-1 flex flex-col items-center justify-center relative select-none',
          isDragOver ? 'border-violet-500 bg-violet-50/50' : 'border-slate-200/90 hover:border-violet-400 bg-slate-50/40 hover:bg-slate-50/80'
        ]"
      >
        <input 
          ref="fileInputRef" 
          type="file" 
          accept="application/pdf" 
          class="hidden" 
          @change="onFileSelected" 
        >
        
        <div class="w-16 h-16 bg-violet-50 text-violet-600 rounded-3xl flex items-center justify-center mb-3 shadow-inner">
          <ListOrdered class="w-8 h-8" />
        </div>
        
        <h3 class="text-base sm:text-lg font-bold text-slate-800">{{ t('page_number_drop_title') }}</h3>
        <p class="text-xs text-slate-400 mt-1 max-w-sm">{{ t('page_number_drop_subtitle') }}</p>
        
        <!-- Dual Source Selection Buttons -->
        <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button 
            type="button" 
            @click="fileInputRef.click()"
            class="bg-violet-600 hover:bg-violet-700 active:scale-98 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition flex items-center space-x-2 shadow-md hover:shadow-violet-600/25 cursor-pointer"
          >
            <Plus class="w-4 h-4" />
            <span>{{ t('merge_btn_from_local') || 'Add from Computer' }}</span>
          </button>
          
          <button 
            type="button" 
            @click="isVaultPickerOpen = true"
            class="bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center space-x-2 border border-slate-200 shadow-2xs hover:border-slate-300 cursor-pointer"
          >
            <FolderLock class="w-4 h-4 text-violet-600" />
            <span>{{ t('merge_btn_from_vault') || 'Pick from Vault' }}</span>
          </button>
        </div>
      </div>

      <!-- State B: Active Document Workspace -->
      <div v-else class="flex-1 flex flex-col justify-between overflow-hidden">
        <!-- Top Toolbar & Status Bar -->
        <div class="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100 shrink-0">
          <div class="flex items-center space-x-2 min-w-0 flex-1">
            <span class="text-xs bg-violet-50 text-violet-700 font-extrabold px-2.5 py-1 rounded-lg border border-violet-200 shrink-0">
              {{ totalPages }} {{ t('pages_label') || 'pages' }}
            </span>
            <span class="text-xs font-bold text-slate-700 truncate max-w-xs" :title="filename">
              {{ filename }}
            </span>
            <span 
              v-if="unlockedPassword" 
              class="text-[10px] bg-violet-100 text-violet-800 px-2 py-0.5 rounded-md font-bold flex items-center shrink-0"
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
              class="text-xs text-violet-600 hover:bg-violet-50 font-semibold px-2.5 py-1.5 rounded-xl border border-violet-200 transition flex items-center space-x-1 cursor-pointer"
            >
              <RefreshCw class="w-3.5 h-3.5" />
              <span>{{ t('btn_choose_another') || 'Choose Another File' }}</span>
            </button>

            <!-- Choose From Vault -->
            <button 
              @click="isVaultPickerOpen = true"
              class="text-xs text-slate-700 hover:bg-slate-100 font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 transition flex items-center space-x-1 cursor-pointer"
            >
              <FolderLock class="w-3.5 h-3.5 text-violet-600" />
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

        <!-- Loading State -->
        <div v-if="isLoading" class="flex-1 flex flex-col items-center justify-center py-16 text-center text-xs text-slate-500 font-medium">
          <Loader2 class="w-8 h-8 animate-spin mx-auto mb-3 text-violet-600" />
          <span>{{ t('rendering_pages') }}...</span>
        </div>

        <!-- Center Workspace: Controls & Live Preview -->
        <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-4 my-2.5 flex-1 items-stretch min-h-0 overflow-hidden">
          <!-- Left Controls (5 cols on lg) -->
          <div class="lg:col-span-5 bg-slate-50/80 rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 flex flex-col justify-between overflow-y-auto custom-scrollbar">
            <div class="space-y-3">
              <div class="flex items-center space-x-2 font-bold text-slate-800 text-xs border-b border-slate-200/70 pb-1.5">
                <Sliders class="w-3.5 h-3.5 text-violet-600" />
                <span>{{ t('page_number_title') }}</span>
              </div>

              <!-- Format Macro Input & Presets -->
              <div>
                <div class="flex justify-between items-center text-[11px] font-semibold text-slate-700 mb-1">
                  <label>{{ t('pn_format_label') }}</label>
                  <span class="text-[10px] text-violet-700 font-mono font-bold bg-violet-100/70 px-1.5 py-0.5 rounded">
                    {{ currentInterpolatedPreview }}
                  </span>
                </div>
                <input 
                  v-model="pnFormat" 
                  @input="renderPreview"
                  type="text" 
                  :placeholder="t('pn_format_placeholder', 'e.g. Page {n} of {total}')"
                  class="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-violet-500 outline-hidden font-medium shadow-2xs"
                >
                <div class="flex flex-wrap gap-1.5 mt-1.5">
                  <button 
                    type="button" 
                    v-for="preset in formatPresets" 
                    :key="preset.val"
                    @click="setFormat(preset.val)"
                    :class="[
                      'text-[10px] px-2 py-0.5 rounded-lg border transition font-mono cursor-pointer',
                      pnFormat === preset.val
                        ? 'bg-violet-100 text-violet-800 border-violet-300 font-bold shadow-2xs'
                        : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                    ]"
                  >
                    {{ preset.label }}
                  </button>
                </div>
              </div>

              <!-- Start Number & Skip Cover -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[11px] font-semibold text-slate-700 mb-1">{{ t('pn_start_number') }}</label>
                  <input 
                    v-model.number="pnStartNumber" 
                    @input="renderPreview"
                    type="number" 
                    min="1" 
                    class="w-full text-xs bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-violet-500 outline-hidden font-medium shadow-2xs"
                  >
                </div>

                <div class="flex flex-col justify-end">
                  <label class="flex items-center space-x-1.5 text-xs text-slate-700 font-semibold cursor-pointer select-none py-1.5">
                    <input 
                      type="checkbox" 
                      v-model="pnSkipCover" 
                      @change="renderPreview"
                      class="w-4 h-4 text-violet-600 rounded-md border-slate-300 focus:ring-violet-500 cursor-pointer"
                    >
                    <span>{{ t('pn_skip_cover') }}</span>
                  </label>
                </div>
              </div>

              <!-- 6-Anchor Position Grid -->
              <div>
                <label class="block text-[11px] font-semibold text-slate-700 mb-1">{{ t('pn_position_label') }}</label>
                <div class="grid grid-cols-3 gap-1.5">
                  <button 
                    type="button" 
                    v-for="pos in positionOptions" 
                    :key="pos.id"
                    @click="setPosition(pos.id)"
                    :class="[
                      'text-[11px] py-1.5 px-2 rounded-xl border text-center transition font-semibold cursor-pointer',
                      pnPosition === pos.id 
                        ? 'border-violet-600 bg-violet-100/80 text-violet-900 font-bold shadow-2xs' 
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    ]"
                  >
                    {{ t(pos.labelKey) }}
                  </button>
                </div>
              </div>

              <!-- Background Whiteout Mask Mode -->
              <div>
                <label class="block text-[11px] font-semibold text-slate-700 mb-1">{{ t('pn_mask_label') }}</label>
                <div class="grid grid-cols-3 gap-1.5">
                  <button 
                    type="button" 
                    v-for="m in maskOptions" 
                    :key="m.id"
                    @click="setMaskMode(m.id)"
                    :class="[
                      'text-[10px] py-1.5 px-1 rounded-xl border text-center transition font-semibold cursor-pointer',
                      pnMaskMode === m.id 
                        ? 'border-violet-600 bg-violet-100/80 text-violet-900 font-bold shadow-2xs' 
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    ]"
                  >
                    {{ t(m.labelKey) }}
                  </button>
                </div>

                <!-- Mask Color Picker & Pipette -->
                <div v-if="pnMaskMode !== 'none'" class="mt-2 flex flex-wrap items-center gap-2">
                  <span class="text-[11px] text-slate-600 font-semibold">{{ t('pn_mask_color_label') }}:</span>
                  
                  <div class="flex items-center space-x-1.5">
                    <!-- White swatch -->
                    <button 
                      type="button" 
                      @click="setMaskColor('#ffffff')" 
                      class="w-5 h-5 rounded-full bg-white border border-slate-300 shadow-2xs transition hover:scale-110" 
                      :class="{ 'ring-2 ring-violet-600': pnMaskColor.toLowerCase() === '#ffffff' }"
                      :title="t('pn_mask_color_white')"
                    ></button>

                    <!-- Cream / Parchment swatch -->
                    <button 
                      type="button" 
                      @click="setMaskColor('#fbf9f4')" 
                      class="w-5 h-5 rounded-full bg-[#fbf9f4] border border-amber-200 shadow-2xs transition hover:scale-110" 
                      :class="{ 'ring-2 ring-violet-600': pnMaskColor.toLowerCase() === '#fbf9f4' }"
                      :title="t('pn_mask_color_cream')"
                    ></button>
                  </div>

                  <!-- Custom Color Picker -->
                  <div class="relative w-6 h-6 rounded-lg border border-slate-300 overflow-hidden shadow-2xs cursor-pointer flex items-center justify-center">
                    <input 
                      type="color" 
                      v-model="pnMaskColor" 
                      @input="renderPreview"
                      class="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    >
                    <div class="w-full h-full" :style="{ backgroundColor: pnMaskColor }"></div>
                  </div>

                  <!-- Auto-sample Pipette Button -->
                  <button 
                    type="button" 
                    @click="sampleCurrentPageBackground"
                    class="text-[10px] bg-slate-100 hover:bg-violet-50 text-slate-700 hover:text-violet-700 px-2 py-1 rounded-lg border border-slate-200 transition flex items-center space-x-1 font-semibold cursor-pointer"
                    :title="t('pn_mask_color_sample')"
                  >
                    <Pipette class="w-3 h-3 text-violet-600" />
                    <span>{{ t('pn_mask_color_sample') }}</span>
                  </button>
                </div>
              </div>

              <!-- Typography: Font Size & Text Color -->
              <div class="grid grid-cols-2 gap-3 pt-1 border-t border-slate-200/70">
                <div>
                  <div class="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                    <span>{{ t('wm_size_label') || 'Font Size' }}</span>
                    <span class="text-violet-700 font-mono font-bold">{{ pnFontSize }}pt</span>
                  </div>
                  <input 
                    v-model.number="pnFontSize" 
                    @input="renderPreview"
                    type="range" 
                    min="8" 
                    max="22" 
                    class="w-full accent-violet-600 cursor-pointer"
                  >
                </div>

                <div>
                  <div class="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                    <span>{{ t('pn_text_color') }}</span>
                    <span class="text-slate-500 font-mono uppercase text-[10px]">{{ pnTextColor }}</span>
                  </div>
                  <div class="flex items-center space-x-2">
                    <div class="relative w-6 h-6 rounded-lg border border-slate-300 overflow-hidden shadow-2xs cursor-pointer flex items-center justify-center">
                      <input 
                        type="color" 
                        v-model="pnTextColor" 
                        @input="renderPreview"
                        class="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                      >
                      <div class="w-full h-full" :style="{ backgroundColor: pnTextColor }"></div>
                    </div>
                    <div class="flex items-center space-x-1">
                      <button 
                        v-for="c in ['#334155', '#000000', '#1e293b', '#1d4ed8']" 
                        :key="c"
                        type="button"
                        @click="setTextColor(c)"
                        :style="{ backgroundColor: c }"
                        :class="[
                          'w-4 h-4 rounded-full transition cursor-pointer',
                          pnTextColor.toLowerCase() === c.toLowerCase() ? 'ring-2 ring-violet-600 scale-110' : 'opacity-80 hover:opacity-100'
                        ]"
                      ></button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Margin Slider -->
              <div>
                <div class="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                  <span>{{ t('pn_margin') || 'Edge Margin' }}</span>
                  <span class="text-slate-500 font-mono font-bold">{{ pnMargin }}pt</span>
                </div>
                <input 
                  v-model.number="pnMargin" 
                  @input="renderPreview"
                  type="range" 
                  min="12" 
                  max="48" 
                  class="w-full accent-violet-600 cursor-pointer"
                >
              </div>
            </div>
          </div>

          <!-- Right Live Canvas Preview (7 cols on lg) -->
          <div class="lg:col-span-7 bg-slate-100/70 rounded-2xl p-3 sm:p-4 border border-slate-200/80 flex flex-col justify-between overflow-hidden min-h-0">
            <!-- Preview Header & Page Switcher -->
            <div class="flex items-center justify-between gap-2 mb-2 shrink-0">
              <div class="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
                <span class="w-2 h-2 rounded-full bg-violet-600"></span>
                <span>{{ t('live_preview') }}</span>
              </div>

              <!-- Page Navigation Controls -->
              <div class="flex items-center space-x-1 text-xs">
                <button 
                  type="button" 
                  :disabled="previewPageIndex <= 0" 
                  @click="changePreviewPage(previewPageIndex - 1)"
                  class="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold disabled:opacity-40 transition cursor-pointer"
                >
                  ◀
                </button>
                <span class="font-mono font-bold text-slate-800 px-2 py-0.5 bg-white rounded-md border border-slate-200">
                  {{ previewPageIndex + 1 }} / {{ totalPages }}
                </span>
                <button 
                  type="button" 
                  :disabled="previewPageIndex >= totalPages - 1" 
                  @click="changePreviewPage(previewPageIndex + 1)"
                  class="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold disabled:opacity-40 transition cursor-pointer"
                >
                  ▶
                </button>

                <!-- Quick Jumps -->
                <div class="hidden sm:flex items-center space-x-1 pl-1">
                  <button 
                    type="button" 
                    @click="changePreviewPage(0)"
                    :class="['px-2 py-0.5 rounded-md text-[10px] font-semibold border transition cursor-pointer', previewPageIndex === 0 ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50']"
                  >
                    {{ t('pn_quick_cover', 'Cover') }}
                  </button>
                  <button 
                    v-if="totalPages > 1"
                    type="button" 
                    @click="changePreviewPage(1)"
                    :class="['px-2 py-0.5 rounded-md text-[10px] font-semibold border transition cursor-pointer', previewPageIndex === 1 ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50']"
                  >
                    P.2
                  </button>
                  <button 
                    v-if="totalPages > 2"
                    type="button" 
                    @click="changePreviewPage(totalPages - 1)"
                    :class="['px-2 py-0.5 rounded-md text-[10px] font-semibold border transition cursor-pointer', previewPageIndex === totalPages - 1 ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50']"
                  >
                    P.{{ totalPages }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Canvas Container -->
            <div class="bg-white p-2 rounded-2xl shadow-md border border-slate-200/80 max-w-full flex-1 w-full overflow-hidden flex items-center justify-center relative min-h-0">
              <canvas ref="previewCanvasRef" class="max-h-[380px] max-w-full object-contain rounded-lg shadow-2xs"></canvas>

              <!-- Cover Skipped Indicator Overlay -->
              <div 
                v-if="previewPageIndex === 0 && pnSkipCover" 
                class="absolute top-4 left-4 bg-amber-50/95 border border-amber-300 text-amber-900 text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-xs flex items-center space-x-1.5 backdrop-blur-xs"
              >
                <span>🛡️</span>
                <span>{{ t('pn_cover_skipped_badge') }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Next Action Relay Banner -->
        <NextActionBanner 
          v-if="showNextActions && lastExportedFile"
          :current-tool="'page_number'"
          :file="lastExportedFile"
          @send-to-tool="(tId) => emit('send-to-tool', tId)"
          @close="showNextActions = false"
          class="mb-3"
        />

        <!-- Assembly Bottom Action & Export Configuration Bar -->
        <div class="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <!-- Left: Output Filename & Auto-save Checkbox -->
          <div class="flex flex-wrap items-center gap-3">
            <div class="flex items-center space-x-1.5">
              <label class="text-xs text-slate-500 font-semibold shrink-0">
                {{ t('vault_field_name') }}:
              </label>
              <input 
                v-model="customOutputBaseName"
                type="text" 
                :placeholder="t('vault_filename_placeholder') || 'Custom output filename (optional)'"
                class="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:bg-white focus:ring-2 focus:ring-violet-500 outline-hidden font-medium text-slate-700 w-44 sm:w-64"
              >
            </div>

            <label class="flex items-center space-x-1.5 text-xs text-slate-600 font-semibold cursor-pointer select-none">
              <input 
                type="checkbox" 
                v-model="autoSaveToVault" 
                class="w-4 h-4 text-violet-600 rounded-md border-slate-300 focus:ring-violet-500 cursor-pointer"
              >
              <span>{{ t('vault_autosave_checkbox') }}</span>
            </label>
          </div>

          <!-- Right: Execution Button -->
          <button 
            :disabled="isProcessing || isLoading"
            @click="executePageNumber" 
            class="bg-violet-600 hover:bg-violet-700 active:scale-98 text-white text-xs sm:text-sm font-bold px-6 py-2.5 rounded-xl transition flex items-center justify-center space-x-2 shadow-md hover:shadow-violet-600/25 disabled:opacity-50 cursor-pointer ml-auto"
          >
            <span v-if="!isProcessing">{{ t('pn_download_btn') }}</span>
            <span v-else>{{ t('loading') || 'Processing...' }}</span>
            <Download v-if="!isProcessing" class="w-4 h-4" />
            <Loader2 v-else class="w-4 h-4 animate-spin" />
          </button>
        </div>
      </div>
    </div>

    <!-- Vault File Picker Modal -->
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
import { ref, computed, watch, nextTick, onMounted, onActivated } from 'vue';
import { 
  ListOrdered, 
  Plus, 
  Sliders, 
  Download, 
  Loader2, 
  FolderLock, 
  Unlock, 
  RefreshCw,
  Pipette
} from 'lucide-vue-next';
import * as pdfjsLib from 'pdfjs-dist';
import { t } from '../i18n';
import { triggerDownload } from '../utils/download';
import { verifyPdfSecurity, loadCleanPdfDocument } from '../utils/pdfSecurity';
import { consumePendingFile } from '../utils/toolBridge';
import { saveFile } from '../utils/vaultDb';
import { logger } from '../utils/logger';
import { generateExportFileName } from '../utils/filenameUtils';
import { applyPageNumbers, interpolatePageNumber, calculatePageNumberGeometry } from '../utils/pageNumberEngine';
import PasswordModal from '../components/PasswordModal.vue';
import VaultFilePickerModal from '../components/VaultFilePickerModal.vue';
import NextActionBanner from '../components/NextActionBanner.vue';

const emit = defineEmits(['send-to-tool']);

// File & State
const docBytes = ref(null);
const filename = ref('');
const totalPages = ref(0);
const isDragOver = ref(false);
const isLoading = ref(false);
const isProcessing = ref(false);
const fileInputRef = ref(null);
const previewCanvasRef = ref(null);
const previewPageIndex = ref(0); // 0-based

// Password Handling
const isPasswordOpen = ref(false);
const isUnlocking = ref(false);
const passwordError = ref('');
const pendingFileName = ref('');
let pendingFileObj = null;
let unlockedPassword = '';

// Vault Picker & Auto-save
const isVaultPickerOpen = ref(false);
const autoSaveToVault = ref(false);
const customOutputBaseName = ref('');

// Export & Next Action
const lastExportedFile = ref(null);
const showNextActions = ref(false);

// Configuration options
const pnFormat = ref('Page {n} of {total}');
const pnStartNumber = ref(1);
const pnSkipCover = ref(false);
const pnPosition = ref('bottom_center');
const pnMaskMode = ref('full_ribbon');
const pnMaskColor = ref('#ffffff');
const pnFontSize = ref(10);
const pnTextColor = ref('#334155');
const pnMargin = ref(24);

// Format Presets
const formatPresets = [
  { val: '{n}', label: '{n}' },
  { val: '{n} / {total}', label: '{n} / {total}' },
  { val: 'Page {n} of {total}', label: 'Page {n} of {total}' },
  { val: '第 {n} 页，共 {total} 页', label: '第 {n} 页，共 {total} 页' }
];

// Position Options (2x3 grid)
const positionOptions = [
  { id: 'top_left', labelKey: 'pn_pos_top_left' },
  { id: 'top_center', labelKey: 'pn_pos_top_center' },
  { id: 'top_right', labelKey: 'pn_pos_top_right' },
  { id: 'bottom_left', labelKey: 'pn_pos_bottom_left' },
  { id: 'bottom_center', labelKey: 'pn_pos_bottom_center' },
  { id: 'bottom_right', labelKey: 'pn_pos_bottom_right' }
];

// Mask Mode Options
const maskOptions = [
  { id: 'full_ribbon', labelKey: 'pn_mask_ribbon' },
  { id: 'local_box', labelKey: 'pn_mask_box' },
  { id: 'none', labelKey: 'pn_mask_none' }
];

// Current page canvas cache
let activePdfDoc = null;
let renderedPageCanvases = new Map();

const currentInterpolatedPreview = computed(() => {
  const sample = interpolatePageNumber(pnFormat.value, previewPageIndex.value, totalPages.value || 10, {
    startNumber: pnStartNumber.value,
    skipCover: pnSkipCover.value
  });
  return sample || t('pn_cover_skipped_badge');
});

function setFormat(val) {
  pnFormat.value = val;
  renderPreview();
}

function setPosition(pos) {
  pnPosition.value = pos;
  renderPreview();
}

function setMaskMode(mode) {
  pnMaskMode.value = mode;
  renderPreview();
}

function setMaskColor(hex) {
  pnMaskColor.value = hex;
  renderPreview();
}

function setTextColor(hex) {
  pnTextColor.value = hex;
  renderPreview();
}

async function changePreviewPage(pageIdx) {
  if (pageIdx < 0 || pageIdx >= totalPages.value) return;
  previewPageIndex.value = pageIdx;
  await renderPreview();
}

// File drop & select
function onDrop(e) {
  isDragOver.value = false;
  const file = e.dataTransfer.files[0];
  if (file && file.type === 'application/pdf') {
    loadFile(file);
  }
}

function onFileSelected(e) {
  const file = e.target.files[0];
  if (file) {
    loadFile(file);
  }
}

function handleVaultFilesSelected(files) {
  if (files && files.length > 0) {
    const vFile = files[0];
    loadFile(vFile);
  }
}

async function loadFile(fileObj, password = '') {
  isLoading.value = true;
  pendingFileObj = fileObj;
  pendingFileName.value = fileObj.name;
  showNextActions.value = false;
  lastExportedFile.value = null;

  try {
    let arrayBuffer = fileObj.arrayBuffer;
    if (typeof arrayBuffer === 'function') {
      arrayBuffer = await fileObj.arrayBuffer();
    } else if (fileObj.data instanceof Uint8Array) {
      arrayBuffer = fileObj.data.buffer.slice(fileObj.data.byteOffset, fileObj.data.byteOffset + fileObj.data.byteLength);
    }

    docBytes.value = arrayBuffer;
    filename.value = fileObj.name || 'document.pdf';

    const pdfDataForViewer = arrayBuffer.slice(0);
    const loadingTask = pdfjsLib.getDocument({ 
      data: pdfDataForViewer,
      password: password || undefined,
      cMapUrl: '/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: '/standard_fonts/'
    });
    
    activePdfDoc = await loadingTask.promise;
    totalPages.value = activePdfDoc.numPages;
    previewPageIndex.value = 0;
    renderedPageCanvases.clear();

    unlockedPassword = password;
    isPasswordOpen.value = false;
    passwordError.value = '';

    await renderPreview();
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

/**
 * Samples the background pixel color from the current rendered page canvas.
 */
function sampleCurrentPageBackground() {
  const baseCanvas = renderedPageCanvases.get(previewPageIndex.value);
  if (!baseCanvas) return;

  const ctx = baseCanvas.getContext('2d');
  // Sample near bottom center where old page numbers reside
  const sampleX = Math.round(baseCanvas.width / 2);
  const sampleY = Math.round(baseCanvas.height - 20 * (baseCanvas.width / 595));

  try {
    const pixel = ctx.getImageData(sampleX, sampleY, 1, 1).data;
    // Check alpha
    if (pixel[3] > 0) {
      const r = pixel[0].toString(16).padStart(2, '0');
      const g = pixel[1].toString(16).padStart(2, '0');
      const b = pixel[2].toString(16).padStart(2, '0');
      pnMaskColor.value = `#${r}${g}${b}`;
      renderPreview();
    }
  } catch (e) {
    logger.warn('PAGE_NUMBER', 'Color sampling error: ' + e.message);
  }
}

/**
 * Renders the live interactive preview on <canvas> for previewPageIndex.
 */
async function renderPreview() {
  if (!activePdfDoc || !previewCanvasRef.value) return;

  const pageIdx = previewPageIndex.value;
  let baseCanvas = renderedPageCanvases.get(pageIdx);

  if (!baseCanvas) {
    const pdfPage = await activePdfDoc.getPage(pageIdx + 1);
    const viewport = pdfPage.getViewport({ scale: 1.5 });

    baseCanvas = document.createElement('canvas');
    baseCanvas.width = viewport.width;
    baseCanvas.height = viewport.height;
    const bctx = baseCanvas.getContext('2d');
    await pdfPage.render({ canvasContext: bctx, viewport }).promise;
    renderedPageCanvases.set(pageIdx, baseCanvas);
  }

  const canvas = previewCanvasRef.value;
  const ctx = canvas.getContext('2d');
  canvas.width = baseCanvas.width;
  canvas.height = baseCanvas.height;

  // 1. Draw base page
  ctx.drawImage(baseCanvas, 0, 0);

  // 2. Interpolate page number text
  const text = interpolatePageNumber(pnFormat.value, pageIdx, totalPages.value, {
    startNumber: pnStartNumber.value,
    skipCover: pnSkipCover.value
  });

  // If cover page is skipped, do not draw overlay
  if (!text) return;

  const scale = canvas.width / 595.28; // Standard A4 width reference ratio
  const fontPt = pnFontSize.value * scale * 1.35;
  const marginPx = pnMargin.value * scale;

  ctx.font = `bold ${fontPt}px "PingFang SC", "Microsoft YaHei", "Segoe UI", -apple-system, sans-serif`;
  const textMetrics = ctx.measureText(text);
  const textWidth = textMetrics.width;

  const isTop = pnPosition.value.startsWith('top');
  const isCenter = pnPosition.value.endsWith('center');
  const isRight = pnPosition.value.endsWith('right');

  let textX = 0;
  if (isCenter) {
    textX = (canvas.width - textWidth) / 2;
  } else if (isRight) {
    textX = canvas.width - marginPx - textWidth;
  } else {
    textX = marginPx;
  }

  let textY = isTop ? marginPx + fontPt : canvas.height - marginPx;

  // 3. Draw Mask Rectangle
  if (pnMaskMode.value === 'full_ribbon') {
    const ribbonHeight = Math.max(34 * scale, marginPx * 1.8);
    const ribbonY = isTop ? 0 : canvas.height - ribbonHeight;
    ctx.fillStyle = pnMaskColor.value;
    ctx.fillRect(0, ribbonY, canvas.width, ribbonHeight);
  } else if (pnMaskMode.value === 'local_box') {
    const padX = 14 * scale;
    const padY = 5 * scale;
    const boxWidth = Math.max(textWidth + padX * 2, 60 * scale);
    const boxHeight = fontPt + padY * 2;
    const boxX = isCenter ? (canvas.width - boxWidth) / 2 : (isRight ? canvas.width - marginPx - boxWidth : marginPx - padX / 2);
    const boxY = textY - fontPt - padY / 2;
    ctx.fillStyle = pnMaskColor.value;
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
  }

  // 4. Draw Text
  ctx.fillStyle = pnTextColor.value;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, textX, textY);
}

async function executePageNumber() {
  if (!docBytes.value) return;
  isProcessing.value = true;

  try {
    const { outBytes, pageCount } = await applyPageNumbers(docBytes.value, {
      format: pnFormat.value,
      position: pnPosition.value,
      startNumber: pnStartNumber.value,
      skipCover: pnSkipCover.value,
      fontSize: pnFontSize.value,
      textColor: pnTextColor.value,
      maskMode: pnMaskMode.value,
      maskColor: pnMaskColor.value,
      margin: pnMargin.value,
      password: unlockedPassword || ''
    });

    let outName = (customOutputBaseName.value.trim() || generateExportFileName(filename.value, 'Numbered'));
    if (!outName.toLowerCase().endsWith('.pdf')) {
      outName += '.pdf';
    }

    triggerDownload(new Blob([outBytes], { type: 'application/pdf' }), outName);

    lastExportedFile.value = {
      name: outName,
      arrayBuffer: outBytes.buffer ? outBytes.buffer.slice(outBytes.byteOffset, outBytes.byteOffset + outBytes.byteLength) : outBytes
    };
    showNextActions.value = true;

    // Auto-save to Vault if checked
    if (autoSaveToVault.value) {
      await saveFile({
        name: outName,
        arrayBuffer: outBytes,
        folderId: 'default',
        category: 'export',
        pageCount,
        isEncrypted: false
      });
      logger.info('VAULT', `Page numbered result auto-saved to Vault: ${outName}`);
    }
  } catch (err) {
    logger.error('PAGE_NUMBER', `Page numbering execution failed: ${err.message}`);
    alert('Failed to apply page numbers: ' + err.message);
  } finally {
    isProcessing.value = false;
  }
}

function reset() {
  docBytes.value = null;
  filename.value = '';
  totalPages.value = 0;
  previewPageIndex.value = 0;
  activePdfDoc = null;
  renderedPageCanvases.clear();
  unlockedPassword = '';
  showNextActions.value = false;
  lastExportedFile.value = null;
}

function checkIncomingFile() {
  const incoming = consumePendingFile('page_number');
  if (incoming) {
    const file = new File([incoming.arrayBuffer], incoming.name, { type: 'application/pdf' });
    loadFile(file, incoming.password || '');
  }
}

onMounted(checkIncomingFile);
onActivated(checkIncomingFile);
</script>
