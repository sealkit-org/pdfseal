<template>
  <footer class="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-500 mt-auto">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
      <div class="flex items-center space-x-2">
        <span class="text-base">🦭</span>
        <span class="font-bold text-slate-800">PDFSeal</span>
        <span class="text-slate-400">|</span>
        <button 
          @click="$emit('open-privacy')" 
          class="text-slate-500 hover:text-emerald-700 font-medium transition cursor-pointer hover:underline"
        >
          {{ t('brand_footer_claim') }}
        </button>
      </div>

      <div class="flex items-center space-x-4 text-xs">
        <a 
          href="https://github.com/sealkit-org/pdfseal/blob/main/LICENSE" 
          target="_blank" 
          class="text-slate-500 hover:text-slate-900 transition text-[11px]"
        >
          {{ t('footer_license') }}
        </a>
        <button @click="$emit('open-privacy')" class="text-slate-500 hover:text-slate-900 transition">{{ t('footer_privacy') }}</button>
        <a href="https://github.com/sealkit-org/pdfseal" target="_blank" class="text-slate-500 hover:text-slate-900 transition">GitHub</a>
        <a href="https://ko-fi.com/muffin27" target="_blank" class="text-amber-700 hover:text-amber-900 font-medium transition flex items-center space-x-1">
          <span>{{ t('footer_feed_seal') }}</span>
        </a>
        <button @click="$emit('open-feedback')" class="text-slate-500 hover:text-slate-900 transition">{{ t('feedback_btn') }}</button>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { t } from '../i18n';
defineEmits(['open-feedback', 'open-privacy']);
</script>
