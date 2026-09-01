<template>
  <section class="tool-panel max-w-4xl mx-auto">
    <div class="mb-5 text-center max-w-xl mx-auto">
      <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{{ t('sanitize_title') }}</h2>
      <p class="text-sm text-slate-600 mt-1">{{ t('sanitize_desc') }}</p>
    </div>

    <!-- Dropzone -->
    <div 
      v-if="!docBytes"
      @dragover.prevent="isDragOver = true"
      @dragleave.prevent="isDragOver = false"
      @drop.prevent="onDrop"
      :class="[
        'border-2 border-dashed rounded-3xl p-12 text-center transition cursor-pointer shadow-xs bg-white',
        isDragOver ? 'border-cyan-500 bg-cyan-50/50' : 'border-slate-300 hover:border-cyan-500'
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
      <div class="w-16 h-16 bg-cyan-50 text-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
        <ShieldCheck class="w-8 h-8" />
      </div>
      <h3 class="text-base font-bold text-slate-800">{{ t('sanitize_drop_title') }}</h3>
      <p class="text-xs text-slate-500 mt-1">{{ t('sanitize_drop_subtitle') }}</p>
      <button 
        type="button" 
        class="mt-4 inline-flex items-center space-x-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition shadow-sm"
      >
        <FileUp class="w-4 h-4" />
        <span>{{ t('btn_choose_pdf') }}</span>
      </button>
    </div>

    <!-- Metadata Inspector & Action -->
    <div v-else class="space-y-6">
      <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div>
            <h3 class="font-bold text-slate-800 text-sm flex items-center space-x-2">
              <span>{{ t('detected_metadata') }}</span>
              <span v-if="unlockedPassword" class="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                🔒 Unlocked
              </span>
            </h3>
            <p class="text-xs text-slate-500">{{ t('detected_subtitle') }}</p>
          </div>
          <span class="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full font-medium">
            {{ t('has_metadata_badge') }}
          </span>
        </div>

        <!-- Detected Attributes Table -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div 
            v-for="(val, key) in metadata" 
            :key="key"
            class="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-center"
          >
            <span class="text-slate-400 font-semibold text-[10px] uppercase tracking-wider mb-0.5">{{ key }}</span>
            <span class="text-slate-800 font-mono break-all font-medium select-all">{{ val }}</span>
          </div>
        </div>

        <!-- Privacy Stripping Warning -->
        <div class="mt-6 p-4 bg-cyan-50/70 border border-cyan-200/80 rounded-2xl text-xs text-cyan-900 space-y-1">
          <p class="font-bold">{{ t('what_will_be_stripped') }}</p>
          <p class="text-cyan-800">{{ t('strip_item_1') }}</p>
          <p class="text-cyan-800">{{ t('strip_item_2') }}</p>
          <p class="text-cyan-800">{{ t('strip_item_3') }}</p>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-between">
        <button 
          @click="docBytes = null; unlockedPassword = '';" 
          class="text-xs text-slate-500 hover:text-slate-800 transition font-medium"
        >
          {{ t('btn_choose_another') }}
        </button>

        <button 
          :disabled="isProcessing"
          @click="executeSanitize"
          class="bg-cyan-600 hover:bg-cyan-500 active:scale-98 text-white font-bold text-xs px-6 py-3 rounded-xl transition flex items-center space-x-2 shadow-md hover:shadow-cyan-600/25 disabled:opacity-50"
        >
          <span v-if="!isProcessing">{{ t('sanitize_and_download') }}</span>
          <span v-else>{{ t('sealing_state') }}</span>
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
import { ref, computed } from 'vue';
import { ShieldCheck, FileUp, Download, Loader2 } from 'lucide-vue-next';
import { PDFDocument } from 'pdf-lib';
import { t, currentLang } from '../i18n';
import { triggerDownload } from '../utils/download';
import { verifyPdfSecurity } from '../utils/pdfSecurity';
import PasswordModal from '../components/PasswordModal.vue';

const fileInputRef = ref(null);
const docBytes = ref(null);
const metadata = ref({});
const isDragOver = ref(false);
const isProcessing = ref(false);

// Password State
const isPasswordOpen = ref(false);
const passwordError = ref('');
const isUnlocking = ref(false);
const pendingFileName = ref('');
let pendingFileObj = null;
let unlockedPassword = '';

const noneText = computed(() => t('none_value'));

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
  pendingFileName.value = file.name;
  pendingFileObj = file;
  const rawBytes = await file.arrayBuffer();

  // Strict encryption check
  const security = await verifyPdfSecurity(rawBytes, password);
  if (security.isEncrypted && !security.isValid) {
    isUnlocking.value = false;
    docBytes.value = null;
    isPasswordOpen.value = true;
    if (password) {
      passwordError.value = t('pwd_error_wrong');
    }
    return;
  }

  try {
    const pdfDoc = await PDFDocument.load(rawBytes, {
      password: password || undefined,
      ignoreEncryption: true
    });
    
    docBytes.value = new Uint8Array(rawBytes);
    unlockedPassword = password;
    isPasswordOpen.value = false;
    passwordError.value = '';

    const n = noneText.value;
    metadata.value = {
      'Title': pdfDoc.getTitle() || n,
      'Author': pdfDoc.getAuthor() || n,
      'Subject': pdfDoc.getSubject() || n,
      'Keywords': pdfDoc.getKeywords() || n,
      'Producer': pdfDoc.getProducer() || n,
      'Creator': pdfDoc.getCreator() || n,
      'Creation Date': pdfDoc.getCreationDate() ? pdfDoc.getCreationDate().toISOString() : n,
      'Modification Date': pdfDoc.getModificationDate() ? pdfDoc.getModificationDate().toISOString() : n
    };
  } catch (err) {
    if (err.message?.toLowerCase().includes('password') || err.message?.toLowerCase().includes('encrypt')) {
      docBytes.value = null;
      isPasswordOpen.value = true;
      if (password) {
        passwordError.value = t('pwd_error_wrong');
      }
    } else {
      alert('Failed to inspect metadata: ' + err.message);
    }
  } finally {
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
  docBytes.value = null;
  unlockedPassword = '';
}

async function executeSanitize() {
  if (!docBytes.value) return;
  isProcessing.value = true;
  try {
    const pdfDoc = await PDFDocument.load(docBytes.value, {
      password: unlockedPassword || undefined,
      ignoreEncryption: !unlockedPassword
    });
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('');
    pdfDoc.setCreator('');

    const outBytes = await pdfDoc.save({ updateMetadata: false });
    triggerDownload(new Blob([outBytes], { type: 'application/pdf' }), `PDFSeal_Sanitized_${Date.now()}.pdf`);
  } catch (err) {
    alert('Failed to sanitize PDF: ' + err.message);
  } finally {
    isProcessing.value = false;
  }
}
</script>
