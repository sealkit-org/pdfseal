<template>
  <section class="max-w-4xl mx-auto w-full flex-1 flex flex-col items-stretch justify-center">
    <!-- Main Center Card -->
    <div class="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-xl border border-slate-100 flex flex-col relative overflow-hidden">
      <!-- Top Decorative Accent -->
      <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600"></div>

      <!-- Header -->
      <div class="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 pb-5 border-b border-slate-100 text-center sm:text-left">
        <div class="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-3.5">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center font-bold shrink-0 shadow-lg shadow-blue-500/20">
            <ShieldCheck class="w-6 h-6" />
          </div>
          <div>
            <h2 class="text-base sm:text-lg font-extrabold text-slate-900 leading-tight flex items-center justify-center sm:justify-start space-x-2">
              <span>{{ t('receive_title') || '海豹端到端加密安全提取' }}</span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">E2EE</span>
            </h2>
            <p class="text-xs text-slate-400 font-medium mt-1">
              {{ t('receive_subtitle') || '零知识本地内存解密 · 任何第三方均无法查看原件' }}
            </p>
          </div>
        </div>

        <!-- Back to Workspace Button -->
        <button 
          @click="$emit('exit-receive')"
          class="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition cursor-pointer"
        >
          {{ t('receive_btn_return_tools') || '返回 PDF 工具箱' }}
        </button>
      </div>

      <!-- State 1: Loading & Fetching Metadata -->
      <div v-if="isLoading" class="py-16 flex flex-col items-center justify-center text-center space-y-4">
        <Loader2 class="w-10 h-10 text-blue-600 animate-spin" />
        <div>
          <p class="text-sm font-bold text-slate-800">{{ t('receive_loading_info') || '正在从安全盲盒获取密文切片...' }}</p>
          <p class="text-xs text-slate-400 mt-1">正在校验客户端零知识密钥</p>
        </div>
      </div>

      <!-- State 2: Expired or Destroyed Error -->
      <div v-else-if="errorMessage" class="py-12 flex flex-col items-center justify-center text-center space-y-4">
        <div class="w-14 h-14 rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
          <Flame v-if="isBurned" class="w-7 h-7" />
          <AlertTriangle v-else class="w-7 h-7" />
        </div>
        <div class="max-w-md">
          <h3 class="text-base font-extrabold text-slate-900">
            {{ isBurned ? (t('receive_err_burned_title') || '该文件已阅后即焚销毁') : (t('receive_err_expired_title') || '文件不存在或已过期') }}
          </h3>
          <p class="text-xs text-slate-500 mt-1.5 leading-relaxed">
            {{ errorMessage }}
          </p>
        </div>
        <button 
          @click="$emit('exit-receive')"
          class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold px-6 py-2.5 rounded-xl transition shadow-md hover:shadow-blue-600/25 cursor-pointer mt-2"
        >
          {{ t('receive_btn_home') || '前往首页开始处理 PDF' }}
        </button>
      </div>

      <!-- State 3: Ready to Decrypt -->
      <div v-else class="py-6 space-y-6">
        <!-- File Info Card -->
        <div class="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="flex items-center space-x-3.5 min-w-0 w-full sm:w-auto">
            <div class="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
              <FileText class="w-6 h-6" />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-extrabold text-slate-900 truncate">
                {{ decryptedResult ? decryptedResult.name : (fileInfo ? `Encrypted_PDF_${fileInfo.id.substring(0, 8)}.pdf` : 'Encrypted Document') }}
              </p>
              <div class="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500 font-medium">
                <span>{{ formatBytes(decryptedResult ? decryptedResult.size : (fileInfo ? fileInfo.size : 0)) }}</span>
                <span v-if="decryptedResult">· {{ decryptedResult.pageCount }} {{ t('page_unit') || '页' }}</span>
                <span>·</span>
                <span class="font-mono text-emerald-600 font-bold">AES-256-GCM</span>
              </div>
            </div>
          </div>

          <!-- Strategy Status Badge -->
          <div class="flex items-center space-x-2 shrink-0">
            <span v-if="fileInfo?.burnAfterRead" class="flex items-center space-x-1 text-xs font-bold px-3 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-200 shadow-2xs">
              <Flame class="w-3.5 h-3.5" />
              <span>{{ t('receive_badge_burn') || '阅后即焚（下载后立即物理销毁）' }}</span>
            </span>
            <span v-else class="flex items-center space-x-1 text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-200 shadow-2xs">
              <Clock class="w-3.5 h-3.5" />
              <span>{{ formatExpiresLabel(fileInfo?.expiresAt) }}</span>
            </span>
          </div>
        </div>

        <!-- Password Input Form if required -->
        <div v-if="requiresPassword && !decryptedResult" class="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
          <div class="flex items-center space-x-2 text-amber-900 font-bold text-xs">
            <Lock class="w-4 h-4 text-amber-600" />
            <span>{{ t('receive_pin_required_title') || '此分享已设置提取密码保护' }}</span>
          </div>
          <div class="flex items-center space-x-2">
            <input 
              v-model="inputPassword" 
              type="password" 
              maxlength="16"
              :placeholder="t('receive_pin_input_placeholder') || '请输入提取密码/PIN码'"
              class="w-full text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-amber-500 outline-hidden tracking-widest placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-400"
              @keydown.enter="executeDecrypt"
            >
          </div>
          <p v-if="passwordError" class="text-xs text-rose-600 font-bold">
            {{ passwordError }}
          </p>
        </div>

        <!-- Decrypted Ready Success Notice -->
        <div v-if="decryptedResult" class="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex items-center space-x-3 text-emerald-900 animate-in fade-in duration-200">
          <CheckCircle2 class="w-5 h-5 text-emerald-600 shrink-0" />
          <div class="text-xs">
            <p class="font-bold">{{ t('receive_decrypted_ready_title') || '已在本地内存成功解密 PDF 原件！' }}</p>
            <p class="text-emerald-700/80 mt-0.5">您可以直接下载、在本地预览或一键存入您的海豹收纳箱。</p>
          </div>
        </div>

        <!-- Actions Toolbar -->
        <div class="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <!-- Main Decrypt & Download Action -->
          <button 
            v-if="!decryptedResult"
            :disabled="isDecrypting"
            @click="executeDecrypt"
            class="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-extrabold text-xs px-7 py-3 rounded-xl transition flex items-center justify-center space-x-2 shadow-lg hover:shadow-blue-600/25 disabled:opacity-50 cursor-pointer"
          >
            <Loader2 v-if="isDecrypting" class="w-4 h-4 animate-spin" />
            <Unlock v-else class="w-4 h-4" />
            <span>{{ isDecrypting ? (t('receive_state_decrypting') || '正在本地解密 (AES-256)...') : (t('receive_btn_decrypt_download') || '本地解密并下载 PDF') }}</span>
          </button>

          <!-- Post-Decryption Actions -->
          <template v-else>
            <!-- Preview Button -->
            <button 
              @click="openPreview"
              class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
            >
              <Eye class="w-4 h-4 text-slate-500" />
              <span>{{ t('vault_action_preview') || '本地安全预览' }}</span>
            </button>

            <!-- Save to Vault Button -->
            <button 
              @click="saveToMyVault"
              class="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-2xs"
            >
              <FolderLock class="w-4 h-4 text-indigo-600" />
              <span>{{ isSavedToVault ? (t('vault_saved') || '已存入收纳箱') : (t('receive_btn_save_vault') || '存入我的海豹收纳箱') }}</span>
            </button>

            <!-- Download Button -->
            <button 
              @click="triggerDecryptedDownload"
              class="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl transition flex items-center space-x-1.5 shadow-md hover:shadow-blue-600/25 cursor-pointer"
            >
              <Download class="w-4 h-4" />
              <span>{{ t('download') || '下载 PDF' }}</span>
            </button>
          </template>
        </div>
      </div>
    </div>

    <!-- Quick Preview Modal -->
    <VaultPreviewModal 
      :is-open="isPreviewOpen"
      :file="previewTargetFile"
      @close="isPreviewOpen = false"
      @download="triggerDecryptedDownload"
    />
  </section>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { 
  ShieldCheck, FileText, Lock, Unlock, Download, Eye, 
  FolderLock, Flame, Clock, AlertTriangle, CheckCircle2, Loader2 
} from 'lucide-vue-next';
import confetti from 'canvas-confetti';
import { t } from '../i18n';
import { triggerDownload } from '../utils/download';
import { importKeyUrlSafe, decryptFilePayload, isPayloadPasswordProtected } from '../utils/cryptoSend';
import { fetchPayloadInfo, downloadEncryptedPayload } from '../utils/sendApi';
import { saveFile } from '../utils/vaultDb';
import { logger } from '../utils/logger';
import VaultPreviewModal from '../components/VaultPreviewModal.vue';

const props = defineProps({
  shareId: {
    type: String,
    required: true
  },
  keyUrlSafe: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['exit-receive']);

const isLoading = ref(true);
const isDecrypting = ref(false);
const errorMessage = ref('');
const isBurned = ref(false);

const fileInfo = ref(null);
const requiresPassword = ref(false);
const inputPassword = ref('');
const passwordError = ref('');

const decryptedResult = ref(null);
const cachedEncryptedBytes = ref(null);
const isSavedToVault = ref(false);

const isPreviewOpen = ref(false);
const previewTargetFile = ref(null);

onMounted(async () => {
  await loadShareData();
});

watch(() => props.shareId, async () => {
  cachedEncryptedBytes.value = null;
  await loadShareData();
});

async function loadShareData() {
  if (!props.shareId || !props.keyUrlSafe) {
    errorMessage.value = '无效或不完整的解密链接（缺少密钥参数）。';
    isLoading.value = false;
    return;
  }

  isLoading.value = true;
  errorMessage.value = '';
  isBurned.value = false;
  decryptedResult.value = null;
  cachedEncryptedBytes.value = null;

  try {
    const info = await fetchPayloadInfo(props.shareId);
    fileInfo.value = info;
    requiresPassword.value = Boolean(info.isPasswordProtected);
    logger.info('RECEIVE', `Fetched share payload info for ${props.shareId}`);
  } catch (err) {
    logger.error('RECEIVE', `Failed to fetch payload info: ${err.message}`);
    if (err.message.includes('EXPIRED') || err.message.includes('DESTROYED')) {
      isBurned.value = true;
      errorMessage.value = '该文件已达到有效期限，或已被阅后即焚规则自动从云端物理抹除。';
    } else {
      errorMessage.value = '无法连接到中转盲盒或文件不存在。';
    }
  } finally {
    isLoading.value = false;
  }
}

async function executeDecrypt() {
  if (requiresPassword.value && !inputPassword.value.trim()) {
    passwordError.value = t('pwd_error_empty') || '请输入提取密码';
    return;
  }

  isDecrypting.value = true;
  passwordError.value = '';

  try {
    // 1. Download raw binary ciphertext (or reuse cached blob in current session if retrying PIN)
    if (!cachedEncryptedBytes.value) {
      cachedEncryptedBytes.value = await downloadEncryptedPayload(props.shareId);
    }
    const encryptedBytes = cachedEncryptedBytes.value;

    // 2. Import Master Key from URL hash
    const masterKey = await importKeyUrlSafe(props.keyUrlSafe);

    // 3. Decrypt in local browser memory
    const result = await decryptFilePayload(
      encryptedBytes, 
      masterKey, 
      inputPassword.value.trim()
    );

    decryptedResult.value = result;
    logger.info('RECEIVE', `Successfully decrypted payload locally: ${result.name}`);

    // Trigger celebration
    try {
      confetti({ particleCount: 35, spread: 50, origin: { y: 0.6 } });
    } catch (e) {}

    // Auto-trigger download
    triggerDecryptedDownload();

  } catch (err) {
    logger.error('RECEIVE', `Decryption failed: ${err.message}`);
    if (err.message === 'INVALID_PASSWORD') {
      passwordError.value = t('pwd_error_wrong') || '提取密码不正确，请重新输入';
    } else if (err.message.includes('EXPIRED') || err.message.includes('DESTROYED')) {
      isBurned.value = true;
      errorMessage.value = '该文件已阅后即焚销毁。';
    } else {
      passwordError.value = '解密失败：' + err.message;
    }
  } finally {
    isDecrypting.value = false;
  }
}

function triggerDecryptedDownload() {
  if (!decryptedResult.value) return;
  const blob = new Blob([decryptedResult.value.arrayBuffer], { type: 'application/pdf' });
  triggerDownload(blob, decryptedResult.value.name);
}

async function saveToMyVault() {
  if (!decryptedResult.value) return;
  try {
    await saveFile({
      name: decryptedResult.value.name,
      arrayBuffer: decryptedResult.value.arrayBuffer,
      folderId: 'default',
      category: 'upload',
      pageCount: decryptedResult.value.pageCount
    });
    isSavedToVault.value = true;
    logger.info('VAULT', `Saved decrypted share file to Vault: ${decryptedResult.value.name}`);
  } catch (e) {
    alert('Failed to save to vault: ' + e.message);
  }
}

function openPreview() {
  if (!decryptedResult.value) return;
  previewTargetFile.value = {
    name: decryptedResult.value.name,
    arrayBuffer: decryptedResult.value.arrayBuffer,
    blob: new Blob([decryptedResult.value.arrayBuffer], { type: 'application/pdf' }),
    pageCount: decryptedResult.value.pageCount,
    isEncrypted: false
  };
  isPreviewOpen.value = true;
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatExpiresLabel(timestamp) {
  if (!timestamp) return '24 小时内有效';
  const diffHours = Math.round((timestamp - Date.now()) / (1000 * 3600));
  if (diffHours <= 1) return '约 1 小时内有效';
  if (diffHours < 24) return `${diffHours} 小时内有效`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} 天内有效`;
}
</script>
