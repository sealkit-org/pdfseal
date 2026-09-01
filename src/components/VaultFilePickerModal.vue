<template>
  <div 
    v-if="isOpen" 
    class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
    @click.self="$emit('close')"
    @keydown.esc="$emit('close')"
  >
    <div class="bg-white rounded-3xl max-w-3xl w-full h-[650px] max-h-[90vh] p-5 sm:p-6 shadow-2xl border border-slate-100 flex flex-col relative animate-in zoom-in-95 duration-200">
      <!-- Header -->
      <div class="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
        <div class="flex items-center space-x-2.5">
          <div class="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0 shadow-2xs">
            <FolderLock class="w-5 h-5" />
          </div>
          <div>
            <h3 class="font-extrabold text-slate-900 text-sm sm:text-base leading-tight">
              {{ multiple ? (t('picker_modal_title') || '从海豹收纳箱挑选文件') : (t('picker_modal_title_single') || '从海豹收纳箱选择文件') }}
            </h3>
            <p class="text-[11px] text-slate-400 font-medium hidden sm:block">
              {{ multiple ? (t('picker_modal_desc') || '选择已保存在浏览器本地收纳箱中的 PDF 加入装配台') : (t('picker_modal_desc_single') || '选择已保存在收纳箱中的单个 PDF 进行操作') }}
            </p>
          </div>
        </div>

        <button 
          @click="$emit('close')" 
          class="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Search & Bulk Select Bar -->
      <div class="flex items-center justify-between gap-3 py-2.5 border-b border-slate-100 shrink-0">
        <div class="relative flex-1 max-w-sm">
          <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input 
            v-model="searchQuery" 
            type="text" 
            :placeholder="t('vault_search_placeholder')"
            class="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-hidden font-medium transition placeholder:text-slate-400"
          >
          <button 
            v-if="searchQuery" 
            @click="searchQuery = ''" 
            class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full cursor-pointer"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>

        <div v-if="multiple" class="flex items-center space-x-2">
          <button 
            @click="toggleSelectCurrentPage" 
            :disabled="filteredFiles.length === 0"
            class="text-xs font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-40 disabled:hover:bg-transparent px-3 py-1.5 rounded-xl border border-blue-200/60 transition cursor-pointer"
          >
            {{ isAllCurrentPageSelected ? (t('btn_deselect_all') || '取消本页全选') : (t('btn_select_all') || '全选本页') }}
          </button>
        </div>
        <div v-else class="text-[11px] text-slate-400 font-medium hidden sm:flex items-center space-x-1">
          <span>{{ t('picker_single_hint') || '单选模式：点击选中，双击可直接导入' }}</span>
        </div>
      </div>

      <!-- Main Layout: Folder Sidebar + File List -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 pt-3 flex-1 overflow-hidden">
        <!-- Folder Sidebar -->
        <div class="md:col-span-1 border-r border-slate-100 pr-2 overflow-y-auto space-y-1">
          <button 
            @click="activeFolderId = 'all'" 
            :class="[
              'w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer',
              activeFolderId === 'all' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
            ]"
          >
            <span class="flex items-center space-x-1.5 truncate">
              <Folder class="w-3.5 h-3.5 shrink-0" />
              <span class="truncate">{{ t('vault_all_files') }}</span>
            </span>
            <span class="text-[10px] bg-white px-1.5 py-0.2 rounded-full border border-slate-200 text-slate-500 font-mono">
              {{ files.length }}
            </span>
          </button>

          <button 
            @click="activeFolderId = 'default'" 
            :class="[
              'w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer',
              activeFolderId === 'default' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
            ]"
          >
            <span class="flex items-center space-x-1.5 truncate">
              <Inbox class="w-3.5 h-3.5 shrink-0" />
              <span class="truncate">{{ t('vault_default_folder') }}</span>
            </span>
            <span class="text-[10px] bg-white px-1.5 py-0.2 rounded-full border border-slate-200 text-slate-500 font-mono">
              {{ files.filter(f => f.folderId === 'default').length }}
            </span>
          </button>

          <button 
            @click="activeFolderId = 'export'" 
            :class="[
              'w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer',
              activeFolderId === 'export' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
            ]"
          >
            <span class="flex items-center space-x-1.5 truncate">
              <FileCheck class="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span class="truncate">{{ t('vault_exports_folder') }}</span>
            </span>
            <span class="text-[10px] bg-white px-1.5 py-0.2 rounded-full border border-emerald-200 text-emerald-700 font-mono">
              {{ files.filter(f => f.category === 'export').length }}
            </span>
          </button>

          <!-- Custom Folders -->
          <div v-if="folders.length > 0" class="pt-2 mt-1 border-t border-slate-100 space-y-1">
            <button 
              v-for="folder in folders" 
              :key="folder.id"
              @click="activeFolderId = folder.id"
              :class="[
                'w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer truncate',
                activeFolderId === folder.id ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
              ]"
            >
              <span class="flex items-center space-x-1.5 truncate">
                <FolderOpen v-if="activeFolderId === folder.id" class="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <Folder v-else class="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span class="truncate">{{ folder.name }}</span>
              </span>
            </button>
          </div>
        </div>

        <!-- Files Selection List with Zero-Scroll Pagination -->
        <div class="md:col-span-3 flex flex-col justify-between overflow-hidden">
          <!-- Empty View -->
          <div v-if="filteredFiles.length === 0" class="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div class="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-xl mb-2">
              🦭
            </div>
            <p class="text-xs font-semibold text-slate-600">{{ t('vault_empty_title') }}</p>
            <p class="text-[11px] text-slate-400 mt-0.5">{{ t('vault_empty_desc') }}</p>
          </div>

          <!-- Paginated File Items (Clean compact layout, zero scrollbars) -->
          <div v-else class="flex-1 space-y-1.5 overflow-hidden">
            <div 
              v-for="file in paginatedFiles" 
              :key="file.id"
              @click="toggleFileSelect(file)"
              @dblclick="handleFileDoubleClick(file)"
              :class="[
                'flex items-center justify-between py-1.5 sm:py-2 px-3 rounded-xl border transition cursor-pointer select-none',
                selectedMap[file.id] 
                  ? 'bg-blue-50/80 border-blue-300 shadow-2xs' 
                  : 'bg-slate-50/60 hover:bg-white border-slate-200/80 hover:border-slate-300'
              ]"
            >
              <div class="flex items-center space-x-2.5 min-w-0 flex-1">
                <!-- Indicator: Checkbox for multiple, Radio for single -->
                <input 
                  v-if="multiple"
                  type="checkbox" 
                  :checked="Boolean(selectedMap[file.id])" 
                  class="w-4 h-4 text-blue-600 rounded-md border-slate-300 focus:ring-blue-500 cursor-pointer pointer-events-none shrink-0"
                >
                <input 
                  v-else
                  type="radio" 
                  name="vault-single-select"
                  :checked="Boolean(selectedMap[file.id])" 
                  class="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer pointer-events-none shrink-0"
                >
                <div class="relative shrink-0">
                  <div class="w-6 h-6 rounded-md bg-red-50 text-red-600 flex items-center justify-center font-bold text-[9px] border border-red-100">
                    PDF
                  </div>
                  <span 
                    v-if="file.isEncrypted" 
                    class="absolute -bottom-0.5 -right-0.5 bg-amber-500 text-white rounded-full p-0.5 shadow-2xs"
                    :title="t('badge_pwd_required')"
                  >
                    <Lock class="w-2 h-2" />
                  </span>
                </div>
                <div class="truncate min-w-0 flex-1">
                  <p class="text-xs font-semibold text-slate-800 truncate" :title="file.name">
                    {{ file.name }}
                  </p>
                  <p class="text-[10px] text-slate-400 font-mono">
                    {{ (file.size / 1024 / 1024).toFixed(2) }} MB • {{ formatDate(file.createdAt) }}
                  </p>
                </div>
              </div>

              <div class="flex items-center space-x-1.5 shrink-0 ml-2">
                <span 
                  v-if="file.isEncrypted" 
                  class="text-[9px] font-bold px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-md"
                >
                  🔒 {{ t('badge_pwd_required') }}
                </span>
                <span class="text-[10px] font-semibold text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-200/70">
                  {{ file.folderId === 'default' ? t('vault_default_folder') : getFolderName(file.folderId) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Pagination Controls Bar -->
          <div v-if="totalPages > 1" class="flex items-center justify-between pt-2 px-1 border-t border-slate-100 shrink-0 text-xs text-slate-500">
            <span class="text-[11px] text-slate-400 font-medium">
              {{ t('page_showing') }} {{ (currentPage - 1) * pageSize + 1 }}-{{ Math.min(currentPage * pageSize, filteredFiles.length) }} {{ t('page_of') }} {{ filteredFiles.length }} {{ t('page_items') }}
            </span>
            <div class="flex items-center space-x-1">
              <button 
                @click="currentPage--" 
                :disabled="currentPage === 1" 
                class="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer text-slate-600"
                :title="t('vault_page_prev')"
              >
                <ChevronLeft class="w-3.5 h-3.5" />
              </button>
              <span class="px-2 font-mono text-[11px] font-bold text-slate-700">
                {{ currentPage }} / {{ totalPages }}
              </span>
              <button 
                @click="currentPage++" 
                :disabled="currentPage >= totalPages" 
                class="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer text-slate-600"
                :title="t('vault_page_next')"
              >
                <ChevronRight class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Confirm Footer -->
      <div class="pt-3.5 border-t border-slate-100 flex items-center justify-between shrink-0 gap-3">
        <span class="text-xs text-slate-500">
          <template v-if="multiple">
            {{ t('picker_selected_count') || '已选择' }} 
            <strong class="text-blue-600 font-mono font-bold">{{ selectedCount }}</strong> 
            {{ t('page_items') || '个文件' }}
            <span v-if="selectedCount > 0" class="text-[11px] text-slate-400 ml-1">(支持跨页累加)</span>
          </template>
          <template v-else>
            <span v-if="selectedCount === 1" class="text-slate-700 font-medium truncate max-w-xs inline-block align-bottom">
              已选: <strong class="text-blue-600">{{ Object.values(selectedMap)[0]?.name }}</strong>
            </span>
            <span v-else class="text-slate-400">
              {{ t('picker_please_select_one') || '请点击选择一个 PDF 文件' }}
            </span>
          </template>
        </span>

        <div class="flex items-center space-x-2">
          <button 
            type="button" 
            @click="$emit('close')" 
            class="text-xs text-slate-500 hover:text-slate-800 font-semibold px-4 py-2 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            {{ t('btn_cancel') }}
          </button>
          <button 
            type="button" 
            @click="confirmSelection" 
            :disabled="selectedCount === 0 || isImporting"
            class="bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition flex items-center space-x-1.5 shadow-md hover:shadow-blue-600/25 disabled:opacity-50 cursor-pointer"
          >
            <span v-if="!isImporting">
              {{ multiple ? `${t('picker_btn_confirm') || '确认导入已选'} (${selectedCount})` : (t('picker_btn_confirm_single') || '确认导入此文件') }}
            </span>
            <span v-else>{{ t('loading') || '导入中...' }}</span>
            <Check v-if="!isImporting" class="w-3.5 h-3.5" />
            <Loader2 v-else class="w-3.5 h-3.5 animate-spin" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { 
  FolderLock, Search, Folder, FolderOpen, Inbox, FileCheck, 
  Lock, X, Check, Loader2, ChevronLeft, ChevronRight 
} from 'lucide-vue-next';
import { t } from '../i18n';
import { getFiles, getFolders } from '../utils/vaultDb';

const props = defineProps({
  isOpen: Boolean,
  multiple: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['close', 'select-files']);

const files = ref([]);
const folders = ref([]);
const activeFolderId = ref('all');
const searchQuery = ref('');
const selectedMap = ref({});
const isImporting = ref(false);

const currentPage = ref(1);
const pageSize = 7;

watch(() => props.isOpen, async (newVal) => {
  if (newVal) {
    selectedMap.value = {};
    searchQuery.value = '';
    activeFolderId.value = 'all';
    currentPage.value = 1;
    await loadVaultFiles();
  }
});

watch([activeFolderId, searchQuery], () => {
  currentPage.value = 1;
});

async function loadVaultFiles() {
  files.value = await getFiles({ folderId: 'all' });
  folders.value = await getFolders();
}

const filteredFiles = computed(() => {
  let list = files.value;

  if (activeFolderId.value !== 'all') {
    if (activeFolderId.value === 'export') {
      list = list.filter(f => f.category === 'export');
    } else {
      list = list.filter(f => f.folderId === activeFolderId.value);
    }
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter(f => f.name.toLowerCase().includes(q));
  }

  return list;
});

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(filteredFiles.value.length / pageSize));
});

const paginatedFiles = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return filteredFiles.value.slice(start, start + pageSize);
});

const selectedCount = computed(() => {
  return Object.values(selectedMap.value).filter(Boolean).length;
});

const isAllCurrentPageSelected = computed(() => {
  if (paginatedFiles.value.length === 0) return false;
  return paginatedFiles.value.every(f => selectedMap.value[f.id]);
});

function toggleFileSelect(file) {
  if (!props.multiple) {
    // Single selection mode
    selectedMap.value = { [file.id]: file };
    return;
  }
  // Multiple selection mode
  if (selectedMap.value[file.id]) {
    delete selectedMap.value[file.id];
  } else {
    selectedMap.value[file.id] = file;
  }
}

async function handleFileDoubleClick(file) {
  if (!props.multiple) {
    selectedMap.value = { [file.id]: file };
    await confirmSelection();
  }
}

function toggleSelectCurrentPage() {
  if (isAllCurrentPageSelected.value) {
    paginatedFiles.value.forEach(f => {
      delete selectedMap.value[f.id];
    });
  } else {
    paginatedFiles.value.forEach(f => {
      selectedMap.value[f.id] = f;
    });
  }
}

function getFolderName(folderId) {
  if (folderId === 'default') return t('vault_default_folder');
  const found = folders.value.find(f => f.id === folderId);
  return found ? found.name : t('vault_default_folder');
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

async function confirmSelection() {
  const chosenRecords = Object.values(selectedMap.value).filter(Boolean);
  if (chosenRecords.length === 0) return;

  isImporting.value = true;
  try {
    const preparedFiles = [];
    for (const rec of chosenRecords) {
      if (rec.blob) {
        const arrayBuffer = await rec.blob.arrayBuffer();
        const fileObj = new File([arrayBuffer], rec.name, { type: 'application/pdf' });
        // Attach source indicator & encryption flag
        fileObj.source = 'vault';
        fileObj.isEncrypted = Boolean(rec.isEncrypted);
        preparedFiles.push(fileObj);
      }
    }
    emit('select-files', preparedFiles);
    emit('close');
  } catch (err) {
    console.error('Failed to prepare vault files:', err);
  } finally {
    isImporting.value = false;
  }
}
</script>
