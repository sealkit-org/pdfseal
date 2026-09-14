<template>
  <div 
    v-if="isOpen" 
    class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
    @click.self="$emit('close')"
    @keydown.esc="$emit('close')"
  >
    <div class="bg-white rounded-3xl max-w-xl w-full max-h-[85vh] p-5 sm:p-6 shadow-2xl border border-slate-100 flex flex-col relative animate-in zoom-in-95 duration-200 overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
        <div class="flex items-center space-x-2.5">
          <div class="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0 shadow-2xs">
            <Settings class="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 class="font-extrabold text-slate-900 text-base leading-tight">
              {{ t('settings_modal_title', '全局偏好设置') }}
            </h3>
            <p class="text-xs text-slate-400 font-medium mt-0.5">
              {{ t('settings_modal_desc', '配置收纳箱归档与默认行为，所有设置保存在本地浏览器') }}
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

      <!-- Segmented Tab Navigation -->
      <div class="mt-3 shrink-0">
        <div class="bg-slate-100/90 p-1 rounded-2xl flex items-center gap-1 border border-slate-200/50">
          <button 
            type="button"
            @click="activeTab = 'general'"
            :class="[
              'flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer',
              activeTab === 'general' 
                ? 'bg-white text-blue-600 shadow-2xs font-extrabold' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            ]"
          >
            <FolderLock class="w-3.5 h-3.5" />
            <span>{{ t('settings_tab_general', '常用偏好') }}</span>
          </button>

          <button 
            type="button"
            @click="activeTab = 'advanced'"
            :class="[
              'flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer',
              activeTab === 'advanced' 
                ? 'bg-white text-blue-600 shadow-2xs font-extrabold' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            ]"
          >
            <Sliders class="w-3.5 h-3.5" />
            <span>{{ t('settings_tab_advanced', '高级与授权') }}</span>
          </button>
        </div>
      </div>

      <!-- Settings Body -->
      <div class="flex-1 overflow-y-auto py-3.5 pr-1 min-h-0">
        <!-- TAB 1: 常用偏好 (General) - 简洁直接、一屏搞定 -->
        <div v-show="activeTab === 'general'" class="space-y-3.5 animate-in fade-in duration-150">
          <!-- 1. 收纳箱与归档行为 -->
          <div class="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 space-y-3.5">
            <!-- Auto save export switch -->
            <div class="flex items-center justify-between gap-4 pb-3 border-b border-slate-200/60">
              <div class="min-w-0 pr-2">
                <div class="flex items-center space-x-1.5">
                  <FolderLock class="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <p class="text-xs font-bold text-slate-800">
                    {{ t('settings_autosave_vault_title', '处理后自动保存至收纳箱') }}
                  </p>
                </div>
                <p class="text-[11px] text-slate-500 mt-0.5 leading-relaxed pl-5">
                  {{ t('settings_autosave_vault_desc', '合并、拆分或导出的文件自动在本地收纳箱中留存备份副本。') }}
                </p>
              </div>

              <label class="relative inline-flex items-center cursor-pointer shrink-0">
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
              <div class="min-w-0 pr-2">
                <div class="flex items-center space-x-1.5">
                  <LayoutGrid class="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <p class="text-xs font-bold text-slate-800">
                    {{ t('settings_default_view_title', '收纳箱默认展示视图') }}
                  </p>
                </div>
                <p class="text-[11px] text-slate-500 mt-0.5 pl-5">
                  {{ t('settings_default_view_desc', '进入海豹收纳箱时默认采用的展示形式。') }}
                </p>
              </div>

              <div class="flex items-center bg-slate-200/70 p-1 rounded-xl shrink-0">
                <button 
                  type="button" 
                  @click="userSettings.defaultVaultView = 'grid'" 
                  :class="[
                    'p-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition cursor-pointer',
                    userSettings.defaultVaultView === 'grid' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  ]"
                >
                  <LayoutGrid class="w-3.5 h-3.5" />
                  <span class="text-[11px]">{{ t('vault_view_grid', '网格卡片') }}</span>
                </button>
                <button 
                  type="button" 
                  @click="userSettings.defaultVaultView = 'list'" 
                  :class="[
                    'p-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition cursor-pointer',
                    userSettings.defaultVaultView === 'list' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  ]"
                >
                  <List class="w-3.5 h-3.5" />
                  <span class="text-[11px]">{{ t('vault_view_list', '详细列表') }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 2. 默认导出命名规则 -->
          <div class="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-1.5">
                <Tag class="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <p class="text-xs font-bold text-slate-800">
                  {{ t('settings_naming_pattern_title', '默认导出文件名命名规则') }}
                </p>
              </div>
              <button 
                v-if="userSettings.defaultNamingPattern"
                type="button" 
                @click="userSettings.defaultNamingPattern = ''" 
                class="text-[11px] text-slate-500 hover:text-blue-600 transition cursor-pointer"
              >
                {{ t('settings_naming_reset_btn', '清空规则') }}
              </button>
            </div>

            <!-- Preset Chips -->
            <div class="flex flex-wrap items-center gap-1.5 text-[11px]">
              <button 
                v-for="preset in namingPresets" 
                :key="preset.val"
                type="button"
                @click="userSettings.defaultNamingPattern = preset.val"
                :class="[
                  'px-2.5 py-1 rounded-xl font-medium border transition cursor-pointer',
                  userSettings.defaultNamingPattern === preset.val 
                    ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold shadow-2xs' 
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-100/50'
                ]"
              >
                {{ preset.label }}
              </button>
            </div>

            <!-- Custom Input -->
            <div class="pt-0.5">
              <input 
                type="text" 
                v-model="userSettings.defaultNamingPattern" 
                :placeholder="t('settings_naming_pattern_desc', '{name}_{tool}_{date}')" 
                class="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono focus:ring-2 focus:ring-blue-500 outline-hidden text-slate-800 placeholder:text-slate-400"
              >
            </div>
          </div>
        </div>

        <!-- TAB 2: 高级与授权 (Advanced) - 极客项集中管理 -->
        <div v-show="activeTab === 'advanced'" class="space-y-3.5 animate-in fade-in duration-150">
          <!-- 1. 渲染与图层处理 -->
          <div class="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70">
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0 pr-2">
                <div class="flex items-center space-x-1.5">
                  <Layers class="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <p class="text-xs font-bold text-slate-800">
                    {{ t('settings_preserve_watermarks_title', '保留原始浮动水印与注释图层') }}
                  </p>
                </div>
                <p class="text-[11px] text-slate-500 mt-0.5 leading-relaxed pl-5">
                  {{ t('settings_preserve_watermarks_desc', '开启时 100% 保留原文档中的浮动水印、签章与注释图层；关闭时采用纯净正文模式。') }}
                </p>
              </div>

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

          <!-- 2. 赞助者证书与软件授权 -->
          <div class="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 space-y-3">
            <div class="flex items-center space-x-1.5">
              <Crown class="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <p class="text-xs font-bold text-slate-800">
                {{ t('settings_group_license', '赞助者证书与软件授权') }}
              </p>
            </div>

            <!-- If Already Activated -->
            <div 
              v-if="isProSupporter" 
              class="bg-gradient-to-r from-amber-50/80 via-indigo-50/40 to-emerald-50/50 rounded-xl p-3.5 border border-amber-200/80 space-y-2"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="space-y-1">
                  <div class="flex items-center flex-wrap gap-1.5">
                    <span class="text-sm">🦭</span>
                    <span class="font-extrabold text-slate-900 text-xs">{{ activeTierLabel }}</span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white">
                      {{ t('enterprise_active_title', '已激活') }}
                    </span>
                    <span 
                      class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      :class="activeCert?.provider === 'lemonsqueezy' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'"
                    >
                      {{ activeCert?.provider === 'lemonsqueezy' ? 'LemonSqueezy' : 'Offline ECDSA' }}
                    </span>
                  </div>
                  <p class="text-[11px] text-slate-600">
                    {{ t('settings_license_owner', '授权所有者:') }} <b class="text-slate-800">{{ activeCert?.name }}</b> 
                    <span v-if="activeCert?.email" class="text-slate-500">({{ activeCert.email }})</span>
                  </p>
                  <p class="text-[10px] text-slate-500 flex flex-wrap items-center gap-x-2">
                    <span>{{ t('settings_license_validity', '有效期:') }} <b>{{ activeCert?.expiresAt ? new Date(activeCert.expiresAt).toLocaleDateString() : t('settings_license_lifetime', '终生永久有效') }}</b></span>
                    <span v-if="activeCert?.instanceName" class="text-slate-400">· {{ t('settings_license_device', '设备:') }} {{ activeCert.instanceName }}</span>
                  </p>
                </div>

                <button 
                  @click="handleRevokeCert"
                  class="px-2.5 py-1 rounded-lg border border-slate-300 hover:bg-white text-slate-600 text-[11px] font-semibold transition cursor-pointer shrink-0 shadow-2xs"
                >
                  {{ t('settings_license_revoke_btn', '解绑授权') }}
                </button>
              </div>
            </div>

            <!-- If Not Activated -->
            <div v-else class="space-y-2.5">
              <p class="text-[11px] text-slate-500 leading-relaxed">
                {{ t('settings_license_code_desc', '输入您的激活码或离线证书代码，激活后解锁全部 Pro 权益。') }}
              </p>

              <div class="flex flex-col sm:flex-row gap-2">
                <input 
                  type="text" 
                  v-model="inputCertCode" 
                  :placeholder="t('settings_license_placeholder', '粘贴授权码或离线代码 (SEAL-...)')" 
                  class="text-xs bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-mono focus:ring-2 focus:ring-amber-500 outline-hidden flex-1 text-slate-800 placeholder:text-slate-400"
                >
                <button 
                  type="button" 
                  @click="handleActivateCert" 
                  class="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-98 text-white text-xs font-bold rounded-xl transition cursor-pointer shrink-0 shadow-xs"
                >
                  {{ t('settings_license_btn_activate', '验证并激活') }}
                </button>
              </div>

              <p v-if="certError" class="text-xs text-rose-600 font-medium">
                ⚠️ {{ certError }}
              </p>
              <p v-if="certSuccess" class="text-xs text-emerald-600 font-bold">
                🎉 {{ certSuccess }}
              </p>
            </div>
          </div>

          <!-- 3. 端到端加密中继端点 -->
          <div class="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 space-y-2.5">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-1.5">
                <Send class="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <p class="text-xs font-bold text-slate-800">
                  {{ t('settings_custom_worker_title', '自定义 Cloudflare Worker URL') }}
                </p>
              </div>
              <button 
                v-if="userSettings.customWorkerUrl"
                type="button" 
                @click="userSettings.customWorkerUrl = ''" 
                class="text-[11px] text-slate-500 hover:text-blue-600 transition cursor-pointer"
              >
                {{ t('settings_naming_reset_btn', '恢复默认') }}
              </button>
            </div>
            <p class="text-[11px] text-slate-500 leading-relaxed">
              {{ t('settings_custom_worker_desc', '外发加密分享的中转端点，留空则使用官方默认安全中继。') }}
            </p>
            <input 
              type="text" 
              v-model="userSettings.customWorkerUrl" 
              placeholder="https://send.sealkit.org"
              class="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-mono focus:ring-2 focus:ring-blue-500 outline-hidden text-slate-800 placeholder:text-slate-400"
            >
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
        <button 
          type="button" 
          @click="handleReset" 
          class="text-xs text-rose-600 hover:bg-rose-50 font-semibold px-2.5 py-1.5 rounded-xl transition cursor-pointer flex items-center space-x-1"
        >
          <RotateCcw class="w-3.5 h-3.5" />
          <span>{{ t('settings_btn_reset', '恢复默认设置') }}</span>
        </button>

        <button 
          type="button" 
          @click="$emit('close')" 
          class="bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-bold px-5 py-2 rounded-xl transition shadow-md hover:shadow-blue-600/25 cursor-pointer"
        >
          {{ t('btn_done', '完成') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { 
  Settings, X, Layers, FolderLock, Tag, ShieldCheck, 
  RotateCcw, LayoutGrid, List, Send, Crown, Sliders
} from 'lucide-vue-next';
import { ref, computed } from 'vue';
import { userSettings, resetSettings } from '../utils/userSettings';
import { 
  activeCert, 
  isProSupporter, 
  activeTierLabel, 
  activateCertificate, 
  revokeCertificate 
} from '../utils/security/certificateStore';
import { t } from '../i18n';

defineProps({
  isOpen: Boolean
});

defineEmits(['close']);

const activeTab = ref('general');

const namingPresets = computed(() => [
  { label: t('settings_naming_preset_default', '原名_工具_日期'), val: '{name}_{tool}_{date}' },
  { label: t('settings_naming_preset_simple', '原名_工具'), val: '{name}_{tool}' },
  { label: t('settings_naming_preset_date', '原名_日期'), val: '{name}_{date}' },
  { label: t('settings_naming_preset_clean', '保持原文件名'), val: '{name}' }
]);

const inputCertCode = ref('');
const certError = ref('');
const certSuccess = ref('');

async function handleActivateCert() {
  certError.value = '';
  certSuccess.value = '';
  if (!inputCertCode.value.trim()) {
    certError.value = t('settings_license_err_empty', '请输入证书代码');
    return;
  }
  const res = await activateCertificate(inputCertCode.value.trim());
  if (res.success) {
    certSuccess.value = t('settings_license_success', { name: res.cert.name, tier: activeTierLabel.value }) || `激活成功！欢迎，${res.cert.name} (${activeTierLabel.value})`;
    inputCertCode.value = '';
  } else {
    certError.value = res.error || 'Invalid license certificate';
  }
}

function handleRevokeCert() {
  if (confirm(t('settings_license_revoke_confirm', '确定要从此设备解绑并清除授权证书吗？'))) {
    revokeCertificate();
    certSuccess.value = '';
    certError.value = '';
  }
}

function handleReset() {
  if (confirm(t('settings_confirm_reset', '确定要将所有设置恢复为默认值吗？'))) {
    resetSettings();
  }
}
</script>
