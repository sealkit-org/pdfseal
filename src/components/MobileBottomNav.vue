<template>
  <nav 
    v-if="!isLandscape"
    class="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 py-1 px-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] md:hidden select-none"
    style="padding-bottom: max(0.4rem, env(safe-area-inset-bottom));"
  >
    <div class="grid grid-cols-5 items-center max-w-md mx-auto">
      <!-- 1. Merge -->
      <button
        type="button"
        @click="selectTool('merge')"
        :class="[
          'flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 cursor-pointer',
          activeTab === 'merge' 
            ? 'text-blue-600 font-bold' 
            : 'text-slate-500 hover:text-slate-800'
        ]"
      >
        <div 
          :class="[
            'w-8 h-8 rounded-xl flex items-center justify-center transition-all',
            activeTab === 'merge' ? 'bg-blue-50 text-blue-600 scale-105 shadow-2xs' : ''
          ]"
        >
          <Layers class="w-5 h-5" />
        </div>
        <span class="text-[10px] mt-0.5 tracking-tight truncate max-w-full">
          {{ t('tab_merge') }}
        </span>
      </button>

      <!-- 2. Image to PDF -->
      <button
        type="button"
        @click="selectTool('image_to_pdf')"
        :class="[
          'flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 cursor-pointer',
          activeTab === 'image_to_pdf' 
            ? 'text-violet-600 font-bold' 
            : 'text-slate-500 hover:text-slate-800'
        ]"
      >
        <div 
          :class="[
            'w-8 h-8 rounded-xl flex items-center justify-center transition-all',
            activeTab === 'image_to_pdf' ? 'bg-violet-50 text-violet-600 scale-105 shadow-2xs' : ''
          ]"
        >
          <Images class="w-5 h-5" />
        </div>
        <span class="text-[10px] mt-0.5 tracking-tight truncate max-w-full">
          {{ t('tab_image_to_pdf') }}
        </span>
      </button>

      <!-- 3. Compress -->
      <button
        type="button"
        @click="selectTool('compress')"
        :class="[
          'flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 cursor-pointer',
          activeTab === 'compress' 
            ? 'text-blue-600 font-bold' 
            : 'text-slate-500 hover:text-slate-800'
        ]"
      >
        <div 
          :class="[
            'w-8 h-8 rounded-xl flex items-center justify-center transition-all',
            activeTab === 'compress' ? 'bg-blue-50 text-blue-600 scale-105 shadow-2xs' : ''
          ]"
        >
          <Minimize2 class="w-5 h-5" />
        </div>
        <span class="text-[10px] mt-0.5 tracking-tight truncate max-w-full">
          {{ t('tab_compress') }}
        </span>
      </button>

      <!-- 4. Sign -->
      <button
        type="button"
        @click="selectTool('sign')"
        :class="[
          'flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 cursor-pointer',
          activeTab === 'sign' 
            ? 'text-indigo-600 font-bold' 
            : 'text-slate-500 hover:text-slate-800'
        ]"
      >
        <div 
          :class="[
            'w-8 h-8 rounded-xl flex items-center justify-center transition-all',
            activeTab === 'sign' ? 'bg-indigo-50 text-indigo-600 scale-105 shadow-2xs' : ''
          ]"
        >
          <PenTool class="w-5 h-5" />
        </div>
        <span class="text-[10px] mt-0.5 tracking-tight truncate max-w-full">
          {{ t('tab_sign') }}
        </span>
      </button>

      <!-- 5. All Tools (Drawer trigger) -->
      <button
        type="button"
        @click="$emit('open-drawer')"
        :class="[
          'flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 cursor-pointer',
          isDrawerActive 
            ? 'text-blue-600 font-bold' 
            : 'text-slate-500 hover:text-slate-800'
        ]"
      >
        <div 
          :class="[
            'w-8 h-8 rounded-xl flex items-center justify-center transition-all',
            isDrawerActive ? 'bg-blue-50 text-blue-600 scale-105 shadow-2xs' : ''
          ]"
        >
          <Sparkles class="w-5 h-5 text-amber-500" />
        </div>
        <span class="text-[10px] mt-0.5 tracking-tight truncate max-w-full font-medium">
          {{ t('nav_all_tools', 'All Tools') }}
        </span>
      </button>
    </div>
  </nav>
</template>

<script setup>
import { computed } from 'vue';
import { Layers, Minimize2, Images, PenTool, Sparkles } from 'lucide-vue-next';
import { t } from '../i18n';
import { recordToolUsage } from '../utils/usageTracker';
import { useDevice } from '../utils/useDevice';

const props = defineProps({
  activeTab: {
    type: String,
    required: true
  },
  isDrawerOpen: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['switch-tab', 'open-drawer']);
const { isLandscape } = useDevice();

const primaryIds = ['merge', 'image_to_pdf', 'compress', 'sign'];
const isDrawerActive = computed(() => {
  return props.isDrawerOpen || !primaryIds.includes(props.activeTab);
});

function selectTool(id) {
  recordToolUsage(id);
  emit('switch-tab', id);
}
</script>
