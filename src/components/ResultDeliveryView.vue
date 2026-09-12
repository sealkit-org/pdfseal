<template>
  <div class="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
    <!-- Main Delivery Card -->
    <div class="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs text-center relative overflow-hidden">
      <!-- Decorative celebratory gradient background glow -->
      <div class="absolute -top-24 left-1/2 -translate-x-1/2 w-full max-w-lg h-36 bg-gradient-to-b from-emerald-100/70 via-teal-50/40 to-transparent blur-2xl pointer-events-none -z-0"></div>

      <div class="relative z-10 flex flex-col items-center max-w-xl mx-auto">
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

        <!-- Artifact Information Card -->
        <div class="w-full bg-slate-50/90 hover:bg-slate-50 rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 mb-5 text-left transition shadow-2xs">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center space-x-3 min-w-0">
              <div class="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-black text-xs shrink-0 shadow-2xs border border-red-200/60">
                PDF
              </div>
              <div class="min-w-0">
                <p class="text-xs sm:text-sm font-extrabold text-slate-800 truncate" :title="file.name">
                  {{ file.name }}
                </p>
                <div class="flex items-center space-x-2 text-[11px] text-slate-500 font-medium mt-0.5">
                  <span class="font-mono">{{ formattedSize }}</span>
                  <span v-if="pageCount" class="text-slate-300">·</span>
                  <span v-if="pageCount">{{ pageCount }} {{ t('page_unit', '页') }}</span>
                </div>
              </div>
            </div>

            <!-- Optional Extra Action (e.g. Diff Preview Trigger) -->
            <div v-if="$slots['extra-actions']" class="shrink-0">
              <slot name="extra-actions" />
            </div>
          </div>

          <!-- Dynamic Feature Metric Slot (e.g. Compress Saved % / Merge Source Count) -->
          <div v-if="$slots.metrics || metricText" class="pt-2.5 mt-2.5 border-t border-slate-200/60 flex flex-wrap items-center gap-2">
            <span v-if="metricText" class="text-xs font-semibold text-slate-600">
              {{ metricText }}
            </span>
            <slot name="metrics" />
          </div>
        </div>

        <!-- Core Action Buttons Trio: Re-download, Start New Task, Back to Edit -->
        <div class="flex flex-wrap items-center justify-center gap-2.5 w-full">
          <!-- Primary: Re-download -->
          <button 
            type="button"
            @click="emit('redownload')"
            class="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-blue-600/25 transition flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Download class="w-4 h-4" />
            <span>{{ t('result_btn_redownload') || '再次下载' }}</span>
          </button>

          <!-- Secondary: Start New Task (Reset) -->
          <button 
            type="button"
            @click="emit('new-task')"
            class="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 active:scale-98 text-slate-700 font-bold text-xs sm:text-sm border border-slate-200 transition flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <RotateCcw class="w-3.5 h-3.5 text-slate-600" />
            <span>{{ resolvedNewTaskText }}</span>
          </button>

          <!-- Tertiary: Back to Edit (Keep Stage) -->
          <button 
            type="button"
            @click="emit('back-to-edit')"
            class="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 active:scale-98 text-slate-600 hover:text-slate-800 font-bold text-xs sm:text-sm border border-slate-200/80 transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-2xs"
          >
            <Pencil class="w-3.5 h-3.5 text-slate-500" />
            <span>{{ t('result_btn_back_to_edit') || '返回微调' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Integrated Next Action Relay Banner (Anchored at Bottom of Result) -->
    <NextActionBanner 
      :current-tool="sourceTool"
      :file="file"
      @send-to-tool="(tId) => emit('send-to-tool', tId)"
      @close="isBannerDismissed = true"
      v-if="!isBannerDismissed"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { 
  CheckCircle2, 
  Download, 
  RotateCcw, 
  Pencil 
} from 'lucide-vue-next';
import { t } from '../i18n';
import NextActionBanner from './NextActionBanner.vue';

const props = defineProps({
  file: {
    type: Object,
    required: true
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
</script>
