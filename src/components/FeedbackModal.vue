<template>
  <div 
    v-if="isOpen" 
    class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
    @click.self="$emit('close')"
  >
    <div class="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
      <!-- Close Button -->
      <button 
        @click="$emit('close')" 
        class="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition"
      >
        <X class="w-5 h-5" />
      </button>

      <!-- Modal Header -->
      <div class="flex items-center space-x-3 mb-4 shrink-0 pb-3 border-b border-slate-100">
        <span class="text-3xl">🦭</span>
        <div>
          <h3 class="font-extrabold text-slate-900 text-base sm:text-lg">{{ t('feedback_title') }}</h3>
          <p class="text-xs text-slate-500">{{ t('feedback_subtitle') }}</p>
        </div>
      </div>

      <!-- Tally Form Embed Iframe Container -->
      <div class="flex-1 overflow-y-auto rounded-2xl bg-slate-50 border border-slate-100 p-1 min-h-[380px] relative">
        <!-- Loading Skeleton -->
        <div v-if="isLoading" class="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-10 text-slate-400 text-xs space-y-2">
          <Loader2 class="w-6 h-6 animate-spin text-blue-600" />
          <span>Loading feedback form...</span>
        </div>

        <iframe 
          :src="tallyEmbedUrl"
          @load="isLoading = false"
          class="w-full h-[400px] border-0 rounded-xl block"
          title="PDFSeal Feedback"
        ></iframe>
      </div>

      <!-- Bottom Alternative Links -->
      <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0">
        <span class="text-[11px] text-slate-400">Prefer GitHub or Ko-fi?</span>
        <div class="flex items-center space-x-3 font-medium">
          <a 
            href="https://github.com/gzz727007/pdfseal/issues/new" 
            target="_blank" 
            class="text-slate-600 hover:text-slate-900 transition hover:underline"
          >
            {{ t('btn_github_issue') }}
          </a>
          <span class="text-slate-300">•</span>
          <a 
            href="https://ko-fi.com/muffin27" 
            target="_blank" 
            class="text-amber-700 hover:text-amber-900 transition hover:underline"
          >
            {{ t('btn_kofi_message') }}
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { X, Loader2 } from 'lucide-vue-next';
import { t } from '../i18n';

const props = defineProps({
  isOpen: Boolean
});

defineEmits(['close']);

const isLoading = ref(true);
const tallyEmbedUrl = 'https://tally.so/embed/vG9eGg?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1';

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    isLoading.value = true;
  }
});
</script>
