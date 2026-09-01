<template>
  <div 
    v-if="isOpen" 
    class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200"
    @click.self="$emit('close')"
    @keydown.esc="$emit('close')"
  >
    <div class="bg-slate-900 text-white rounded-3xl w-full h-[95vh] max-w-[98vw] p-3.5 sm:p-4 flex flex-col shadow-2xl border border-slate-800 relative animate-in zoom-in-95 duration-200">
      <!-- Top Control Bar -->
      <div class="flex items-center justify-between pb-3 px-1 border-b border-slate-800/80 shrink-0 gap-3">
        <!-- Document Title & Security Badge -->
        <div class="flex items-center space-x-2.5 min-w-0 flex-1">
          <div class="w-8 h-8 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center font-bold text-xs shrink-0">
            PDF
          </div>
          <div class="min-w-0 truncate">
            <div class="flex items-center space-x-2">
              <h3 class="font-bold text-slate-100 text-sm sm:text-base truncate" :title="file?.name">
                {{ file?.name }}
              </h3>
              <span 
                v-if="file?.isEncrypted && password" 
                class="inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md shrink-0"
              >
                <Unlock class="w-2.5 h-2.5 mr-0.5" />
                {{ t('badge_unlocked') }}
              </span>
              <span 
                v-else-if="file?.isEncrypted" 
                class="inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md shrink-0"
              >
                <Lock class="w-2.5 h-2.5 mr-0.5" />
                {{ t('badge_pwd_required') }}
              </span>
            </div>
            <p class="text-[11px] text-slate-400 font-mono mt-0.5">
              {{ file ? (file.size / 1024 / 1024).toFixed(2) : 0 }} MB • {{ t('processed_locally') }}
            </p>
          </div>
        </div>

        <!-- Action Controls: Print, Download, Close -->
        <div class="flex items-center space-x-2 shrink-0">
          <!-- 1-Click Print Button -->
          <button 
            @click="handlePrint"
            :disabled="isLoading || !pdfUrl"
            class="bg-blue-600 hover:bg-blue-500 active:scale-98 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center space-x-1.5 shadow-md hover:shadow-blue-600/25 disabled:opacity-50 cursor-pointer"
            :title="t('vault_action_print')"
          >
            <Printer class="w-4 h-4" />
            <span class="hidden sm:inline">{{ t('vault_action_print') }}</span>
          </button>

          <!-- Download Button -->
          <button 
            @click="$emit('download', file)" 
            class="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl transition flex items-center space-x-1.5 border border-slate-700 cursor-pointer"
            :title="t('vault_action_download')"
          >
            <Download class="w-4 h-4" />
            <span class="hidden sm:inline">{{ t('vault_action_download') }}</span>
          </button>

          <!-- Close Modal Button -->
          <button 
            @click="$emit('close')" 
            class="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
            :title="t('btn_close') || '关闭'"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Main High-Definition Viewport Area -->
      <div class="flex-1 w-full h-full bg-slate-950 rounded-2xl overflow-hidden mt-3 relative flex items-center justify-center border border-slate-800/60">
        <!-- Loading State -->
        <div v-if="isLoading" class="flex flex-col items-center justify-center text-slate-400 text-xs space-y-3">
          <Loader2 class="w-8 h-8 animate-spin text-blue-500" />
          <span class="font-medium">{{ t('rendering_pages') }}...</span>
        </div>

        <!-- Error State -->
        <div v-else-if="errorMessage" class="text-center p-6 text-xs text-rose-400 max-w-md">
          <p class="font-bold mb-1">{{ errorMessage }}</p>
          <button 
            @click="$emit('download', file)" 
            class="mt-3 inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold"
          >
            <Download class="w-3.5 h-3.5" />
            <span>{{ t('vault_action_download') }}</span>
          </button>
        </div>

        <!-- Fullscreen Native Vector Viewer Frame -->
        <iframe 
          v-else-if="pdfUrl"
          ref="iframeRef" 
          :src="pdfUrl" 
          class="w-full h-full border-0 rounded-2xl bg-slate-900"
        ></iframe>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue';
import { X, Loader2, Download, Printer, Lock, Unlock } from 'lucide-vue-next';
import { PDFDocument } from 'pdf-lib';
import { t } from '../i18n';

const props = defineProps({
  isOpen: Boolean,
  file: Object,
  password: {
    type: String,
    default: ''
  }
});

defineEmits(['close', 'download']);

const iframeRef = ref(null);
const isLoading = ref(false);
const errorMessage = ref('');
const pdfUrl = ref('');

watch(() => props.isOpen, async (newVal) => {
  if (newVal && props.file) {
    await loadPdfViewport();
  } else {
    cleanupUrl();
  }
});

onUnmounted(() => {
  cleanupUrl();
});

function cleanupUrl() {
  if (pdfUrl.value) {
    URL.revokeObjectURL(pdfUrl.value);
    pdfUrl.value = '';
  }
  errorMessage.value = '';
}

async function loadPdfViewport() {
  if (!props.file || !props.file.blob) return;
  isLoading.value = true;
  errorMessage.value = '';
  cleanupUrl();

  try {
    let finalBlob = props.file.blob;

    // If file has a password unlocked in session, decrypt in memory so the viewer opens and prints seamlessly
    if (props.file.isEncrypted && props.password) {
      try {
        const arrayBuffer = await props.file.blob.arrayBuffer();
        const doc = await PDFDocument.load(arrayBuffer, {
          password: props.password,
          ignoreEncryption: false
        });
        const decryptedBytes = await doc.save();
        finalBlob = new Blob([decryptedBytes], { type: 'application/pdf' });
      } catch (err) {
        // Fallback to original blob if already unencrypted or standard load
        finalBlob = props.file.blob;
      }
    }

    const objectUrl = URL.createObjectURL(finalBlob);
    pdfUrl.value = `${objectUrl}#toolbar=1&navpanes=1`;
  } catch (err) {
    errorMessage.value = err.message || 'Failed to prepare PDF viewer';
  } finally {
    isLoading.value = false;
  }
}

function handlePrint() {
  if (!iframeRef.value) return;

  try {
    // Focus the iframe window and trigger browser native print dialog
    iframeRef.value.contentWindow.focus();
    iframeRef.value.contentWindow.print();
  } catch (err) {
    // Cross-origin fallback: open in dedicated print window
    if (pdfUrl.value) {
      const cleanUrl = pdfUrl.value.split('#')[0];
      const printWin = window.open(cleanUrl, '_blank');
      if (printWin) {
        printWin.onload = () => {
          printWin.focus();
          printWin.print();
        };
      }
    }
  }
}
</script>
