<template>
  <div 
    v-if="isOpen" 
    class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
    @click.self="$emit('cancel')"
  >
    <div class="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-200">
      <!-- Close Button -->
      <button 
        @click="$emit('cancel')" 
        class="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition"
      >
        <X class="w-5 h-5" />
      </button>

      <!-- Lock Header -->
      <div class="flex items-center space-x-3 mb-4 pb-3 border-b border-slate-100">
        <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0 shadow-xs">
          <LockKeyhole class="w-6 h-6" />
        </div>
        <div class="truncate">
          <h3 class="font-extrabold text-slate-900 text-base sm:text-lg truncate">{{ t('pwd_modal_title') }}</h3>
          <p class="text-xs text-slate-500 truncate font-mono">{{ filename }}</p>
        </div>
      </div>

      <!-- Description & Form -->
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <p class="text-xs text-slate-600 leading-relaxed">
          {{ t('pwd_modal_desc') }}
        </p>

        <!-- Password Input -->
        <div class="relative">
          <input 
            ref="passwordInputRef"
            :type="showPassword ? 'text' : 'password'" 
            v-model="password" 
            :placeholder="t('pwd_input_placeholder')"
            class="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl pl-3 pr-10 py-3 focus:ring-2 focus:ring-amber-500 focus:bg-white outline-hidden font-medium transition"
            autofocus
          >
          <button 
            type="button" 
            @click="showPassword = !showPassword"
            class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
          >
            <EyeOff v-if="showPassword" class="w-4 h-4" />
            <Eye v-else class="w-4 h-4" />
          </button>
        </div>

        <!-- Error Message -->
        <div v-if="errorMessage" class="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center space-x-1.5 animate-shake">
          <AlertCircle class="w-4 h-4 shrink-0" />
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Security Privacy Guarantee -->
        <div class="p-2.5 bg-emerald-50/80 border border-emerald-200/70 rounded-xl text-[11px] text-emerald-800 font-medium flex items-center space-x-1.5">
          <span>{{ t('pwd_modal_privacy_hint') }}</span>
        </div>

        <!-- Action Buttons -->
        <div class="pt-2 flex items-center space-x-2.5">
          <button 
            type="button" 
            @click="$emit('cancel')" 
            class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-3 rounded-xl transition"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            :disabled="!password || isUnlocking"
            class="flex-2 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white text-xs font-bold py-3 rounded-xl transition flex items-center justify-center space-x-1.5 shadow-md hover:shadow-amber-600/25 disabled:opacity-50"
          >
            <span v-if="!isUnlocking">{{ t('btn_unlock_pdf') }}</span>
            <span v-else>Unlocking...</span>
            <Unlock v-if="!isUnlocking" class="w-4 h-4" />
            <Loader2 v-else class="w-4 h-4 animate-spin" />
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';
import { LockKeyhole, Eye, EyeOff, AlertCircle, Unlock, Loader2, X } from 'lucide-vue-next';
import { t } from '../i18n';

const props = defineProps({
  isOpen: Boolean,
  filename: String,
  errorMessage: String,
  isUnlocking: Boolean
});

const emit = defineEmits(['submit', 'cancel']);

const password = ref('');
const showPassword = ref(false);
const passwordInputRef = ref(null);

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    password.value = '';
    showPassword.value = false;
    nextTick(() => {
      passwordInputRef.value?.focus();
    });
  }
});

function handleSubmit() {
  if (!password.value) return;
  emit('submit', password.value);
}
</script>
