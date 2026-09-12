<template>
  <div 
    v-if="file" 
    class="bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-indigo-500/10 border border-emerald-200/80 rounded-2xl p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-2.5 shadow-xs animate-in fade-in slide-in-from-bottom-2 duration-300 select-none"
  >
    <!-- Left: Status & Hint & Vault Archiving Badge -->
    <div class="flex items-center space-x-2.5 min-w-0">
      <div class="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0 shadow-2xs">
        <Sparkles class="w-4 h-4 text-emerald-600 animate-pulse" />
      </div>
      <div class="min-w-0">
        <!-- Line 1: Current Result Status & Vault Persistence -->
        <div class="flex items-center space-x-2 flex-wrap">
          <p class="text-xs font-extrabold text-slate-800">
            {{ t('next_action_done') || 'All done!' }}
          </p>

          <!-- Vault Archiving Status / Action Badge -->
          <div 
            v-if="isSavedToVault" 
            class="inline-flex items-center space-x-1 text-[11px] font-medium text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-lg border border-emerald-200/60 shadow-2xs"
          >
            <CheckCircle2 class="w-3 h-3 text-emerald-600 shrink-0" />
            <span>{{ t('vault_status_saved') || 'Saved to Local Vault' }}</span>
            <span class="text-emerald-400">·</span>
            <button 
              type="button" 
              @click="handleOpenVault"
              class="hover:underline font-bold text-emerald-800 hover:text-emerald-950 inline-flex items-center gap-0.5 cursor-pointer"
            >
              <span>{{ t('vault_status_view') || 'View' }}</span>
              <ArrowUpRight class="w-3 h-3" />
            </button>
          </div>
          <button 
            v-else
            type="button"
            @click="handleSaveToVault"
            :disabled="isSaving"
            class="inline-flex items-center space-x-1 text-[11px] font-bold text-blue-700 bg-white/90 hover:bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg shadow-2xs hover:shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Loader2 v-if="isSaving" class="w-3 h-3 animate-spin text-blue-600 shrink-0" />
            <FolderPlus v-else class="w-3 h-3 text-blue-600 shrink-0" />
            <span>{{ isSaving ? (t('vault_status_saving') || 'Saving...') : (t('vault_btn_save_now') || 'Save to Vault') }}</span>
          </button>
        </div>

        <!-- Line 2: Next Action Prompt (Leading to the tool buttons on the right) -->
        <p class="text-[11px] text-slate-500 font-medium truncate hidden sm:block mt-0.5">
          {{ t('next_action_prompt') || 'Next step (in-memory relay without re-uploading):' }}
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
import { ref, computed, watch } from 'vue';
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
  ImageDown,
  ListOrdered,
  X,
  CheckCircle2,
  FolderPlus,
  ArrowUpRight,
  Loader2
} from 'lucide-vue-next';
import { t } from '../i18n';
import { dispatchToTool } from '../utils/toolBridge';
import { computeSha256, checkDuplicateHash, saveFile } from '../utils/vaultDb';

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

// --- Local Vault Archiving State & Operations ---
const isSavedToVault = ref(false);
const isSaving = ref(false);

async function checkVaultPersistence() {
  if (!props.file || !props.file.arrayBuffer) {
    isSavedToVault.value = false;
    return;
  }
  try {
    const hash = await computeSha256(props.file.arrayBuffer);
    const existing = await checkDuplicateHash(hash);
    isSavedToVault.value = Boolean(existing);
  } catch (err) {
    isSavedToVault.value = false;
  }
}

watch(
  () => props.file,
  () => {
    checkVaultPersistence();
  },
  { immediate: true }
);

async function handleSaveToVault() {
  if (!props.file || isSaving.value || isSavedToVault.value) return;
  isSaving.value = true;
  try {
    await saveFile({
      name: props.file.name,
      arrayBuffer: props.file.arrayBuffer,
      category: 'export',
      folderId: 'default'
    });
    isSavedToVault.value = true;
  } catch (err) {
    console.error('Failed to save file to vault:', err);
  } finally {
    isSaving.value = false;
  }
}

function handleOpenVault() {
  emit('send-to-tool', 'vault');
}

// --- Pure Processing Tool Catalog & Prioritization ---
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
  { id: 'merge', labelKey: 'next_action_merge', icon: Files, color: 'text-slate-700 bg-slate-100 border-slate-200 hover:bg-slate-200' }
];

const priorityMap = {
  merge: ['compress', 'sign', 'protect', 'pdf_to_image', 'page_number'],
  compress: ['protect', 'sign', 'watermark', 'pdf_to_image', 'page_number'],
  organize: ['compress', 'sign', 'protect', 'pdf_to_image', 'page_number'],
  split: ['compress', 'sign', 'protect', 'pdf_to_image', 'organize'],
  page_number: ['compress', 'protect', 'sign', 'pdf_to_image', 'watermark'],
  watermark: ['protect', 'compress', 'sign', 'sanitize', 'page_number'],
  protect: ['watermark', 'compress', 'sign', 'sanitize', 'page_number'],
  sanitize: ['protect', 'watermark', 'compress', 'sign', 'page_number'],
  unlock: ['split', 'organize', 'compress', 'watermark', 'sign'],
  sign: ['protect', 'compress', 'watermark', 'page_number', 'pdf_to_image'],
  image_to_pdf: ['watermark', 'compress', 'protect', 'sign', 'page_number']
};

const suggestedActions = computed(() => {
  const ids = priorityMap[props.currentTool] || ['compress', 'protect', 'sign', 'page_number'];
  return ids
    .map(id => actionCatalog.find(a => a.id === id))
    .filter(Boolean)
    .slice(0, 5);
});

function handleRelay(targetToolId) {
  if (!props.file) return;

  dispatchToTool(targetToolId, {
    name: props.file.name,
    arrayBuffer: props.file.arrayBuffer,
    size: props.file.size,
    password: props.file.password || ''
  });

  emit('send-to-tool', targetToolId);
}
</script>
