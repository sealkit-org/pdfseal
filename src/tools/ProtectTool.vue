<template>
  <section class="w-full flex-1 flex flex-col">
    <!-- Main Assembly Container -->
    <div class="bg-white rounded-3xl p-5 sm:p-7 shadow-xl border border-slate-100 flex flex-col flex-1">
      <!-- Top Title Header -->
      <div class="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0 shadow-2xs">
            <Lock class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
              {{ t('protect_title') }}
            </h2>
            <p class="text-xs text-slate-400 font-medium hidden sm:block mt-0.5">
              {{ t('protect_desc') }}
            </p>
          </div>
        </div>
      </div>

      <!-- 1. EMPTY STATE DROPZONE (Dual-Source Import: Computer & Vault) -->
      <div 
        v-if="!docBytes"
        @dragover.prevent="isDragOver = true"
        @dragleave.prevent="isDragOver = false"
        @drop.prevent="onDrop"
        :class="[
          'flex-1 border-2 border-dashed rounded-3xl p-8 sm:p-14 text-center transition flex flex-col items-center justify-center my-4',
          isDragOver ? 'border-rose-500 bg-rose-50/50 scale-[0.99]' : 'border-slate-200 hover:border-rose-400 bg-slate-50/50'
        ]"
      >
        <input 
          ref="fileInputRef" 
          type="file" 
          accept="application/pdf" 
          class="hidden" 
          @change="onFileSelected" 
        >

        <div class="w-16 h-16 bg-rose-100/60 text-rose-600 rounded-3xl flex items-center justify-center mb-4 shadow-sm">
          <Lock class="w-8 h-8" />
        </div>
        <h3 class="text-base sm:text-lg font-bold text-slate-800">
          {{ t('protect_drop_title') }}
        </h3>
        <p class="text-xs text-slate-400 mt-1 max-w-sm">
          {{ t('protect_drop_subtitle') }}
        </p>

        <!-- Dual-Source Action Buttons -->
        <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button 
            type="button" 
            @click="fileInputRef.click()"
            class="bg-rose-600 hover:bg-rose-700 active:scale-98 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition flex items-center space-x-2 shadow-md hover:shadow-rose-600/25 cursor-pointer"
          >
            <Plus class="w-4 h-4" />
            <span>{{ t('merge_btn_from_local') || 'Add from Computer' }}</span>
          </button>

          <button 
            type="button" 
            @click="isVaultPickerOpen = true"
            class="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-slate-400 text-xs font-bold px-5 py-2.5 rounded-xl transition flex items-center space-x-2 shadow-2xs cursor-pointer"
          >
            <FolderLock class="w-4 h-4 text-rose-600" />
            <span>{{ t('merge_btn_from_vault') || 'Pick from Vault' }}</span>
          </button>
        </div>
      </div>

      <!-- 2. ACTIVE WORKSPACE -->
      <div v-else class="flex-1 flex flex-col justify-between pt-4">
        <div class="space-y-4">
          <!-- File Summary Card -->
          <div class="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/80">
            <div class="flex items-center space-x-3 min-w-0">
              <div class="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs shrink-0">
                PDF
              </div>
              <div class="min-w-0">
                <p class="text-xs font-bold text-slate-800 truncate max-w-xs sm:max-w-md" :title="filename">
                  {{ filename }}
                </p>
                <div class="flex items-center space-x-2 text-[11px] text-slate-400 font-mono mt-0.5">
                  <span class="font-bold text-slate-600">{{ originalSizeFormatted }}</span>
                  <span>•</span>
                  <span>{{ totalPages }} {{ t('pages_label') || 'pages' }}</span>
                  <span v-if="alreadyEncrypted" class="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                    {{ t('protect_badge_already_encrypted') }}
                  </span>
                </div>
              </div>
            </div>

            <button 
              @click="reset" 
              class="text-xs text-slate-500 hover:text-slate-800 font-semibold px-2.5 py-1.5 rounded-xl hover:bg-slate-200/60 transition cursor-pointer"
            >
              {{ t('btn_reset_file') || 'Reset / Change File' }}
            </button>
          </div>

          <!-- Quick Security Presets -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                <Sparkles class="w-3.5 h-3.5 text-rose-600" />
                <span>{{ t('protect_preset_title') }}</span>
              </span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <!-- Preset 1: Strict Confidential -->
              <button 
                type="button"
                @click="applyPreset('confidential')"
                :class="[
                  'p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between',
                  activePreset === 'confidential' ? 'bg-rose-50/80 border-rose-500 ring-2 ring-rose-500/20 shadow-xs' : 'bg-white border-slate-200/80 hover:border-rose-300 hover:bg-slate-50/50'
                ]"
              >
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs font-bold text-slate-800 flex items-center space-x-1">
                    <span>🛡️</span>
                    <span>{{ t('protect_preset_confidential') }}</span>
                  </span>
                  <span class="text-[10px] font-mono text-rose-600 font-bold">{{ t('protect_badge_confidential') }}</span>
                </div>
                <p class="text-[11px] text-slate-400 leading-tight">
                  {{ t('protect_mode_open') }} + {{ t('protect_mode_owner') }}
                </p>
              </button>

              <!-- Preset 2: Read-Only Distribution -->
              <button 
                type="button"
                @click="applyPreset('readonly')"
                :class="[
                  'p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between',
                  activePreset === 'readonly' ? 'bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs' : 'bg-white border-slate-200/80 hover:border-indigo-300 hover:bg-slate-50/50'
                ]"
              >
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs font-bold text-slate-800 flex items-center space-x-1">
                    <span>📄</span>
                    <span>{{ t('protect_preset_readonly') }}</span>
                  </span>
                  <span class="text-[10px] font-mono text-indigo-600 font-bold">{{ t('protect_badge_readonly') }}</span>
                </div>
                <p class="text-[11px] text-slate-400 leading-tight">
                  {{ t('protect_perm_copying') }}: ❌ | {{ t('protect_perm_printing') }}: ❌
                </p>
              </button>

              <!-- Preset 3: Forms & Signing Only -->
              <button 
                type="button"
                @click="applyPreset('forms')"
                :class="[
                  'p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between',
                  activePreset === 'forms' ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs' : 'bg-white border-slate-200/80 hover:border-emerald-300 hover:bg-slate-50/50'
                ]"
              >
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs font-bold text-slate-800 flex items-center space-x-1">
                    <span>✍️</span>
                    <span>{{ t('protect_preset_forms') }}</span>
                  </span>
                  <span class="text-[10px] font-mono text-emerald-600 font-bold">{{ t('protect_badge_sign_only') }}</span>
                </div>
                <p class="text-[11px] text-slate-400 leading-tight">
                  {{ t('protect_perm_annotating') }}: ✔️ | {{ t('protect_perm_modifying') }}: ❌
                </p>
              </button>
            </div>
          </div>

          <!-- Configuration Grid (Left: Passwords, Right: Permissions & Algorithm) -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Left: Passwords Configuration -->
            <div class="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/80 space-y-3.5 flex flex-col justify-between">
              
              <!-- SCENARIO A: Strict Confidential Preset -->
              <div v-if="activePreset === 'confidential'" class="space-y-3">
                <!-- Section 1: Open Password -->
                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <label class="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                      <Key class="w-3.5 h-3.5 text-rose-600" />
                      <span>{{ t('protect_mode_open') }}</span>
                    </label>
                    <span class="text-[10px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full font-bold border border-rose-200/60">{{ t('protect_tag_user_pwd') }}</span>
                  </div>
                  
                  <div class="relative">
                    <input 
                      v-model="userPassword"
                      :type="showUserPassword ? 'text' : 'password'"
                      :placeholder="t('protect_open_pwd_placeholder')"
                      class="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2.5 pr-10 focus:ring-2 focus:ring-rose-500 outline-hidden font-medium text-slate-800 shadow-2xs"
                    >
                    <button 
                      type="button" 
                      @click="showUserPassword = !showUserPassword"
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <Eye v-if="!showUserPassword" class="w-4 h-4" />
                      <EyeOff v-else class="w-4 h-4" />
                    </button>
                  </div>

                  <!-- Smallpdf Password Strength Meter for Open Password -->
                  <div v-if="userPassword" class="animate-in fade-in duration-200 pt-0.5">
                    <div class="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div :class="['h-full transition-all duration-300 rounded-full', userPasswordStrength.widthClass]"></div>
                    </div>
                    <div class="flex justify-between items-center text-[10px] mt-1 text-slate-500">
                      <span>{{ t('protect_pwd_strength_label') }}: <strong :class="userPasswordStrength.color">{{ userPasswordStrength.label }}</strong></span>
                    </div>
                  </div>

                  <!-- Confirm Open Password -->
                  <div v-if="userPassword" class="space-y-1 animate-in fade-in duration-150">
                    <div class="relative">
                      <input 
                        v-model="confirmUserPassword"
                        :type="showUserPassword ? 'text' : 'password'"
                        :placeholder="t('protect_confirm_pwd_placeholder')"
                        :class="[
                          'w-full text-xs bg-white border rounded-xl px-3 py-2.5 pr-10 outline-hidden font-medium text-slate-800 shadow-2xs transition-colors',
                          confirmUserPassword 
                            ? (confirmUserPassword === userPassword ? 'border-emerald-400 focus:ring-2 focus:ring-emerald-500' : 'border-rose-400 focus:ring-2 focus:ring-rose-500')
                            : 'border-slate-300 focus:ring-2 focus:ring-rose-500'
                        ]"
                      >
                      <span v-if="confirmUserPassword && userPassword === confirmUserPassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 text-xs font-bold">
                        ✓
                      </span>
                      <span v-else-if="confirmUserPassword && userPassword !== confirmUserPassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-rose-500 text-xs font-bold">
                        ✕
                      </span>
                    </div>

                    <!-- Real-time Matching Feedback -->
                    <div v-if="confirmUserPassword" class="flex items-center space-x-1 text-[11px] font-medium pt-0.5 animate-in fade-in duration-150">
                      <span v-if="userPassword === confirmUserPassword" class="text-emerald-600 flex items-center space-x-1">
                        <span>✓</span>
                        <span>{{ t('protect_pwd_matched') }}</span>
                      </span>
                      <span v-else class="text-rose-500 flex items-center space-x-1">
                        <span>✕</span>
                        <span>{{ t('protect_pwd_mismatched') }}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Apple Pattern: Single Password Sync Toggle -->
                <div class="pt-2 border-t border-slate-200/60">
                  <label class="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      v-model="useSamePassword"
                      class="w-4 h-4 rounded text-rose-600 border-slate-300 focus:ring-rose-500 cursor-pointer"
                    >
                    <span class="font-medium text-slate-800">{{ t('protect_use_same_pwd') }}</span>
                  </label>
                </div>

                <!-- Owner / Management Password (Shown only if NOT using same password) -->
                <div v-if="!useSamePassword" class="space-y-2 pt-2 border-t border-slate-200/60 animate-in fade-in duration-200">
                  <div class="flex items-center justify-between">
                    <label class="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                      <ShieldAlert class="w-3.5 h-3.5 text-indigo-600" />
                      <span>{{ t('protect_mode_owner') }}</span>
                    </label>
                    <span class="text-[10px] text-slate-400 font-medium">{{ t('protect_tag_owner_pwd') }}</span>
                  </div>

                  <p class="text-[11px] text-slate-500 leading-tight">
                    {{ t('protect_owner_pwd_hint') }}
                  </p>

                  <div class="relative">
                    <input 
                      v-model="ownerPassword"
                      :type="showOwnerPassword ? 'text' : 'password'"
                      :placeholder="t('protect_owner_pwd_placeholder')"
                      class="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2.5 pr-10 focus:ring-2 focus:ring-indigo-500 outline-hidden font-medium text-slate-800 shadow-2xs"
                    >
                    <button 
                      type="button"
                      @click="showOwnerPassword = !showOwnerPassword"
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <Eye v-if="!showOwnerPassword" class="w-4 h-4" />
                      <EyeOff v-else class="w-4 h-4" />
                    </button>
                  </div>

                  <!-- Smallpdf Password Strength Meter for Separate Owner Password -->
                  <div v-if="ownerPassword" class="animate-in fade-in duration-200 pt-0.5">
                    <div class="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div :class="['h-full transition-all duration-300 rounded-full', ownerPasswordStrength.widthClass]"></div>
                    </div>
                    <div class="flex justify-between items-center text-[10px] mt-1 text-slate-500">
                      <span>{{ t('protect_pwd_strength_label') }}: <strong :class="ownerPasswordStrength.color">{{ ownerPasswordStrength.label }}</strong></span>
                    </div>
                  </div>

                  <!-- Confirm Separate Owner Password -->
                  <div v-if="ownerPassword" class="space-y-1 animate-in fade-in duration-150">
                    <div class="relative">
                      <input 
                        v-model="confirmOwnerPassword"
                        :type="showOwnerPassword ? 'text' : 'password'"
                        :placeholder="t('protect_confirm_owner_pwd_placeholder')"
                        :class="[
                          'w-full text-xs bg-white border rounded-xl px-3 py-2.5 pr-10 outline-hidden font-medium text-slate-800 shadow-2xs transition-colors',
                          confirmOwnerPassword 
                            ? (confirmOwnerPassword === ownerPassword ? 'border-emerald-400 focus:ring-2 focus:ring-emerald-500' : 'border-rose-400 focus:ring-2 focus:ring-rose-500')
                            : 'border-slate-300 focus:ring-2 focus:ring-indigo-500'
                        ]"
                      >
                      <span v-if="confirmOwnerPassword && ownerPassword === confirmOwnerPassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 text-xs font-bold">
                        ✓
                      </span>
                      <span v-else-if="confirmOwnerPassword && ownerPassword !== confirmOwnerPassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-rose-500 text-xs font-bold">
                        ✕
                      </span>
                    </div>

                    <!-- Real-time Matching Feedback -->
                    <div v-if="confirmOwnerPassword" class="flex items-center space-x-1 text-[11px] font-medium pt-0.5 animate-in fade-in duration-150">
                      <span v-if="ownerPassword === confirmOwnerPassword" class="text-emerald-600 flex items-center space-x-1">
                        <span>✓</span>
                        <span>{{ t('protect_pwd_matched') }}</span>
                      </span>
                      <span v-else class="text-rose-500 flex items-center space-x-1">
                        <span>✕</span>
                        <span>{{ t('protect_pwd_mismatched') }}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- SCENARIO B: Read-Only or Forms Presets (Public View, Protected Actions) -->
              <div v-else class="space-y-3.5">
                <!-- Friendly Public Read Badge -->
                <div class="p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-xl flex items-start space-x-2.5 text-xs text-emerald-800">
                  <CheckCircle2 class="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span class="font-bold block">{{ t('protect_mode_readonly_badge') }}</span>
                  </div>
                </div>

                <!-- Management Password Section -->
                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <label class="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                      <ShieldAlert class="w-3.5 h-3.5 text-indigo-600" />
                      <span>{{ t('protect_mode_owner') }}</span>
                    </label>
                    <span class="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-bold border border-indigo-200/60">{{ t('protect_tag_owner_pwd') }}</span>
                  </div>

                  <p class="text-[11px] text-slate-500 leading-tight">
                    {{ t('protect_owner_pwd_hint') }}
                  </p>

                  <div class="relative">
                    <input 
                      v-model="ownerPassword"
                      :type="showOwnerPassword ? 'text' : 'password'"
                      :placeholder="t('protect_owner_pwd_placeholder')"
                      class="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2.5 pr-10 focus:ring-2 focus:ring-indigo-500 outline-hidden font-medium text-slate-800 shadow-2xs"
                    >
                    <button 
                      type="button"
                      @click="showOwnerPassword = !showOwnerPassword"
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <Eye v-if="!showOwnerPassword" class="w-4 h-4" />
                      <EyeOff v-else class="w-4 h-4" />
                    </button>
                  </div>

                  <!-- Smallpdf Password Strength Meter for Management Password -->
                  <div v-if="ownerPassword" class="animate-in fade-in duration-200 pt-0.5">
                    <div class="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div :class="['h-full transition-all duration-300 rounded-full', ownerPasswordStrength.widthClass]"></div>
                    </div>
                    <div class="flex justify-between items-center text-[10px] mt-1 text-slate-500">
                      <span>{{ t('protect_pwd_strength_label') }}: <strong :class="ownerPasswordStrength.color">{{ ownerPasswordStrength.label }}</strong></span>
                    </div>
                  </div>

                  <!-- Confirm Management Password -->
                  <div v-if="ownerPassword" class="space-y-1 animate-in fade-in duration-150">
                    <div class="relative">
                      <input 
                        v-model="confirmOwnerPassword"
                        :type="showOwnerPassword ? 'text' : 'password'"
                        :placeholder="t('protect_confirm_owner_pwd_placeholder')"
                        :class="[
                          'w-full text-xs bg-white border rounded-xl px-3 py-2.5 pr-10 outline-hidden font-medium text-slate-800 shadow-2xs transition-colors',
                          confirmOwnerPassword 
                            ? (confirmOwnerPassword === ownerPassword ? 'border-emerald-400 focus:ring-2 focus:ring-emerald-500' : 'border-rose-400 focus:ring-2 focus:ring-rose-500')
                            : 'border-slate-300 focus:ring-2 focus:ring-indigo-500'
                        ]"
                      >
                      <span v-if="confirmOwnerPassword && ownerPassword === confirmOwnerPassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 text-xs font-bold">
                        ✓
                      </span>
                      <span v-else-if="confirmOwnerPassword && ownerPassword !== confirmOwnerPassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-rose-500 text-xs font-bold">
                        ✕
                      </span>
                    </div>

                    <!-- Real-time Matching Feedback -->
                    <div v-if="confirmOwnerPassword" class="flex items-center space-x-1 text-[11px] font-medium pt-0.5 animate-in fade-in duration-150">
                      <span v-if="ownerPassword === confirmOwnerPassword" class="text-emerald-600 flex items-center space-x-1">
                        <span>✓</span>
                        <span>{{ t('protect_pwd_matched') }}</span>
                      </span>
                      <span v-else class="text-rose-500 flex items-center space-x-1">
                        <span>✕</span>
                        <span>{{ t('protect_pwd_mismatched') }}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            <!-- Right: Permissions Checklist & Progressive Disclosure Algorithm -->
            <div class="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/80 flex flex-col justify-between space-y-3">
              <div class="space-y-2.5">
                <span class="text-xs font-bold text-slate-800 block">
                  {{ t('protect_mode_owner') }}
                </span>

                <!-- Permissions Checkboxes -->
                <div class="space-y-2">
                  <!-- Printing -->
                  <label class="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      v-model="allowPrinting"
                      @change="activePreset = 'custom'"
                      class="w-4 h-4 rounded text-rose-600 border-slate-300 focus:ring-rose-500 cursor-pointer"
                    >
                    <Printer class="w-3.5 h-3.5 text-slate-500" />
                    <span :class="allowPrinting ? 'font-bold text-slate-900' : 'text-slate-600'">{{ t('protect_perm_printing') }}</span>
                  </label>

                  <!-- Copying -->
                  <label class="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      v-model="allowCopying"
                      @change="activePreset = 'custom'"
                      class="w-4 h-4 rounded text-rose-600 border-slate-300 focus:ring-rose-500 cursor-pointer"
                    >
                    <Copy class="w-3.5 h-3.5 text-slate-500" />
                    <span :class="allowCopying ? 'font-bold text-slate-900' : 'text-slate-600'">{{ t('protect_perm_copying') }}</span>
                  </label>

                  <!-- Modifying -->
                  <label class="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      v-model="allowModifying"
                      @change="activePreset = 'custom'"
                      class="w-4 h-4 rounded text-rose-600 border-slate-300 focus:ring-rose-500 cursor-pointer"
                    >
                    <FileEdit class="w-3.5 h-3.5 text-slate-500" />
                    <span :class="allowModifying ? 'font-bold text-slate-900' : 'text-slate-600'">{{ t('protect_perm_modifying') }}</span>
                  </label>

                  <!-- Annotating / Forms -->
                  <label class="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      v-model="allowAnnotating"
                      @change="activePreset = 'custom'"
                      class="w-4 h-4 rounded text-rose-600 border-slate-300 focus:ring-rose-500 cursor-pointer"
                    >
                    <PenLine class="w-3.5 h-3.5 text-slate-500" />
                    <span :class="allowAnnotating ? 'font-bold text-slate-900' : 'text-slate-600'">{{ t('protect_perm_annotating') }}</span>
                  </label>
                </div>
              </div>

              <!-- Progressive Disclosure: Collapsible Algorithm Selection -->
              <div class="pt-2 border-t border-slate-200/60">
                <button 
                  type="button" 
                  @click="isAdvancedOpen = !isAdvancedOpen"
                  class="w-full flex items-center justify-between text-[11px] font-bold text-slate-600 hover:text-slate-900 cursor-pointer select-none py-1"
                >
                  <span class="flex items-center space-x-1.5">
                    <span>⚙️</span>
                    <span>{{ t('protect_advanced_toggle') }}</span>
                  </span>
                  <ChevronDown :class="['w-3.5 h-3.5 transition-transform duration-200', isAdvancedOpen ? 'rotate-180' : '']" />
                </button>

                <div v-show="isAdvancedOpen" class="space-y-1.5 pt-2 animate-in fade-in duration-150">
                  <label class="text-[10px] font-semibold text-slate-500 block">
                    {{ t('protect_algorithm_label') }}
                  </label>
                  <div class="grid grid-cols-2 gap-2">
                    <button 
                      type="button"
                      @click="algorithm = 'AES-256'; activePreset = 'custom'"
                      :class="[
                        'py-1.5 px-2 rounded-xl border text-[11px] font-bold transition cursor-pointer text-center',
                        algorithm === 'AES-256' ? 'bg-rose-600 text-white border-rose-600 shadow-2xs' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      ]"
                    >
                      {{ t('protect_algo_aes_btn') }}
                    </button>
                    <button 
                      type="button"
                      @click="algorithm = 'RC4'; activePreset = 'custom'"
                      :class="[
                        'py-1.5 px-2 rounded-xl border text-[11px] font-bold transition cursor-pointer text-center',
                        algorithm === 'RC4' ? 'bg-rose-600 text-white border-rose-600 shadow-2xs' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      ]"
                    >
                      RC4 128-bit
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Live Human-Readable Protection Summary Callout -->
          <div class="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/70 flex items-start space-x-2.5 text-xs text-slate-700">
            <span class="text-base shrink-0">💡</span>
            <div class="leading-relaxed">
              <span class="font-bold text-slate-800">{{ t('protect_summary_prefix') }}: </span>
              <span class="text-slate-600">{{ effectiveProtectionSummary }}</span>
            </div>
          </div>

          <!-- Error Alert Banner -->
          <div v-if="protectError" class="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center space-x-2 animate-in fade-in duration-150">
            <AlertCircle class="w-4 h-4 text-rose-600 shrink-0" />
            <span class="font-medium">{{ protectError }}</span>
          </div>
        </div>

        <!-- Bottom Cluster: Next Action Relay Banner (Anchored to Bottom) & Output Settings Bar -->
        <div class="shrink-0 space-y-2.5 pt-2">
          <!-- Next Action Relay Banner -->
          <NextActionBanner 
            v-if="showNextActions && lastExportedFile"
            :current-tool="'protect'"
            :file="lastExportedFile"
            @send-to-tool="(tId) => emit('send-to-tool', tId)"
            @close="showNextActions = false"
          />

          <!-- Bottom Execution & Output Settings Bar -->
          <div class="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-wrap items-center gap-3">
              <div class="flex items-center space-x-1.5">
                <label class="text-xs text-slate-500 font-semibold shrink-0">
                  {{ t('vault_field_name') }}:
                </label>
                <input 
                  v-model="customOutputBaseName"
                  type="text" 
                  :placeholder="defaultFileNamePlaceholder"
                  class="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:bg-white focus:ring-2 focus:ring-rose-500 outline-hidden font-medium text-slate-700 w-44 sm:w-56"
                >
              </div>

              <!-- Auto-save to Vault Checkbox -->
              <label class="flex items-center space-x-1.5 text-xs text-slate-600 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  v-model="autoSaveToVault"
                  class="w-3.5 h-3.5 rounded text-rose-600 border-slate-300 focus:ring-rose-500 cursor-pointer"
                >
                <FolderLock class="w-3.5 h-3.5 text-rose-600" />
                <span>{{ t('vault_autosave_checkbox') }}</span>
              </label>
            </div>

            <!-- Execution Action Button -->
            <button 
              :disabled="isProcessing"
              @click="executeProtect"
              class="bg-rose-600 hover:bg-rose-700 active:scale-98 text-white text-xs sm:text-sm font-bold px-6 py-2.5 rounded-xl transition flex items-center space-x-2 shadow-md hover:shadow-rose-600/25 disabled:opacity-50 cursor-pointer ml-auto"
            >
              <Lock v-if="!isProcessing" class="w-4 h-4" />
              <Loader2 v-else class="w-4 h-4 animate-spin" />
              <span>{{ isProcessing ? (t('loading') || 'Processing...') : t('protect_btn_action') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Vault File Picker Modal -->
    <VaultFilePickerModal
      :is-open="isVaultPickerOpen"
      :multiple="false"
      @select-files="handleVaultFilesSelected"
      @close="isVaultPickerOpen = false"
    />

    <!-- Password Modal (for already encrypted file input) -->
    <PasswordModal 
      :is-open="isPasswordOpen"
      :filename="filename"
      :error-message="passwordModalError"
      :is-unlocking="isUnlockingModal"
      @submit="handlePasswordSubmit"
      @cancel="handlePasswordCancel"
    />
  </section>
</template>

<script setup>
import { ref, computed, watch, onMounted, onActivated } from 'vue';
import { 
  Lock, 
  Plus, 
  FolderLock, 
  Sparkles, 
  Key, 
  ShieldAlert, 
  Eye, 
  EyeOff, 
  Printer, 
  Copy, 
  FileEdit, 
  PenLine, 
  AlertCircle, 
  Loader2,
  CheckCircle2,
  ChevronDown
} from 'lucide-vue-next';
import * as pdfjsLib from 'pdfjs-dist';
import confetti from 'canvas-confetti';
import { encryptPDF } from '@pdfsmaller/pdf-encrypt';
import { t } from '../i18n';
import { triggerDownload } from '../utils/download';
import { verifyPdfSecurity, loadCleanPdfDocument } from '../utils/pdfSecurity';
import { saveFile } from '../utils/vaultDb';
import { userSettings } from '../utils/userSettings';
import { logger } from '../utils/logger';
import { generateExportFileName } from '../utils/filenameUtils';
import { consumePendingFile } from '../utils/toolBridge';
import VaultFilePickerModal from '../components/VaultFilePickerModal.vue';
import PasswordModal from '../components/PasswordModal.vue';
import NextActionBanner from '../components/NextActionBanner.vue';

const emit = defineEmits(['send-to-tool', 'open-enterprise']);

const lastExportedFile = ref(null);
const showNextActions = ref(false);

const fileInputRef = ref(null);
const docBytes = ref(null);
const filename = ref('');
const totalPages = ref(0);
const originalSizeFormatted = ref('0 B');
const isDragOver = ref(false);
const isProcessing = ref(false);
const isVaultPickerOpen = ref(false);

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Passwords and security controls
const userPassword = ref('');
const confirmUserPassword = ref('');
const ownerPassword = ref('');
const confirmOwnerPassword = ref('');
const showUserPassword = ref(false);
const showOwnerPassword = ref(false);
const protectError = ref('');

// Password synchronization & progressive disclosure states
const useSamePassword = ref(true);
const isAdvancedOpen = ref(false);

// Dynamic Password Strength Meter (Smallpdf Pattern)
function calcPasswordStrength(pwd) {
  if (!pwd) return { level: 0, score: 0, label: '', color: '', widthClass: 'w-0' };
  
  let score = 0;
  if (pwd.length >= 6) score += 1;
  if (pwd.length >= 10) score += 1;
  if (/[0-9]/.test(pwd) && /[a-zA-Z]/.test(pwd)) score += 1;
  if (/[^a-zA-Z0-9]/.test(pwd)) score += 1;

  if (score <= 1) {
    return {
      level: 1,
      score: 1,
      label: t('protect_pwd_strength_weak') || '弱',
      color: 'text-rose-600',
      widthClass: 'w-1/3 bg-rose-500'
    };
  } else if (score <= 2) {
    return {
      level: 2,
      score: 2,
      label: t('protect_pwd_strength_medium') || '中',
      color: 'text-amber-600',
      widthClass: 'w-2/3 bg-amber-500'
    };
  } else {
    return {
      level: 3,
      score: 3,
      label: t('protect_pwd_strength_strong') || '极佳',
      color: 'text-emerald-600',
      widthClass: 'w-full bg-emerald-500'
    };
  }
}

const userPasswordStrength = computed(() => calcPasswordStrength(userPassword.value));
const ownerPasswordStrength = computed(() => calcPasswordStrength(ownerPassword.value));
const passwordStrength = userPasswordStrength;

// Live Human-Readable Protection Summary
const effectiveProtectionSummary = computed(() => {
  if (activePreset.value === 'confidential') {
    return t('protect_summary_confidential');
  } else if (activePreset.value === 'readonly') {
    return t('protect_summary_readonly');
  } else if (activePreset.value === 'forms') {
    return t('protect_summary_forms');
  } else {
    return t('protect_summary_custom');
  }
});

// Permissions
const allowPrinting = ref(false);
const allowCopying = ref(false);
const allowModifying = ref(false);
const allowAnnotating = ref(false);
const algorithm = ref('AES-256'); // 'AES-256' | 'RC4'
const activePreset = ref('confidential');

// Existing file password status
const alreadyEncrypted = ref(false);
const isPasswordOpen = ref(false);
const passwordModalError = ref('');
const isUnlockingModal = ref(false);
let pendingFileToUnlock = null;
let currentLoadedCleanPassword = '';

// Export Settings
const customOutputBaseName = ref('');
const autoSaveToVault = ref(userSettings.autoSaveToVault);

watch(() => userSettings.autoSaveToVault, (newVal) => {
  autoSaveToVault.value = Boolean(newVal);
}, { immediate: true });

const defaultFileNamePlaceholder = computed(() => {
  return generateExportFileName(filename.value, 'Protected');
});

function applyPreset(presetType) {
  activePreset.value = presetType;
  protectError.value = '';

  if (presetType === 'confidential') {
    algorithm.value = 'AES-256';
    useSamePassword.value = true;
    confirmOwnerPassword.value = '';
    allowPrinting.value = false;
    allowCopying.value = false;
    allowModifying.value = false;
    allowAnnotating.value = false;
  } else if (presetType === 'readonly') {
    algorithm.value = 'AES-256';
    userPassword.value = '';
    confirmUserPassword.value = '';
    confirmOwnerPassword.value = '';
    allowPrinting.value = false;
    allowCopying.value = false;
    allowModifying.value = false;
    allowAnnotating.value = false;
  } else if (presetType === 'forms') {
    algorithm.value = 'AES-256';
    userPassword.value = '';
    confirmUserPassword.value = '';
    confirmOwnerPassword.value = '';
    allowPrinting.value = true;
    allowCopying.value = false;
    allowModifying.value = false;
    allowAnnotating.value = true;
  }
}

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
  isVaultPickerOpen.value = false;
  if (!selectedFiles || selectedFiles.length === 0) return;
  const file = selectedFiles[0];
  if (file) {
    loadFile(file);
  }
}

async function loadFile(file, password = '') {
  try {
    const rawBuffer = await file.arrayBuffer();
    const sec = await verifyPdfSecurity(rawBuffer, password);

    if (sec.isOpenPasswordRequired && !sec.isValid) {
      // Need password to read first
      pendingFileToUnlock = file;
      filename.value = file.name;
      isPasswordOpen.value = true;
      passwordModalError.value = password ? (t('pwd_error_wrong') || 'Incorrect password') : '';
      return;
    }

    currentLoadedCleanPassword = password;
    alreadyEncrypted.value = sec.isEncrypted;
    docBytes.value = new Uint8Array(rawBuffer);
    filename.value = file.name;
    originalSizeFormatted.value = formatBytes(rawBuffer.byteLength);
    protectError.value = '';

    customOutputBaseName.value = generateExportFileName(file.name, 'Protected');
    showNextActions.value = false;
    lastExportedFile.value = null;

    // Count pages
    try {
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(rawBuffer.slice(0)),
        password: password || undefined,
        cMapUrl: '/cmaps/',
        cMapPacked: true,
        standardFontDataUrl: '/standard_fonts/'
      });
      const pdf = await loadingTask.promise;
      totalPages.value = pdf.numPages;
    } catch (e) {
      totalPages.value = 1;
    }
  } catch (err) {
    logger.error('PROTECT', `File load failed: ${err.message}`);
  }
}

async function handlePasswordSubmit(pwd) {
  if (!pendingFileToUnlock) return;
  isUnlockingModal.value = true;
  await loadFile(pendingFileToUnlock, pwd);
  isUnlockingModal.value = false;
  isPasswordOpen.value = false;
  pendingFileToUnlock = null;
}

function handlePasswordCancel() {
  isPasswordOpen.value = false;
  pendingFileToUnlock = null;
  reset();
}

function reset() {
  docBytes.value = null;
  filename.value = '';
  totalPages.value = 0;
  originalSizeFormatted.value = '0 B';
  userPassword.value = '';
  confirmUserPassword.value = '';
  ownerPassword.value = '';
  confirmOwnerPassword.value = '';
  useSamePassword.value = true;
  isAdvancedOpen.value = false;
  alreadyEncrypted.value = false;
  protectError.value = '';
  customOutputBaseName.value = '';
  activePreset.value = 'confidential';
  showNextActions.value = false;
  lastExportedFile.value = null;
}

function formatErrorMessage(err) {
  if (!err) return t('protect_err_failed') || '加密保护处理失败，请重试。';
  const msg = err.message || String(err);

  if (/invalid pdf structure|failed to parse|no pdf header/i.test(msg)) {
    return t('protect_err_invalid_pdf') || 'PDF 文件结构异常或已损坏，无法进行加密保护。';
  }
  if (/already password-protected|already encrypted/i.test(msg)) {
    return t('protect_err_already_encrypted') || '该文档已被加密，请先解除现有密码保护后再进行加密。';
  }
  if (/password/i.test(msg) && (/incorrect|wrong|invalid/i.test(msg))) {
    return t('pwd_error_wrong') || '密码不正确，请重新输入。';
  }
  if (/unsupported password character|prohibited password character/i.test(msg)) {
    return t('protect_err_unsupported_char') || '密码包含不受支持的特殊字符，请尝试更换密码。';
  }
  return t('protect_err_failed') || `加密保护处理失败: ${msg}`;
}

async function executeProtect() {
  if (!docBytes.value) return;
  protectError.value = '';

  // 1. Validation for Confidential preset
  if (activePreset.value === 'confidential') {
    if (!userPassword.value) {
      protectError.value = t('protect_err_need_open_pwd') || 'Open password is required for Confidential preset.';
      return;
    }
    if (confirmUserPassword.value !== userPassword.value) {
      protectError.value = t('protect_err_pwd_mismatch') || 'Open passwords do not match';
      return;
    }
    if (!useSamePassword.value) {
      if (!ownerPassword.value) {
        protectError.value = t('protect_err_need_owner_pwd') || 'Please set an owner password to allow lifting restrictions later.';
        return;
      }
      if (confirmOwnerPassword.value !== ownerPassword.value) {
        protectError.value = t('protect_err_owner_pwd_mismatch') || 'Management passwords do not match';
        return;
      }
    }
  } else {
    // 2. Validation for Readonly or Forms preset
    if (!ownerPassword.value) {
      protectError.value = t('protect_err_need_owner_pwd') || 'Please set an owner password to allow lifting restrictions later.';
      return;
    }
    if (confirmOwnerPassword.value !== ownerPassword.value) {
      protectError.value = t('protect_err_owner_pwd_mismatch') || 'Management passwords do not match';
      return;
    }
  }

  isProcessing.value = true;

  try {
    // 1. Ensure clean base document
    let rawBytes;
    if (alreadyEncrypted.value) {
      const cleanDoc = await loadCleanPdfDocument(docBytes.value, {
        password: currentLoadedCleanPassword || '',
        preserveWatermarks: true
      });
      rawBytes = await cleanDoc.save({ useObjectStreams: false });
    } else {
      rawBytes = docBytes.value;
    }

    // 2. Determine open password & owner password
    const passToOpen = activePreset.value === 'confidential' ? userPassword.value : '';
    const passToOwner = (activePreset.value === 'confidential' && useSamePassword.value)
      ? userPassword.value
      : (ownerPassword.value || undefined);

    // 3. Apply EncryptPDF
    const encryptedBytes = await encryptPDF(rawBytes, passToOpen, {
      ownerPassword: passToOwner,
      algorithm: algorithm.value,
      allowPrinting: Boolean(allowPrinting.value),
      allowModifying: Boolean(allowModifying.value),
      allowCopying: Boolean(allowCopying.value),
      allowAnnotating: Boolean(allowAnnotating.value),
      allowFillingForms: Boolean(allowAnnotating.value),
      allowHighQualityPrint: Boolean(allowPrinting.value)
    });

    let outName = (customOutputBaseName.value.trim() || generateExportFileName(filename.value, 'Protected'));
    if (!outName.toLowerCase().endsWith('.pdf')) {
      outName += '.pdf';
    }

    // 4. Download
    triggerDownload(new Blob([encryptedBytes], { type: 'application/pdf' }), outName);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
    logger.info('PROTECT', `PDF encrypted and protected successfully: ${outName}`);

    lastExportedFile.value = {
      name: outName,
      arrayBuffer: encryptedBytes.buffer ? encryptedBytes.buffer.slice(encryptedBytes.byteOffset, encryptedBytes.byteOffset + encryptedBytes.byteLength) : encryptedBytes
    };
    showNextActions.value = true;

    // 5. Auto-save to Vault if checked
    if (autoSaveToVault.value) {
      await saveFile({
        name: outName,
        arrayBuffer: encryptedBytes,
        folderId: 'default',
        category: 'export',
        pageCount: totalPages.value,
        isEncrypted: true
      });
      logger.info('VAULT', `Protected PDF auto-saved to Vault: ${outName} (isEncrypted=true)`);
    }
  } catch (err) {
    logger.error('PROTECT', `Protect failed: ${err.message}`);
    protectError.value = formatErrorMessage(err);
  } finally {
    isProcessing.value = false;
  }
}

function checkIncomingFile() {
  const incoming = consumePendingFile('protect');
  if (incoming) {
    const file = new File([incoming.arrayBuffer], incoming.name, { type: 'application/pdf' });
    loadFile(file, incoming.password || '');
  }
}

onMounted(checkIncomingFile);
onActivated(checkIncomingFile);
</script>
