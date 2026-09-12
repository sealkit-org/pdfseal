<template>
  <div 
    v-if="file" 
    class="bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-indigo-500/10 border border-emerald-200/80 rounded-2xl p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-2.5 shadow-xs animate-in fade-in slide-in-from-bottom-2 duration-300 select-none"
  >
    <!-- Left: Status & Hint -->
    <div class="flex items-center space-x-2.5 min-w-0">
      <div class="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0 shadow-2xs">
        <Sparkles class="w-4 h-4 text-emerald-600 animate-pulse" />
      </div>
      <div class="min-w-0">
        <div class="text-xs font-extrabold text-slate-800 flex items-center space-x-1.5 truncate">
          <span class="shrink-0">{{ t('next_action_title') || 'Done! What\'s next:' }}</span>
          <span 
            class="inline-flex items-center text-[10px] leading-none text-emerald-800 bg-emerald-100/90 border border-emerald-200/60 font-mono px-2 py-0.5 rounded-md font-bold truncate max-w-[140px] sm:max-w-[200px] shrink-0"
            :title="file.name"
          >
            <span class="truncate leading-none">{{ file.name }}</span>
          </span>
        </div>
        <p class="text-[11px] text-slate-500 font-medium truncate hidden sm:block">
          {{ t('next_action_desc') || 'Relay directly in memory without re-uploading' }}
        </p>
      </div>
    </div>

    <!-- Right: Suggested Quick Actions & Close -->
    <div class="flex flex-wrap items-center gap-1.5">
      <button 
        v-for="act in suggestedActions" 
        :key="act.id"
        type="button"
        @click="handleRelay(act.id)"
        :class="[
          'px-2.5 py-1 rounded-xl text-xs font-bold border transition flex items-center space-x-1 shadow-2xs active:scale-95 cursor-pointer',
          act.color
        ]"
      >
        <component :is="act.icon" class="w-3.5 h-3.5" />
        <span>{{ t(act.labelKey) }}</span>
      </button>

      <button 
        type="button"
        @click="emit('close')"
        class="text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 p-1 rounded-lg transition cursor-pointer ml-0.5"
        title="Dismiss"
      >
        <X class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { 
  Sparkles, 
  PenTool, 
  Minimize2, 
  Lock, 
  Stamp, 
  Scissors, 
  Layers, 
  ShieldCheck, 
  Files,
  FolderLock,
  ImageDown,
  ListOrdered,
  X
} from 'lucide-vue-next';
import { t } from '../i18n';
import { dispatchToTool } from '../utils/toolBridge';

const props = defineProps({
  currentTool: {
    type: String,
    required: true
  },
  file: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['send-to-tool', 'close']);

const actionCatalog = [
  { id: 'page_number', labelKey: 'next_action_page_number', icon: ListOrdered, color: 'text-violet-700 bg-violet-50 border-violet-200 hover:bg-violet-100' },
  { id: 'protect', labelKey: 'next_action_protect', icon: Lock, color: 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100' },
  { id: 'sign', labelKey: 'next_action_sign', icon: PenTool, color: 'text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100' },
  { id: 'compress', labelKey: 'next_action_compress', icon: Minimize2, color: 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100' },
  { id: 'watermark', labelKey: 'next_action_watermark', icon: Stamp, color: 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100' },
  { id: 'split', labelKey: 'next_action_split', icon: Scissors, color: 'text-teal-700 bg-teal-50 border-teal-200 hover:bg-teal-100' },
  { id: 'organize', labelKey: 'next_action_organize', icon: Layers, color: 'text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100' },
  { id: 'sanitize', labelKey: 'next_action_sanitize', icon: ShieldCheck, color: 'text-cyan-700 bg-cyan-50 border-cyan-200 hover:bg-cyan-100' },
  { id: 'pdf_to_image', labelKey: 'next_action_pdf_to_image', icon: ImageDown, color: 'text-teal-700 bg-teal-50 border-teal-200 hover:bg-teal-100' },
  { id: 'merge', labelKey: 'next_action_merge', icon: Files, color: 'text-slate-700 bg-slate-100 border-slate-200 hover:bg-slate-200' },
  { id: 'vault', labelKey: 'next_action_vault', icon: FolderLock, color: 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100' }
];

const priorityMap = {
  merge: ['page_number', 'compress', 'sign', 'protect', 'vault'],
  compress: ['page_number', 'protect', 'sign', 'watermark', 'vault'],
  organize: ['page_number', 'compress', 'sign', 'protect', 'vault'],
  split: ['page_number', 'compress', 'sign', 'protect', 'vault'],
  page_number: ['compress', 'protect', 'sign', 'pdf_to_image', 'vault'],
  watermark: ['page_number', 'protect', 'compress', 'sign', 'vault'],
  protect: ['watermark', 'compress', 'vault'],
  sanitize: ['page_number', 'protect', 'watermark', 'compress', 'vault'],
  unlock: ['page_number', 'split', 'organize', 'compress', 'sign'],
  sign: ['protect', 'compress', 'watermark', 'vault'],
  image_to_pdf: ['page_number', 'watermark', 'compress', 'protect', 'vault']
};

const suggestedActions = computed(() => {
  const ids = priorityMap[props.currentTool] || ['compress', 'protect', 'sign', 'vault'];
  return ids
    .map(id => actionCatalog.find(a => a.id === id))
    .filter(Boolean)
    .slice(0, 5);
});

function handleRelay(targetToolId) {
  if (!props.file) return;

  if (targetToolId === 'vault') {
    emit('send-to-tool', 'vault');
    return;
  }

  dispatchToTool(targetToolId, {
    name: props.file.name,
    arrayBuffer: props.file.arrayBuffer,
    size: props.file.size,
    password: props.file.password || ''
  });

  emit('send-to-tool', targetToolId);
}
</script>
