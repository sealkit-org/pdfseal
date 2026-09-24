<template>
  <Transition name="fade">
    <div 
      v-if="globalLoading" 
      class="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex flex-col items-center justify-center transition-all"
    >
      <!-- Sleek, minimal glassmorphism pill -->
      <div class="bg-white/95 backdrop-blur-md px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-4 border border-white/40 transform scale-100 animate-in zoom-in-95 duration-200">
        <!-- Spinner -->
        <Loader2 class="w-6 h-6 text-blue-600 animate-spin" />
        
        <!-- Message -->
        <p class="text-slate-700 font-medium text-sm tracking-wide">
          {{ loadingMessage || t('loading_default', 'Processing...') }}
        </p>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { useGlobalLoading } from '../utils/useGlobalLoading';
import { Loader2 } from 'lucide-vue-next';
import { t } from '../i18n';

const { globalLoading, loadingMessage } = useGlobalLoading();
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
