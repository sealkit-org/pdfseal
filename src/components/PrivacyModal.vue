<template>
  <div 
    v-if="isOpen" 
    class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
    @click.self="$emit('close')"
  >
    <div class="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-200">
      <!-- Close Button -->
      <button 
        @click="$emit('close')" 
        class="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition"
      >
        <X class="w-5 h-5" />
      </button>

      <!-- Header -->
      <div class="flex items-center space-x-3 mb-5 pb-3 border-b border-slate-100">
        <span class="text-3xl">🦭</span>
        <div>
          <h3 class="font-extrabold text-slate-900 text-lg sm:text-xl flex items-center space-x-2">
            <span>{{ t('trust_title_privacy') }}</span>
          </h3>
          <p class="text-xs text-emerald-700 font-semibold flex items-center mt-0.5">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-ping"></span>
            {{ t('trust_badge_offline') }}
          </p>
        </div>
      </div>

      <!-- 3 Key Guarantees -->
      <div class="space-y-4 text-xs">
        <!-- Point 1 -->
        <div class="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-start space-x-3.5">
          <div class="p-2 bg-emerald-100 text-emerald-800 rounded-xl shrink-0 mt-0.5">
            <ShieldCheck class="w-5 h-5" />
          </div>
          <div>
            <h4 class="font-bold text-slate-900 text-sm mb-1">{{ t('trust_title_privacy') }}</h4>
            <p class="text-slate-600 leading-relaxed">{{ t('trust_desc_privacy') }}</p>
          </div>
        </div>

        <!-- Point 2 -->
        <div class="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex items-start space-x-3.5">
          <div class="p-2 bg-blue-100 text-blue-800 rounded-xl shrink-0 mt-0.5">
            <Zap class="w-5 h-5" />
          </div>
          <div>
            <h4 class="font-bold text-slate-900 text-sm mb-1">{{ t('trust_title_speed') }}</h4>
            <p class="text-slate-600 leading-relaxed">{{ t('trust_desc_speed') }}</p>
          </div>
        </div>

        <!-- Point 3 -->
        <div class="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start space-x-3.5">
          <div class="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
            <HeartHandshake class="w-5 h-5" />
          </div>
          <div>
            <h4 class="font-bold text-slate-900 text-sm mb-1">{{ t('trust_title_honest') }}</h4>
            <p class="text-slate-600 leading-relaxed">{{ t('trust_desc_honest') }}</p>
          </div>
        </div>
      </div>

      <!-- Action -->
      <div class="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
        <a 
          href="https://github.com/gzz727007/pdfseal" 
          target="_blank" 
          class="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center space-x-1"
        >
          <Github class="w-4 h-4" />
          <span>{{ t('btn_audit_code') }}</span>
        </a>
        <button 
          @click="$emit('close')" 
          class="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-sm"
        >
          {{ t('btn_got_it') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { X, ShieldCheck, Zap, HeartHandshake, Github } from 'lucide-vue-next';
import { t } from '../i18n';

defineProps({
  isOpen: Boolean
});

defineEmits(['close']);
</script>
