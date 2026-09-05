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
              {{ t('settings_modal_title') || 'Global Preferences' }}
            </h3>
            <p class="text-xs text-slate-400 font-medium mt-0.5">
              {{ t('settings_modal_desc') || 'Configure rendering, vault archiving, and defaults. All preferences stay in your local browser.' }}
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
            <span>{{ t('settings_group_rendering') || 'Rendering & Layers' }}</span>
          </div>

          <div class="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 space-y-3">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-xs font-bold text-slate-800">
                  {{ t('settings_preserve_watermarks_title') || 'Preserve Original Floating Watermarks & Annotations' }}
                </p>
                <p class="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  {{ t('settings_preserve_watermarks_desc') || 'When enabled, 100% preserves stamps, watermarks and annotations. When disabled, extracts clean core content and strips floating watermarks.' }}
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
            <span>{{ t('settings_group_vault') || 'Vault & Archiving' }}</span>
          </div>

          <div class="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 space-y-4">
            <!-- Auto save export switch -->
            <div class="flex items-start justify-between gap-4 pb-3 border-b border-slate-200/60">
              <div>
                <p class="text-xs font-bold text-slate-800">
                  {{ t('settings_autosave_vault_title') || 'Auto-archive to Vault after processing' }}
                </p>
                <p class="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  {{ t('settings_autosave_vault_desc') || 'Merged, split, watermarked, or sanitized PDFs automatically generate archive copies in your local Vault.' }}
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
                  {{ t('settings_default_view_title') || 'Vault Default View' }}
                </p>
                <p class="text-[11px] text-slate-500 mt-0.5">
                  {{ t('settings_default_view_desc') || 'Default display style when opening the Vault.' }}
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
            <span>{{ t('settings_group_export') || 'Naming & Export Rules' }}</span>
          </div>

          <div class="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 space-y-3">
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="text-xs font-bold text-slate-800">
                  {{ t('settings_export_prefix_title') || 'Default Export Filename Prefix' }}
                </p>
                <p class="text-[11px] text-slate-500 mt-0.5">
                  {{ t('settings_export_prefix_desc') || 'Prefix prepended automatically to exported filenames.' }}
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
            <span>{{ t('settings_group_security') || 'Privacy & Security' }}</span>
          </div>

          <div class="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 space-y-3">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-xs font-bold text-slate-800">
                  {{ t('settings_remember_session_title') || 'Session Password Memory' }}
                </p>
                <p class="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  {{ t('settings_remember_session_desc') || 'Remember unlocked passwords within the current browser session for seamless tool transitions. Cleared on refresh.' }}
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
            <span>{{ t('settings_group_send') || 'E2EE Send Endpoint' }}</span>
          </div>

          <div class="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 space-y-3">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p class="text-xs font-bold text-slate-800">
                  {{ t('settings_custom_worker_title') || 'Custom Cloudflare Worker URL' }}
                </p>
                <p class="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  {{ t('settings_custom_worker_desc') || 'Enter your custom Cloudflare Worker endpoint; leave empty for local session or default relay.' }}
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

        <!-- 6. 赞助者证书与软件授权 (Supporter Certificate) -->
        <div class="space-y-3">
          <div class="flex items-center space-x-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
            <Crown class="w-4 h-4 text-amber-500" />
            <span>{{ t('settings_group_license') || 'Supporter Certificate & License' }}</span>
          </div>

          <!-- If Already Activated -->
          <div 
            v-if="isProSupporter" 
            class="bg-gradient-to-r from-amber-50/70 via-indigo-50/40 to-emerald-50/50 rounded-2xl p-5 border border-amber-200/80 space-y-3 shadow-xs"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="space-y-1">
                <div class="flex items-center flex-wrap gap-2">
                  <span class="text-base">🦭</span>
                  <span class="font-extrabold text-slate-900 text-sm">{{ activeTierLabel }}</span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white">
                    {{ t('enterprise_active_title') }}
                  </span>
                  <span 
                    class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    :class="activeCert?.provider === 'lemonsqueezy' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'"
                  >
                    {{ activeCert?.provider === 'lemonsqueezy' ? 'LemonSqueezy' : 'Offline ECDSA' }}
                  </span>
                </div>
                <p class="text-xs text-slate-600">
                  {{ t('settings_license_owner') }} <b class="text-slate-800">{{ activeCert.name }}</b> 
                  <span v-if="activeCert.email" class="text-slate-500">({{ activeCert.email }})</span>
                </p>
                <p class="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span>{{ t('settings_license_validity') }} <b>{{ activeCert.expiresAt ? new Date(activeCert.expiresAt).toLocaleDateString() : t('settings_license_lifetime') }}</b></span>
                  <span v-if="activeCert?.instanceName" class="text-slate-400">· {{ t('settings_license_device') }} {{ activeCert.instanceName }}</span>
                </p>
              </div>

              <button 
                @click="handleRevokeCert"
                class="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition cursor-pointer shrink-0"
              >
                {{ t('settings_license_revoke_btn') }}
              </button>
            </div>
          </div>

          <!-- If Not Activated -->
          <div 
            v-else 
            class="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 space-y-3"
          >
            <div>
              <div class="flex items-center justify-between">
                <p class="text-xs font-bold text-slate-800">
                  {{ t('settings_license_status') }} <span class="text-slate-500 font-normal">{{ activeTierLabel }}</span>
                </p>
              </div>
              <p class="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                {{ t('settings_license_desc') }}
              </p>
            </div>

            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input 
                type="text" 
                v-model="inputCertCode" 
                :placeholder="t('settings_license_placeholder')"
                class="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono focus:ring-2 focus:ring-indigo-500 outline-hidden flex-1"
                @keyup.enter="handleActivateCert"
              >
              <button 
                @click="handleActivateCert"
                class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer shrink-0"
              >
                {{ t('settings_license_btn_activate') }}
              </button>
            </div>

            <!-- Error or Success Tip -->
            <p v-if="certError" class="text-xs text-rose-600 font-medium">
              ⚠️ {{ certError }}
            </p>
            <p v-if="certSuccess" class="text-xs text-emerald-600 font-bold">
              🎉 {{ certSuccess }}
            </p>
          </div>
        </div>

        <!-- 5. 开发者环境模拟与自建测试 (Only visible in dev or local environment) -->
        <div v-if="isDevOrLocal" class="space-y-3 pt-1">
          <div class="flex items-center space-x-2 text-xs font-bold text-amber-800 uppercase tracking-wider">
            <Wrench class="w-4 h-4 text-amber-600" />
            <span>{{ t('settings_dev_title') || '🛠️ 本地调试与环境模拟 (Dev Tools)' }}</span>
          </div>

          <div class="bg-amber-50/70 rounded-2xl p-4 border border-amber-200/80 space-y-3">
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="flex items-center space-x-2">
                  <p class="text-xs font-bold text-slate-800">
                    {{ t('settings_dev_official_mode_title') || '模拟官方商业站点 (Simulate Official Mode)' }}
                  </p>
                  <span 
                    :class="[
                      'text-[10px] font-extrabold px-2 py-0.5 rounded-md border',
                      isOfficialMode.value 
                        ? 'bg-amber-100 text-amber-800 border-amber-300' 
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    ]"
                  >
                    {{ isOfficialMode.value ? 'Official Mode ON' : 'Clean Mode' }}
                  </span>
                </div>
                <p class="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  {{ t('settings_dev_official_mode_desc') || '开启后呈现商业许可/Pro、赞助打赏与意见反馈入口，方便本地联调测试；关闭则保持纯净本地工具箱。' }}
                </p>
              </div>

              <!-- Switch -->
              <label class="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                <input 
                  type="checkbox" 
                  :checked="isOfficialMode.value" 
                  @change="setOfficialMode($event.target.checked)"
                  class="sr-only peer"
                >
                <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
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
          <span>{{ t('settings_btn_reset') || 'Reset to Defaults' }}</span>
        </button>

        <button 
          type="button" 
          @click="$emit('close')" 
          class="bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition shadow-md hover:shadow-blue-600/25 cursor-pointer"
        >
          {{ t('btn_done') || 'Done' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { 
  Settings, X, Layers, FolderLock, Tag, ShieldCheck, 
  RotateCcw, LayoutGrid, List, Send, Crown, Wrench 
} from 'lucide-vue-next';
import { ref } from 'vue';
import { userSettings, resetSettings } from '../utils/userSettings';
import { 
  activeCert, 
  isProSupporter, 
  activeTierLabel, 
  activateCertificate, 
  revokeCertificate 
} from '../utils/security/certificateStore';
import { isDevOrLocal, isOfficialMode, setOfficialMode } from '../config/siteConfig';
import { t } from '../i18n';

defineProps({
  isOpen: Boolean
});

defineEmits(['close']);

const inputCertCode = ref('');
const certError = ref('');
const certSuccess = ref('');

async function handleActivateCert() {
  certError.value = '';
  certSuccess.value = '';
  if (!inputCertCode.value.trim()) {
    certError.value = t('settings_license_err_empty');
    return;
  }
  const res = await activateCertificate(inputCertCode.value.trim());
  if (res.success) {
    certSuccess.value = t('settings_license_success')
      .replace('{name}', res.cert.name)
      .replace('{tier}', activeTierLabel.value);
    inputCertCode.value = '';
  } else {
    certError.value = res.error || 'Invalid license certificate';
  }
}

function handleRevokeCert() {
  if (confirm(t('settings_license_revoke_confirm'))) {
    revokeCertificate();
    certSuccess.value = '';
    certError.value = '';
  }
}

function handleReset() {
  if (confirm(t('settings_confirm_reset') || 'Are you sure you want to reset all preferences to defaults?')) {
    resetSettings();
  }
}
</script>
