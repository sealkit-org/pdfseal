<template>
  <Transition name="fade">
    <div 
      v-if="isOpen" 
      class="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-md select-none overflow-hidden"
      tabindex="-1"
      @keydown.esc="close"
    >
      <!-- Top Floating Control Bar -->
      <div class="absolute top-4 inset-x-0 z-20 flex items-center justify-between px-6 pointer-events-none">
        <!-- Title / Page hint (left) -->
        <div class="pointer-events-auto flex items-center space-x-2 bg-slate-900/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/60 text-xs font-medium text-slate-300 shadow-xl">
          <span>{{ title || t('preview_title', 'Page Preview') }}</span>
        </div>

        <!-- Zoom & Viewport Toolbar (center) -->
        <div class="pointer-events-auto flex items-center space-x-1.5 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/60 shadow-xl text-slate-200">
          <button 
            @click="zoomOut" 
            :disabled="zoomLevel <= 0.5"
            class="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-full transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            :title="t('zoom_out', 'Zoom Out')"
          >
            <ZoomOut class="w-4 h-4" />
          </button>

          <button 
            @click="resetZoom"
            class="px-2 py-0.5 text-xs font-mono font-medium hover:bg-slate-800 text-slate-300 hover:text-white rounded-md transition cursor-pointer min-w-[50px] text-center"
            :title="t('zoom_reset', 'Reset (Fit)')"
          >
            {{ Math.round(zoomLevel * 100) }}%
          </button>

          <button 
            @click="zoomIn" 
            :disabled="zoomLevel >= 3.0"
            class="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-full transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            :title="t('zoom_in', 'Zoom In')"
          >
            <ZoomIn class="w-4 h-4" />
          </button>

          <div class="h-4 w-px bg-slate-700/80 mx-1"></div>

          <button 
            @click="resetZoom"
            class="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-full transition cursor-pointer"
            :title="t('fit_screen', 'Fit Screen')"
          >
            <Maximize2 class="w-4 h-4" />
          </button>
        </div>

        <!-- Close button (right) -->
        <div class="pointer-events-auto">
          <button 
            @click="close"
            class="text-slate-300 hover:text-white bg-slate-900/80 hover:bg-rose-600/80 p-2 rounded-full border border-slate-700/60 transition-all shadow-xl cursor-pointer"
            :title="t('close', 'Close (Esc)')"
          >
            <XIcon class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Main Canvas / Image Viewport Container -->
      <div 
        ref="viewportRef"
        class="w-full h-full flex items-center justify-center overflow-auto p-4 sm:p-8 pt-16 sm:pt-20 cursor-grab active:cursor-grabbing"
        @click.self="close"
        @wheel.prevent="handleWheel"
      >
        <!-- Loading state overlay -->
        <div 
          v-if="isLoading" 
          class="flex flex-col items-center justify-center bg-slate-900/90 border border-slate-700/60 rounded-2xl px-6 py-5 shadow-2xl backdrop-blur-md"
        >
          <Loader2 class="w-8 h-8 text-blue-500 animate-spin mb-3" />
          <span class="text-slate-200 text-xs font-medium tracking-wide">
            {{ t('preview_rendering', 'Rendering high-resolution preview...') }}
          </span>
        </div>

        <!-- Rendered High-Res Image -->
        <div 
          v-else-if="imgSrc"
          class="transition-transform duration-150 ease-out flex items-center justify-center shrink-0"
          :style="{
            transform: `scale(${zoomLevel}) rotate(${rotation || 0}deg)`,
            transformOrigin: 'center center'
          }"
        >
          <img 
            :src="imgSrc"
            class="max-h-[85vh] max-w-[90vw] object-contain shadow-2xl bg-white rounded-lg border border-slate-800/40 pointer-events-auto"
            alt="PDF Page High-Res Preview"
          />
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { X as XIcon, Loader2, ZoomIn, ZoomOut, Maximize2 } from 'lucide-vue-next';
import { t } from '../i18n';

const props = defineProps({
  isOpen: Boolean,
  isLoading: Boolean,
  imgSrc: String,
  rotation: {
    type: Number,
    default: 0
  },
  title: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['close']);

const zoomLevel = ref(1.0);
const viewportRef = ref(null);

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    zoomLevel.value = 1.0;
  }
});

function zoomIn() {
  zoomLevel.value = Math.min(3.0, Number((zoomLevel.value + 0.25).toFixed(2)));
}

function zoomOut() {
  zoomLevel.value = Math.max(0.5, Number((zoomLevel.value - 0.25).toFixed(2)));
}

function resetZoom() {
  zoomLevel.value = 1.0;
}

function handleWheel(e) {
  if (e.ctrlKey || e.metaKey) {
    if (e.deltaY < 0) {
      zoomIn();
    } else {
      zoomOut();
    }
  }
}

function handleKeydown(e) {
  if (!props.isOpen) return;
  if (e.key === 'Escape') {
    close();
  } else if (e.key === '+' || e.key === '=') {
    zoomIn();
  } else if (e.key === '-') {
    zoomOut();
  } else if (e.key === '0') {
    resetZoom();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});

function close() {
  emit('close');
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
