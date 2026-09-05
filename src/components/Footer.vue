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
        <button 
          v-if="siteConfig.features.enableEnterprisePortal"
          @click="$emit('open-enterprise')" 
          class="text-indigo-600 hover:text-indigo-800 transition font-medium cursor-pointer"
        >
          {{ t('footer_enterprise') || 'Commercial License' }}
        </button>
        <button @click="$emit('open-privacy')" class="text-slate-500 hover:text-slate-900 transition">{{ t('footer_privacy') }}</button>
        <a v-if="siteConfig.githubRepoUrl" :href="siteConfig.githubRepoUrl" target="_blank" class="text-slate-500 hover:text-slate-900 transition">GitHub</a>
        <a 
          v-if="siteConfig.features.enableDonations"
          :href="siteConfig.kofiUrl" 
          target="_blank" 
          class="text-amber-700 hover:text-amber-900 font-medium transition flex items-center space-x-1"
        >
          <span>{{ t('footer_feed_seal') }}</span>
        </a>
        <button 
          v-if="siteConfig.features.enableFeedback"
          @click="$emit('open-feedback')" 
          class="text-slate-500 hover:text-slate-900 transition"
        >
          {{ t('feedback_btn') }}
        </button>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { t } from '../i18n';
import { siteConfig } from '../config/siteConfig';

defineEmits(['open-feedback', 'open-privacy', 'open-enterprise']);
</script>
