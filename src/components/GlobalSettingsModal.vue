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
              {{ t('settings_modal_title', 'Global Preferences') }}
            </h3>
            <p class="text-xs text-slate-400 font-medium mt-0.5">
              {{ t('settings_modal_desc', 'Configure rendering, vault archiving, and defaults.') }}
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
            <span>{{ t('settings_tab_general', 'Preferences') }}</span>
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
            <span>{{ t('settings_tab_advanced', 'Advanced & Licensing') }}</span>
          </button>
        </div>
      </div>

      <!-- Settings Body -->
      <div class="flex-1 overflow-y-auto py-3.5 pr-1 min-h-0">
        <!-- TAB 1: General Preferences -->
        <div v-show="activeTab === 'general'" class="space-y-3.5 animate-in fade-in duration-150">
          <!-- 1. Vault & Archiving -->
          <div class="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 space-y-3.5">
            <!-- Auto save export switch -->
            <div class="flex items-center justify-between gap-4 pb-3 border-b border-slate-200/60">
              <div class="min-w-0 pr-2">
                <div class="flex items-center space-x-1.5">
                  <FolderLock class="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <p class="text-xs font-bold text-slate-800">
                    {{ t('settings_autosave_vault_title', 'Auto-save output to Vault') }}
                  </p>
                </div>
                <p class="text-[11px] text-slate-500 mt-0.5 leading-relaxed pl-5">
                  {{ t('settings_autosave_vault_desc', 'Automatically store a backup of merged, split, or exported files in your local Vault.') }}
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
                    {{ t('settings_default_view_title', 'Default Vault View') }}
                  </p>
                </div>
                <p class="text-[11px] text-slate-500 mt-0.5 pl-5">
                  {{ t('settings_default_view_desc', 'Choose default display layout when opening Vault.') }}
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
                  <span class="text-[11px]">{{ t('vault_view_grid', 'Grid Cards') }}</span>
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
                  <span class="text-[11px]">{{ t('vault_view_list', 'Detailed List') }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 2. Export Naming Pattern -->
          <div class="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-1.5">
                <Tag class="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <p class="text-xs font-bold text-slate-800">
                  {{ t('settings_naming_pattern_title', 'Default Export Naming Pattern') }}
                </p>
              </div>
              <button 
                v-if="userSettings.defaultNamingPattern"
                type="button" 
                @click="userSettings.defaultNamingPattern = ''" 
                class="text-[11px] text-slate-500 hover:text-blue-600 transition cursor-pointer"
              >
                {{ t('settings_naming_reset_btn', 'Reset') }}
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

        <!-- TAB 2: Advanced & Licensing -->
        <div v-show="activeTab === 'advanced'" class="space-y-3.5 animate-in fade-in duration-150">
          <!-- 1. Rendering and Layers -->
          <div class="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70">
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0 pr-2">
                <div class="flex items-center space-x-1.5">
                  <Layers class="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <p class="text-xs font-bold text-slate-800">
                    {{ t('settings_preserve_watermarks_title', 'Preserve Watermarks and Annotations') }}
                  </p>
                </div>
                <p class="text-[11px] text-slate-500 mt-0.5 leading-relaxed pl-5">
                  {{ t('settings_preserve_watermarks_desc', 'Retain floating watermarks, stamps, and annotation layers from original document.') }}
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

          <!-- 2. Supporter Certificate & License -->
          <div class="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 space-y-3">
            <div class="flex items-center space-x-1.5">
              <Crown class="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <p class="text-xs font-bold text-slate-800">
                {{ t('settings_group_license', 'Supporter Certificate & License') }}
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
                      {{ t('enterprise_active_title', 'Activated') }}
                    </span>
                    <span 
                      class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      :class="activeCert?.provider === 'lemonsqueezy' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'"
                    >
                      {{ activeCert?.provider === 'lemonsqueezy' ? 'LemonSqueezy' : 'Offline ECDSA' }}
                    </span>
                  </div>
                  <p class="text-[11px] text-slate-600">
                    {{ t('settings_license_owner', 'License Owner:') }} <b class="text-slate-800">{{ activeCert?.name }}</b> 
                    <span v-if="activeCert?.email" class="text-slate-500">({{ activeCert.email }})</span>
                  </p>
                  <p class="text-[10px] text-slate-500 flex flex-wrap items-center gap-x-2">
                    <span>{{ t('settings_license_validity', 'Validity:') }} <b>{{ activeCert?.expiresAt ? new Date(activeCert.expiresAt).toLocaleDateString() : t('settings_license_lifetime', 'Lifetime Valid') }}</b></span>
                    <span v-if="activeCert?.instanceName" class="text-slate-400">· {{ t('settings_license_device', 'Device:') }} {{ activeCert.instanceName }}</span>
                  </p>
                </div>

                <button 
                  @click="handleRevokeCert"
                  class="px-2.5 py-1 rounded-lg border border-slate-300 hover:bg-white text-slate-600 text-[11px] font-semibold transition cursor-pointer shrink-0 shadow-2xs"
                >
                  {{ t('settings_license_revoke_btn', 'Revoke License') }}
                </button>
              </div>
            </div>

            <!-- If Not Activated -->
            <div v-else class="space-y-2.5">
              <p class="text-[11px] text-slate-500 leading-relaxed">
                {{ t('settings_license_code_desc', 'Enter your activation code or offline certificate code to unlock Pro features.') }}
              </p>

              <div class="flex flex-col sm:flex-row gap-2">
                <input 
                  type="text" 
                  v-model="inputCertCode" 
                  :placeholder="t('settings_license_placeholder', 'Paste license key or offline code (SEAL-...)')" 
                  class="text-xs bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-mono focus:ring-2 focus:ring-amber-500 outline-hidden flex-1 text-slate-800 placeholder:text-slate-400"
                >
                <button 
                  type="button" 
                  @click="handleActivateCert" 
                  class="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-98 text-white text-xs font-bold rounded-xl transition cursor-pointer shrink-0 shadow-xs"
                >
                  {{ t('settings_license_btn_activate', 'Verify & Activate') }}
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

          <!-- 3. Encrypted Sharing Relay -->
          <div class="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 space-y-2.5">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-1.5">
                <Send class="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <p class="text-xs font-bold text-slate-800">
                  {{ t('settings_custom_worker_title', 'Custom Cloudflare Worker URL') }}
                </p>
              </div>
              <button 
                v-if="userSettings.customWorkerUrl"
                type="button" 
                @click="userSettings.customWorkerUrl = ''" 
                class="text-[11px] text-slate-500 hover:text-blue-600 transition cursor-pointer"
              >
                {{ t('settings_naming_reset_btn', 'Reset') }}
              </button>
            </div>
            <p class="text-[11px] text-slate-500 leading-relaxed">
              {{ t('settings_custom_worker_desc', 'Relay endpoint for encrypted sharing. Leave empty to use official secure relay.') }}
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
          <span>{{ t('settings_btn_reset', 'Reset to Defaults') }}</span>
        </button>

        <button 
          type="button" 
          @click="$emit('close')" 
          class="bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-bold px-5 py-2 rounded-xl transition shadow-md hover:shadow-blue-600/25 cursor-pointer"
        >
          {{ t('btn_done', 'Done') }}
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
  { label: t('settings_naming_preset_default', 'Name_Tool_Date'), val: '{name}_{tool}_{date}' },
  { label: t('settings_naming_preset_simple', 'Name_Tool'), val: '{name}_{tool}' },
  { label: t('settings_naming_preset_date', 'Name_Date'), val: '{name}_{date}' },
  { label: t('settings_naming_preset_clean', 'Original Name'), val: '{name}' }
]);

const inputCertCode = ref('');
const certError = ref('');
const certSuccess = ref('');

async function handleActivateCert() {
  certError.value = '';
  certSuccess.value = '';
  if (!inputCertCode.value.trim()) {
    certError.value = t('settings_license_err_empty', 'Please enter a license key');
    return;
  }
  const res = await activateCertificate(inputCertCode.value.trim());
  if (res.success) {
    certSuccess.value = t('settings_license_success', { name: res.cert.name, tier: activeTierLabel.value }, `Activated! Welcome, ${res.cert.name} (${activeTierLabel.value})`);
    inputCertCode.value = '';
  } else {
    certError.value = res.error || 'Invalid license certificate';
  }
}

function handleRevokeCert() {
  if (confirm(t('settings_license_revoke_confirm', 'Are you sure you want to unbind and remove this license certificate from this device?'))) {
    revokeCertificate();
    certSuccess.value = '';
    certError.value = '';
  }
}

function handleReset() {
  if (confirm(t('settings_confirm_reset', 'Are you sure you want to reset all settings to defaults?'))) {
    resetSettings();
  }
}
</script>
