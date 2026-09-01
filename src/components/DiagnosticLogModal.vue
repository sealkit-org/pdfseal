<template>
  <div 
    v-if="isOpen" 
    class="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
    @click.self="$emit('close')"
    @keydown.esc="$emit('close')"
  >
    <div class="bg-slate-950 text-slate-100 rounded-3xl max-w-4xl w-full h-[85vh] p-5 sm:p-6 shadow-2xl border border-slate-800 flex flex-col relative animate-in zoom-in-95 duration-200 overflow-hidden font-mono">
      <!-- Header -->
      <div class="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold shrink-0">
            <Terminal class="w-5 h-5" />
          </div>
          <div>
            <div class="flex items-center space-x-2">
              <h3 class="font-bold text-slate-100 text-base leading-tight">
                {{ t('log_modal_title') || '实时诊断日志控制台' }}
              </h3>
              <span class="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-sans">
                {{ filteredLogs.length }} {{ t('log_entries_count') || '条记录' }}
              </span>
            </div>
            <p class="text-xs text-slate-400 font-sans mt-0.5">
              {{ t('log_modal_desc') || '实时监控 PDF 安全校验、解密链路、图层提取与装配流水线' }}
            </p>
          </div>
        </div>

        <button 
          @click="$emit('close')" 
          class="text-slate-400 hover:text-slate-200 p-2 rounded-full hover:bg-slate-800 transition cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Controls Strip -->
      <div class="py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 border-b border-slate-800/80">
        <!-- Search & Filter -->
        <div class="flex items-center space-x-2 flex-1 min-w-[240px]">
          <div class="relative flex-1">
            <Search class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              v-model="searchQuery" 
              :placeholder="t('log_search_placeholder') || '搜索日志关键字/标签/文件名...'" 
              class="w-full text-xs bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-slate-200 focus:outline-hidden focus:border-blue-500"
            >
          </div>

          <!-- Level Filter Buttons -->
          <div class="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px] font-sans">
            <button 
              v-for="lvl in ['ALL', 'INFO', 'WARN', 'ERROR', 'DEBUG']" 
              :key="lvl"
              @click="selectedLevel = lvl"
              :class="[
                'px-2 py-0.5 rounded-lg transition cursor-pointer font-medium',
                selectedLevel === lvl ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              ]"
            >
              {{ lvl }}
            </button>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center space-x-2 font-sans">
          <button 
            type="button" 
            @click="handleCopy" 
            class="text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center space-x-1"
          >
            <Copy class="w-3.5 h-3.5" />
            <span>{{ copySuccess ? (t('copied') || '已复制!') : (t('log_btn_copy') || '复制全部') }}</span>
          </button>

          <button 
            type="button" 
            @click="handleDownload" 
            class="text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center space-x-1"
          >
            <Download class="w-3.5 h-3.5" />
            <span>{{ t('log_btn_export') || '导出日志' }}</span>
          </button>

          <button 
            type="button" 
            @click="handleClear" 
            class="text-xs text-rose-400 hover:bg-rose-950/40 border border-rose-900/30 px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center space-x-1"
          >
            <Trash2 class="w-3.5 h-3.5" />
            <span>{{ t('log_btn_clear') || '清空' }}</span>
          </button>
        </div>
      </div>

      <!-- Logs Console Window -->
      <div ref="logContainerRef" class="flex-1 overflow-y-auto py-3 space-y-1.5 text-[11px] leading-relaxed select-text scrollbar-thin">
        <div v-if="filteredLogs.length === 0" class="text-center py-20 text-slate-600 font-sans">
          <Terminal class="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>{{ t('log_empty_hint') || '暂无匹配的诊断日志记录' }}</p>
        </div>

        <div 
          v-for="entry in filteredLogs" 
          :key="entry.id"
          class="p-2 rounded-xl bg-slate-900/50 hover:bg-slate-900 border border-slate-800/40 transition group"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center space-x-2 shrink-0">
              <span class="text-slate-500 select-none">[{{ entry.time }}]</span>
              
              <!-- Level Badge -->
              <span :class="[
                'text-[10px] px-1.5 py-0.2 rounded-md font-bold',
                entry.level === 'ERROR' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                entry.level === 'WARN' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                entry.level === 'DEBUG' ? 'bg-purple-950 text-purple-400 border border-purple-800' :
                'bg-blue-950 text-blue-400 border border-blue-800'
              ]">
                {{ entry.level }}
              </span>

              <!-- Tag -->
              <span class="text-slate-300 font-bold text-[10px] bg-slate-800 px-1.5 py-0.2 rounded-md border border-slate-700">
                #{{ entry.tag }}
              </span>
            </div>

            <!-- Copy Single Entry -->
            <button 
              @click="copySingleEntry(entry)" 
              class="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300 p-1 rounded-md transition cursor-pointer"
              title="复制此条日志"
            >
              <Copy class="w-3 h-3" />
            </button>
          </div>

          <!-- Message Body -->
          <div class="mt-1 text-slate-200 font-sans break-all pl-0.5">
            {{ entry.message }}
          </div>

          <!-- Structured Details (if present) -->
          <pre v-if="entry.details" class="mt-1.5 p-2 bg-slate-950 rounded-lg text-[10px] text-slate-400 overflow-x-auto border border-slate-800/80 font-mono">{{ JSON.stringify(entry.details, null, 2) }}</pre>
        </div>
      </div>

      <!-- Footer Live Status Bar -->
      <div class="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 font-sans shrink-0">
        <div class="flex items-center space-x-2">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>{{ t('log_live_active') || '诊断监听引擎处于活动状态 (100% 本地浏览器内存沙箱)' }}</span>
        </div>

        <button 
          @click="$emit('close')" 
          class="bg-slate-800 hover:bg-slate-700 text-slate-200 px-5 py-1.5 rounded-xl transition cursor-pointer text-xs font-bold font-sans"
        >
          {{ t('btn_close') || '关闭' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { Terminal, X, Search, Copy, Download, Trash2 } from 'lucide-vue-next';
import { logEntries, logger } from '../utils/logger';
import { triggerDownload } from '../utils/download';
import { t } from '../i18n';

defineProps({
  isOpen: Boolean
});

defineEmits(['close']);

const searchQuery = ref('');
const selectedLevel = ref('ALL');
const copySuccess = ref(false);

const filteredLogs = computed(() => {
  return logEntries.filter(entry => {
    // Level match
    if (selectedLevel.value !== 'ALL' && entry.level !== selectedLevel.value) {
      return false;
    }
    // Search match
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase();
      const matchMsg = entry.message?.toLowerCase().includes(q);
      const matchTag = entry.tag?.toLowerCase().includes(q);
      const matchDetails = entry.details ? JSON.stringify(entry.details).toLowerCase().includes(q) : false;
      return matchMsg || matchTag || matchDetails;
    }
    return true;
  });
});

function handleCopy() {
  const text = logger.getPlainText();
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
    copySuccess.value = true;
    setTimeout(() => { copySuccess.value = false; }, 2000);
  }
}

function copySingleEntry(entry) {
  const text = `[${entry.time}] [${entry.level}] [${entry.tag}] ${entry.message}${entry.details ? '\n' + JSON.stringify(entry.details, null, 2) : ''}`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  }
}

function handleDownload() {
  const text = logger.getPlainText();
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  triggerDownload(blob, `PDFSeal_Diagnostic_Logs_${Date.now()}.txt`);
}

function handleClear() {
  logger.clear();
}
</script>
