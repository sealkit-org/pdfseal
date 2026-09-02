<template>
  <div 
    v-if="isOpen" 
    class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
    @click.self="$emit('close')"
    @keydown.esc="$emit('close')"
  >
    <div class="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] p-6 shadow-2xl border border-slate-100 flex flex-col relative animate-in zoom-in-95 duration-200 overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
        <div class="flex items-center space-x-2.5">
          <div class="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0 shadow-2xs">
            <Settings class="w-5 h-5" />
          </div>
          <div>
            <h3 class="font-extrabold text-slate-900 text-base leading-tight">
              {{ t('settings_modal_title') || '全局偏好设置' }}
            </h3>
            <p class="text-xs text-slate-400 font-medium mt-0.5">
              {{ t('settings_modal_desc') || '配置渲染处理、收纳箱归档与默认行为，所有设置保存在本地浏览器' }}
            </p>
          </div>
        </div>

        <button 
          @click="$emit('close')" 
          class="text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Settings Content Body -->
      <div class="flex-1 overflow-y-auto py-4 space-y-6 pr-1">
        <!-- 1. 渲染与图层处理 (Rendering & Layers) -->
        <div class="space-y-3">
          <div class="flex items-center space-x-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
            <Layers class="w-4 h-4 text-blue-600" />
            <span>{{ t('settings_group_rendering') || '渲染与图层处理' }}</span>
          </div>

          <div class="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 space-y-3">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-xs font-bold text-slate-800">
                  {{ t('settings_preserve_watermarks_title') || '保留原始浮动水印与注释图层' }}
                </p>
                <p class="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  {{ t('settings_preserve_watermarks_desc') || '开启时 100% 烙印原文档中的防伪水印、盖章与注释图层；关闭时采用纯净正文模式（自动剥离第三方牛皮癣水印）。' }}
                </p>
              </div>

              <!-- Switch -->
              <label class="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                <input 
                  type="checkbox" 
                  v-model="userSettings.preserveWatermarks" 
                  class="sr-only peer"
                >
                <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        <!-- 2. 收纳箱与归档行为 (Vault & Archiving) -->
        <div class="space-y-3">
          <div class="flex items-center space-x-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
            <FolderLock class="w-4 h-4 text-blue-600" />
            <span>{{ t('settings_group_vault') || '收纳箱与归档行为' }}</span>
          </div>

          <div class="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 space-y-4">
            <!-- Auto save export switch -->
            <div class="flex items-start justify-between gap-4 pb-3 border-b border-slate-200/60">
              <div>
                <p class="text-xs font-bold text-slate-800">
                  {{ t('settings_autosave_vault_title') || '处理后自动保存至收纳箱' }}
                </p>
                <p class="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  {{ t('settings_autosave_vault_desc') || '合并、拆分、水印、脱敏处理后的 PDF 自动在本地收纳箱的「已导出记录」中生成归档副本。' }}
                </p>
              </div>

              <label class="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                <input 
                  type="checkbox" 
                  v-model="userSettings.autoSaveToVault" 
                  class="sr-only peer"
                >
                <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <!-- Default Vault View Mode -->
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="text-xs font-bold text-slate-800">
                  {{ t('settings_default_view_title') || '收纳箱默认视图' }}
                </p>
                <p class="text-[11px] text-slate-500 mt-0.5">
                  {{ t('settings_default_view_desc') || '打开海豹收纳箱时默认采用的展现形式。' }}
                </p>
              </div>

              <div class="flex items-center bg-white p-1 rounded-xl border border-slate-200 shrink-0">
                <button 
                  type="button"
                  @click="userSettings.defaultVaultView = 'grid'"
                  :class="[
                    'px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer',
                    userSettings.defaultVaultView === 'grid' ? 'bg-blue-50 text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  ]"
                >
                  <LayoutGrid class="w-3.5 h-3.5" />
                  <span>{{ t('vault_view_grid') }}</span>
                </button>
                <button 
                  type="button"
                  @click="userSettings.defaultVaultView = 'list'"
                  :class="[
                    'px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer',
                    userSettings.defaultVaultView === 'list' ? 'bg-blue-50 text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  ]"
                >
                  <List class="w-3.5 h-3.5" />
                  <span>{{ t('vault_view_list') }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. 命名与导出规范 (Naming & Export) -->
        <div class="space-y-3">
          <div class="flex items-center space-x-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
            <Tag class="w-4 h-4 text-blue-600" />
            <span>{{ t('settings_group_export') || '命名与导出规范' }}</span>
          </div>

          <div class="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 space-y-3">
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="text-xs font-bold text-slate-800">
                  {{ t('settings_export_prefix_title') || '默认导出文件名前缀' }}
                </p>
                <p class="text-[11px] text-slate-500 mt-0.5">
                  {{ t('settings_export_prefix_desc') || '合并或导出文件时自动附加在文件名前方。' }}
                </p>
              </div>

              <input 
                type="text" 
                v-model="userSettings.defaultExportPrefix" 
                class="text-xs bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-mono focus:ring-2 focus:ring-blue-500 outline-hidden w-36 sm:w-44 text-right"
              >
            </div>
          </div>
        </div>

        <!-- 4. 隐私与会话安全 (Security & Session) -->
        <div class="space-y-3">
          <div class="flex items-center space-x-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
            <ShieldCheck class="w-4 h-4 text-emerald-600" />
            <span>{{ t('settings_group_security') || '隐私与会话安全' }}</span>
          </div>

          <div class="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 space-y-3">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-xs font-bold text-slate-800">
                  {{ t('settings_remember_session_title') || '会话级免密记忆' }}
                </p>
                <p class="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  {{ t('settings_remember_session_desc') || '在当前浏览器会话内记住已解锁的密码，流转到其他工具时免密通行；刷新页面或关闭标签页后自动安全销毁。' }}
                </p>
              </div>

              <label class="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                <input 
                  type="checkbox" 
                  v-model="userSettings.rememberSessionPasswords" 
                  class="sr-only peer"
                >
                <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        <!-- 5. 零知识加密外发服务 (Seal Send Endpoint) -->
        <div class="space-y-3">
          <div class="flex items-center space-x-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
            <Send class="w-4 h-4 text-blue-600" />
            <span>{{ t('settings_group_send') || '加密外发中转端点' }}</span>
          </div>

          <div class="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 space-y-3">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p class="text-xs font-bold text-slate-800">
                  {{ t('settings_custom_worker_title') || '自定义 Cloudflare Worker URL' }}
                </p>
                <p class="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  {{ t('settings_custom_worker_desc') || '填入您部署在 Cloudflare 的专属 Worker 域名；留空则使用本地调试会话或默认安全中转。' }}
                </p>
              </div>

              <input 
                type="text" 
                v-model="userSettings.customWorkerUrl" 
                placeholder="https://your-worker.workers.dev"
                class="text-xs bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-mono focus:ring-2 focus:ring-blue-500 outline-hidden w-full sm:w-56"
              >
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="pt-4 border-t border-slate-100 flex items-center justify-between shrink-0">
        <button 
          type="button" 
          @click="handleReset" 
          class="text-xs text-rose-600 hover:bg-rose-50 font-semibold px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center space-x-1"
        >
          <RotateCcw class="w-3.5 h-3.5" />
          <span>{{ t('settings_btn_reset') || '恢复默认设置' }}</span>
        </button>

        <button 
          type="button" 
          @click="$emit('close')" 
          class="bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition shadow-md hover:shadow-blue-600/25 cursor-pointer"
        >
          {{ t('btn_done') || '完成' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { 
  Settings, X, Layers, FolderLock, Tag, ShieldCheck, 
  RotateCcw, LayoutGrid, List, Send 
} from 'lucide-vue-next';
import { userSettings, resetSettings } from '../utils/userSettings';
import { t } from '../i18n';

defineProps({
  isOpen: Boolean
});

defineEmits(['close']);

function handleReset() {
  if (confirm(t('settings_confirm_reset') || '确定要恢复所有全局设置为初始默认值吗？')) {
    resetSettings();
  }
}
</script>
