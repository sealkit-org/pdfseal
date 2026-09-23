<template>
  <div 
    v-if="file && actionStrategy.canRelay && hero" 
    class="bg-gradient-to-r from-amber-500/10 via-blue-500/10 to-indigo-500/10 border-2 border-amber-300/80 rounded-2xl p-3.5 sm:p-4 shadow-xs animate-in fade-in slide-in-from-bottom-2 duration-300 select-none text-left"
  >
    <!-- TOP ROW: HERO SMART RECOMMENDATION & CALL TO ACTION -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <!-- Left: Indicator, Title, Badge, Description -->
      <div class="min-w-0 flex-1">
        <div class="flex items-center space-x-2 flex-wrap gap-y-1">
          <!-- Lightbulb Indicator / Header -->
          <div class="flex items-center space-x-1.5 font-black text-xs sm:text-sm text-slate-900">
            <span class="text-amber-500 text-sm">💡</span>
            <span>{{ t(hero.titleKey, 'Recommended Next Step') }}：</span>
          </div>

          <!-- Smart Contextual Badge -->
          <span 
            v-if="hero.badgeKey"
            class="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300/80 shadow-2xs"
          >
            {{ t(hero.badgeKey, hero.badgeParams) }}
          </span>
        </div>

        <!-- Explanatory Contextual Advice -->
        <p class="text-xs text-slate-600 mt-1 leading-relaxed">
          {{ t(hero.descKey, hero.descParams) }}
        </p>
      </div>

      <!-- Right: Hero CTA Relay Button -->
      <button 
        type="button"
        @click="handleRelay(hero.id)"
        :class="[
          'w-full sm:w-auto px-4 py-2 rounded-xl font-extrabold text-xs sm:text-sm shadow-md transition shrink-0 cursor-pointer flex items-center justify-center space-x-1.5 active:scale-95 group',
          hero.heroColor
        ]"
      >
        <component :is="hero.icon" class="w-4 h-4 group-hover:scale-110 transition-transform" />
        <span>{{ t(hero.ctaKey) }}</span>
      </button>
    </div>

    <!-- DIVIDER -->
    <div class="mt-3 pt-2.5 border-t border-amber-200/60 flex flex-wrap items-center justify-between gap-2.5">
      <!-- Left: Secondary Quick Actions Strip -->
      <div class="flex flex-wrap items-center gap-1.5 min-w-0">
        <span class="text-[11px] text-slate-500 font-semibold shrink-0">
          {{ t('next_action_other_shortcuts', 'Other quick actions (0 re-upload):') }}
        </span>

        <button 
          v-for="act in secondaryActions" 
          :key="act.id"
          type="button"
          @click="handleRelay(act.id)"
          :class="[
            'px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[11px] font-bold border transition flex items-center space-x-1 shadow-2xs active:scale-95 cursor-pointer bg-white/90 hover:bg-white',
            act.color
          ]"
        >
          <component :is="act.icon" class="w-3 h-3" />
          <span>{{ t(act.labelKey) }}</span>
        </button>
      </div>

      <!-- Right: Local Vault Persistence & Close -->
      <div class="flex items-center space-x-2 shrink-0 ml-auto">
        <!-- Vault Archiving Status / Action Badge -->
        <div 
          v-if="isSavedToVault" 
          class="inline-flex items-center space-x-1 text-[11px] font-medium text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-lg border border-emerald-200/80 shadow-2xs"
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

        <!-- Close Button -->
        <button 
          type="button"
          @click="emit('close')"
          class="text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 p-1 rounded-lg transition cursor-pointer"
          :title="t('btn_close', 'Close')"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { 
  X,
  CheckCircle2,
  FolderPlus,
  ArrowUpRight,
  Loader2
} from 'lucide-vue-next';
import { t } from '../i18n';
import { dispatchToTool } from '../utils/toolBridge';
import { computeSha256, checkDuplicateHash, saveFile } from '../utils/vaultDb';
import { resolveNextActions } from '../utils/workflowStrategy';

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

// --- Smart Strategy Resolution ---
const actionStrategy = computed(() => {
  return resolveNextActions(props.currentTool, props.file);
});

const hero = computed(() => actionStrategy.value.heroAction);
const secondaryActions = computed(() => actionStrategy.value.secondaryActions);

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

const router = useRouter();

function handleOpenVault() {
  if (router && props.file?.name) {
    router.push({
      path: '/vault',
      query: { q: props.file.name, exact: '1' }
    });
  } else if (props.file?.name) {
    emit('send-to-tool', { tool: 'vault', query: { q: props.file.name, exact: '1' } });
  } else {
    emit('send-to-tool', 'vault');
  }
}

function handleRelay(targetToolId) {
  if (!props.file) return;

  if (targetToolId === 'vault') {
    handleOpenVault();
    return;
  }

  dispatchToTool(targetToolId, {
    name: props.file.name,
    arrayBuffer: props.file.arrayBuffer,
    size: props.file.size,
    password: props.file.password || ''
  });

  emit('send-to-tool', targetToolId);
}
</script>
