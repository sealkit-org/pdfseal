<template>
  <section class="w-full flex-1 flex flex-col relative">
    <!-- Main Assembly Container (Unified White Card) -->
    <div class="bg-white rounded-3xl p-5 sm:p-7 shadow-xl border border-slate-100 flex flex-col flex-1">
      <!-- Top Title Header -->
      <div class="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0 shadow-2xs">
            <LayoutGrid class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
              {{ t('organize_title') }}
            </h2>
            <p class="text-xs text-slate-400 font-medium hidden sm:block mt-0.5">
              {{ t('organize_desc') }}
            </p>
          </div>
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
          <LayoutGrid class="w-8 h-8" />
        </div>
        <h3 class="text-base sm:text-lg font-bold text-slate-800">
          {{ t('organize_drop_title') }}
        </h3>
        <p class="text-xs text-slate-400 mt-1 max-w-sm">
          {{ t('organize_drop_subtitle') }}
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
            <span>{{ t('merge_btn_from_local') || 'Add from Computer' }}</span>
          </button>

          <!-- From Local Vault -->
          <button 
            type="button" 
            @click="isVaultPickerOpen = true"
            class="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-slate-400 text-xs font-bold px-5 py-2.5 rounded-xl transition flex items-center space-x-2 shadow-2xs cursor-pointer"
          >
            <FolderLock class="w-4 h-4 text-indigo-600" />
            <span>{{ t('merge_btn_from_vault') || 'Pick from Vault' }}</span>
          </button>
        </div>
      </div>

      <!-- 2. ACTIVE ASSEMBLY WORKSPACE -->
      <div v-else class="flex-1 flex flex-col justify-between pt-4">
        <!-- Assembly Control Bar (Single-Row Streamlined Layout) -->
        <div class="flex items-center justify-between gap-2.5 pb-3 border-b border-slate-100 shrink-0">
          <!-- Left Info Badges & Document Operations -->
          <div class="flex items-center space-x-2 min-w-0">
            <span class="text-xs bg-indigo-50 text-indigo-700 font-extrabold px-2.5 py-1 rounded-xl border border-indigo-200/80 shrink-0">
              {{ pages.length }} {{ t('pages_label') || 'pages' }}
            </span>
            <span class="text-xs font-bold text-slate-800 truncate max-w-[120px] sm:max-w-[160px] md:max-w-[200px]" :title="filename">
              {{ filename }}
            </span>
            <span 
              v-if="unlockedPassword" 
              class="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md shrink-0"
            >
              <Unlock class="w-3 h-3 mr-0.5" />
              {{ t('badge_unlocked') || 'Unlocked' }}
            </span>

            <!-- Compact Document Actions: Replace & Clear -->
            <div class="flex items-center space-x-1 pl-1.5 border-l border-slate-200/80">
              <button 
                @click="fileInputRef.click()"
                class="text-xs text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 font-medium px-2 py-1 rounded-lg transition flex items-center space-x-1 cursor-pointer"
                :title="t('btn_choose_another') || 'Replace File'"
              >
                <RefreshCw class="w-3.5 h-3.5" />
                <span class="hidden lg:inline text-[11px]">{{ t('org_btn_replace_file') }}</span>
              </button>
              <button 
                @click="reset" 
                class="text-xs text-slate-400 hover:text-rose-600 hover:bg-rose-50 font-medium p-1 rounded-lg transition cursor-pointer"
                :title="t('btn_clear_all') || 'Clear All'"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <!-- Quick Action Buttons Toolbar (Streamlined Single-Row Layout) -->
          <div class="flex items-center gap-1.5 sm:gap-2">
            <!-- Undo / Redo Buttons -->
            <div class="flex items-center space-x-0.5 bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
              <button
                @click="undo"
                :disabled="undoStack.length === 0"
                class="p-1.5 text-slate-700 hover:text-indigo-600 hover:bg-white rounded-lg transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-700"
                :title="t('org_btn_undo') + ' (Ctrl+Z)'"
              >
                <Undo2 class="w-3.5 h-3.5" />
              </button>
              <button
                @click="redo"
                :disabled="redoStack.length === 0"
                class="p-1.5 text-slate-700 hover:text-indigo-600 hover:bg-white rounded-lg transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-700"
                :title="t('org_btn_redo') + ' (Ctrl+Y)'"
              >
                <Redo2 class="w-3.5 h-3.5" />
              </button>
            </div>

            <!-- Select All / Deselect Toggle Button -->
            <button
              @click="toggleSelectAll"
              class="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-2.5 py-1.5 rounded-xl border border-slate-200/80 transition flex items-center space-x-1 cursor-pointer shadow-2xs"
              :title="selectedPageIds.size === pages.length ? t('org_btn_deselect') : t('org_btn_select_all')"
            >
              <CheckSquare v-if="selectedPageIds.size === pages.length && pages.length > 0" class="w-3.5 h-3.5 text-indigo-600" />
              <Square v-else class="w-3.5 h-3.5 text-slate-500" />
              <span class="hidden md:inline">{{ selectedPageIds.size === pages.length && pages.length > 0 ? t('org_btn_deselect') : t('org_btn_select_all') }}</span>
            </button>

            <!-- Insert Blank Page (Concise: + Blank / + 空白页) -->
            <button 
              @click="insertBlankPageAt(null)" 
              class="text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold px-2.5 py-1.5 rounded-xl border border-amber-200/80 transition flex items-center space-x-1 cursor-pointer shadow-2xs"
              :title="t('org_insert_blank_here') || 'Insert blank A4 page'"
            >
              <FilePlus class="w-3.5 h-3.5 text-amber-600" />
              <span>{{ t('org_btn_insert_blank') }}</span>
            </button>

            <!-- Append External File (Split Button: + File / + 外部文件) -->
            <div class="inline-flex rounded-xl shadow-2xs">
              <button 
                @click="appendFileInputRef.click()" 
                class="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-2.5 py-1.5 rounded-l-xl border border-indigo-200/80 transition flex items-center space-x-1 cursor-pointer"
                :title="t('merge_btn_from_local') || 'Add from Computer'"
              >
                <FileUp class="w-3.5 h-3.5 text-indigo-600" />
                <span>{{ t('org_btn_append_file') }}</span>
              </button>
              <button 
                @click="isAppendVaultOpen = true" 
                class="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-2 py-1.5 rounded-r-xl border-t border-b border-r border-indigo-200/80 transition flex items-center cursor-pointer"
                :title="t('merge_btn_from_vault') || 'Pick from Vault'"
              >
                <FolderLock class="w-3.5 h-3.5 text-indigo-600" />
              </button>
            </div>

            <!-- Rotate All (Concise: Rotate All / 全部旋转) -->
            <button 
              @click="rotateAllPages(90)" 
              class="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200/80 transition flex items-center space-x-1 cursor-pointer shadow-2xs"
              :title="t('rotate_all_90')"
            >
              <RotateCw class="w-3.5 h-3.5 text-slate-600" />
              <span class="hidden sm:inline">{{ t('org_btn_rotate_all') }}</span>
            </button>

            <!-- Magic A4 -->
            <button 
              @click="magicStandardizeA4()" 
              class="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-1.5 rounded-xl border border-slate-200/80 transition flex items-center space-x-1 cursor-pointer shadow-2xs"
              title="Scale & Center to A4"
            >
              <Wand2 class="w-3.5 h-3.5 text-amber-600" />
              <span>A4</span>
            </button>

            <!-- Magic Portrait (Concise: Portrait / 统一纵向) -->
            <button 
              @click="magicForcePortrait()" 
              class="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-1.5 rounded-xl border border-slate-200/80 transition flex items-center space-x-1 cursor-pointer shadow-2xs"
              :title="t('org_btn_portrait_tip')"
            >
              <Wand2 class="w-3.5 h-3.5 text-emerald-600" />
              <span class="hidden md:inline">{{ t('org_btn_portrait') }}</span>
            </button>
          </div>
        </div>

        <!-- Hidden File Inputs -->
        <input 
          ref="fileInputRef" 
          type="file" 
          accept="application/pdf" 
          class="hidden" 
          @change="onFileSelected" 
        >
        <input 
          ref="appendFileInputRef" 
          type="file" 
          accept="application/pdf" 
          multiple
          class="hidden" 
          @change="onAppendFilesSelected" 
        >

        <!-- Loading State -->
        <div v-if="isLoading || isAppending" class="flex-1 flex flex-col items-center justify-center py-20 text-center text-xs text-slate-500 font-medium">
          <Loader2 class="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-600" />
          <span>{{ t('rendering_pages') }}...</span>
        </div>

        <!-- Sortable Interactive Thumbnail Cards Grid -->
        <div 
          v-else 
          ref="gridRef" 
          class="flex-1 my-3 overflow-y-auto max-h-[460px] pr-1 grid content-start items-start grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 select-none"
        >
          <div 
            v-for="(p, idx) in pages" 
            :key="p.id"
            @click="handleCardClick(idx, $event)"
            :class="[
              'rounded-2xl border p-2.5 shadow-2xs flex flex-col items-center relative group hover:shadow-md transition cursor-grab active:cursor-grabbing select-none',
              selectedPageIds.has(p.id) 
                ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/40' 
                : 'bg-slate-50/90 hover:bg-white border-slate-200/80 hover:border-indigo-300'
            ]"
          >
            <!-- Card Header: Selection Checkbox + Page Index Badge + Rotate/Blank/Delete Controls -->
            <div class="w-full flex items-center justify-between mb-1.5">
              <div class="flex items-center space-x-1.5 min-w-0">
                <!-- Checkbox (no-drag) -->
                <button
                  type="button"
                  @click.stop="togglePageSelection(p.id, idx)"
                  :class="[
                    'w-4 h-4 rounded flex items-center justify-center transition cursor-pointer no-drag shrink-0',
                    selectedPageIds.has(p.id) ? 'bg-indigo-600 text-white shadow-2xs' : 'border border-slate-300 bg-white hover:border-indigo-400'
                  ]"
                >
                  <Check v-if="selectedPageIds.has(p.id)" class="w-3 h-3 stroke-[3]" />
                </button>

                <!-- Page Index Badge -->
                <span class="text-[11px] font-extrabold bg-slate-200/80 text-slate-700 px-1.5 py-0.5 rounded-md shrink-0">
                  {{ idx + 1 }}
                </span>
              </div>

              <!-- Header Action Buttons (no-drag) -->
              <div class="flex items-center space-x-0.5 no-drag shrink-0">
                <!-- Rotate 90° -->
                <button
                  @click.stop="rotatePage(idx, 90)"
                  :title="t('org_btn_batch_rotate')"
                  class="p-1 hover:bg-slate-200/80 rounded-md text-slate-600 transition cursor-pointer"
                >
                  <RotateCw class="w-3.5 h-3.5" />
                </button>
                <!-- Insert blank page after this page -->
                <button
                  @click.stop="insertBlankPageAt(idx + 1)"
                  :title="t('org_insert_blank_here')"
                  class="p-1 hover:bg-amber-100 text-slate-400 hover:text-amber-700 rounded-md transition cursor-pointer"
                >
                  <FilePlus class="w-3.5 h-3.5" />
                </button>
                <!-- Download this page as image -->
                <button
                  @click.stop="downloadPageAsImage(idx)"
                  :disabled="downloadingPageIdx !== null"
                  :title="t('p2i_download_page')"
                  class="p-1 hover:bg-cyan-100 text-slate-400 hover:text-cyan-600 rounded-md transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Loader2 v-if="downloadingPageIdx === idx" class="w-3.5 h-3.5 animate-spin text-cyan-600" />
                  <ImageDown v-else class="w-3.5 h-3.5" />
                </button>
                <!-- Delete Page -->
                <button
                  @click.stop="deletePage(idx)"
                  title="Delete Page"
                  class="p-1 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-md transition cursor-pointer"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <!-- Page Canvas Preview -->
            <div class="overflow-hidden rounded-xl border border-slate-200/60 flex items-center justify-center bg-white w-full h-40 relative pointer-events-none">
              <img 
                :src="p.dataUrl" 
                :style="{ transform: `rotate(${p.rotation}deg)` }" 
                class="max-h-full max-w-full object-contain transition-transform duration-200"
              >
              <!-- External Document Badge (Bottom-left pill) -->
              <span 
                v-if="p.type === 'external'"
                class="absolute bottom-1.5 left-1.5 text-[9px] font-bold bg-slate-900/75 text-slate-100 px-1.5 py-0.5 rounded-md backdrop-blur-xs max-w-[85%] truncate shadow-xs"
                :title="p.sourceName || t('org_source_external_badge')"
              >
                {{ p.sourceName || t('org_source_external_badge') }}
              </span>
            </div>
          </div>
        </div>

        <!-- Next Action Relay Banner -->
        <NextActionBanner 
          v-if="showNextActions && lastExportedFile"
          :current-tool="'organize'"
          :file="lastExportedFile"
          @send-to-tool="(tId) => emit('send-to-tool', tId)"
          @close="showNextActions = false"
          class="mb-3"
        />

        <!-- Assembly Bottom Action & Export Configuration Bar -->
        <div class="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
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
                class="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden font-medium text-slate-700 w-44 sm:w-64"
              >
            </div>
            
            <label class="flex items-center space-x-1.5 text-xs text-slate-600 cursor-pointer select-none">
              <input 
                v-model="autoSaveToVault" 
                type="checkbox" 
                class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              >
              <span>{{ t('vault_autosave_checkbox') }}</span>
            </label>
          </div>

          <!-- Right: Big Primary Export Button -->
          <button 
            :disabled="isProcessing || isLoading || pages.length === 0"
            @click="executeExport" 
            class="bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl transition flex items-center justify-center space-x-2 shadow-lg hover:shadow-indigo-600/25 disabled:opacity-50 cursor-pointer ml-auto"
          >
            <span v-if="!isProcessing">{{ t('seal_and_download') || '🦭 Seal & Download' }}</span>
            <span v-else>{{ t('sealing_state') || 'Sealing...' }}</span>
            <Download v-if="!isProcessing" class="w-4 h-4" />
            <Loader2 v-else class="w-4 h-4 animate-spin" />
          </button>
        </div>
      </div>
    </div>

    <!-- 3. FLOATING BATCH ACTION BAR (Shown when 1 or more pages selected) -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-4 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-4 scale-95"
    >
      <div 
        v-if="selectedPageIds.size > 0"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 hover:bg-slate-900 backdrop-blur-md text-white px-4 sm:px-5 py-2.5 rounded-2xl shadow-2xl border border-slate-700/70 flex items-center space-x-2.5 sm:space-x-3 select-none"
      >
        <!-- Selection count pill -->
        <div class="flex items-center space-x-2 pr-2.5 border-r border-slate-700/80">
          <span class="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
          <span class="text-xs font-bold text-slate-100 whitespace-nowrap">
            {{ t('org_batch_selected', { count: selectedPageIds.size }) }}
          </span>
        </div>

        <!-- Batch Rotate 90° -->
        <button 
          @click="batchRotate(90)"
          class="text-xs hover:bg-slate-800 text-slate-200 hover:text-white px-2.5 py-1.5 rounded-xl transition flex items-center space-x-1.5 cursor-pointer font-medium"
          :title="t('org_btn_batch_rotate')"
        >
          <RotateCw class="w-3.5 h-3.5 text-indigo-400" />
          <span>{{ t('org_btn_batch_rotate') }}</span>
        </button>

        <!-- Batch Delete -->
        <button 
          @click="batchDelete"
          class="text-xs hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 px-2.5 py-1.5 rounded-xl transition flex items-center space-x-1.5 cursor-pointer font-medium"
          :title="t('org_btn_batch_delete')"
        >
          <Trash2 class="w-3.5 h-3.5 text-rose-400" />
          <span>{{ t('org_btn_batch_delete') }}</span>
        </button>

        <!-- Invert Selection -->
        <button 
          @click="invertSelection"
          class="text-xs hover:bg-slate-800 text-slate-300 hover:text-white px-2 py-1.5 rounded-xl transition cursor-pointer font-medium hidden sm:inline-block"
          :title="t('org_btn_invert_select')"
        >
          <span>{{ t('org_btn_invert_select') }}</span>
        </button>

        <!-- Deselect / Clear (X) -->
        <button 
          @click="deselectAll"
          class="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition cursor-pointer ml-1"
          :title="t('org_btn_deselect')"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </transition>

    <!-- Initial Vault File Picker Modal (Single-select mode for initial file) -->
    <VaultFilePickerModal
      :is-open="isVaultPickerOpen"
      :multiple="false"
      @select-files="handleVaultFilesSelected"
      @close="isVaultPickerOpen = false"
    />

    <!-- Append From Vault File Picker Modal (Multiple-select mode for appending) -->
    <VaultFilePickerModal
      :is-open="isAppendVaultOpen"
      :multiple="true"
      @select-files="handleAppendVaultFiles"
      @close="isAppendVaultOpen = false"
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
import { ref, watch, nextTick, onMounted, onActivated, onDeactivated, onUnmounted } from 'vue';
import { 
  LayoutGrid, 
  Plus, 
  RotateCw, 
  Trash2, 
  Download, 
  Loader2, 
  FolderLock, 
  Unlock,
  RefreshCw,
  ImageDown,
  Wand2,
  Undo2,
  Redo2,
  CheckSquare,
  Square,
  Check,
  X,
  FilePlus,
  FileUp
} from 'lucide-vue-next';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, PageSizes, degrees } from 'pdf-lib';
import Sortable from 'sortablejs';
import { t, currentLang } from '../i18n';
import { triggerDownload } from '../utils/download';
import { verifyPdfSecurity, loadCleanPdfDocument } from '../utils/pdfSecurity';
import { consumePendingFile } from '../utils/toolBridge';
import { saveFile } from '../utils/vaultDb';
import { userSettings } from '../utils/userSettings';
import { logger } from '../utils/logger';
import { assembleOrganizedPdf, generateBlankPageThumbnail } from '../utils/organizeEngine';
import PasswordModal from '../components/PasswordModal.vue';
import VaultFilePickerModal from '../components/VaultFilePickerModal.vue';
import NextActionBanner from '../components/NextActionBanner.vue';

const emit = defineEmits(['send-to-tool']);

const lastExportedFile = ref(null);
const showNextActions = ref(false);

const fileInputRef = ref(null);
const appendFileInputRef = ref(null);
const gridRef = ref(null);
const docBytes = ref(null);
const filename = ref('');
const pages = ref([]);
const isDragOver = ref(false);
const isLoading = ref(false);
const isAppending = ref(false);
const isProcessing = ref(false);
const isVaultPickerOpen = ref(false);
const isAppendVaultOpen = ref(false);

// Multi-Selection State
const selectedPageIds = ref(new Set());
let lastClickedIdx = null;

// Undo / Redo Stacks (Max 30 snapshots)
const undoStack = ref([]);
const redoStack = ref([]);

function pushState() {
  undoStack.value.push(pages.value.map(p => ({ ...p })));
  if (undoStack.value.length > 30) {
    undoStack.value.shift();
  }
  redoStack.value = [];
}

function undo() {
  if (undoStack.value.length === 0) return;
  redoStack.value.push(pages.value.map(p => ({ ...p })));
  pages.value = undoStack.value.pop();
  
  // Prune any selectedPageIds that no longer exist
  const currentIds = new Set(pages.value.map(p => p.id));
  selectedPageIds.value = new Set([...selectedPageIds.value].filter(id => currentIds.has(id)));
}

function redo() {
  if (redoStack.value.length === 0) return;
  undoStack.value.push(pages.value.map(p => ({ ...p })));
  pages.value = redoStack.value.pop();

  const currentIds = new Set(pages.value.map(p => p.id));
  selectedPageIds.value = new Set([...selectedPageIds.value].filter(id => currentIds.has(id)));
}

// Export options (Dynamically synchronized with Global Settings)
const customOutputBaseName = ref('');
const autoSaveToVault = ref(userSettings.autoSaveToVault);

watch(() => userSettings.autoSaveToVault, (newVal) => {
  autoSaveToVault.value = Boolean(newVal);
}, { immediate: true });

// Password Unlock State
const isPasswordOpen = ref(false);
const passwordError = ref('');
const isUnlocking = ref(false);
const pendingFileName = ref('');
let pendingFileObj = null;
let unlockedPassword = '';

let sortableInstance = null;

// Live pdf.js document handle for on-demand "download page as image" re-rendering
let pdfDoc = null;
const downloadingPageIdx = ref(null);

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
  if (file) {
    loadFile(file);
  }
}

async function loadFile(file, password = '') {
  filename.value = file.name;
  pendingFileName.value = file.name;
  pendingFileObj = file;
  isLoading.value = true;

  const prefix = userSettings.defaultExportPrefix || 'PDFSeal_Organized_';
  const cleanBase = file.name.replace(/\.pdf$/i, '');
  customOutputBaseName.value = `${prefix}${cleanBase}`;
  showNextActions.value = false;
  lastExportedFile.value = null;

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

    const pdf = await loadingTask.promise;
    pdfDoc = pdf;
    pages.value = [];
    selectedPageIds.value = new Set();
    undoStack.value = [];
    redoStack.value = [];
    lastClickedIdx = null;
    unlockedPassword = password;
    isPasswordOpen.value = false;
    passwordError.value = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 0.6 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ 
        canvasContext: ctx, 
        viewport,
        intent: 'display'
      }).promise;

      pages.value.push({
        id: 'p_src_' + (i - 1) + '_' + Math.random().toString(36).slice(2, 7),
        type: 'source',
        pageIndex: i - 1,
        rotation: 0,
        dataUrl: canvas.toDataURL()
      });
    }

    initSortable();
    logger.info('ORGANIZE', `Loaded ${pdf.numPages} pages from ${file.name}`);
  } catch (err) {
    if (err.name === 'PasswordException' || err.message?.toLowerCase().includes('password')) {
      docBytes.value = null;
      isPasswordOpen.value = true;
      if (password) {
        passwordError.value = t('pwd_error_wrong');
      }
    } else {
      logger.error('ORGANIZE', `Failed to load PDF: ${err.message}`);
      alert('Failed to load PDF: ' + err.message);
    }
  } finally {
    isLoading.value = false;
    isUnlocking.value = false;
  }
}

function initSortable() {
  nextTick(() => {
    if (gridRef.value) {
      if (sortableInstance) sortableInstance.destroy();
      sortableInstance = new Sortable(gridRef.value, {
        animation: 150,
        ghostClass: 'opacity-40',
        filter: '.no-drag, input, button',
        preventOnFilter: false,
        onEnd: (evt) => {
          if (evt.oldIndex === evt.newIndex) return;
          pushState();
          const item = pages.value.splice(evt.oldIndex, 1)[0];
          pages.value.splice(evt.newIndex, 0, item);
        }
      });
    }
  });
}

// Multi-Selection Logic
function handleCardClick(idx, event) {
  const page = pages.value[idx];
  if (!page) return;

  if (event.shiftKey && lastClickedIdx !== null && lastClickedIdx !== idx) {
    // Shift Range Select
    const start = Math.min(lastClickedIdx, idx);
    const end = Math.max(lastClickedIdx, idx);
    const next = new Set(selectedPageIds.value);
    for (let i = start; i <= end; i++) {
      next.add(pages.value[i].id);
    }
    selectedPageIds.value = next;
  } else if (event.ctrlKey || event.metaKey) {
    // Ctrl / Cmd Toggle
    togglePageSelection(page.id, idx);
  } else {
    // Regular Click: if already in multi-select mode, toggle; otherwise select this page
    if (selectedPageIds.value.size > 0) {
      togglePageSelection(page.id, idx);
    } else {
      selectedPageIds.value = new Set([page.id]);
      lastClickedIdx = idx;
    }
  }
}

function togglePageSelection(id, idx = null) {
  const next = new Set(selectedPageIds.value);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  selectedPageIds.value = next;
  if (idx !== null) {
    lastClickedIdx = idx;
  }
}

function toggleSelectAll() {
  if (selectedPageIds.value.size === pages.value.length) {
    deselectAll();
  } else {
    selectAll();
  }
}

function selectAll() {
  selectedPageIds.value = new Set(pages.value.map(p => p.id));
}

function deselectAll() {
  selectedPageIds.value = new Set();
  lastClickedIdx = null;
}

function invertSelection() {
  const next = new Set();
  for (const p of pages.value) {
    if (!selectedPageIds.value.has(p.id)) {
      next.add(p.id);
    }
  }
  selectedPageIds.value = next;
}

// Batch Operations
function batchRotate(deg = 90) {
  if (selectedPageIds.value.size === 0) return;
  pushState();
  pages.value.forEach(p => {
    if (selectedPageIds.value.has(p.id)) {
      p.rotation = (p.rotation + deg) % 360;
    }
  });
}

function batchDelete() {
  if (selectedPageIds.value.size === 0) return;
  if (pages.value.length - selectedPageIds.value.size < 1) {
    alert(t('alert_cannot_delete_last_page') || 'Cannot delete all remaining pages.');
    return;
  }
  pushState();
  pages.value = pages.value.filter(p => !selectedPageIds.value.has(p.id));
  selectedPageIds.value = new Set();
  lastClickedIdx = null;
}

// Single Page Operations
function rotatePage(idx, deg) {
  pushState();
  pages.value[idx].rotation = (pages.value[idx].rotation + deg) % 360;
}

function rotateAllPages(deg) {
  pushState();
  pages.value.forEach(p => { p.rotation = (p.rotation + deg) % 360; });
}

function deletePage(idx) {
  if (pages.value.length <= 1) {
    alert(t('alert_cannot_delete_last_page') || 'Cannot delete the only remaining page.');
    return;
  }
  pushState();
  const deletedId = pages.value[idx].id;
  pages.value.splice(idx, 1);
  if (selectedPageIds.value.has(deletedId)) {
    const next = new Set(selectedPageIds.value);
    next.delete(deletedId);
    selectedPageIds.value = next;
  }
}

// Insert Blank Page
function insertBlankPageAt(targetIndex = null) {
  pushState();
  let insertIdx = pages.value.length;
  if (typeof targetIndex === 'number') {
    insertIdx = targetIndex;
  } else if (selectedPageIds.value.size > 0) {
    // Insert after the highest selected page
    let maxIdx = -1;
    pages.value.forEach((p, i) => {
      if (selectedPageIds.value.has(p.id)) maxIdx = i;
    });
    if (maxIdx !== -1) insertIdx = maxIdx + 1;
  }

  const newBlankItem = {
    id: 'p_blank_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    type: 'blank',
    pageIndex: -1,
    rotation: 0,
    dataUrl: generateBlankPageThumbnail(t('org_blank_watermark') || 'BLANK')
  };

  pages.value.splice(insertIdx, 0, newBlankItem);
  selectedPageIds.value = new Set([newBlankItem.id]);
  lastClickedIdx = insertIdx;
  logger.info('ORGANIZE', `Inserted blank A4 page at index ${insertIdx}`);
}

// Automatically update blank page watermarks when language changes
watch(currentLang, () => {
  pages.value.forEach(p => {
    if (p.type === 'blank') {
      p.dataUrl = generateBlankPageThumbnail(t('org_blank_watermark') || 'BLANK');
    }
  });
});

// Append External Files (Local or Vault)
function onAppendFilesSelected(e) {
  const files = Array.from(e.target.files || []);
  if (files.length > 0) handleAppendFiles(files);
  e.target.value = '';
}

function handleAppendVaultFiles(selectedFiles) {
  isAppendVaultOpen.value = false;
  if (!selectedFiles || selectedFiles.length === 0) return;
  handleAppendFiles(selectedFiles);
}

async function handleAppendFiles(files) {
  if (!files || files.length === 0) return;
  isAppending.value = true;
  pushState();

  try {
    for (const file of files) {
      const rawBuffer = await file.arrayBuffer();
      const sec = await verifyPdfSecurity(rawBuffer);
      if (sec.isEncrypted && !sec.isValid) {
        alert(`Encrypted file skipped: ${file.name}`);
        continue;
      }

      const extBytes = new Uint8Array(rawBuffer);
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(rawBuffer.slice(0)),
        cMapUrl: typeof window !== 'undefined' ? (window.location.origin + '/cmaps/') : '/cmaps/',
        cMapPacked: true,
        standardFontDataUrl: typeof window !== 'undefined' ? (window.location.origin + '/standard_fonts/') : '/standard_fonts/'
      });

      const extPdf = await loadingTask.promise;
      for (let i = 1; i <= extPdf.numPages; i++) {
        const page = await extPdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.6 });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({
          canvasContext: ctx,
          viewport,
          intent: 'display'
        }).promise;

        pages.value.push({
          id: 'p_ext_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
          type: 'external',
          pageIndex: i - 1,
          rotation: 0,
          dataUrl: canvas.toDataURL(),
          sourceBytes: extBytes,
          sourceName: file.name
        });
      }
      try { await extPdf.destroy(); } catch (e) {}
    }
    logger.info('ORGANIZE', `Appended external files. Total pages: ${pages.value.length}`);
  } catch (err) {
    logger.error('ORGANIZE', `Failed to append files: ${err.message}`);
    alert('Failed to append files: ' + err.message);
  } finally {
    isAppending.value = false;
  }
}

// Global Keyboard Shortcuts (Undo, Redo, Select All, Delete)
function handleKeydown(e) {
  const tag = document.activeElement?.tagName?.toLowerCase();
  if (tag === 'input' || tag === 'textarea') return;

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (e.shiftKey) {
      redo();
    } else {
      undo();
    }
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
    e.preventDefault();
    redo();
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
    if (pages.value.length > 0) {
      e.preventDefault();
      selectAll();
    }
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    if (selectedPageIds.value.size > 0) {
      e.preventDefault();
      batchDelete();
    }
  } else if (e.key === 'Escape') {
    if (selectedPageIds.value.size > 0) {
      deselectAll();
    }
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

function reset() {
  docBytes.value = null;
  pages.value = [];
  selectedPageIds.value = new Set();
  undoStack.value = [];
  redoStack.value = [];
  lastClickedIdx = null;
  unlockedPassword = '';
  customOutputBaseName.value = '';
  showNextActions.value = false;
  lastExportedFile.value = null;
  downloadingPageIdx.value = null;
  destroyPdfDoc();
  if (sortableInstance) {
    sortableInstance.destroy();
    sortableInstance = null;
  }
}

async function downloadPageAsImage(idx) {
  const item = pages.value[idx];
  if (!item || downloadingPageIdx.value !== null) return;
  downloadingPageIdx.value = idx;

  try {
    const cleanBase = (customOutputBaseName.value?.trim() || filename.value || 'PDFSeal').replace(/\.pdf$/i, '');
    const pageNum = String(idx + 1).padStart(2, '0');
    const outName = `${cleanBase}_page_${pageNum}.png`;

    if (item.type === 'blank') {
      const res = await fetch(item.dataUrl);
      const blob = await res.blob();
      triggerDownload(blob, outName);
      logger.info('ORGANIZE', `Downloaded blank page image: ${outName}`);
      return;
    }

    let targetPdf = pdfDoc;
    let needDestroy = false;

    if (item.type === 'external' && item.sourceBytes) {
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(item.sourceBytes.slice(0)),
        cMapUrl: typeof window !== 'undefined' ? (window.location.origin + '/cmaps/') : '/cmaps/',
        cMapPacked: true,
        standardFontDataUrl: typeof window !== 'undefined' ? (window.location.origin + '/standard_fonts/') : '/standard_fonts/'
      });
      targetPdf = await loadingTask.promise;
      needDestroy = true;
    }

    if (!targetPdf) return;

    const page = await targetPdf.getPage(item.pageIndex + 1);
    const rotation = ((page.rotate || 0) + (item.rotation || 0)) % 360;
    const viewport = page.getViewport({ scale: 150 / 72, rotation });
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

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas.toBlob returned null'))), 'image/png');
    });

    triggerDownload(blob, outName);
    logger.info('ORGANIZE', `Exported page ${idx + 1} as PNG image: ${outName}`);

    if (needDestroy) {
      try { await targetPdf.destroy(); } catch (e) {}
    }
  } catch (err) {
    logger.error('ORGANIZE', `Failed to export page ${idx + 1} as image: ${err.message}`);
    alert((t('p2i_err_export') || 'Export failed:') + ' ' + err.message);
  } finally {
    downloadingPageIdx.value = null;
  }
}

async function magicStandardizeA4() {
  if (pages.value.length === 0) return;
  pushState();
  isLoading.value = true;
  try {
    const assembledBytes = await assembleOrganizedPdf(pages.value, {
      sourceBytes: docBytes.value,
      password: unlockedPassword
    });

    const doc = await PDFDocument.load(assembledBytes);
    const docPages = doc.getPages();
    for (const page of docPages) {
      const sz = page.getSize();
      const isLandscape = sz.width > sz.height;
      const a4Width = isLandscape ? PageSizes.A4[1] : PageSizes.A4[0];
      const a4Height = isLandscape ? PageSizes.A4[0] : PageSizes.A4[1];

      const scale = Math.min(a4Width / sz.width, a4Height / sz.height);
      const scaledWidth = sz.width * scale;
      const scaledHeight = sz.height * scale;
      const x = (a4Width - scaledWidth) / 2;
      const y = (a4Height - scaledHeight) / 2;

      page.setSize(a4Width, a4Height);
      page.translateContent(x, y);
      page.scaleContent(scale, scale);
    }
    const newBytes = await doc.save();
    const mockFile = new File([newBytes], pendingFileObj?.name || filename.value || 'organized.pdf', { type: 'application/pdf' });
    await loadFile(mockFile, unlockedPassword);
  } catch (err) {
    logger.error('ORGANIZE', `Magic A4 Error: ${err.message}`);
    alert('Failed: ' + err.message);
    isLoading.value = false;
  }
}

async function magicForcePortrait() {
  if (pages.value.length === 0) return;
  pushState();
  isLoading.value = true;
  try {
    const assembledBytes = await assembleOrganizedPdf(pages.value, {
      sourceBytes: docBytes.value,
      password: unlockedPassword
    });

    const doc = await PDFDocument.load(assembledBytes);
    const docPages = doc.getPages();
    for (const page of docPages) {
      const sz = page.getSize();
      const { angle } = page.getRotation();
      if (sz.width > sz.height) { // Landscape
        page.setRotation(degrees((angle || 0) + 90));
      }
    }
    const newBytes = await doc.save();
    const mockFile = new File([newBytes], pendingFileObj?.name || filename.value || 'organized.pdf', { type: 'application/pdf' });
    await loadFile(mockFile, unlockedPassword);
  } catch (err) {
    logger.error('ORGANIZE', `Magic Portrait Error: ${err.message}`);
    alert('Failed: ' + err.message);
    isLoading.value = false;
  }
}

async function generateOrganizedBytes() {
  if (!docBytes.value || pages.value.length === 0) return null;
  const outBytes = await assembleOrganizedPdf(pages.value, {
    sourceBytes: docBytes.value,
    password: unlockedPassword
  });

  const cleanBase = (customOutputBaseName.value?.trim() || `PDFSeal_Organized_${Date.now()}`).replace(/\.pdf$/i, '');
  const outName = `${cleanBase}.pdf`;

  return { outBytes, outName, pageCount: pages.value.length };
}

async function executeExport() {
  if (!docBytes.value || pages.value.length === 0) return;
  isProcessing.value = true;
  try {
    const result = await generateOrganizedBytes();
    if (!result) return;
    const { outBytes, outName, pageCount } = result;

    triggerDownload(new Blob([outBytes], { type: 'application/pdf' }), outName);
    logger.info('ORGANIZE', `Exported organized PDF: ${outName} (${(outBytes.byteLength / 1024).toFixed(1)} KB, ${pageCount} pages)`);

    lastExportedFile.value = {
      name: outName,
      arrayBuffer: outBytes.buffer ? outBytes.buffer.slice(outBytes.byteOffset, outBytes.byteOffset + outBytes.byteLength) : outBytes
    };
    showNextActions.value = true;

    // Auto-archive in Vault if enabled
    if (autoSaveToVault.value) {
      await saveFile({
        name: outName,
        arrayBuffer: outBytes,
        folderId: 'default',
        category: 'export',
        pageCount
      });
      logger.info('VAULT', `Organized result auto-saved to Vault: ${outName}`);
    }
  } catch (err) {
    logger.error('ORGANIZE', `Failed to export organized PDF: ${err.message}`);
    alert('Failed to export organized PDF: ' + err.message);
  } finally {
    isProcessing.value = false;
  }
}

function checkIncomingFile() {
  const incoming = consumePendingFile('organize');
  if (incoming) {
    const file = new File([incoming.arrayBuffer], incoming.name, { type: 'application/pdf' });
    loadFile(file, incoming.password || '');
  }
}

onMounted(() => {
  checkIncomingFile();
  window.addEventListener('keydown', handleKeydown);
});

onActivated(() => {
  checkIncomingFile();
  window.addEventListener('keydown', handleKeydown);
});

onDeactivated(() => {
  destroyPdfDoc();
  window.removeEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  destroyPdfDoc();
  window.removeEventListener('keydown', handleKeydown);
});
</script>
