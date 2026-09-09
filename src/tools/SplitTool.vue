<template>
  <section class="w-full flex-1 flex flex-col">
    <!-- Main Card Container matching Merge & Organize tools -->
    <div class="bg-white rounded-3xl p-5 sm:p-7 shadow-xl border border-slate-100 flex flex-col flex-1">
      <!-- Integrated Header with Badge -->
      <div class="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 shrink-0">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-2xs">
            <Scissors class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
              {{ t('split_title') }}
            </h2>
            <p class="text-xs text-slate-500 mt-0.5">
              {{ t('split_desc') }}
            </p>
          </div>
        </div>
      </div>

      <!-- State A: Empty State (Dual Source Dropzone: Local & Vault) -->
      <div 
        v-if="!docBytes"
        @dragover.prevent="isDragOver = true"
        @dragleave.prevent="isDragOver = false"
        @drop.prevent="onDrop"
        :class="[
          'border-2 border-dashed rounded-3xl p-8 sm:p-14 text-center transition flex-1 flex flex-col items-center justify-center relative select-none',
          isDragOver ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200/90 hover:border-emerald-400 bg-slate-50/40 hover:bg-slate-50/80'
        ]"
      >
        <input 
          ref="fileInputRef" 
          type="file" 
          accept="application/pdf" 
          class="hidden" 
          @change="onFileSelected" 
        >
        
        <div class="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mb-3 shadow-inner">
          <Scissors class="w-8 h-8" />
        </div>
        
        <h3 class="text-base sm:text-lg font-bold text-slate-800">{{ t('split_drop_title') }}</h3>
        <p class="text-xs text-slate-400 mt-1 max-w-sm">{{ t('split_drop_subtitle') }}</p>
        
        <!-- Dual Source Selection Buttons -->
        <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button 
            type="button" 
            @click="fileInputRef.click()"
            class="bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition flex items-center space-x-2 shadow-md hover:shadow-emerald-600/25 cursor-pointer"
          >
            <Plus class="w-4 h-4" />
            <span>{{ t('merge_btn_from_local') || 'Add from Computer' }}</span>
          </button>
          
          <button 
            type="button" 
            @click="isVaultPickerOpen = true"
            class="bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center space-x-2 border border-slate-200 shadow-2xs hover:border-slate-300 cursor-pointer"
          >
            <FolderLock class="w-4 h-4 text-emerald-600" />
            <span>{{ t('merge_btn_from_vault') || 'Pick from Vault' }}</span>
          </button>
        </div>
      </div>

      <!-- State B: Active Document Workspace -->
      <div v-else class="flex-1 flex flex-col justify-between overflow-hidden">
        <!-- 1. Top Toolbar & Status Bar -->
        <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 shrink-0">
          <div class="flex items-center space-x-2 min-w-0 flex-1">
            <span class="text-xs bg-emerald-50 text-emerald-700 font-extrabold px-2.5 py-1 rounded-lg border border-emerald-200 shrink-0">
              {{ totalPages }} {{ t('pages_label') || 'pages' }}
            </span>
            <span class="text-xs bg-blue-50 text-blue-700 font-extrabold px-2.5 py-1 rounded-lg border border-blue-200 shrink-0">
              {{ selectedIndices.size }} {{ t('pages_label') }} {{ t('selected_label') }}
            </span>
            <span class="text-xs font-bold text-slate-700 truncate max-w-xs" :title="filename">
              {{ filename }}
            </span>
            <span 
              v-if="unlockedPassword" 
              class="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-bold flex items-center shrink-0"
            >
              <Unlock class="w-3 h-3 mr-0.5" />
              {{ t('badge_unlocked') || 'Unlocked' }}
            </span>
          </div>

          <!-- Quick Action Buttons -->
          <div class="flex items-center space-x-1.5 sm:space-x-2">
            <!-- Mode 1 Quick Buttons -->
            <template v-if="activeMode === 'extract'">
              <button 
                @click="selectAll" 
                class="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200/80 transition flex items-center space-x-1 cursor-pointer"
                :title="t('btn_select_all')"
              >
                <CheckSquare class="w-3.5 h-3.5 text-slate-600" />
                <span>{{ t('btn_select_all') || 'Select All' }}</span>
              </button>

              <button 
                @click="clearAll" 
                class="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200/80 transition flex items-center space-x-1 cursor-pointer"
                :title="t('btn_deselect_all')"
              >
                <Square class="w-3.5 h-3.5 text-slate-600" />
                <span>{{ t('btn_deselect_all') || 'Deselect All' }}</span>
              </button>

              <button 
                @click="selectOdds" 
                class="text-xs bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium px-2 py-1.5 rounded-xl border border-slate-200 transition cursor-pointer"
              >
                {{ t('split_btn_select_odds') || 'Odd' }}
              </button>

              <button 
                @click="selectEvens" 
                class="text-xs bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium px-2 py-1.5 rounded-xl border border-slate-200 transition cursor-pointer"
              >
                {{ t('split_btn_select_evens') || 'Even' }}
              </button>
            </template>

            <!-- Choose Another Local File -->
            <button 
              @click="fileInputRef.click()"
              class="text-xs text-emerald-600 hover:bg-emerald-50 font-semibold px-2.5 py-1.5 rounded-xl border border-emerald-200 transition flex items-center space-x-1 cursor-pointer"
            >
              <RefreshCw class="w-3.5 h-3.5" />
              <span class="hidden sm:inline">{{ t('btn_choose_another') || 'Choose Another' }}</span>
            </button>

            <!-- Choose From Vault -->
            <button 
              @click="isVaultPickerOpen = true"
              class="text-xs text-slate-700 hover:bg-slate-100 font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 transition flex items-center space-x-1 cursor-pointer"
            >
              <FolderLock class="w-3.5 h-3.5 text-emerald-600" />
              <span class="hidden sm:inline">{{ t('merge_btn_from_vault') || 'Vault' }}</span>
            </button>

            <!-- Clear / Reset -->
            <button 
              @click="reset" 
              class="text-xs text-rose-600 hover:bg-rose-50 font-semibold px-2.5 py-1.5 rounded-xl transition cursor-pointer"
            >
              {{ t('btn_clear_all') || 'Clear' }}
            </button>
          </div>
        </div>

        <!-- 2. Four Split Modes Tab Switcher -->
        <div class="my-2.5 bg-slate-100/80 p-1 rounded-2xl flex items-center space-x-1 shrink-0 overflow-x-auto">
          <button 
            type="button"
            @click="switchMode('extract')"
            :class="[
              'flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 whitespace-nowrap cursor-pointer',
              activeMode === 'extract'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            ]"
          >
            <span>🎯</span>
            <span>{{ t('split_mode_extract') || 'Extract Pages' }}</span>
          </button>

          <button 
            type="button"
            @click="switchMode('burst')"
            :class="[
              'flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 whitespace-nowrap cursor-pointer',
              activeMode === 'burst'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            ]"
          >
            <span>⚡</span>
            <span>{{ t('split_mode_burst') || 'Single Pages (Burst)' }}</span>
          </button>

          <button 
            type="button"
            @click="switchMode('interval')"
            :class="[
              'flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 whitespace-nowrap cursor-pointer',
              activeMode === 'interval'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            ]"
          >
            <span>📏</span>
            <span>{{ t('split_mode_interval') || 'By Page Count' }}</span>
          </button>

          <button 
            type="button"
            @click="switchMode('multi_range')"
            :class="[
              'flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 whitespace-nowrap cursor-pointer',
              activeMode === 'multi_range'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            ]"
          >
            <span>📑</span>
            <span>{{ t('split_mode_ranges') || 'Custom Ranges' }}</span>
          </button>
        </div>

        <!-- 3. Dynamic Mode Parameter Controls Panel -->
        <!-- Mode 1: Custom Range + Merge/Separate Format -->
        <div v-if="activeMode === 'extract'" class="bg-slate-50/90 rounded-2xl p-3 mb-2 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div class="flex items-center space-x-2 flex-1 min-w-[280px]">
            <span class="font-bold text-slate-700 shrink-0">{{ t('custom_page_range') || 'Custom Page Range:' }}</span>
            <input 
              v-model="rangeInput" 
              @keyup.enter="applyRange"
              type="text" 
              :placeholder="t('range_placeholder') || 'e.g. 1-3, 5, 8'" 
              class="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden flex-1 font-mono"
            >
            <button 
              @click="applyRange" 
              class="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-3.5 py-1.5 rounded-xl transition shadow-xs cursor-pointer shrink-0"
            >
              {{ t('apply_range') || 'Apply Range' }}
            </button>
          </div>

          <!-- Format Choice: Merge into 1 vs Separate -->
          <div class="flex items-center space-x-3 text-xs text-slate-700 font-medium pl-1 border-l border-slate-200">
            <span class="text-slate-500 font-semibold">{{ t('split_extract_output_label') || 'Export Output:' }}</span>
            <label class="flex items-center space-x-1.5 cursor-pointer">
              <input type="radio" value="merge" v-model="extractFormat" class="text-emerald-600 focus:ring-emerald-500 cursor-pointer">
              <span>{{ t('split_extract_merge') || 'Merge into 1 PDF' }}</span>
            </label>
            <label class="flex items-center space-x-1.5 cursor-pointer">
              <input type="radio" value="separate" v-model="extractFormat" class="text-emerald-600 focus:ring-emerald-500 cursor-pointer">
              <span>{{ t('split_extract_separate') || 'Separate PDFs' }}</span>
            </label>
          </div>
        </div>

        <!-- Mode 2: Burst Banner -->
        <div v-else-if="activeMode === 'burst'" class="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 mb-2 flex items-center justify-between text-xs shrink-0">
          <div class="flex items-center space-x-2 text-emerald-800 font-semibold">
            <Sparkles class="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{{ t('split_burst_info', { total: totalPages }) || `Document has ${totalPages} pages. Each page will be split into an independent 1-page PDF file.` }}</span>
          </div>
          <span class="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-lg">
            {{ totalPages }} {{ t('split_plan_count', { count: totalPages }) }}
          </span>
        </div>

        <!-- Mode 3: Fixed Interval Controls -->
        <div v-else-if="activeMode === 'interval'" class="bg-slate-50/90 rounded-2xl p-3 mb-2 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div class="flex items-center space-x-3">
            <span class="font-bold text-slate-700">{{ t('split_interval_label') || 'Every' }}</span>
            <div class="flex items-center space-x-1">
              <input 
                type="number" 
                v-model.number="intervalCount" 
                :min="1" 
                :max="totalPages"
                class="w-16 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-center font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
              <span class="text-slate-600 font-medium">{{ t('split_interval_unit') || 'pages per document' }}</span>
            </div>

            <!-- Quick Interval Preset Pills -->
            <div class="flex items-center space-x-1.5 pl-2 border-l border-slate-200">
              <button 
                v-for="pVal in [1, 2, 5, 10]" 
                :key="pVal"
                v-show="pVal <= totalPages"
                @click="intervalCount = pVal"
                :class="[
                  'px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer',
                  intervalCount === pVal ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                ]"
              >
                {{ t(`split_interval_preset_${pVal}`) || `Every ${pVal}` }}
              </button>
            </div>
          </div>

          <div class="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            {{ t('split_interval_calc', { total: totalPages, interval: intervalCount, count: computedIntervalPlan.length }) || `${computedIntervalPlan.length} files will be generated` }}
          </div>
        </div>

        <!-- Mode 4: Multi-Range Chapter Manager -->
        <div v-else-if="activeMode === 'multi_range'" class="bg-slate-50/90 rounded-2xl p-3 mb-2 border border-slate-200/80 flex flex-col gap-2 text-xs shrink-0 max-h-36 overflow-y-auto">
          <div class="flex flex-wrap items-center gap-2">
            <div 
              v-for="(r, idx) in customRanges" 
              :key="r.id"
              class="flex items-center space-x-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1 shadow-2xs"
            >
              <span class="font-bold text-slate-600">{{ t('split_range_item') || 'Part' }} {{ idx + 1 }}:</span>
              <input 
                type="number" 
                v-model.number="r.from" 
                :min="1" 
                :max="totalPages"
                class="w-12 bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-0.5 text-center font-bold text-slate-700"
              >
              <span class="text-slate-400 font-medium">-</span>
              <input 
                type="number" 
                v-model.number="r.to" 
                :min="1" 
                :max="totalPages"
                class="w-12 bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-0.5 text-center font-bold text-slate-700"
              >
              <span class="text-[11px] text-slate-400 font-medium pl-1">
                ({{ Math.max(0, (r.to || 0) - (r.from || 0) + 1) }} {{ t('pages_label') }})
              </span>
              <button 
                v-if="customRanges.length > 1"
                @click="removeRange(idx)" 
                class="text-slate-400 hover:text-rose-600 transition p-0.5 cursor-pointer"
                title="Delete"
              >
                <X class="w-3.5 h-3.5" />
              </button>
            </div>

            <button 
              @click="addRange" 
              class="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-3 py-1 rounded-xl border border-emerald-200 transition cursor-pointer flex items-center space-x-1"
            >
              <Plus class="w-3.5 h-3.5" />
              <span>{{ t('split_btn_add_range') || 'Add Range' }}</span>
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
        <div v-if="isLoading" class="flex-1 flex flex-col items-center justify-center py-20 text-center text-xs text-slate-500 font-medium">
          <Loader2 class="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-600" />
          <span>{{ t('rendering_pages') }}...</span>
        </div>

        <!-- 4. Interactive Thumbnail Cards Grid -->
        <div 
          v-else 
          class="flex-1 my-2 overflow-y-auto max-h-[440px] pr-1 grid content-start items-start grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 select-none"
        >
          <div 
            v-for="p in pages" 
            :key="p.index"
            @click="onCardClick(p.index)"
            :class="[
              'rounded-2xl border p-2.5 flex flex-col items-center relative group transition select-none',
              activeMode === 'extract' ? 'cursor-pointer' : 'cursor-default',
              isPageSelectedInMode(p.index) 
                ? 'bg-emerald-50/70 border-emerald-400 shadow-md ring-2 ring-emerald-500/20' 
                : (isPageExcludedInMode(p.index) ? 'opacity-40 bg-slate-100/60 border-slate-200' : 'bg-slate-50/70 hover:bg-white border-slate-200/80 shadow-2xs')
            ]"
          >
            <!-- Card Header: Page Index Badge + Contextual Mode Tag -->
            <div class="w-full flex items-center justify-between mb-1.5">
              <span :class="[
                'text-[11px] font-extrabold px-2 py-0.5 rounded-md',
                isPageSelectedInMode(p.index) ? 'bg-emerald-600 text-white' : 'bg-slate-200/80 text-slate-700'
              ]">
                {{ t('page_card_prefix', 'Page') }} {{ p.index + 1 }}
              </span>

              <!-- Mode 1: Checkmark -->
              <div 
                v-if="activeMode === 'extract'"
                :class="[
                  'w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-bold transition shrink-0',
                  selectedIndices.has(p.index) ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white text-transparent'
                ]"
              >
                ✓
              </div>

              <!-- Mode 2: Burst Icon -->
              <span v-else-if="activeMode === 'burst'" class="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                1P
              </span>

              <!-- Mode 3: Part Interval Tag -->
              <span v-else-if="activeMode === 'interval'" class="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-md">
                Part {{ Math.floor(p.index / Math.max(1, intervalCount)) + 1 }}
              </span>

              <!-- Mode 4: Range Tag -->
              <span v-else-if="activeMode === 'multi_range' && getRangeTagForPage(p.index + 1)" class="text-[10px] font-extrabold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-md">
                {{ getRangeTagForPage(p.index + 1) }}
              </span>
            </div>

            <!-- Page Canvas Preview -->
            <div class="overflow-hidden rounded-xl border border-slate-200/60 flex items-center justify-center bg-white w-full h-40 relative">
              <img 
                :src="p.dataUrl" 
                class="max-h-full max-w-full object-contain pointer-events-none"
              >
            </div>
          </div>
        </div>

        <!-- 5. Bottom Action & Export Configuration Bar -->
        <div class="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <!-- Left: Output Filename & Auto-save Checkbox -->
          <div class="flex flex-wrap items-center gap-3">
            <div class="flex items-center space-x-1.5">
              <label class="text-xs text-slate-500 font-semibold shrink-0">
                {{ t('vault_field_name') }}:
              </label>
              <input 
                v-model="customOutputBaseName"
                type="text" 
                :placeholder="defaultFileNamePlaceholder"
                class="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-medium text-slate-700 w-44 sm:w-64"
              >
            </div>

            <!-- Delivery Format Selector (Visible for multi-file operations) -->
            <div v-if="isDeliveryToggleVisible" class="flex items-center space-x-1.5 pl-1 sm:border-l sm:border-slate-200">
              <span class="text-xs text-slate-500 font-semibold shrink-0">{{ t('split_delivery_format_label') || '交付形式：' }}</span>
              <div class="flex items-center space-x-1 bg-slate-100/90 p-0.5 rounded-xl border border-slate-200/70 text-xs">
                <button 
                  type="button" 
                  @click="deliveryFormat = 'zip'"
                  :class="[
                    'px-2.5 py-1 rounded-lg font-bold flex items-center space-x-1 transition cursor-pointer',
                    deliveryFormat === 'zip' 
                      ? 'bg-white text-emerald-700 shadow-2xs border border-slate-200/60' 
                      : 'text-slate-500 hover:text-slate-700'
                  ]"
                >
                  <Package class="w-3.5 h-3.5 text-emerald-600" />
                  <span>{{ t('split_delivery_zip_pill') || '📦 ZIP 打包' }}</span>
                </button>
                <button 
                  type="button" 
                  @click="deliveryFormat = 'separate'"
                  :class="[
                    'px-2.5 py-1 rounded-lg font-bold flex items-center space-x-1 transition cursor-pointer',
                    deliveryFormat === 'separate' 
                      ? 'bg-white text-emerald-700 shadow-2xs border border-slate-200/60' 
                      : 'text-slate-500 hover:text-slate-700'
                  ]"
                >
                  <Files class="w-3.5 h-3.5 text-slate-600" />
                  <span>{{ t('split_delivery_separate_pill') || '📄 独立 PDF' }}</span>
                </button>
              </div>
            </div>

            <label class="flex items-center space-x-1.5 text-xs text-slate-600 font-semibold cursor-pointer select-none">
              <input 
                type="checkbox" 
                v-model="autoSaveToVault" 
                class="w-4 h-4 text-emerald-600 rounded-md border-slate-300 focus:ring-emerald-500 cursor-pointer"
              >
              <span>{{ t('vault_autosave_checkbox') }}</span>
            </label>
          </div>

          <!-- Right: Execution Button -->
          <button 
            :disabled="isProcessing || isLoading || isExecutionDisabled"
            @click="handlePrimarySplitClick" 
            class="bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs sm:text-sm font-bold px-6 py-2.5 rounded-xl transition flex items-center justify-center space-x-2 shadow-md hover:shadow-emerald-600/25 disabled:opacity-50 cursor-pointer ml-auto"
          >
            <span v-if="!isProcessing">
              {{ primaryButtonText }}
            </span>
            <span v-else>{{ deliveryStatusMessage || t('loading') || 'Processing...' }}</span>
            <Download v-if="!isProcessing" class="w-4 h-4" />
            <Loader2 v-else class="w-4 h-4 animate-spin" />
          </button>
        </div>
      </div>
    </div>

    <!-- Multi-File Delivery Choice Modal (ZIP vs Separate) -->
    <div 
      v-if="isDeliveryModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
      @click.self="isDeliveryModalOpen = false"
    >
      <div class="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-150">
        <button 
          @click="isDeliveryModalOpen = false" 
          class="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-xl hover:bg-slate-100 transition cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>

        <div class="flex items-center space-x-3 mb-2">
          <div class="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Package class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-base font-extrabold text-slate-900">
              {{ t('split_delivery_modal_title') || 'Choose Delivery Method' }}
            </h3>
            <p class="text-xs text-slate-500 mt-0.5">
              {{ t('split_delivery_modal_desc', { count: pendingSplitPlan.length }) || `This operation generates ${pendingSplitPlan.length} PDF files.` }}
            </p>
          </div>
        </div>

        <!-- 2 Choice Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 my-5">
          <!-- Choice A: ZIP (Recommended) -->
          <button 
            type="button"
            @click="executeDelivery('zip')"
            :disabled="isDelivering"
            class="p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/80 transition text-left group cursor-pointer relative shadow-sm"
          >
            <div class="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2.5">
              <Package class="w-4 h-4" />
            </div>
            <div class="text-xs font-extrabold text-slate-900 group-hover:text-emerald-700 transition">
              {{ t('split_delivery_zip') || 'Download as ZIP (Recommended)' }}
            </div>
            <div class="text-[11px] text-slate-500 mt-1 leading-snug">
              {{ t('split_delivery_zip_desc') || 'Download all files in one single compressed archive without popup blocks.' }}
            </div>
          </button>

          <!-- Choice B: Separate Sequential Download -->
          <button 
            type="button"
            @click="executeDelivery('separate')"
            :disabled="isDelivering"
            class="p-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition text-left group cursor-pointer"
          >
            <div class="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-2.5">
              <Files class="w-4 h-4" />
            </div>
            <div class="text-xs font-extrabold text-slate-900 group-hover:text-slate-800 transition">
              {{ t('split_delivery_separate') || 'Download Separate Files' }}
            </div>
            <div class="text-[11px] text-slate-500 mt-1 leading-snug">
              {{ t('split_delivery_separate_desc') || 'Download each PDF individually in sequential order.' }}
            </div>
          </button>
        </div>

        <!-- Delivery Status / Spinner -->
        <div v-if="isDelivering" class="text-center py-2 text-xs font-semibold text-emerald-700 flex items-center justify-center space-x-2">
          <Loader2 class="w-4 h-4 animate-spin text-emerald-600" />
          <span>{{ deliveryStatusMessage }}</span>
        </div>

        <div class="flex items-center justify-end pt-2 border-t border-slate-100 text-xs text-slate-400">
          <span>{{ t('split_plan_count', { count: pendingSplitPlan.length }) }}</span>
        </div>
      </div>
    </div>

    <!-- Vault File Picker Modal (Single-select mode for Split) -->
    <VaultFilePickerModal
      :is-open="isVaultPickerOpen"
      :multiple="false"
      @select-files="handleVaultFilesSelected"
      @close="isVaultPickerOpen = false"
    />

    <!-- Password Unlock Modal -->
    <PasswordModal 
      :is-open="isPasswordOpen"
      :filename="pendingFileName"
      :error-message="passwordError"
      :is-unlocking="isUnlocking"
      @submit="handlePasswordSubmit"
      @cancel="handlePasswordCancel"
    />
  </section>
</template>

<script setup>
import { ref, computed, watch, onMounted, onActivated } from 'vue';
import { 
  Scissors, 
  Plus, 
  Download, 
  Loader2, 
  FolderLock, 
  Unlock, 
  RefreshCw,
  CheckSquare, 
  Square,
  Sparkles,
  Package,
  Files,
  X
} from 'lucide-vue-next';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { t } from '../i18n';
import { triggerDownload } from '../utils/download';
import { verifyPdfSecurity, loadCleanPdfDocument } from '../utils/pdfSecurity';
import { consumePendingFile } from '../utils/toolBridge';
import { saveFile } from '../utils/vaultDb';
import { userSettings } from '../utils/userSettings';
import { logger } from '../utils/logger';
import { generateExportFileName, sanitizeBaseFileName } from '../utils/filenameUtils';
import { createAndDownloadZip } from '../utils/zipUtils';
import PasswordModal from '../components/PasswordModal.vue';
import VaultFilePickerModal from '../components/VaultFilePickerModal.vue';

const fileInputRef = ref(null);
const docBytes = ref(null);
const filename = ref('');
const pages = ref([]);
const totalPages = ref(0);
const isDragOver = ref(false);
const isLoading = ref(false);
const isProcessing = ref(false);
const isVaultPickerOpen = ref(false);

// Active Split Mode ('extract' | 'burst' | 'interval' | 'multi_range')
const activeMode = ref('extract');

// Mode 1: Custom Extract
const selectedIndices = ref(new Set());
const rangeInput = ref('');
const extractFormat = ref('merge'); // 'merge' | 'separate'

// Mode 3: Fixed Interval
const intervalCount = ref(2);

// Mode 4: Multi-Range
const customRanges = ref([
  { id: 1, from: 1, to: 2 }
]);

// Export options (Dynamically synchronized with Global Settings)
const customOutputBaseName = ref('');
const autoSaveToVault = ref(userSettings.autoSaveToVault);

watch(() => userSettings.autoSaveToVault, (newVal) => {
  autoSaveToVault.value = Boolean(newVal);
}, { immediate: true });

// Password State
const isPasswordOpen = ref(false);
const passwordError = ref('');
const isUnlocking = ref(false);
const pendingFileName = ref('');
let pendingFileObj = null;
let unlockedPassword = '';

// Delivery Format State ('zip' | 'separate')
const deliveryFormat = ref('zip');

const isDeliveryToggleVisible = computed(() => {
  return activeMode.value !== 'extract' || extractFormat.value === 'separate';
});

// Delivery Modal State
const isDeliveryModalOpen = ref(false);
const isDelivering = ref(false);
const deliveryStatusMessage = ref('');
let pendingSplitPlan = ref([]);

const defaultFileNamePlaceholder = computed(() => {
  return generateExportFileName(filename.value, 'Split');
});

// Calculate interval plan items
const computedIntervalPlan = computed(() => {
  const result = [];
  const interval = Math.max(1, intervalCount.value || 1);
  let part = 1;
  for (let p = 1; p <= totalPages.value; p += interval) {
    const from = p;
    const to = Math.min(totalPages.value, p + interval - 1);
    result.push({ part, from, to, count: to - from + 1 });
    part++;
  }
  return result;
});

// Dynamic Primary Button Label
const primaryButtonText = computed(() => {
  if (activeMode.value === 'extract') {
    if (extractFormat.value === 'merge') {
      return `${t('extract_selected') || '🦭 Extract Selected'} (${selectedIndices.value.size})`;
    }
    const prefix = deliveryFormat.value === 'zip' 
      ? (t('split_btn_execute_zip') || '🦭 打包下载 ZIP') 
      : (t('split_btn_execute_separate') || '🦭 逐个下载 PDF');
    return `${prefix} (${selectedIndices.value.size} ${t('pages_label') || 'pages'})`;
  }

  const prefix = deliveryFormat.value === 'zip' 
    ? (t('split_btn_execute_zip') || '🦭 打包下载 ZIP') 
    : (t('split_btn_execute_separate') || '🦭 逐个下载 PDF');

  if (activeMode.value === 'burst') {
    return `${prefix} (${totalPages.value} ${t('pages_label') || 'pages'})`;
  }
  if (activeMode.value === 'interval') {
    return `${prefix} (${computedIntervalPlan.value.length} files)`;
  }
  if (activeMode.value === 'multi_range') {
    return `${prefix} (${customRanges.value.length} ranges)`;
  }
  return prefix;
});

const isExecutionDisabled = computed(() => {
  if (activeMode.value === 'extract') {
    return selectedIndices.value.size === 0;
  }
  if (activeMode.value === 'interval') {
    return intervalCount.value < 1 || totalPages.value === 0;
  }
  if (activeMode.value === 'multi_range') {
    return customRanges.value.length === 0;
  }
  return totalPages.value === 0;
});

function switchMode(mode) {
  activeMode.value = mode;
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
  isLoading.value = true;
  filename.value = file.name;
  pendingFileName.value = file.name;
  pendingFileObj = file;

  customOutputBaseName.value = generateExportFileName(file.name, 'Split');

  const rawBuffer = await file.arrayBuffer();

  // Strict encryption detection & validation
  const security = await verifyPdfSecurity(rawBuffer, password);
  if (security.isEncrypted && !security.isValid) {
    isLoading.value = false;
    isUnlocking.value = false;
    docBytes.value = null;
    isPasswordOpen.value = true;
    if (password) {
      passwordError.value = t('pwd_error_wrong');
    }
    return;
  }

  docBytes.value = new Uint8Array(rawBuffer);
  selectedIndices.value.clear();
  rangeInput.value = '';

  try {
    const pdfDataForViewer = new Uint8Array(rawBuffer.slice(0));
    const loadingTask = pdfjsLib.getDocument({ 
      data: pdfDataForViewer,
      password: password || undefined,
      cMapUrl: '/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: '/standard_fonts/'
    });
    
    const pdf = await loadingTask.promise;
    totalPages.value = pdf.numPages;
    pages.value = [];
    unlockedPassword = password;
    isPasswordOpen.value = false;
    passwordError.value = '';

    // Initialize default ranges based on page count
    customRanges.value = [
      { id: 1, from: 1, to: Math.min(2, totalPages.value) }
    ];
    if (totalPages.value > 2) {
      customRanges.value.push({ id: 2, from: 3, to: totalPages.value });
    }

    for (let i = 1; i <= totalPages.value; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 0.45 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;

      pages.value.push({
        index: i - 1,
        dataUrl: canvas.toDataURL()
      });
      // By default select all pages on load (compatible with E2E tests)
      selectedIndices.value.add(i - 1);
    }
  } catch (err) {
    if (err.name === 'PasswordException' || err.message?.toLowerCase().includes('password')) {
      docBytes.value = null;
      isPasswordOpen.value = true;
      if (password) {
        passwordError.value = t('pwd_error_wrong');
      }
    } else {
      alert('Failed to load PDF: ' + err.message);
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
  reset();
}

function onCardClick(idx) {
  if (activeMode.value === 'extract') {
    toggleSelection(idx);
  }
}

function toggleSelection(idx) {
  if (selectedIndices.value.has(idx)) {
    selectedIndices.value.delete(idx);
  } else {
    selectedIndices.value.add(idx);
  }
}

function selectAll() {
  pages.value.forEach(p => selectedIndices.value.add(p.index));
}

function clearAll() {
  selectedIndices.value.clear();
}

function selectOdds() {
  selectedIndices.value.clear();
  pages.value.forEach(p => {
    if ((p.index + 1) % 2 === 1) selectedIndices.value.add(p.index);
  });
}

function selectEvens() {
  selectedIndices.value.clear();
  pages.value.forEach(p => {
    if ((p.index + 1) % 2 === 0) selectedIndices.value.add(p.index);
  });
}

function applyRange() {
  if (!rangeInput.value.trim()) return;
  selectedIndices.value.clear();
  const parts = rangeInput.value.split(',');
  parts.forEach(part => {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const [start, end] = trimmed.split('-').map(n => parseInt(n, 10));
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
          if (i >= 1 && i <= totalPages.value) selectedIndices.value.add(i - 1);
        }
      }
    } else {
      const num = parseInt(trimmed, 10);
      if (!isNaN(num) && num >= 1 && num <= totalPages.value) {
        selectedIndices.value.add(num - 1);
      }
    }
  });
}

function addRange() {
  const last = customRanges.value[customRanges.value.length - 1];
  const nextFrom = last ? Math.min(totalPages.value, last.to + 1) : 1;
  const nextTo = Math.min(totalPages.value, nextFrom + 1);
  customRanges.value.push({
    id: Date.now(),
    from: nextFrom,
    to: nextTo
  });
}

function removeRange(index) {
  if (customRanges.value.length > 1) {
    customRanges.value.splice(index, 1);
  }
}

function getRangeTagForPage(pageNumber) {
  const idx = customRanges.value.findIndex(r => pageNumber >= r.from && pageNumber <= r.to);
  if (idx !== -1) {
    return `${t('split_range_item') || 'Part'} ${idx + 1}`;
  }
  return null;
}

function isPageSelectedInMode(idx) {
  if (activeMode.value === 'extract') {
    return selectedIndices.value.has(idx);
  }
  if (activeMode.value === 'burst') {
    return true;
  }
  if (activeMode.value === 'interval') {
    return true;
  }
  if (activeMode.value === 'multi_range') {
    const pNum = idx + 1;
    return customRanges.value.some(r => pNum >= r.from && pNum <= r.to);
  }
  return false;
}

function isPageExcludedInMode(idx) {
  if (activeMode.value === 'multi_range') {
    const pNum = idx + 1;
    return !customRanges.value.some(r => pNum >= r.from && pNum <= r.to);
  }
  return false;
}

function reset() {
  docBytes.value = null;
  filename.value = '';
  pages.value = [];
  selectedIndices.value.clear();
  rangeInput.value = '';
  totalPages.value = 0;
  unlockedPassword = '';
  activeMode.value = 'extract';
  extractFormat.value = 'merge';
  intervalCount.value = 2;
  customRanges.value = [{ id: 1, from: 1, to: 2 }];
  deliveryFormat.value = 'zip';
  isDeliveryModalOpen.value = false;
  pendingSplitPlan.value = [];
}

/**
 * Builds the array of PDF documents to be produced according to the active mode.
 * @returns {Promise<Array<{ name: string, data: Uint8Array, pageCount: number }>>}
 */
async function buildSplitOutputFiles() {
  if (!docBytes.value) return [];
  const preserveWatermarks = userSettings.preserveWatermarks !== false;
  const cleanDoc = await loadCleanPdfDocument(docBytes.value, {
    password: unlockedPassword || '',
    preserveWatermarks
  });

  const baseCleanName = (customOutputBaseName.value.trim() || generateExportFileName(filename.value, 'Split')).replace(/\.pdf$/i, '');
  const outputs = [];

  if (activeMode.value === 'extract') {
    const sortedIndices = Array.from(selectedIndices.value).sort((a, b) => a - b);
    if (sortedIndices.length === 0) return [];

    if (extractFormat.value === 'merge') {
      // Single combined document
      const newPdf = await PDFDocument.create();
      const copiedPages = await newPdf.copyPages(cleanDoc, sortedIndices);
      copiedPages.forEach(p => newPdf.addPage(p));
      const bytes = await newPdf.save({ useObjectStreams: true });
      outputs.push({
        name: `${baseCleanName}.pdf`,
        data: bytes,
        pageCount: sortedIndices.length
      });
    } else {
      // Separate files per selected page
      for (const pIdx of sortedIndices) {
        const singleDoc = await PDFDocument.create();
        const [copiedPage] = await singleDoc.copyPages(cleanDoc, [pIdx]);
        singleDoc.addPage(copiedPage);
        const bytes = await singleDoc.save({ useObjectStreams: true });
        outputs.push({
          name: `${baseCleanName}_Page_${pIdx + 1}.pdf`,
          data: bytes,
          pageCount: 1
        });
      }
    }
  } else if (activeMode.value === 'burst') {
    // Every page in document
    for (let p = 0; p < totalPages.value; p++) {
      const singleDoc = await PDFDocument.create();
      const [copiedPage] = await singleDoc.copyPages(cleanDoc, [p]);
      singleDoc.addPage(copiedPage);
      const bytes = await singleDoc.save({ useObjectStreams: true });
      outputs.push({
        name: `${baseCleanName}_Page_${p + 1}.pdf`,
        data: bytes,
        pageCount: 1
      });
    }
  } else if (activeMode.value === 'interval') {
    // Chunks of N pages
    const interval = Math.max(1, intervalCount.value || 1);
    let partIdx = 1;
    for (let p = 0; p < totalPages.value; p += interval) {
      const chunk = [];
      for (let c = p; c < Math.min(totalPages.value, p + interval); c++) {
        chunk.push(c);
      }
      const chunkDoc = await PDFDocument.create();
      const copied = await chunkDoc.copyPages(cleanDoc, chunk);
      copied.forEach(cp => chunkDoc.addPage(cp));
      const bytes = await chunkDoc.save({ useObjectStreams: true });
      outputs.push({
        name: `${baseCleanName}_Part_${partIdx}.pdf`,
        data: bytes,
        pageCount: chunk.length
      });
      partIdx++;
    }
  } else if (activeMode.value === 'multi_range') {
    // Multiple custom ranges
    for (let r = 0; r < customRanges.value.length; r++) {
      const range = customRanges.value[r];
      const from = Math.max(1, Math.min(range.from, range.to));
      const to = Math.min(totalPages.value, Math.max(range.from, range.to));
      const indices = [];
      for (let i = from; i <= to; i++) {
        indices.push(i - 1);
      }
      if (indices.length === 0) continue;

      const rangeDoc = await PDFDocument.create();
      const copied = await rangeDoc.copyPages(cleanDoc, indices);
      copied.forEach(cp => rangeDoc.addPage(cp));
      const bytes = await rangeDoc.save({ useObjectStreams: true });
      outputs.push({
        name: `${baseCleanName}_Range_${r + 1}.pdf`,
        data: bytes,
        pageCount: indices.length
      });
    }
  }

  return outputs;
}

/**
 * Handles Primary Split Button Click:
 * - If Mode 1 & merge: executes direct single-file PDF download & Vault archiving.
 * - Otherwise: executes delivery immediately according to deliveryFormat ('zip' or 'separate').
 */
async function handlePrimarySplitClick() {
  if (!docBytes.value || isExecutionDisabled.value) return;
  isProcessing.value = true;

  try {
    const files = await buildSplitOutputFiles();
    if (files.length === 0) return;

    if (activeMode.value === 'extract' && extractFormat.value === 'merge') {
      // Direct single-file download
      const singleFile = files[0];
      triggerDownload(new Blob([singleFile.data], { type: 'application/pdf' }), singleFile.name);
      
      if (autoSaveToVault.value) {
        await saveFile({
          name: singleFile.name,
          arrayBuffer: singleFile.data.buffer,
          folderId: 'default',
          category: 'export',
          pageCount: singleFile.pageCount
        });
        logger.info('VAULT', `Split result auto-saved to Vault: ${singleFile.name}`);
      }
      return;
    }

    // Direct execution of selected delivery format (ZIP or separate)
    pendingSplitPlan.value = files;
    await executeDelivery(deliveryFormat.value);
  } catch (err) {
    logger.error('SPLIT', `Split execution failed: ${err.message}`);
    alert('Failed to split PDF: ' + err.message);
  } finally {
    isProcessing.value = false;
  }
}

/**
 * Executes delivery for multiple files (ZIP or sequential separate downloads).
 */
async function executeDelivery(type) {
  if (!pendingSplitPlan.value || pendingSplitPlan.value.length === 0) return;
  isDelivering.value = true;

  const baseCleanName = (customOutputBaseName.value.trim() || generateExportFileName(filename.value, 'Split')).replace(/\.pdf$/i, '');

  try {
    if (type === 'zip') {
      deliveryStatusMessage.value = t('split_delivery_downloading_zip') || 'Compressing into ZIP and downloading...';
      const zipName = `${baseCleanName}_Split_Bundle.zip`;
      await createAndDownloadZip(pendingSplitPlan.value, zipName, (pct) => {
        deliveryStatusMessage.value = `${t('split_delivery_downloading_zip') || 'Compressing ZIP'} (${pct}%)`;
      });
    } else {
      // Sequential separate download with anti-choke delay
      const total = pendingSplitPlan.value.length;
      for (let i = 0; i < total; i++) {
        const f = pendingSplitPlan.value[i];
        deliveryStatusMessage.value = t('split_delivery_downloading_files', { current: i + 1, total }) || `Downloading (${i + 1}/${total})...`;
        triggerDownload(new Blob([f.data], { type: 'application/pdf' }), f.name);
        if (i < total - 1) {
          await new Promise(r => setTimeout(r, 250));
        }
      }
    }

    // Auto-save batch to Vault if checked
    if (autoSaveToVault.value) {
      for (const f of pendingSplitPlan.value) {
        await saveFile({
          name: f.name,
          arrayBuffer: f.data.buffer,
          folderId: 'default',
          category: 'export',
          pageCount: f.pageCount
        });
      }
      logger.info('VAULT', `Batch of ${pendingSplitPlan.value.length} split files saved to Vault`);
    }

    isDeliveryModalOpen.value = false;
  } catch (err) {
    logger.error('SPLIT_DELIVERY', `Delivery failed: ${err.message}`);
    alert('Delivery failed: ' + err.message);
  } finally {
    isDelivering.value = false;
    deliveryStatusMessage.value = '';
  }
}

function checkIncomingFile() {
  const incoming = consumePendingFile('split');
  if (incoming) {
    const file = new File([incoming.arrayBuffer], incoming.name, { type: 'application/pdf' });
    loadFile(file, incoming.password || '');
  }
}

onMounted(checkIncomingFile);
onActivated(checkIncomingFile);
</script>
