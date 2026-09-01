<template>
  <div 
    v-if="isOpen" 
    class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
    @click.self="$emit('close')"
  >
    <div class="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-200 max-h-[95vh] flex flex-col">
      <!-- Close Button -->
      <button 
        @click="$emit('close')" 
        class="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition z-20"
      >
        <X class="w-5 h-5" />
      </button>

      <!-- Modal Header -->
      <div class="flex items-center space-x-3 mb-2 shrink-0 pb-3 border-b border-slate-100">
        <span class="text-3xl">🦭</span>
        <div>
          <h3 class="font-extrabold text-slate-900 text-base sm:text-lg">{{ t('feedback_title') }}</h3>
          <p class="text-xs text-slate-500">{{ t('feedback_subtitle') }}</p>
        </div>
      </div>

      <!-- Tally Form Embed Iframe (Expanded Height & Clean Blend) -->
      <div class="flex-1 overflow-hidden relative min-h-[460px] sm:min-h-[500px]">
        <!-- Loading Skeleton -->
        <div v-if="isLoading" class="absolute inset-0 flex flex-col items-center justify-center bg-white z-10 text-slate-400 text-xs space-y-2">
          <Loader2 class="w-7 h-7 animate-spin text-blue-600 mb-1" />
          <span>Loading feedback form...</span>
        </div>

        <iframe 
          :src="tallyEmbedUrl"
          @load="isLoading = false"
          class="w-full h-[470px] sm:h-[510px] border-0 rounded-2xl block bg-transparent"
          title="PDFSeal Feedback"
        ></iframe>
      </div>

      <!-- Bottom Alternative Links -->
      <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0">
        <span class="text-[11px] text-slate-400">Prefer GitHub or Ko-fi?</span>
        <div class="flex items-center space-x-3 font-medium">
          <a 
            href="https://github.com/sealkit-org/pdfseal/issues/new" 
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
// Embed parameters: hide title, transparent bg, left aligned
const tallyEmbedUrl = 'https://tally.so/embed/vG9eGg?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1';

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    isLoading.value = true;
  }
});
</script>
