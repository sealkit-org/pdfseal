<template>
  <div 
    v-if="isOpen" 
    class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
    @click.self="$emit('cancel')"
  >
    <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-200">
      <!-- Top Close Button -->
      <button 
        @click="$emit('cancel')" 
        class="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
      >
        <X class="w-4 h-4" />
      </button>

      <!-- Warning Header -->
      <div class="flex items-center space-x-3 mb-4 pb-3 border-b border-slate-100">
        <div class="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0 shadow-2xs">
          <CopyCheck class="w-5 h-5" />
        </div>
        <div class="truncate pr-6">
          <h3 class="font-extrabold text-slate-900 text-base truncate">{{ t('dup_modal_title') }}</h3>
          <p class="text-[11px] text-amber-600 font-medium truncate">{{ t('dup_modal_subtitle') }}</p>
        </div>
      </div>

      <!-- Content -->
      <div class="space-y-3.5 text-xs text-slate-600">
        <p class="leading-relaxed">
          {{ t('dup_modal_desc') }}
        </p>

        <!-- Existing File Info Card -->
        <div v-if="existingFile" class="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5 font-mono text-[11px]">
          <div class="flex items-center justify-between text-slate-700">
            <span class="font-semibold text-slate-500 font-sans">{{ t('dup_field_name') }}:</span>
            <span class="font-bold truncate max-w-[200px]" :title="existingFile.name">{{ existingFile.name }}</span>
          </div>
          <div class="flex items-center justify-between text-slate-600">
            <span class="font-semibold text-slate-500 font-sans">{{ t('dup_field_size') }}:</span>
            <span>{{ (existingFile.size / 1024 / 1024).toFixed(2) }} MB</span>
          </div>
          <div class="flex items-center justify-between text-slate-600">
            <span class="font-semibold text-slate-500 font-sans">{{ t('dup_field_folder') }}:</span>
            <span class="font-sans px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-semibold text-[10px]">
              {{ folderName || t('vault_default_folder') }}
            </span>
          </div>
        </div>

        <div class="p-2.5 bg-emerald-50/80 border border-emerald-200/70 rounded-xl text-[11px] text-emerald-800 font-medium flex items-center space-x-1.5">
          <span>{{ t('dup_storage_saved_hint') }}</span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
        <button 
          type="button" 
          @click="$emit('cancel')" 
          class="text-xs text-slate-500 hover:text-slate-800 font-semibold px-3 py-2 rounded-xl hover:bg-slate-100 transition cursor-pointer"
        >
          {{ t('btn_cancel') }}
        </button>
        <button 
          type="button" 
          @click="$emit('save-copy')" 
          class="text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 font-semibold px-3.5 py-2 rounded-xl transition cursor-pointer"
        >
          {{ t('btn_save_copy') }}
        </button>
        <button 
          type="button" 
          @click="$emit('locate-existing', existingFile)" 
          class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-md hover:shadow-blue-600/25 flex items-center space-x-1 cursor-pointer"
        >
          <ExternalLink class="w-3.5 h-3.5" />
          <span>{{ t('btn_locate_existing') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { CopyCheck, ExternalLink, X } from 'lucide-vue-next';
import { t } from '../i18n';

defineProps({
  isOpen: Boolean,
  existingFile: Object,
  folderName: String
});

defineEmits(['locate-existing', 'save-copy', 'cancel']);
</script>
