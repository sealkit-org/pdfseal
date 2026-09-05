<template>
  <div 
    v-if="isOpen" 
    class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
    @click.self="handleClose"
    @keydown.esc="handleClose"
  >
    <div class="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] p-5 sm:p-6 shadow-2xl border border-slate-100 flex flex-col relative animate-in zoom-in-95 duration-200 overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between pb-3.5 border-b border-slate-100 shrink-0">
        <div class="flex items-center space-x-2.5">
          <div class="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center font-bold shrink-0 shadow-md shadow-blue-500/20">
            <Send class="w-4 h-4" />
          </div>
          <div>
            <h3 class="font-extrabold text-slate-900 text-sm sm:text-base leading-tight flex items-center space-x-1.5">
              <span>{{ t('send_modal_title') || 'Seal End-to-End Encrypted Send' }}</span>
              <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-200/60 uppercase">E2EE</span>
            </h3>
            <p class="text-[11px] text-slate-400 font-medium mt-0.5">
              {{ t('send_modal_desc') || 'Zero-Knowledge E2EE · Burn-after-Reading Secure Transfer' }}
            </p>
          </div>
        </div>

        <button 
          @click="handleClose" 
          class="text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Body Content -->
      <div class="flex-1 overflow-y-auto py-3.5 space-y-4 pr-1">
        <!-- Target File Information Card -->
        <div class="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 flex items-center justify-between gap-3">
          <div class="flex items-center space-x-2.5 min-w-0">
            <div class="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
              <FileText class="w-4 h-4" />
            </div>
            <div class="min-w-0">
              <p class="text-xs font-bold text-slate-800 truncate" :title="fileData?.name">
                {{ fileData?.name || 'Document.pdf' }}
              </p>
              <p class="text-[10px] text-slate-400 font-medium mt-0.5">
                {{ formatBytes(fileData?.size || fileData?.arrayBuffer?.byteLength || 0) }} · {{ fileData?.pageCount || 1 }} {{ t('page_unit') || 'pages' }}
              </p>
            </div>
          </div>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
            {{ t('send_state_ready') || 'Ready' }}
          </span>
        </div>

        <!-- 💡 Zero-Knowledge Cryptographic Guarantee Card -->
        <div class="bg-blue-50/70 border border-blue-200/60 rounded-2xl p-3 text-[11px] text-blue-900 leading-relaxed space-y-1">
          <div class="flex items-center space-x-1.5 font-bold text-blue-700">
            <ShieldCheck class="w-3.5 h-3.5 shrink-0" />
            <span>{{ t('send_privacy_banner_title') || 'Zero-Knowledge Security Guarantee' }}</span>
          </div>
          <p class="text-blue-800/80 text-[10.5px]">
            {{ t('send_privacy_banner_desc') || 'Files are encrypted locally with AES-256 before leaving your browser. Decryption keys live solely in the generated link, making cloud decryption impossible.' }}
          </p>
        </div>

        <!-- ⚠️ File Size Limit Exceeded Warning (> 10 MB) -->
        <div v-if="isFileSizeOverLimit" class="bg-rose-50 border border-rose-200 rounded-2xl p-3 flex items-start space-x-2.5 text-rose-800 text-xs animate-in fade-in duration-150">
          <AlertTriangle class="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p class="font-bold">{{ t('send_err_size', 'File size exceeds 10 MB limit') }}</p>
            <p class="text-[10.5px] text-rose-700/80 mt-0.5">
              {{ t('send_err_size_desc', 'Current size is {size}. To ensure high-speed E2EE transfer and storage safety, the limit is 10 MB. Please use Split or Sanitize tools first.', {size: formatBytes(fileSize)}) }}
            </p>
          </div>
        </div>

        <!-- ⚠️ Watermark 85% Warning -->
        <div v-if="serviceWatermark === 'high_85'" class="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center space-x-2 text-amber-900 text-xs font-medium animate-in fade-in duration-150">
          <Flame class="w-4 h-4 text-amber-600 shrink-0" />
          <p class="text-[11px]">
            {{ t('send_warn_pool_85', 'Relay storage pool is over 85%. Entered Fast Turnover Protection Mode. Only 10-minute expiry is allowed.') }}
          </p>
        </div>

        <!-- 🚫 Watermark 95% Warning -->
        <div v-if="serviceWatermark === 'critical_95'" class="bg-rose-50 border border-rose-200 rounded-2xl p-3 flex items-start space-x-2.5 text-rose-800 text-xs animate-in fade-in duration-150">
          <AlertTriangle class="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p class="font-bold">{{ t('send_err_pool_95', 'Relay storage pool saturated (95%+)') }}</p>
            <p class="text-[10.5px] text-rose-700/80 mt-0.5">
              {{ t('send_err_pool_95_desc', 'Temporary storage pool has reached its limit. No new files can be sent. Please wait for existing files to expire or self-destruct.') }}
            </p>
          </div>
        </div>

        <!-- STEP 1: Configuration Form -->
        <div v-if="!shareResult" class="space-y-3.5">
          <!-- 1. Expiration TTL Setting -->
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span class="flex items-center space-x-1">
                <Clock class="w-3.5 h-3.5 text-blue-600" />
                <span>{{ t('send_expiration_title') || 'Expiration Period' }}</span>
              </span>
              <span class="text-[10px] text-slate-400 font-normal">{{ t('send_auto_purge') || 'Auto-purged after expiration' }}</span>
            </label>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button 
                v-for="opt in expirationOptions" 
                :key="opt.seconds"
                type="button"
                :disabled="serviceWatermark === 'high_85' && opt.seconds > 600"
                @click="selectedExpiration = opt.seconds"
                :class="[
                  'py-2 px-2 rounded-xl text-xs font-bold border transition text-center flex flex-col items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
                  selectedExpiration === opt.seconds
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                ]"
                :title="serviceWatermark === 'high_85' && opt.seconds > 600 ? t('send_pool_limit_hint', 'Pool over 85%, limited to 10 mins') : ''"
              >
                <span>{{ opt.label }}</span>
                <span :class="['text-[9px] font-normal mt-0.5', selectedExpiration === opt.seconds ? 'text-blue-100' : 'text-slate-400']">
                  {{ opt.sub }}
                </span>
              </button>
            </div>
          </div>

          <!-- 2. Independent Burn After Reading Option -->
          <div class="bg-amber-50/60 rounded-2xl p-3 border border-amber-200/70 flex items-start justify-between gap-3">
            <div class="flex items-start space-x-2.5">
              <div class="w-7 h-7 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                <Flame class="w-4 h-4" />
              </div>
              <div>
                <div class="flex items-center space-x-1.5">
                  <span class="text-xs font-bold text-slate-800">{{ t('send_burn_title') || 'Enable Burn-after-Reading' }}</span>
                  <span class="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-700">{{ t('send_badge_recommended', 'Recommended') }}</span>
                </div>
                <p class="text-[10.5px] text-slate-500 mt-0.5 leading-relaxed">
                  {{ t('send_burn_desc') || 'The file is physically destroyed after the recipient downloads it once.' }}
                </p>
              </div>
            </div>
            <label class="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input 
                type="checkbox" 
                v-model="burnAfterRead" 
                class="sr-only peer"
              >
              <div class="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          <!-- 3. Mandatory PIN / Password Protection Card -->
          <div class="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/80 space-y-2">
            <div class="flex items-center justify-between">
              <label class="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
                <Lock class="w-3.5 h-3.5 text-blue-600" />
                <span>{{ t('send_pin_label') || 'PIN / Access Password (Required)' }}</span>
                <span class="text-[10px] text-rose-500 font-bold">{{ t('send_badge_required', '*Required') }}</span>
              </label>
              <button 
                type="button" 
                @click="generateRandomPin" 
                class="text-[11px] text-blue-600 hover:text-blue-700 font-bold hover:underline cursor-pointer flex items-center space-x-1"
                :title="t('send_action_random_pin', 'Generate a random 6-digit PIN')"
              >
                <Sparkles class="w-3 h-3" />
                <span>{{ t('send_btn_random_pin') || 'Random PIN' }}</span>
              </button>
            </div>

            <div class="relative">
              <input 
                v-model="pinCode" 
                type="text" 
                maxlength="16"
                :placeholder="t('send_pin_placeholder') || 'Enter 4-16 digit PIN/password'"
                class="w-full text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-hidden tracking-widest placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-400"
              >
            </div>
            <div class="flex items-center justify-between text-[10px] text-slate-400">
              <span>{{ t('send_pin_tip') || 'Recipient must enter this PIN to decrypt locally' }}</span>
              <span class="font-mono" :class="isPinValid ? 'text-emerald-600 font-bold' : 'text-slate-400'">
                {{ pinCode.trim().length }}/16
              </span>
            </div>
          </div>
        </div>

        <!-- STEP 2: Encrypting Progress -->
        <div v-else-if="isEncrypting" class="py-8 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 class="w-8 h-8 text-blue-600 animate-spin" />
          <div>
            <p class="text-xs font-bold text-slate-800">{{ encryptStatusText }}</p>
            <p class="text-[10px] text-slate-400 mt-0.5">{{ t('send_status_hardware', 'Local Web Crypto hardware acceleration in progress') }}</p>
          </div>
        </div>

        <!-- STEP 3: Share Link Generated Success Card -->
        <div v-else class="space-y-3.5 animate-in fade-in zoom-in-95 duration-200">
          <div class="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3 flex items-center space-x-2.5 text-emerald-800">
            <CheckCircle2 class="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p class="text-xs font-bold">{{ t('send_success_title') || 'Encrypted! Secure Share Card Ready' }}</p>
              <p class="text-[10.5px] text-emerald-700/80 mt-0.5">{{ t('send_status_secure_link', 'The key is embedded in the link. No one can view the original file without it.') }}</p>
            </div>
          </div>

          <!-- Share Link Display & Quick Copy -->
          <div>
            <label class="block text-[11px] font-bold text-slate-700 mb-1">
              {{ t('send_share_link_label') || 'Zero-Knowledge Encrypted Link' }}
            </label>
            <div class="flex items-center space-x-1.5">
              <input 
                ref="shareInputRef"
                type="text" 
                readonly 
                :value="shareResult.fullUrl" 
                class="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 select-all outline-hidden"
              >
              <button 
                @click="copyUrlOnly"
                class="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 shrink-0 cursor-pointer shadow-md hover:shadow-blue-600/25"
              >
                <Copy class="w-3.5 h-3.5" />
                <span>{{ isCopied ? (t('copied') || 'Copied!') : (t('copy') || 'Copy') }}</span>
              </button>
            </div>
          </div>

          <!-- QR Code & Summary Details -->
          <div class="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 flex items-center justify-between gap-4">
            <!-- QR Canvas -->
            <div class="flex flex-col items-center shrink-0">
              <canvas ref="qrCanvasRef" class="w-24 h-24 rounded-lg bg-white p-1 border border-slate-200/80"></canvas>
              <span class="text-[9px] text-slate-400 font-medium mt-1">{{ t('send_qr_hint', 'Scan to open on mobile') }}</span>
            </div>

            <!-- Parameters Summary List -->
            <div class="flex-1 min-w-0 space-y-1.5 text-[11px]">
              <div class="flex items-center justify-between text-slate-600">
                <span class="text-slate-400">{{ t('send_summary_strategy') || 'Destruction' }}:</span>
                <span class="font-bold text-slate-800 text-right">
                  {{ formatExpiresLabel(shareResult.expiresAt) }}
                  <span v-if="shareResult.burnAfterRead" class="block text-[10px] text-amber-600">🔥 {{ t('send_burn_badge', 'Burn After Read') }}</span>
                </span>
              </div>
              <div class="flex items-center justify-between text-slate-600">
                <span class="text-slate-400">{{ t('send_summary_pin') || 'Access PIN' }}:</span>
                <span class="font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-200">
                  {{ shareResult.pin }}
                </span>
              </div>
              <div class="flex items-center justify-between text-slate-600">
                <span class="text-slate-400">{{ t('send_summary_mode') || 'Encryption' }}:</span>
                <span class="font-bold text-slate-800">AES-256 + PBKDF2</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Buttons -->
      <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
        <button 
          v-if="shareResult"
          @click="resetModal"
          class="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
        >
          {{ t('send_btn_new') || 'Generate New' }}
        </button>
        <button 
          v-else
          @click="handleClose"
          class="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
        >
          {{ t('btn_cancel') || 'Cancel' }}
        </button>

        <div class="flex items-center space-x-2">
          <!-- Primary Action Button for STEP 1 -->
          <button 
            v-if="!shareResult"
            :disabled="isEncrypting || !isPinValid || isFileSizeOverLimit || serviceWatermark === 'critical_95'"
            @click="executeGenerateShare"
            class="bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition flex items-center space-x-1.5 shadow-md hover:shadow-blue-600/25 disabled:opacity-50 cursor-pointer"
          >
            <Loader2 v-if="isEncrypting" class="w-4 h-4 animate-spin" />
            <Sparkles v-else class="w-4 h-4" />
            <span>{{ isEncrypting ? t('send_btn_encrypting', 'Encrypting Locally...') : (t('send_btn_generate') || 'Encrypt Locally & Generate Link') }}</span>
          </button>

          <!-- Primary Action Button for STEP 3 (Copy Full Card) -->
          <button 
            v-else
            @click="copyFullShareCard"
            class="bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition flex items-center space-x-1.5 shadow-md hover:shadow-blue-600/25 cursor-pointer"
          >
            <ClipboardCheck class="w-4 h-4" />
            <span>{{ isFullCardCopied ? (t('copied_full_card') || 'Full card copied!') : (t('send_btn_copy_card') || 'Copy Full Share Card') }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { 
  Send, X, FileText, ShieldCheck, Lock, Copy, CheckCircle2, 
  Loader2, Sparkles, ClipboardCheck, Clock, Flame, AlertTriangle 
} from 'lucide-vue-next';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { t } from '../i18n';
import { generateSendKey, exportKeyUrlSafe, encryptFilePayload } from '../utils/cryptoSend';
import { uploadEncryptedPayload, fetchServiceStatus, MAX_FILE_BYTES } from '../utils/sendApi';
import { logger } from '../utils/logger';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  fileData: {
    type: Object,
    default: null // { name, arrayBuffer, size, pageCount }
  }
});

const emit = defineEmits(['close']);

// Expiration TTL Options
const expirationOptions = [
  { label: t('send_time_10m', '⏱️ 10 Mins'), sub: t('send_time_10m_sub', 'Short-lived'), seconds: 600 },
  { label: t('send_time_1h', '⏱️ 1 Hour'), sub: t('send_time_1h_sub', 'Temporary'), seconds: 3600 },
  { label: t('send_time_24h', '⏱️ 24 Hours'), sub: t('send_time_24h_sub', 'Daily Work'), seconds: 86400 },
  { label: t('send_time_7d', '⏱️ 7 Days'), sub: t('send_time_7d_sub', 'Maximum'), seconds: 604800 }
];

const selectedExpiration = ref(3600);
const burnAfterRead = ref(true);

// Service Watermark Status
const serviceWatermark = ref('normal'); // 'normal' | 'high_85' | 'critical_95'

// File Size Checking (10MB limit)
const fileSize = computed(() => {
  return props.fileData?.size || props.fileData?.arrayBuffer?.byteLength || 0;
});
const isFileSizeOverLimit = computed(() => {
  return fileSize.value > MAX_FILE_BYTES;
});

// Mandatory PIN / Password
const pinCode = ref('');
const isPinValid = computed(() => {
  const pin = pinCode.value.trim();
  return pin.length >= 4 && pin.length <= 16;
});

function generateRandomPin() {
  const digits = '0123456789';
  let pin = '';
  for (let i = 0; i < 6; i++) {
    pin += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  pinCode.value = pin;
}

const isEncrypting = ref(false);
const encryptStatusText = ref('');

const shareResult = ref(null);
const isCopied = ref(false);
const isFullCardCopied = ref(false);

const shareInputRef = ref(null);
const qrCanvasRef = ref(null);

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    resetModal();
  }
});

async function resetModal() {
  selectedExpiration.value = 3600;
  burnAfterRead.value = true;
  generateRandomPin();
  isEncrypting.value = false;
  shareResult.value = null;
  isCopied.value = false;
  isFullCardCopied.value = false;
  serviceWatermark.value = 'normal';

  // Check remote worker watermark & storage pool status
  try {
    const status = await fetchServiceStatus();
    if (status && status.watermark) {
      serviceWatermark.value = status.watermark;
      if (status.watermark === 'high_85') {
        selectedExpiration.value = 600; // Force 10-minute TTL
      }
    }
  } catch (e) {}
}

function handleClose() {
  resetModal();
  emit('close');
}

async function executeGenerateShare() {
  if (!props.fileData || !props.fileData.arrayBuffer) {
    alert('No file data available for sharing.');
    return;
  }

  if (!isPinValid.value) {
    alert(t('send_alert_pin', 'Please enter a 4-16 digit PIN.'));
    return;
  }

  isEncrypting.value = true;
  encryptStatusText.value = t('send_status_key', 'Generating 256-bit AES-GCM key locally...');

  try {
    // 1. Generate master key
    const masterKey = await generateSendKey();
    const keyUrlSafe = await exportKeyUrlSafe(masterKey);

    encryptStatusText.value = t('send_status_enc', 'Encrypting PDF binary data locally (AES-GCM + PBKDF2)...');
    await new Promise(r => setTimeout(r, 80));

    // 2. Encrypt locally in browser RAM with mandatory PIN
    const encryptedBytes = await encryptFilePayload(
      {
        arrayBuffer: props.fileData.arrayBuffer,
        name: props.fileData.name || 'Document.pdf',
        pageCount: props.fileData.pageCount || 1
      },
      masterKey,
      pinCode.value.trim()
    );

    encryptStatusText.value = t('send_status_push', 'Pushing ciphertext to relay endpoint...');
    
    // 3. Upload blind ciphertext to Cloudflare Worker / R2
    const uploadRes = await uploadEncryptedPayload({
      encryptedBytes,
      expirationSeconds: selectedExpiration.value,
      burnAfterRead: burnAfterRead.value,
      isPasswordProtected: true
    });

    // 4. Construct URL with key in #hash (Zero-knowledge: # is not sent over HTTP)
    const base = typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`.replace(/\/+$/, '')
      : 'https://pdfseal.com';
    const fullUrl = `${base}/#share=${uploadRes.id}&key=${keyUrlSafe}`;

    shareResult.value = {
      id: uploadRes.id,
      fullUrl,
      expiresAt: uploadRes.expiresAt,
      burnAfterRead: burnAfterRead.value,
      pin: pinCode.value.trim()
    };

    logger.info('SEND', `Generated zero-knowledge share link for ${props.fileData.name}`);

    // Trigger subtle confetti celebration
    try {
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
    } catch (e) {}

    // Render QR Code onto canvas
    nextTick(() => {
      if (qrCanvasRef.value) {
        QRCode.toCanvas(qrCanvasRef.value, fullUrl, {
          width: 96,
          margin: 1,
          color: { dark: '#0f172a', light: '#ffffff' }
        });
      }
    });

  } catch (err) {
    logger.error('SEND', `Failed to generate share link: ${err.message}`);
    alert('Failed to generate encrypted link: ' + err.message);
  } finally {
    isEncrypting.value = false;
  }
}

async function copyUrlOnly() {
  if (!shareResult.value?.fullUrl) return;
  try {
    await navigator.clipboard.writeText(shareResult.value.fullUrl);
    isCopied.value = true;
    setTimeout(() => { isCopied.value = false; }, 2500);
  } catch (e) {}
}

async function copyFullShareCard() {
  if (!shareResult.value?.fullUrl) return;
  const fileName = props.fileData?.name || 'Document.pdf';
  const expLabel = formatExpiresLabel(shareResult.value.expiresAt);
  const burnLabel = shareResult.value.burnAfterRead ? t('send_burn_label', '(🔥 Burn after read enabled)') : '';

  const fullText = t('send_copy_text', '【🦭 PDFSeal E2EE File Share】\n📄 File: {fileName}\n⏱️ Expiry: {expLabel} {burnLabel}\n🔑 PIN: {pin}\n🔗 Secure Link:\n{fullUrl}\n\n💡 Note: This file uses End-to-End Encryption (E2EE). The PIN and Key never leave your device. Keep them safe.', {fileName, expLabel, burnLabel, pin: shareResult.value.pin, fullUrl: shareResult.value.fullUrl});

  try {
    await navigator.clipboard.writeText(fullText);
    isFullCardCopied.value = true;
    setTimeout(() => { isFullCardCopied.value = false; }, 2500);
  } catch (e) {}
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatExpiresLabel(timestamp) {
  if (!timestamp) return t('send_exp_24h', '24 Hours');
  const diffHours = Math.round((timestamp - Date.now()) / (1000 * 3600));
  if (diffHours <= 1) return t('send_exp_1h', 'Within 1 hour');
  if (diffHours < 24) return t('send_exp_h', '{h} hours', {h: diffHours});
  const diffDays = Math.round(diffHours / 24);
  return t('send_exp_d', '{d} days', {d: diffDays});
}
</script>
