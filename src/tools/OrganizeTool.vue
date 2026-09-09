<template>
  <section class="w-full flex-1 flex flex-col">
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
        <!-- Assembly Control Bar -->
        <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 shrink-0">
          <!-- Left Info Badges -->
          <div class="flex items-center space-x-2 min-w-0">
            <span class="text-xs bg-indigo-50 text-indigo-700 font-extrabold px-2.5 py-1 rounded-xl border border-indigo-200/80 shrink-0">
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
            <!-- Magic A4 -->
            <button 
              @click="magicStandardizeA4()" 
              class="text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold px-3 py-1.5 rounded-xl border border-amber-200/80 transition flex items-center space-x-1.5 cursor-pointer shadow-2xs"
              title="Scale & Center to A4"
            >
              <Wand2 class="w-3.5 h-3.5" />
              <span>A4</span>
            </button>

            <!-- Magic Portrait -->
            <button 
              @click="magicForcePortrait()" 
              class="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-3 py-1.5 rounded-xl border border-emerald-200/80 transition flex items-center space-x-1.5 cursor-pointer shadow-2xs"
              title="Force Portrait"
            >
              <Wand2 class="w-3.5 h-3.5" />
              <span>{{ t('param_org_or_port') || 'Portrait' }}</span>
            </button>

            <!-- Rotate All 90° -->
            <button 
              @click="rotateAllPages(90)" 
              class="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded-xl border border-slate-200/80 transition flex items-center space-x-1.5 cursor-pointer shadow-2xs"
              :title="t('rotate_all_90')"
            >
              <RotateCw class="w-3.5 h-3.5 text-slate-600" />
              <span>{{ t('rotate_all_90') }}</span>
            </button>

            <!-- Choose Another Local File -->
            <button 
              @click="fileInputRef.click()"
              class="text-xs text-indigo-600 hover:bg-indigo-50 font-semibold px-2.5 py-1.5 rounded-xl border border-indigo-200 transition flex items-center space-x-1 cursor-pointer"
            >
              <RefreshCw class="w-3.5 h-3.5" />
              <span>{{ t('btn_choose_another') || 'Choose Another File' }}</span>
            </button>

            <!-- Choose From Vault -->
            <button 
              @click="isVaultPickerOpen = true"
              class="text-xs text-slate-700 hover:bg-slate-100 font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 transition flex items-center space-x-1 cursor-pointer"
            >
              <FolderLock class="w-3.5 h-3.5 text-indigo-600" />
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
        <div v-if="isLoading" class="flex-1 flex flex-col items-center justify-center py-20 text-center text-xs text-slate-500 font-medium">
          <Loader2 class="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-600" />
          <span>{{ t('rendering_pages') }}...</span>
        </div>

        <!-- Sortable Interactive Thumbnail Cards Grid (Natural Card Height with Top Alignment) -->
        <div 
          v-else 
          ref="gridRef" 
          class="flex-1 my-3 overflow-y-auto max-h-[460px] pr-1 grid content-start items-start grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 select-none"
        >
          <div 
            v-for="(p, idx) in pages" 
            :key="p.pageIndex"
            class="bg-slate-50/90 hover:bg-white rounded-2xl border border-slate-200/80 p-2.5 shadow-2xs flex flex-col items-center relative group hover:shadow-md hover:border-indigo-300 transition cursor-grab active:cursor-grabbing"
          >
            <!-- Card Header: Page Index Badge + Rotate/Delete Controls -->
            <div class="w-full flex items-center justify-between mb-1.5">
              <span class="text-[11px] font-extrabold bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-md">
                {{ t('page_card_prefix', 'Page') }} {{ idx + 1 }}{{ t('page_card_suffix') ? ' ' + t('page_card_suffix') : '' }}
              </span>
              <div class="flex items-center space-x-1">
                <!-- Rotate 90° -->
                <button 
                  @click.stop="rotatePage(idx, 90)" 
                  title="Rotate 90° Clockwise" 
                  class="p-1 hover:bg-slate-200/80 rounded-md text-slate-600 transition cursor-pointer"
                >
                  <RotateCw class="w-3.5 h-3.5" />
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
            <div class="overflow-hidden rounded-xl border border-slate-200/60 flex items-center justify-center bg-white w-full h-40 relative">
              <img 
                :src="p.dataUrl" 
                :style="{ transform: `rotate(${p.rotation}deg)` }" 
                class="max-h-full max-w-full object-contain transition-transform duration-200"
              >
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

    <!-- Vault File Picker Modal (Single-select mode for Organize) -->
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
import { ref, watch, nextTick, onMounted, onActivated } from 'vue';
import { 
  LayoutGrid, 
  Plus, 
  RotateCw, 
  Trash2, 
  Download, 
  Loader2, 
  FolderLock, 
  Lock, 
  Unlock, 
  RefreshCw,
  Wand2
} from 'lucide-vue-next';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, PageSizes, degrees } from 'pdf-lib';
import Sortable from 'sortablejs';
import { t } from '../i18n';
import { triggerDownload } from '../utils/download';
import { verifyPdfSecurity, loadCleanPdfDocument } from '../utils/pdfSecurity';
import { consumePendingFile } from '../utils/toolBridge';
import { saveFile } from '../utils/vaultDb';
import { userSettings } from '../utils/userSettings';
import { logger } from '../utils/logger';
import PasswordModal from '../components/PasswordModal.vue';
import VaultFilePickerModal from '../components/VaultFilePickerModal.vue';
import NextActionBanner from '../components/NextActionBanner.vue';

const emit = defineEmits(['send-to-tool']);

const lastExportedFile = ref(null);
const showNextActions = ref(false);

const fileInputRef = ref(null);
const gridRef = ref(null);
const docBytes = ref(null);
const filename = ref('');
const pages = ref([]);
const isDragOver = ref(false);
const isLoading = ref(false);
const isProcessing = ref(false);
const isVaultPickerOpen = ref(false);

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
    const pdfDataForViewer = new Uint8Array(rawBuffer.slice(0));
    const loadingTask = pdfjsLib.getDocument({ 
      data: pdfDataForViewer,
      password: password || undefined,
      cMapUrl: typeof window !== 'undefined' ? (window.location.origin + '/cmaps/') : '/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: typeof window !== 'undefined' ? (window.location.origin + '/standard_fonts/') : '/standard_fonts/'
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
        pageIndex: i - 1,
        rotation: 0,
        dataUrl: canvas.toDataURL()
      });
    }

    nextTick(() => {
      if (gridRef.value) {
        if (sortableInstance) sortableInstance.destroy();
        sortableInstance = new Sortable(gridRef.value, {
          animation: 150,
          ghostClass: 'opacity-40',
          onEnd: (evt) => {
            const item = pages.value.splice(evt.oldIndex, 1)[0];
            pages.value.splice(evt.newIndex, 0, item);
          }
        });
      }
    });

    logger.info('ORGANIZE', `Loaded ${pdf.numPages} pages from ${file.name}`);
  } catch (err) {
    if (err.name === 'PasswordException' || err.message?.toLowerCase().includes('password')) {
      docBytes.value = null; // Clear until unlocked
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
    alert(t('alert_cannot_delete_last_page') || 'Cannot delete the only remaining page.');
    return;
  }
  pages.value.splice(idx, 1);
}

function reset() {
  docBytes.value = null;
  pages.value = [];
  unlockedPassword = '';
  customOutputBaseName.value = '';
  showNextActions.value = false;
  lastExportedFile.value = null;
  if (sortableInstance) {
    sortableInstance.destroy();
    sortableInstance = null;
  }
}

async function magicStandardizeA4() {
  if (!docBytes.value) return;
  isLoading.value = true;
  try {
    const doc = await loadCleanPdfDocument(docBytes.value, unlockedPassword);
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
    const mockFile = new File([newBytes], pendingFileObj?.name || filename.value, { type: 'application/pdf' });
    await loadFile(mockFile, unlockedPassword);
  } catch (err) {
    logger.error('ORGANIZE', `Magic A4 Error: ${err.message}`);
    alert('Failed: ' + err.message);
    isLoading.value = false;
  }
}

async function magicForcePortrait() {
  if (!docBytes.value) return;
  isLoading.value = true;
  try {
    const doc = await loadCleanPdfDocument(docBytes.value, unlockedPassword);
    const docPages = doc.getPages();
    for (const page of docPages) {
      const sz = page.getSize();
      const { angle } = page.getRotation();
      if (sz.width > sz.height) { // Landscape
        page.setRotation(degrees((angle || 0) + 90));
      }
    }
    const newBytes = await doc.save();
    const mockFile = new File([newBytes], pendingFileObj?.name || filename.value, { type: 'application/pdf' });
    await loadFile(mockFile, unlockedPassword);
  } catch (err) {
    logger.error('ORGANIZE', `Magic Portrait Error: ${err.message}`);
    alert('Failed: ' + err.message);
    isLoading.value = false;
  }
}

async function generateOrganizedBytes() {
  if (!docBytes.value || pages.value.length === 0) return null;
  const cleanDoc = await loadCleanPdfDocument(docBytes.value, unlockedPassword);
  const newPdf = await PDFDocument.create();

  for (const item of pages.value) {
    const [copied] = await newPdf.copyPages(cleanDoc, [item.pageIndex]);
    const currentRot = copied.getRotation().angle;
    copied.setRotation(degrees(currentRot + item.rotation));
    newPdf.addPage(copied);
  }

  const outBytes = await newPdf.save();
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

onMounted(checkIncomingFile);
onActivated(checkIncomingFile);
</script>
