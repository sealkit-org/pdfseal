<template>
  <div 
    v-if="isOpen" 
    class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200"
    @click.self="$emit('close')"
  >
    <div 
      class="bg-white text-slate-900 rounded-3xl w-full max-w-4xl max-h-[94vh] p-4 sm:p-5 flex flex-col shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-200"
    >
      <!-- Modal Header -->
      <div class="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0 gap-3">
        <!-- Title & Subtitle -->
        <div class="flex items-center space-x-2.5 min-w-0 flex-1">
          <div class="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold shrink-0">
            <Eye class="w-4.5 h-4.5" />
          </div>
          <div class="min-w-0">
            <div class="flex items-center space-x-2">
              <h3 class="font-extrabold text-slate-900 text-sm sm:text-base truncate">
                {{ t('compress_diff_title') }}
              </h3>
              <!-- Size Comparison Pill -->
              <span class="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md shrink-0">
                <CheckCircle2 class="w-3 h-3 mr-1 text-emerald-600" />
                <span>{{ originalSizeMb }} MB ➔ {{ compressedSizeMb }} MB (-{{ savedPercent }}%)</span>
              </span>
            </div>
            <p class="text-[11px] text-slate-400 mt-0.5 truncate">
              {{ t('compress_diff_hint') }}
            </p>
          </div>
        </div>

        <!-- Controls: 50% Reset & Close -->
        <div class="flex items-center space-x-1.5 shrink-0">
          <button 
            type="button" 
            @click="diffPosition = 50"
            class="text-xs text-slate-600 hover:text-indigo-600 font-semibold px-2.5 py-1.5 rounded-xl hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-200 transition cursor-pointer flex items-center space-x-1"
            :title="t('compress_diff_reset')"
          >
            <RotateCcw class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">{{ t('compress_diff_reset') }}</span>
          </button>

          <button 
            type="button" 
            @click="$emit('close')" 
            class="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            :title="t('btn_close') || 'Close'"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- High-Def Split Viewport Canvas -->
      <div class="flex-1 w-full min-h-[320px] max-h-[64vh] my-3 relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-900/5 flex items-center justify-center select-none cursor-ew-resize">
        <div 
          ref="diffContainerRef"
          @mousedown="startDiffDrag"
          @touchstart="startDiffDrag"
          class="relative w-full h-full flex items-center justify-center overflow-hidden"
        >
          <!-- Layer 1: Compressed Image (Bottom Full) -->
          <img 
            v-if="compressedThumbnailUrl"
            :src="compressedThumbnailUrl" 
            class="max-h-[62vh] max-w-full w-auto h-auto object-contain mx-auto pointer-events-none select-none shadow-xs" 
            alt="Compressed"
          />
          <div class="absolute bottom-3 right-3 pointer-events-none z-10">
            <span class="text-[11px] font-mono font-bold text-emerald-800 bg-white/95 px-2.5 py-1 rounded-lg border border-emerald-200 shadow-xs flex items-center space-x-1">
              <CheckCircle2 class="w-3.5 h-3.5 text-emerald-600" />
              <span>{{ t('compress_diff_comp') }}: {{ compressedSizeMb }} MB (-{{ savedPercent }}%)</span>
            </span>
          </div>

          <!-- Layer 2: Original Image (Top Clipped) -->
          <div 
            v-if="originalThumbnailUrl"
            class="absolute inset-0 overflow-hidden flex items-center justify-center pointer-events-none"
            :style="{ clipPath: `inset(0 ${100 - diffPosition}% 0 0)` }"
          >
            <img 
              :src="originalThumbnailUrl" 
              class="max-h-[62vh] max-w-full w-auto h-auto object-contain mx-auto pointer-events-none select-none shadow-xs" 
              alt="Original"
            />
          </div>
          <div class="absolute bottom-3 left-3 pointer-events-none z-10">
            <span class="text-[11px] font-mono font-bold text-slate-700 bg-white/95 px-2.5 py-1 rounded-lg border border-slate-200 shadow-xs">
              {{ t('compress_diff_orig') }}: {{ originalSizeMb }} MB
            </span>
          </div>

          <!-- Draggable Center Divider Line & Handle -->
          <div 
            class="absolute top-0 bottom-0 pointer-events-none z-20 flex items-center justify-center"
            :style="{ left: `${diffPosition}%` }"
          >
            <div class="w-0.5 h-full bg-white shadow-[0_0_12px_rgba(0,0,0,0.6)]"></div>
            <div class="absolute w-9 h-9 rounded-full bg-white text-indigo-600 shadow-2xl border-2 border-indigo-500 flex items-center justify-center cursor-ew-resize">
              <ChevronsLeftRight class="w-4.5 h-4.5" />
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer: Interactive Range Slider & Done Button -->
      <div class="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <!-- Interactive Diff Range Slider -->
        <div class="flex items-center space-x-3 flex-1 min-w-[240px]">
          <span class="text-xs font-bold text-slate-500 font-mono shrink-0">
            {{ t('compress_diff_orig') }} ({{ 100 - diffPosition }}%)
          </span>
          <input 
            type="range" 
            min="0" 
            max="100" 
            v-model.number="diffPosition" 
            class="flex-1 accent-indigo-600 cursor-pointer h-1.5"
          />
          <span class="text-xs font-bold text-indigo-600 font-mono shrink-0">
            {{ t('compress_diff_comp') }} ({{ diffPosition }}%)
          </span>
        </div>

        <button 
          type="button" 
          @click="$emit('close')"
          class="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer shadow-xs"
        >
          {{ t('btn_close') || 'Done' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { 
  Eye, 
  RotateCcw, 
  X, 
  CheckCircle2, 
  ChevronsLeftRight 
} from 'lucide-vue-next';
import { t } from '../i18n';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  originalThumbnailUrl: {
    type: String,
    default: ''
  },
  compressedThumbnailUrl: {
    type: String,
    default: ''
  },
  originalSizeMb: {
    type: [String, Number],
    default: '0.00'
  },
  compressedSizeMb: {
    type: [String, Number],
    default: '0.00'
  },
  savedPercent: {
    type: Number,
    default: 0
  }
});

const emit = defineEmits(['close']);

const diffPosition = ref(50);
const isDraggingDiff = ref(false);
const diffContainerRef = ref(null);

function startDiffDrag(e) {
  isDraggingDiff.value = true;
  updateDiffPosition(e);
  window.addEventListener('mousemove', onDiffDrag);
  window.addEventListener('mouseup', stopDiffDrag);
  window.addEventListener('touchmove', onDiffDrag);
  window.addEventListener('touchend', stopDiffDrag);
}

function onDiffDrag(e) {
  if (!isDraggingDiff.value) return;
  updateDiffPosition(e);
}

function stopDiffDrag() {
  isDraggingDiff.value = false;
  window.removeEventListener('mousemove', onDiffDrag);
  window.removeEventListener('mouseup', stopDiffDrag);
  window.removeEventListener('touchmove', onDiffDrag);
  window.removeEventListener('touchend', stopDiffDrag);
}

function updateDiffPosition(e) {
  if (!diffContainerRef.value) return;
  const rect = diffContainerRef.value.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const offsetX = clientX - rect.left;
  const pct = Math.max(0, Math.min(100, Math.round((offsetX / rect.width) * 100)));
  diffPosition.value = pct;
}

function handleKeyDown(e) {
  if (e.key === 'Escape' && props.isOpen) {
    emit('close');
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  stopDiffDrag();
});
</script>
