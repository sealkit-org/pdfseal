<template>
  <div class="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
    <!-- Main Card (In-Place Transition: Processing <-> Delivery) -->
    <div class="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs text-center relative overflow-hidden transition-all duration-300">
      
      <!-- ======================================================== -->
      <!-- STATE A: PROCESSING IN PROGRESS (Unified Progress View)  -->
      <!-- ======================================================== -->
      <div v-if="isProcessing" class="relative z-10 flex flex-col items-center max-w-lg mx-auto py-3 sm:py-6">
        <!-- Gentle Blue/Indigo Pulse Aura -->
        <div class="absolute -top-20 left-1/2 -translate-x-1/2 w-full max-w-md h-36 bg-gradient-to-b from-blue-100/70 via-indigo-50/40 to-transparent blur-2xl pointer-events-none -z-0"></div>

        <!-- Animated Seal / Loading Badge -->
        <div class="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25 mb-3.5 ring-8 ring-blue-50 relative">
          <span class="text-2xl animate-bounce select-none">🦭</span>
        </div>

        <!-- Headline -->
        <h2 class="text-base sm:text-xl font-black text-slate-800 tracking-tight mb-1">
          {{ resolvedProcessingTitle }}
        </h2>
        
        <p class="text-xs text-slate-500 font-medium mb-4">
          {{ t('result_auto_downloaded_hint_wait') || '运算完全在您的浏览器内存中执行 · 请稍候' }}
        </p>

        <!-- Progress Bar & Percentage Track -->
        <div class="w-full max-w-sm space-y-1.5 my-1">
          <div class="flex items-center justify-between text-xs font-bold text-slate-500 px-0.5">
            <span class="text-[11px] font-semibold text-slate-400 font-mono tracking-wider">
              {{ clampedPercent < 100 ? (t('processing_state_running') || 'PROCESSING') : (t('processing_state_finalizing') || 'FINALIZING') }}
            </span>
            <span class="font-mono text-blue-600 font-extrabold text-xs sm:text-sm">{{ clampedPercent }}%</span>
          </div>

          <!-- Progress Bar Track -->
          <div class="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-200/70 shadow-inner">
            <div 
              class="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 transition-all duration-300 ease-out shadow-xs"
              :style="{ width: `${clampedPercent}%` }"
            ></div>
          </div>
        </div>

        <!-- Dynamic Live Activity Capsule (Current Step / Micro-Message) -->
        <div class="mt-4 max-w-full">
          <div class="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-50/90 border border-blue-200/80 text-blue-800 text-xs font-semibold max-w-full shadow-2xs">
            <span class="relative flex h-2 w-2 shrink-0">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
            </span>
            <span class="truncate">{{ resolvedProgressMessage }}</span>
          </div>
        </div>

        <!-- Privacy & Local Safety Guarantee -->
        <div class="flex items-center justify-center space-x-1.5 text-[11px] text-slate-400 font-medium mt-6 pt-3 border-t border-slate-100 w-full max-w-xs">
          <Lock class="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>{{ t('processing_privacy_guarantee') || '纯前端内存运算 · 零文件上传 · 绝对隐私' }}</span>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- STATE B: COMPLETED RESULT DELIVERY (Artifact & Next Steps) -->
      <!-- ======================================================== -->
      <div v-else-if="file" class="relative z-10 flex flex-col items-center max-w-xl mx-auto">
        <!-- Decorative celebratory gradient background glow -->
        <div class="absolute -top-24 left-1/2 -translate-x-1/2 w-full max-w-lg h-36 bg-gradient-to-b from-emerald-100/70 via-teal-50/40 to-transparent blur-2xl pointer-events-none -z-0"></div>

        <!-- Success Icon with celebration aura -->
        <div class="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 mb-3 ring-8 ring-emerald-50">
          <CheckCircle2 class="w-7 h-7" />
        </div>

        <!-- Headline -->
        <h2 class="text-base sm:text-xl font-black text-slate-800 tracking-tight mb-1">
          {{ resolvedTitle }}
        </h2>
        <p class="text-xs text-slate-500 font-medium mb-5">
          {{ t('result_auto_downloaded_hint') || '文件已自动下载至您的设备 · 100% 浏览器本地运算零上传' }}
        </p>

        <!-- Artifact Information Card (Refined & Centered) -->
        <div class="w-full bg-slate-50/80 hover:bg-slate-50 rounded-2xl border border-slate-200/80 p-4 sm:p-4.5 mb-5 text-center transition shadow-2xs">
          <!-- File Identity (Centered) -->
          <div class="flex items-center justify-center space-x-2.5 max-w-full min-w-0">
            <div 
              :class="[
                'w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] shrink-0 shadow-2xs border',
                fileExtBadge === 'ZIP' 
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200/60' 
                  : (fileExtBadge === 'PNG' || fileExtBadge === 'JPG' 
                      ? 'bg-cyan-100 text-cyan-700 border-cyan-200/60' 
                      : 'bg-red-100 text-red-600 border-red-200/60')
              ]"
            >
              {{ fileExtBadge }}
            </div>
            <p class="text-xs sm:text-sm font-extrabold text-slate-800 truncate max-w-[280px] sm:max-w-md" :title="file.name">
              {{ file.name }}
            </p>
          </div>

          <!-- File Attributes: Size & Page Count (Centered) -->
          <div class="flex items-center justify-center space-x-2 text-[11px] text-slate-500 font-medium mt-1">
            <span class="font-mono font-semibold text-slate-600">{{ formattedSize }}</span>
            <span v-if="pageCount" class="text-slate-300">·</span>
            <span v-if="pageCount">{{ pageCount }} {{ t('page_unit', '页') }}</span>
          </div>

          <!-- Dynamic Feature Metric Slot & Extra Actions (Centered) -->
          <div v-if="$slots.metrics || metricText || $slots['extra-actions']" class="pt-2.5 mt-2.5 border-t border-slate-200/60 flex flex-wrap items-center justify-center gap-2">
            <span v-if="metricText" class="text-xs font-semibold text-slate-600">
              {{ metricText }}
            </span>
            <slot name="metrics" />
            <slot name="extra-actions" />
          </div>
        </div>

        <!-- Core Action Buttons Trio: Re-download, Start New Task, Back to Edit -->
        <div class="flex flex-wrap items-center justify-center gap-2.5 w-full">
          <!-- Primary: Re-download -->
          <button 
            type="button"
            @click="emit('redownload')"
            data-testid="delivery-redownload"
            class="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-blue-600/25 transition flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Download class="w-4 h-4" />
            <span>{{ t('result_btn_redownload') || '再次下载' }}</span>
          </button>

          <!-- Secondary: Start New Task (Reset) -->
          <button 
            type="button"
            @click="emit('new-task')"
            data-testid="delivery-new-task"
            class="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 active:scale-98 text-slate-700 font-bold text-xs sm:text-sm border border-slate-200 transition flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <RotateCcw class="w-3.5 h-3.5 text-slate-600" />
            <span>{{ resolvedNewTaskText }}</span>
          </button>

          <!-- Tertiary: Back to Edit (Keep Stage) -->
          <button 
            type="button"
            @click="emit('back-to-edit')"
            data-testid="delivery-back-to-edit"
            class="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 active:scale-98 text-slate-600 hover:text-slate-800 font-bold text-xs sm:text-sm border border-slate-200/80 transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-2xs"
          >
            <Pencil class="w-3.5 h-3.5 text-slate-500" />
            <span>{{ t('result_btn_back_to_edit') || '返回调整' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Integrated Next Action Relay Banner (Anchored at Bottom of Result, only when complete) -->
    <NextActionBanner 
      v-if="!isProcessing && file && !isBannerDismissed"
      :current-tool="sourceTool"
      :file="file"
      @send-to-tool="(tId) => emit('send-to-tool', tId)"
      @close="isBannerDismissed = true"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { 
  CheckCircle2, 
  Download, 
  RotateCcw, 
  Pencil,
  Lock
} from 'lucide-vue-next';
import { t } from '../i18n';
import NextActionBanner from './NextActionBanner.vue';

const props = defineProps({
  isProcessing: {
    type: Boolean,
    default: false
  },
  progressPercent: {
    type: Number,
    default: 0
  },
  progressMessage: {
    type: String,
    default: ''
  },
  processingTitle: {
    type: String,
    default: ''
  },
  file: {
    type: Object,
    default: null
  },
  sourceTool: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: ''
  },
  pageCount: {
    type: Number,
    default: 0
  },
  metricText: {
    type: String,
    default: ''
  }
});

const emit = defineEmits([
  'redownload',
  'new-task',
  'back-to-edit',
  'send-to-tool'
]);

const isBannerDismissed = ref(false);

const clampedPercent = computed(() => {
  return Math.min(100, Math.max(0, Math.round(props.progressPercent || 0)));
});

const resolvedProcessingTitle = computed(() => {
  if (props.processingTitle) return props.processingTitle;
  const toolKey = `processing_title_${props.sourceTool}`;
  return t(toolKey) || t('processing_title_default') || '正在本地极速处理中...';
});

const resolvedProgressMessage = computed(() => {
  if (props.progressMessage) return props.progressMessage;
  return t('processing_status_default') || '正在准备中...';
});

const resolvedTitle = computed(() => {
  if (props.title) return props.title;
  const toolKey = `result_success_${props.sourceTool}`;
  return t(toolKey) || t('result_success_default') || '处理完成！';
});

const resolvedNewTaskText = computed(() => {
  const toolKey = `result_btn_new_task_${props.sourceTool}`;
  return t(toolKey) || t('result_btn_new_task_default') || '开始新任务';
});

const formattedSize = computed(() => {
  const bytes = props.file?.size || 0;
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

const fileExtBadge = computed(() => {
  const name = props.file?.name?.toLowerCase() || '';
  if (name.endsWith('.zip') || props.file?.isZip) return 'ZIP';
  if (name.endsWith('.png')) return 'PNG';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'JPG';
  return 'PDF';
});
</script>
