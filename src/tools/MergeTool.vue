<template>
  <section class="tool-panel max-w-4xl mx-auto">
    <div class="mb-5 text-center max-w-xl mx-auto">
      <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{{ t('merge_title') }}</h2>
      <p class="text-sm text-slate-600 mt-1">{{ t('merge_desc') }}</p>
    </div>

    <!-- Dropzone Area -->
    <div 
      v-if="files.length === 0"
      @dragover.prevent="isDragOver = true"
      @dragleave.prevent="isDragOver = false"
      @drop.prevent="onDrop"
      :class="[
        'border-2 border-dashed rounded-3xl p-12 text-center transition cursor-pointer shadow-xs bg-white',
        isDragOver ? 'border-blue-500 bg-blue-50/50' : 'border-slate-300 hover:border-blue-500'
      ]"
      @click="fileInputRef.click()"
    >
      <input 
        ref="fileInputRef" 
        type="file" 
        multiple 
        accept="application/pdf" 
        class="hidden" 
        @change="onFileSelected"
      >
      <div class="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
        <Files class="w-8 h-8" />
      </div>
      <h3 class="text-base font-bold text-slate-800">{{ t('merge_drop_title') }}</h3>
      <p class="text-xs text-slate-500 mt-1">{{ t('merge_drop_subtitle') }}</p>
      <button 
        type="button" 
        class="mt-4 inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition shadow-sm"
      >
        <Plus class="w-4 h-4" />
        <span>{{ t('btn_choose_files') }}</span>
      </button>
    </div>

    <!-- File List Workspace -->
    <div v-else class="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
      <div class="flex items-center justify-between border-b border-slate-100 pb-3">
        <div class="flex items-center space-x-2">
          <span class="font-bold text-slate-800 text-sm">{{ t('selected_files_count') }} ({{ files.length }})</span>
          <span class="text-[11px] text-slate-400 font-normal">{{ t('drag_to_reorder_hint') }}</span>
        </div>
        <div class="flex items-center space-x-2">
          <button 
            @click="fileInputRef.click()" 
            class="text-xs text-blue-600 hover:text-blue-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-50 transition flex items-center space-x-1"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>{{ t('btn_add_more') }}</span>
          </button>
          <button 
            @click="files = []; filePasswords = {};" 
            class="text-xs text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition"
          >
            {{ t('btn_clear_all') }}
          </button>
        </div>
      </div>

      <input 
        ref="fileInputRef" 
        type="file" 
        multiple 
        accept="application/pdf" 
        class="hidden" 
        @change="onFileSelected"
      >

      <!-- Sortable List -->
      <ul ref="listRef" class="space-y-2 max-h-[380px] overflow-y-auto pr-1">
        <li 
          v-for="(f, idx) in files" 
          :key="f.name + idx"
          class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-300 transition cursor-grab active:cursor-grabbing group shadow-2xs"
        >
          <div class="flex items-center space-x-3 truncate">
            <GripVertical class="w-4 h-4 text-slate-400 group-hover:text-slate-600 shrink-0" />
            <div class="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
              {{ idx + 1 }}
            </div>
            <div class="truncate">
              <p class="text-xs font-semibold text-slate-800 truncate">{{ f.name }}</p>
              <p class="text-[11px] text-slate-500 flex items-center space-x-2">
                <span>{{ (f.size / 1024 / 1024).toFixed(2) }} MB</span>
                <span v-if="filePasswords[f.name]" class="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full font-bold">
                  🔒 Password Set
                </span>
              </p>
            </div>
          </div>
          <button 
            @click.stop="removeFile(idx)" 
            class="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </li>
      </ul>

      <!-- Action Button -->
      <div class="pt-4 border-t border-slate-100 flex items-center justify-between">
        <div class="text-xs text-slate-500 flex items-center">
          <Lock class="w-3.5 h-3.5 text-emerald-600 mr-1" />
          <span>{{ t('processed_locally') }}</span>
        </div>
        <button 
          :disabled="isProcessing || files.length < 2"
          @click="executeMerge" 
          class="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition flex items-center space-x-2 shadow-md hover:shadow-blue-500/25 disabled:opacity-50"
        >
          <span v-if="!isProcessing">{{ t('seal_and_merge') }}</span>
          <span v-else>Sealing...</span>
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
import { ref, watch, nextTick } from 'vue';
import { Files, Plus, GripVertical, Trash2, Lock, Download, Loader2 } from 'lucide-vue-next';
import { PDFDocument } from 'pdf-lib';
import Sortable from 'sortablejs';
import { t, currentLang } from '../i18n';
import { triggerDownload } from '../utils/download';
import PasswordModal from '../components/PasswordModal.vue';

const fileInputRef = ref(null);
const listRef = ref(null);
const files = ref([]);
const filePasswords = ref({});
const isDragOver = ref(false);
const isProcessing = ref(false);
let sortableInstance = null;

// Password Modal State
const isPasswordOpen = ref(false);
const passwordError = ref('');
const isUnlocking = ref(false);
const pendingFileName = ref('');
let pendingFileObj = null;

function onFileSelected(e) {
  addFiles(e.target.files);
  e.target.value = '';
}

function onDrop(e) {
  isDragOver.value = false;
  addFiles(e.dataTransfer.files);
}

function addFiles(newFiles) {
  for (const f of newFiles) {
    if (f.type === 'application/pdf' || f.name.endsWith('.pdf')) {
      files.value.push(f);
    }
  }
}

function removeFile(index) {
  const removed = files.value.splice(index, 1)[0];
  if (removed && filePasswords.value[removed.name]) {
    delete filePasswords.value[removed.name];
  }
}

watch(files, () => {
  nextTick(() => {
    if (listRef.value && !sortableInstance) {
      sortableInstance = new Sortable(listRef.value, {
        animation: 150,
        ghostClass: 'ghost-card',
        onEnd: (evt) => {
          const item = files.value.splice(evt.oldIndex, 1)[0];
          files.value.splice(evt.newIndex, 0, item);
        }
      });
    }
  });
}, { deep: true });

async function executeMerge() {
  if (files.value.length < 2) {
    alert(currentLang.value === 'zh' ? '请至少选择 2 个 PDF 文件进行合并。' : 'Please select at least 2 PDF files to merge.');
    return;
  }

  isProcessing.value = true;
  try {
    const mergedPdf = await PDFDocument.create();
    for (const file of files.value) {
      const arrayBuffer = await file.arrayBuffer();
      const pwd = filePasswords.value[file.name];
      let pdf = null;
      try {
        pdf = await PDFDocument.load(arrayBuffer, {
          password: pwd || undefined,
          ignoreEncryption: !pwd
        });
      } catch (loadErr) {
        if (loadErr.message?.toLowerCase().includes('password') || loadErr.message?.toLowerCase().includes('encrypt')) {
          pendingFileName.value = file.name;
          pendingFileObj = file;
          isPasswordOpen.value = true;
          isProcessing.value = false;
          return;
        }
        throw loadErr;
      }
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach(p => mergedPdf.addPage(p));
    }
    const mergedBytes = await mergedPdf.save();
    triggerDownload(new Blob([mergedBytes], { type: 'application/pdf' }), `PDFSeal_Merged_${Date.now()}.pdf`);
  } catch (err) {
    console.error(err);
    alert('Failed to merge PDFs: ' + err.message);
  } finally {
    isProcessing.value = false;
  }
}

async function handlePasswordSubmit(pwd) {
  if (!pendingFileObj) return;
  isUnlocking.value = true;
  try {
    const bytes = await pendingFileObj.arrayBuffer();
    await PDFDocument.load(bytes, { password: pwd });
    filePasswords.value[pendingFileObj.name] = pwd;
    isPasswordOpen.value = false;
    passwordError.value = '';
    pendingFileObj = null;
    isUnlocking.value = false;
    // Resume merging
    executeMerge();
  } catch (err) {
    passwordError.value = t('pwd_error_wrong');
    isUnlocking.value = false;
  }
}

function handlePasswordCancel() {
  isPasswordOpen.value = false;
  passwordError.value = '';
  pendingFileObj = null;
  isProcessing.value = false;
}
</script>
