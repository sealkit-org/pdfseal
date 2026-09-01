<template>
  <section class="max-w-5xl mx-auto w-full flex-1 flex flex-col">
    <!-- Main Card Container matching Merge, Organize, Split, and Watermark tools -->
    <div class="bg-white rounded-3xl p-4 sm:p-6 shadow-xl border border-slate-100 flex flex-col flex-1">
      <!-- Integrated Header with Badge -->
      <div class="flex items-center justify-between pb-3 mb-2.5 border-b border-slate-100 shrink-0">
        <div class="flex items-center space-x-3">
          <div class="w-9 h-9 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold shadow-2xs">
            <ShieldCheck class="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 class="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
              {{ t('sanitize_title') }}
            </h2>
            <p class="text-xs text-slate-500 mt-0.5">
              {{ t('sanitize_desc') }}
            </p>
          </div>
        </div>

        <div class="hidden sm:flex items-center space-x-1.5 text-xs text-cyan-600 font-semibold bg-cyan-50/80 px-3 py-1.5 rounded-full border border-cyan-100 shadow-2xs">
          <Lock class="w-3.5 h-3.5" />
          <span>{{ t('processed_locally') || '纯浏览器本地内存处理' }}</span>
        </div>
      </div>

      <!-- State A: Empty State (Dual Source Dropzone: Local & Vault) -->
      <div 
        v-if="!docBytes"
        @dragover.prevent="isDragOver = true"
        @dragleave.prevent="isDragOver = false"
        @drop.prevent="onDrop"
        :class="[
          'border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition flex-1 flex flex-col items-center justify-center relative select-none',
          isDragOver ? 'border-cyan-500 bg-cyan-50/50' : 'border-slate-200/90 hover:border-cyan-400 bg-slate-50/40 hover:bg-slate-50/80'
        ]"
      >
        <input 
          ref="fileInputRef" 
          type="file" 
          accept="application/pdf" 
          class="hidden" 
          @change="onFileSelected" 
        >
        
        <div class="w-16 h-16 bg-cyan-50 text-cyan-600 rounded-3xl flex items-center justify-center mb-3 shadow-inner">
          <ShieldCheck class="w-8 h-8" />
        </div>
        
        <h3 class="text-base sm:text-lg font-bold text-slate-800">{{ t('sanitize_drop_title') }}</h3>
        <p class="text-xs text-slate-400 mt-1 max-w-sm">{{ t('sanitize_drop_subtitle') }}</p>
        
        <!-- Dual Source Selection Buttons -->
        <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button 
            type="button" 
            @click="fileInputRef.click()"
            class="bg-cyan-600 hover:bg-cyan-700 active:scale-98 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition flex items-center space-x-2 shadow-md hover:shadow-cyan-600/25 cursor-pointer"
          >
            <Plus class="w-4 h-4" />
            <span>{{ t('merge_btn_from_local') || '从电脑本地添加' }}</span>
          </button>
          
          <button 
            type="button" 
            @click="isVaultPickerOpen = true"
            class="bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center space-x-2 border border-slate-200 shadow-2xs hover:border-slate-300 cursor-pointer"
          >
            <FolderLock class="w-4 h-4 text-cyan-600" />
            <span>{{ t('merge_btn_from_vault') || '从海豹收纳箱挑选' }}</span>
          </button>
        </div>
      </div>

      <!-- State B: Active Document Workspace -->
      <div v-else class="flex-1 flex flex-col justify-between overflow-hidden">
        <!-- Top Toolbar & Status Bar -->
        <div class="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100 shrink-0">
          <div class="flex items-center space-x-2 min-w-0 flex-1">
            <span class="text-xs bg-cyan-50 text-cyan-700 font-extrabold px-2.5 py-1 rounded-lg border border-cyan-200 shrink-0">
              {{ totalPages }} {{ t('pages_label') || '页' }}
            </span>
            <span 
              :class="[
                'text-xs font-extrabold px-2.5 py-1 rounded-lg border shrink-0',
                leakingCount > 0 
                  ? 'bg-amber-50 text-amber-700 border-amber-200' 
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              ]"
            >
              {{ leakingCount > 0 ? `已检测出 ${leakingCount} 项元数据指纹` : '未发现明文元数据' }}
            </span>
            <span class="text-xs font-bold text-slate-700 truncate max-w-xs" :title="filename">
              {{ filename }}
            </span>
            <span 
              v-if="unlockedPassword" 
              class="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-bold flex items-center shrink-0"
            >
              <Unlock class="w-3 h-3 mr-0.5" />
              {{ t('badge_unlocked') || '已解密' }}
            </span>
          </div>

          <!-- Quick Action Buttons -->
          <div class="flex items-center space-x-1.5 sm:space-x-2">
            <!-- Choose Another Local File -->
            <button 
              @click="fileInputRef.click()"
              class="text-xs text-cyan-600 hover:bg-cyan-50 font-semibold px-2.5 py-1.5 rounded-xl border border-cyan-200 transition flex items-center space-x-1 cursor-pointer"
            >
              <RefreshCw class="w-3.5 h-3.5" />
              <span>{{ t('btn_choose_another') || '更换文件' }}</span>
            </button>

            <!-- Choose From Vault -->
            <button 
              @click="isVaultPickerOpen = true"
              class="text-xs text-slate-700 hover:bg-slate-100 font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 transition flex items-center space-x-1 cursor-pointer"
            >
              <FolderLock class="w-3.5 h-3.5 text-cyan-600" />
              <span>{{ t('merge_btn_from_vault') || '从收纳箱选取' }}</span>
            </button>

            <!-- Clear / Reset -->
            <button 
              @click="reset" 
              class="text-xs text-rose-600 hover:bg-rose-50 font-semibold px-2.5 py-1.5 rounded-xl transition cursor-pointer"
            >
              {{ t('btn_clear_all') || '清空' }}
            </button>
          </div>
        </div>

        <input 
          ref="fileInputRef" 
          type="file" 
          accept="application/pdf" 
          class="hidden" 
          @change="onFileSelected" 
        >

        <!-- Loading State -->
        <div v-if="isLoading" class="flex-1 flex flex-col items-center justify-center py-16 text-center text-xs text-slate-500 font-medium">
          <Loader2 class="w-8 h-8 animate-spin mx-auto mb-3 text-cyan-600" />
          <span>{{ t('rendering_pages') }}...</span>
        </div>

        <!-- Center Workspace: 2-Column Balanced Layout (Zero Scrollbars) -->
        <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-4 my-2.5 flex-1 items-stretch min-h-0 overflow-hidden">
          <!-- Left Column (7 cols on lg): Detected Metadata Fingerprints Table -->
          <div class="lg:col-span-7 bg-slate-50/80 rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 flex flex-col justify-between overflow-hidden">
            <div class="flex items-center justify-between border-b border-slate-200/70 pb-2 mb-2 shrink-0">
              <div class="flex items-center space-x-2 font-bold text-slate-800 text-xs">
                <FileText class="w-3.5 h-3.5 text-cyan-600" />
                <span>{{ t('detected_metadata') || '检测到的文档元数据指纹' }}</span>
              </div>
              <span class="text-[10px] text-slate-400 font-medium">
                {{ t('detected_subtitle') || '以下隐私属性已嵌入在源文件中' }}
              </span>
            </div>

            <!-- Metadata Key-Value Cards Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 overflow-y-auto pr-1">
              <div 
                v-for="item in metadataList" 
                :key="item.key"
                class="p-2.5 bg-white rounded-xl border border-slate-200/80 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition"
              >
                <div class="flex items-center justify-between mb-1">
                  <span class="text-slate-400 font-bold text-[10px] uppercase tracking-wider">{{ item.label }}</span>
                  <span 
                    v-if="item.isLeaking" 
                    class="text-[9px] bg-amber-50 text-amber-700 border border-amber-200/80 px-1.5 py-0.2 rounded-md font-bold flex items-center"
                  >
                    <AlertTriangle class="w-2.5 h-2.5 mr-0.5 text-amber-600" />
                    <span>存在指纹</span>
                  </span>
                  <span 
                    v-else 
                    class="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded-md font-medium"
                  >
                    空白
                  </span>
                </div>
                <div class="text-[11px] font-mono font-semibold break-all text-slate-800 select-all leading-tight">
                  {{ item.value }}
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column (5 cols on lg): Sanitization Audit & Privacy Shield -->
          <div class="lg:col-span-5 bg-cyan-50/60 rounded-2xl p-3.5 sm:p-4 border border-cyan-200/80 flex flex-col justify-between overflow-hidden min-h-0">
            <div>
              <div class="flex items-center space-x-1.5 font-bold text-cyan-900 text-xs border-b border-cyan-200/70 pb-2 mb-3">
                <Sparkles class="w-3.5 h-3.5 text-cyan-600" />
                <span>{{ t('what_will_be_stripped') || '脱敏清理清单与安全承诺' }}</span>
              </div>

              <!-- Clean Checklist -->
              <div class="space-y-2 text-xs text-cyan-900 font-medium">
                <div class="flex items-start space-x-2 bg-white/70 p-2 rounded-xl border border-cyan-100">
                  <CheckCircle2 class="w-3.5 h-3.5 text-cyan-600 shrink-0 mt-0.5" />
                  <span class="text-[11px] leading-tight">抹除文档标题、主题、关键词及作者姓名</span>
                </div>
                <div class="flex items-start space-x-2 bg-white/70 p-2 rounded-xl border border-cyan-100">
                  <CheckCircle2 class="w-3.5 h-3.5 text-cyan-600 shrink-0 mt-0.5" />
                  <span class="text-[11px] leading-tight">清除制作软件指纹 (Creator, Producer)</span>
                </div>
                <div class="flex items-start space-x-2 bg-white/70 p-2 rounded-xl border border-cyan-100">
                  <CheckCircle2 class="w-3.5 h-3.5 text-cyan-600 shrink-0 mt-0.5" />
                  <span class="text-[11px] leading-tight">擦除文档创建与修改时间戳线索</span>
                </div>
                <div class="flex items-start space-x-2 bg-white/70 p-2 rounded-xl border border-cyan-100">
                  <CheckCircle2 class="w-3.5 h-3.5 text-cyan-600 shrink-0 mt-0.5" />
                  <span class="text-[11px] leading-tight">剥离深层 XMP/XML 私有元数据流</span>
                </div>
              </div>
            </div>

            <!-- Guarantee Notice -->
            <div class="mt-3 pt-2.5 border-t border-cyan-200/70 text-[10px] text-cyan-800 leading-relaxed font-medium bg-cyan-100/40 p-2 rounded-xl">
              🛡️ <span class="font-bold">物理高保真脱敏：</span> 文档全部文字、图表、印章等正文内容 100% 保持原样，仅在本地内存彻底剔除元数据底层指纹。
            </div>
          </div>
        </div>

        <!-- Assembly Bottom Action & Export Configuration Bar -->
        <div class="pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <!-- Left: Output Filename & Auto-save Checkbox -->
          <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-1">
            <div class="relative min-w-0 sm:max-w-xs w-full">
              <input 
                v-model="customOutputBaseName"
                type="text" 
                :placeholder="t('vault_filename_placeholder') || '自定义导出文件名 (可选)'"
                class="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:bg-white outline-hidden font-medium transition placeholder:text-slate-400"
              >
            </div>

            <label class="flex items-center space-x-1.5 text-xs text-slate-600 font-semibold cursor-pointer select-none">
              <input 
                type="checkbox" 
                v-model="autoSaveToVault" 
                class="w-4 h-4 text-cyan-600 rounded-md border-slate-300 focus:ring-cyan-500 cursor-pointer"
              >
              <span>{{ t('vault_autosave_checkbox') || '处理后自动保存至收纳箱' }}</span>
            </label>
          </div>

          <!-- Right: Clear & Primary Action Button -->
          <div class="flex items-center space-x-2 shrink-0">
            <button 
              :disabled="isProcessing"
              @click="executeSanitize"
              class="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-700 active:scale-98 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl transition flex items-center justify-center space-x-2 shadow-md hover:shadow-cyan-600/25 disabled:opacity-50 cursor-pointer"
            >
              <Loader2 v-if="isProcessing" class="w-4 h-4 animate-spin" />
              <Download v-else class="w-4 h-4" />
              <span>{{ isProcessing ? (t('sealing_state') || '正在脱敏...') : (t('sanitize_and_download') || '一键脱敏并下载 PDF') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Password Unlock Modal -->
    <PasswordModal 
      :is-open="isPasswordOpen"
      :filename="pendingFileName"
      :error-message="passwordError"
      :is-unlocking="isUnlocking"
      @submit="handlePasswordSubmit"
      @cancel="handlePasswordCancel"
    />

    <!-- Vault File Picker Modal (Single-Select Mode) -->
    <VaultFilePickerModal 
      :is-open="isVaultPickerOpen"
      :multiple="false"
      @select-files="handleVaultFilesSelected"
      @close="isVaultPickerOpen = false"
    />
  </section>
</template>

<script setup>
import { ref, computed, watch, onMounted, onActivated } from 'vue';
import { 
  ShieldCheck, 
  Plus, 
  Download, 
  Loader2, 
  FolderLock, 
  Lock, 
  Unlock, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Sparkles 
} from 'lucide-vue-next';
import { PDFDocument, PDFName } from 'pdf-lib';
import { t } from '../i18n';
import { triggerDownload } from '../utils/download';
import { verifyPdfSecurity } from '../utils/pdfSecurity';
import { consumePendingFile } from '../utils/toolBridge';
import { saveFile } from '../utils/vaultDb';
import { userSettings } from '../utils/userSettings';
import { logger } from '../utils/logger';
import PasswordModal from '../components/PasswordModal.vue';
import VaultFilePickerModal from '../components/VaultFilePickerModal.vue';

const fileInputRef = ref(null);
const docBytes = ref(null);
const filename = ref('');
const totalPages = ref(0);
const rawMetadata = ref({});
const isDragOver = ref(false);
const isProcessing = ref(false);
const isLoading = ref(false);
const isVaultPickerOpen = ref(false);

const customOutputBaseName = ref('');
const autoSaveToVault = ref(userSettings.autoSaveToVault ?? true);

// Password State
const isPasswordOpen = ref(false);
const passwordError = ref('');
const isUnlocking = ref(false);
const pendingFileName = ref('');
let pendingFileObj = null;
let unlockedPassword = '';

const noneText = computed(() => t('none_value') || '(无)');

// Watch global autoSaveToVault setting
watch(
  () => userSettings.autoSaveToVault,
  (newVal) => {
    if (newVal !== undefined) {
      autoSaveToVault.value = newVal;
    }
  },
  { immediate: true }
);

// Metadata Attribute Items
const metadataList = computed(() => {
  const n = noneText.value;
  const raw = rawMetadata.value;
  return [
    { key: 'Title', label: 'Title / 标题', value: raw.Title || n, isLeaking: Boolean(raw.Title && raw.Title !== n) },
    { key: 'Author', label: 'Author / 作者', value: raw.Author || n, isLeaking: Boolean(raw.Author && raw.Author !== n) },
    { key: 'Subject', label: 'Subject / 主题', value: raw.Subject || n, isLeaking: Boolean(raw.Subject && raw.Subject !== n) },
    { key: 'Keywords', label: 'Keywords / 关键词', value: raw.Keywords || n, isLeaking: Boolean(raw.Keywords && raw.Keywords !== n) },
    { key: 'Creator', label: 'Creator / 创建软件', value: raw.Creator || n, isLeaking: Boolean(raw.Creator && raw.Creator !== n) },
    { key: 'Producer', label: 'Producer / 转换工具', value: raw.Producer || n, isLeaking: Boolean(raw.Producer && raw.Producer !== n) },
    { key: 'Creation Date', label: 'Creation / 创建时间', value: raw['Creation Date'] || n, isLeaking: Boolean(raw['Creation Date'] && raw['Creation Date'] !== n) },
    { key: 'Modification Date', label: 'ModDate / 修改时间', value: raw['Modification Date'] || n, isLeaking: Boolean(raw['Modification Date'] && raw['Modification Date'] !== n) }
  ];
});

const leakingCount = computed(() => {
  return metadataList.value.filter(item => item.isLeaking).length;
});

function onFileSelected(e) {
  const file = e.target.files[0];
  if (file) loadFile(file);
  e.target.value = '';
}

function onDrop(e) {
  isDragOver.value = false;
  const file = e.dataTransfer.files[0];
  if (file && file.type === 'application/pdf') loadFile(file);
}

function handleVaultFilesSelected(selectedFiles) {
  if (selectedFiles && selectedFiles.length > 0) {
    loadFile(selectedFiles[0]);
  }
}

async function loadFile(file, password = '') {
  isLoading.value = true;
  pendingFileName.value = file.name;
  pendingFileObj = file;
  try {
    const rawBytes = await file.arrayBuffer();

    // Strict encryption check
    const security = await verifyPdfSecurity(rawBytes, password);
    if (security.isEncrypted && !security.isValid) {
      isUnlocking.value = false;
      docBytes.value = null;
      isPasswordOpen.value = true;
      if (password) {
        passwordError.value = t('pwd_error_wrong');
      }
      return;
    }

    const pdfDoc = await PDFDocument.load(rawBytes, {
      password: password || undefined,
      ignoreEncryption: true,
      updateMetadata: false
    });
    pdfDoc.updateMetadata = false;
    
    docBytes.value = new Uint8Array(rawBytes);
    filename.value = file.name;
    totalPages.value = pdfDoc.getPageCount();
    unlockedPassword = password;
    isPasswordOpen.value = false;
    passwordError.value = '';

    const prefix = userSettings.defaultExportPrefix || 'PDFSeal';
    const baseWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    customOutputBaseName.value = `${prefix}_Sanitized_${baseWithoutExt}`;

    const n = noneText.value;
    let title = '';
    let author = '';
    let subject = '';
    let keywords = '';
    let producer = '';
    let creator = '';
    let creationDate = '';
    let modDate = '';

    const infoRef = pdfDoc.context.trailerInfo?.Info;
    if (infoRef) {
      const infoDict = pdfDoc.context.lookup(infoRef);
      if (infoDict && infoDict.get) {
        const tVal = infoDict.get(PDFName.of('Title'));
        const aVal = infoDict.get(PDFName.of('Author'));
        const sVal = infoDict.get(PDFName.of('Subject'));
        const kVal = infoDict.get(PDFName.of('Keywords'));
        const pVal = infoDict.get(PDFName.of('Producer'));
        const cVal = infoDict.get(PDFName.of('Creator'));
        const cdVal = infoDict.get(PDFName.of('CreationDate'));
        const mdVal = infoDict.get(PDFName.of('ModDate'));

        if (tVal && tVal.decodeText) title = tVal.decodeText();
        if (aVal && aVal.decodeText) author = aVal.decodeText();
        if (sVal && sVal.decodeText) subject = sVal.decodeText();
        if (kVal && kVal.decodeText) keywords = kVal.decodeText();
        if (pVal && pVal.decodeText) producer = pVal.decodeText();
        if (cVal && cVal.decodeText) creator = cVal.decodeText();
        if (cdVal && cdVal.decodeText) creationDate = cdVal.decodeText();
        if (mdVal && mdVal.decodeText) modDate = mdVal.decodeText();
      }
    }

    rawMetadata.value = {
      'Title': title && title.trim() ? title.trim() : n,
      'Author': author && author.trim() ? author.trim() : n,
      'Subject': subject && subject.trim() ? subject.trim() : n,
      'Keywords': keywords && keywords.trim() ? keywords.trim() : n,
      'Producer': producer && producer.trim() ? producer.trim() : n,
      'Creator': creator && creator.trim() ? creator.trim() : n,
      'Creation Date': creationDate && creationDate.trim() ? creationDate.trim() : n,
      'Modification Date': modDate && modDate.trim() ? modDate.trim() : n
    };

    logger.info('SANITIZE', `Inspected PDF metadata: ${file.name} (pages: ${totalPages.value})`);
  } catch (err) {
    if (err.message?.toLowerCase().includes('password') || err.message?.toLowerCase().includes('encrypt')) {
      docBytes.value = null;
      isPasswordOpen.value = true;
      if (password) {
        passwordError.value = t('pwd_error_wrong');
      }
    } else {
      logger.error('SANITIZE', `Failed to inspect metadata: ${err.message}`);
      alert('Failed to inspect metadata: ' + err.message);
    }
  } finally {
    isLoading.value = false;
    isUnlocking.value = false;
  }
}

async function handlePasswordSubmit(pwd) {
  if (!pendingFileObj) return;
  isUnlocking.value = true;
  await loadFile(pendingFileObj, pwd);
}

function handlePasswordCancel() {
  isPasswordOpen.value = false;
  passwordError.value = '';
  pendingFileObj = null;
  docBytes.value = null;
  unlockedPassword = '';
}

function reset() {
  docBytes.value = null;
  filename.value = '';
  totalPages.value = 0;
  rawMetadata.value = {};
  unlockedPassword = '';
  pendingFileObj = null;
}

async function executeSanitize() {
  if (!docBytes.value) return;
  isProcessing.value = true;
  try {
    const pdfDoc = await PDFDocument.load(docBytes.value, {
      password: unlockedPassword || undefined,
      ignoreEncryption: !unlockedPassword,
      updateMetadata: false
    });
    pdfDoc.updateMetadata = false;

    // 1. Physically delete all fields from Info dictionary and remove from context
    try {
      const infoRef = pdfDoc.context.trailerInfo?.Info;
      if (infoRef) {
        const infoDict = pdfDoc.context.lookup(infoRef);
        if (infoDict && infoDict.delete) {
          infoDict.delete(PDFName.of('Title'));
          infoDict.delete(PDFName.of('Author'));
          infoDict.delete(PDFName.of('Subject'));
          infoDict.delete(PDFName.of('Keywords'));
          infoDict.delete(PDFName.of('Creator'));
          infoDict.delete(PDFName.of('Producer'));
          infoDict.delete(PDFName.of('CreationDate'));
          infoDict.delete(PDFName.of('ModDate'));
          infoDict.delete(PDFName.of('Trapped'));
          infoDict.delete(PDFName.of('PTEX.Fullbanner'));
          infoDict.delete(PDFName.of('GTS_PDFXVersion'));
        }
        pdfDoc.context.delete(infoRef);
      }
      if (pdfDoc.context.trailerInfo) {
        delete pdfDoc.context.trailerInfo.Info;
      }
    } catch (infoErr) {
      console.warn('Info dict strip warning:', infoErr);
    }

    // 2. Clear standard document information getters/setters
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('');
    pdfDoc.setCreator('');

    // 3. Strip deep XMP metadata streams and piece info from Catalog
    try {
      const catalog = pdfDoc.catalog;
      const metadataKey = PDFName.of('Metadata');
      if (catalog && catalog.has(metadataKey)) {
        catalog.delete(metadataKey);
      }
      const pieceInfoKey = PDFName.of('PieceInfo');
      if (catalog && catalog.has(pieceInfoKey)) {
        catalog.delete(pieceInfoKey);
      }
    } catch (xmpErr) {
      console.warn('XMP metadata stream strip notice:', xmpErr);
    }

    const outBytes = await pdfDoc.save();
    let outName = (customOutputBaseName.value.trim() || `PDFSeal_Sanitized_${Date.now()}`);
    if (!outName.toLowerCase().endsWith('.pdf')) {
      outName += '.pdf';
    }

    triggerDownload(new Blob([outBytes], { type: 'application/pdf' }), outName);
    logger.info('SANITIZE', `PDF sanitized and downloaded: ${outName}`);

    // Auto-save to Vault if checked
    if (autoSaveToVault.value) {
      await saveFile({
        name: outName,
        arrayBuffer: outBytes,
        folderId: 'default',
        category: 'export',
        pageCount: totalPages.value
      });
      logger.info('VAULT', `Sanitized result auto-saved to Vault: ${outName}`);
    }
  } catch (err) {
    logger.error('SANITIZE', `Failed to sanitize PDF: ${err.message}`);
    alert('Failed to sanitize PDF: ' + err.message);
  } finally {
    isProcessing.value = false;
  }
}

function checkIncomingFile() {
  const incoming = consumePendingFile('sanitize');
  if (incoming) {
    const file = new File([incoming.arrayBuffer], incoming.name, { type: 'application/pdf' });
    loadFile(file);
  }
}

onMounted(checkIncomingFile);
</script>
