<template>
  <section class="w-full flex-1 flex flex-col">
    <!-- Main Card Container matching Merge & Organize tools -->
    <div class="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-7 shadow-xl border border-slate-100 flex flex-col flex-1">
      <!-- Universal File Input -->
      <input 
        ref="fileInputRef" 
        type="file" 
        accept="application/pdf,.pdf" 
        class="hidden" 
        @change="onFileSelected" 
      >

      <!-- Integrated Header with Dynamic Subtitle & Action Bar -->
      <div class="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 sm:pb-3 border-b border-slate-100 shrink-0">
        <div class="flex items-center space-x-3 min-w-0">
          <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-2xs">
            <Scissors class="w-4.5 h-4.5 sm:w-5 sm:h-5" />
          </div>
          <div class="min-w-0">
            <h2 class="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
              {{ t('split_title') }}
            </h2>
            <!-- Dynamic Subtitle: File selection info when active, otherwise tool description -->
            <div v-if="docBytes && !isProcessing && !isDelivering && !lastExportedFile" class="flex items-center space-x-2 mt-0.5 min-w-0">
              <span class="text-xs sm:text-sm font-extrabold text-slate-800 shrink-0">
                {{ totalPages }} {{ t('pages_label') || 'pages' }}
              </span>
              <span v-if="activeMode === 'extract'" class="text-xs bg-blue-50 text-blue-700 font-extrabold px-2 py-0.5 rounded-md border border-blue-200 shrink-0">
                {{ selectedIndices.size }} {{ t('selected_label') || 'selected' }}
              </span>
              <span class="text-xs font-bold text-slate-700 truncate max-w-[140px] sm:max-w-xs" :title="filename">
                {{ filename }}
              </span>
              <span 
                v-if="unlockedPassword" 
                class="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-md font-bold flex items-center shrink-0"
              >
                <Unlock class="w-3 h-3 mr-0.5" />
                {{ t('badge_unlocked') || 'Unlocked' }}
              </span>
            </div>
            <p v-else class="text-xs text-slate-500 mt-0.5 hidden sm:block">
              {{ t('split_desc') }}
            </p>
          </div>
        </div>

        <!-- Quick Action Buttons (Fused into Top Header when file is active) -->
        <div v-if="docBytes && !isProcessing && !isDelivering && !lastExportedFile" class="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
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
            data-testid="split-reset-btn"
            class="text-xs text-rose-600 hover:bg-rose-50 font-semibold px-2.5 py-1.5 rounded-xl transition cursor-pointer"
          >
            {{ t('btn_clear_all') || 'Clear' }}
          </button>
        </div>
      </div>

      <!-- State A: Empty State (Dual Source Dropzone: Local & Vault) -->
      <div 
        v-if="!docBytes"
        @dragover.prevent="isDragOver = true"
        @dragleave.prevent="isDragOver = false"
        @drop.prevent="onDrop"
        :class="[
          'flex-1 border-2 border-dashed rounded-2xl sm:rounded-3xl p-6 sm:p-14 text-center transition flex flex-col items-center justify-center my-3 sm:my-4 relative select-none',
          isDragOver ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200/90 hover:border-emerald-400 bg-slate-50/40 hover:bg-slate-50/80'
        ]"
      >
        <div class="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-50 text-emerald-600 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-3 shadow-inner">
          <Scissors class="w-7 h-7 sm:w-8 sm:h-8" />
        </div>
        
        <h3 class="text-base sm:text-lg font-bold text-slate-800">{{ t('split_drop_title') }}</h3>
        <p class="text-xs text-slate-400 mt-1 max-w-sm hidden sm:block">{{ t('split_drop_subtitle') }}</p>
        
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

      <!-- State B: Active Document Workspace OR Unified Result Delivery -->
      <div v-else :class="['flex-1 flex flex-col justify-between min-h-0 overflow-hidden', isProcessing || isDelivering || lastExportedFile ? 'pt-4' : 'pt-2.5 sm:pt-3']">
        <!-- 2A. Unified Processing & Result Delivery View upon Completion -->
        <ResultDeliveryView 
          v-if="isProcessing || isDelivering || lastExportedFile"
          :is-processing="isProcessing || isDelivering"
          :progress-percent="progressPercent"
          :progress-message="progressMessage"
          :file="lastExportedFile"
          source-tool="split"
          :page-count="lastExportedPageCount"
          @redownload="handleReDownload"
          @new-task="reset"
          @back-to-edit="handleBackToEdit"
          @send-to-tool="(tId) => emit('send-to-tool', tId)"
        >
          <template #metrics>
            <span 
              v-if="lastExportedFile?.isZip" 
              class="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80 shadow-2xs"
            >
              {{ lastExportedCount }} {{ t('split_metric_bundle') || 'files in ZIP archive' }}
            </span>
            <span 
              v-else-if="lastExportedFile?.isSeparate"
              class="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80 shadow-2xs"
            >
              {{ lastExportedCount }} {{ t('split_metric_bundle') || 'files downloaded' }}
            </span>
            <span 
              v-else-if="lastExportedPageCount"
              class="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80 shadow-2xs"
            >
              {{ lastExportedPageCount }} {{ t('pages_label') || 'pages' }}
            </span>
          </template>
        </ResultDeliveryView>

        <!-- 2B. Interactive Split Settings Workspace & Thumbnail Grid -->
        <div v-else class="flex-1 flex flex-col justify-between overflow-hidden min-h-0">

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
          <!-- Mode 1: Custom Range + Merge/Separate Format + Batch Selection -->
          <div v-if="activeMode === 'extract'" class="bg-slate-50/90 rounded-2xl p-2.5 sm:p-3 mb-2 border border-slate-200/80 flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0">
            <!-- Quick Page Selection Helpers -->
            <div class="flex items-center space-x-1.5 flex-wrap gap-y-1">
              <button 
                @click="selectAll" 
                class="text-xs bg-white hover:bg-slate-100 text-slate-700 font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 transition flex items-center space-x-1 cursor-pointer"
                :title="t('btn_select_all')"
              >
                <CheckSquare class="w-3.5 h-3.5 text-slate-600" />
                <span>{{ t('btn_select_all') || 'Select All' }}</span>
              </button>

              <button 
                @click="clearAll" 
                class="text-xs bg-white hover:bg-slate-100 text-slate-700 font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 transition flex items-center space-x-1 cursor-pointer"
                :title="t('btn_deselect_all')"
              >
                <Square class="w-3.5 h-3.5 text-slate-600" />
                <span>{{ t('btn_deselect_all') || 'Deselect All' }}</span>
              </button>

              <button 
                @click="selectOdds" 
                class="text-xs bg-white hover:bg-slate-100 text-slate-600 font-medium px-2 py-1.5 rounded-xl border border-slate-200 transition cursor-pointer"
              >
                {{ t('split_btn_select_odds') || 'Odd' }}
              </button>

              <button 
                @click="selectEvens" 
                class="text-xs bg-white hover:bg-slate-100 text-slate-600 font-medium px-2 py-1.5 rounded-xl border border-slate-200 transition cursor-pointer"
              >
                {{ t('split_btn_select_evens') || 'Even' }}
              </button>
            </div>

            <!-- Custom Page Range Input -->
            <div class="flex items-center space-x-2 flex-1 min-w-[240px] max-w-sm">
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
            <div class="flex items-center space-x-3 text-xs text-slate-700 font-medium pl-1 sm:border-l sm:border-slate-200">
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
                  :title="t('action_delete', 'Delete')"
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

          <!-- Loading State -->
          <div v-if="isLoading" class="flex-1 flex flex-col items-center justify-center py-20 text-center text-xs text-slate-500 font-medium">
            <Loader2 class="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-600" />
            <span>{{ t('rendering_pages') }}...</span>
          </div>

          <!-- 4. Interactive Thumbnail Cards Grid -->
          <div 
            v-else 
            class="flex-1 my-2 overflow-y-auto min-h-[200px] max-h-[calc(100vh-465px)] pr-1 grid content-start items-start grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-8 gap-3 select-none"
          >
            <div 
              v-for="(p, idx) in pages" 
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
              <div class="overflow-hidden rounded-xl border border-slate-200/60 flex items-center justify-center bg-white w-full h-40 relative group">
                <img 
                  :src="p.dataUrl" 
                  class="max-h-full max-w-full object-contain pointer-events-none"
                >
                <!-- Zoom Button -->
                <button
                  type="button"
                  @click.stop="openPreview(idx)"
                  :title="t('action_preview', 'Preview Full Size')"
                  class="absolute top-2 right-2 p-1.5 bg-slate-800/75 hover:bg-slate-800 text-white rounded-md opacity-85 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
                >
                  <ZoomIn class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <!-- Bottom Cluster: Output Settings & Sticky Action Bar -->
          <div class="shrink-0 pt-2 sticky bottom-14 md:static z-20 bg-white/95 backdrop-blur-md -mx-3.5 sm:mx-0 px-3.5 sm:px-0 pb-2 sm:pb-0 border-t border-slate-100 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] md:shadow-none space-y-2">
            <!-- 5. Bottom Action & Export Configuration Bar -->
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <!-- Left: Output Filename, Delivery Format & Auto-save Checkbox (Desktop visible, phone hidden) -->
              <div class="hidden sm:flex flex-wrap items-center gap-3">
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
                  <span class="text-xs text-slate-500 font-semibold shrink-0">{{ t('split_delivery_format_label', 'Format:') }}</span>
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
                      <span>{{ t('split_delivery_zip_pill', '📦 ZIP Archive') }}</span>
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
                      <span>{{ t('split_delivery_separate_pill', '📄 Separate PDFs') }}</span>
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

              <!-- Right: Execution Button (Sticky & Full-width on mobile) -->
              <button 
                :disabled="isProcessing || isLoading || isExecutionDisabled"
                @click="handlePrimarySplitClick" 
                class="w-full sm:w-auto sm:ml-auto bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition flex items-center justify-center space-x-2 shadow-lg hover:shadow-emerald-600/25 disabled:opacity-50 cursor-pointer"
              >
                <Loader2 v-if="isProcessing" class="w-4 h-4 animate-spin" />
                <Scissors v-else class="w-4 h-4" />
                <span>{{ isProcessing ? (deliveryStatusMessage || t('loading') || 'Processing...') : primaryButtonText }}</span>
              </button>
            </div>
          </div>
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

    <PasswordModal 
      :is-open="isPasswordOpen"
      :filename="pendingFileName"
      :error-message="passwordError"
      :is-unlocking="isUnlocking"
      @submit="handlePasswordSubmit"
      @cancel="handlePasswordCancel"
    />

    <PagePreviewModal
      :is-open="isPreviewOpen"
      :is-loading="isPreviewLoading"
      :img-src="previewImgSrc"
      :rotation="0"
      @close="closePreview"
    />
  </section>
</template>

<script setup>
import { ref, computed, watch, inject, onMounted, onActivated, onUnmounted } from 'vue';
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
  X,
  ZoomIn
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
import ResultDeliveryView from '../components/ResultDeliveryView.vue';
import PagePreviewModal from '../components/PagePreviewModal.vue';

const emit = defineEmits(['send-to-tool']);

const workspaceState = inject('workspaceActiveState', null);

const lastExportedFile = ref(null);
const showNextActions = ref(false);
const progressPercent = ref(0);
const progressMessage = ref('');
const lastExportedPageCount = ref(0);
const lastExportedCount = ref(0);

// Page Preview Modal State
const isPreviewOpen = ref(false);
const isPreviewLoading = ref(false);
const previewImgSrc = ref('');
let splitPdfDoc = null;

async function destroySplitPdfDoc() {
  if (splitPdfDoc) {
    try { await splitPdfDoc.destroy(); } catch (e) {}
    splitPdfDoc = null;
  }
}

async function openPreview(idx) {
  const p = pages.value[idx];
  if (!p) return;
  
  isPreviewOpen.value = true;
  isPreviewLoading.value = true;
  
  try {
    let targetPdf = splitPdfDoc;
    let needDestroy = false;
    
    if (!targetPdf && docBytes.value) {
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(docBytes.value.slice(0)),
        password: unlockedPassword || undefined,
        cMapUrl: '/cmaps/',
        cMapPacked: true,
        standardFontDataUrl: '/standard_fonts/'
      });
      targetPdf = await loadingTask.promise;
      needDestroy = true;
    }
    
    if (!targetPdf) {
      previewImgSrc.value = p.dataUrl;
      return;
    }
    
    const page = await targetPdf.getPage(idx + 1);
    const rotation = page.rotate || 0;
    const viewport = page.getViewport({ scale: 2.5, rotation });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    await page.render({
      canvasContext: ctx,
      viewport,
      intent: 'display'
    }).promise;
    
    previewImgSrc.value = canvas.toDataURL('image/png');
    
    if (needDestroy) {
      try { await targetPdf.destroy(); } catch (e) {}
    }
  } catch (err) {
    logger.error('PREVIEW', 'Failed to generate high-res preview: ' + err.message);
    previewImgSrc.value = p.dataUrl; // fallback
  } finally {
    isPreviewLoading.value = false;
  }
}

function closePreview() {
  isPreviewOpen.value = false;
  setTimeout(() => {
    previewImgSrc.value = '';
  }, 200);
}
let cachedGeneratedOutputs = null;
let cachedZipBlob = null;
let cachedZipName = '';

const fileInputRef = ref(null);
const docBytes = ref(null);

watch(() => Boolean(docBytes.value), (active) => {
  workspaceState?.setActiveFile(active);
}, { immediate: true });

onActivated(() => {
  workspaceState?.setActiveFile(Boolean(docBytes.value));
});

const filename = ref('');
const pages = ref([]);
const totalPages = ref(0);
const isDragOver = ref(false);
const isLoading = ref(false);
const isProcessing = ref(false);
const isDelivering = ref(false);
const deliveryStatusMessage = ref('');
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
      return `${t('extract_selected', 'Extract Selected')} (${selectedIndices.value.size})`;
    }
    const prefix = deliveryFormat.value === 'zip' 
      ? t('split_btn_execute_zip', 'Download ZIP') 
      : t('split_btn_execute_separate', 'Download Separate PDFs');
    return `${prefix} (${selectedIndices.value.size} ${t('pages_label', 'pages')})`;
  }

  const prefix = deliveryFormat.value === 'zip' 
    ? t('split_btn_execute_zip', 'Download ZIP') 
    : t('split_btn_execute_separate', 'Download Separate PDFs');

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
  showNextActions.value = false;
  lastExportedFile.value = null;

  try {
    const pdfDataForViewer = new Uint8Array(rawBuffer.slice(0));
    const loadingTask = pdfjsLib.getDocument({ 
      data: pdfDataForViewer,
      password: password || undefined,
      cMapUrl: '/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: '/standard_fonts/'
    });
    
    await destroySplitPdfDoc();
    const pdf = await loadingTask.promise;
    splitPdfDoc = pdf;
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

function handleBackToEdit() {
  lastExportedFile.value = null;
  isProcessing.value = false;
  isDelivering.value = false;
  progressPercent.value = 0;
  progressMessage.value = '';
}

function handleReDownload() {
  if (!lastExportedFile.value) return;

  if (lastExportedFile.value.isZip && cachedZipBlob) {
    triggerDownload(cachedZipBlob, cachedZipName || lastExportedFile.value.name);
  } else if (lastExportedFile.value.isSeparate && cachedGeneratedOutputs) {
    for (let i = 0; i < cachedGeneratedOutputs.length; i++) {
      const f = cachedGeneratedOutputs[i];
      setTimeout(() => {
        triggerDownload(new Blob([f.data], { type: 'application/pdf' }), f.name);
      }, i * 200);
    }
  } else if (lastExportedFile.value.arrayBuffer) {
    triggerDownload(new Blob([lastExportedFile.value.arrayBuffer], { type: 'application/pdf' }), lastExportedFile.value.name);
  }
}

function reset() {
  destroySplitPdfDoc();
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
  pendingSplitPlan.value = [];
  showNextActions.value = false;
  lastExportedFile.value = null;
  lastExportedPageCount.value = 0;
  lastExportedCount.value = 0;
  progressPercent.value = 0;
  progressMessage.value = '';
  cachedGeneratedOutputs = null;
  cachedZipBlob = null;
  cachedZipName = '';
}

/**
 * Builds the array of PDF documents to be produced according to the active mode.
 * Actively yields to the event loop so progress updates render and UI does not freeze.
 * @param {Function} [onProgress] - (percent: number, total: number, message: string) => void
 * @returns {Promise<Array<{ name: string, data: Uint8Array, pageCount: number }>>}
 */
async function buildSplitOutputFiles(onProgress = () => {}) {
  if (!docBytes.value) return [];
  const preserveWatermarks = userSettings.preserveWatermarks !== false;

  onProgress(5, 100, t('split_progress_preparing', 'Analyzing document structure & split plan...'));
  await new Promise(r => setTimeout(r, 40));

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
      onProgress(35, 100, t('split_progress_slicing', { current: 1, total: 1 }, 'Generating slice 1/1...'));
      await new Promise(r => setTimeout(r, 30));

      const newPdf = await PDFDocument.create();
      const copiedPages = await newPdf.copyPages(cleanDoc, sortedIndices);
      copiedPages.forEach(p => newPdf.addPage(p));
      const bytes = await newPdf.save({ useObjectStreams: true });
      outputs.push({
        name: `${baseCleanName}.pdf`,
        data: bytes,
        pageCount: sortedIndices.length
      });
      onProgress(85, 100, t('split_progress_done', 'Split Complete!'));
      await new Promise(r => setTimeout(r, 30));
    } else {
      // Separate files per selected page
      const total = sortedIndices.length;
      for (let i = 0; i < total; i++) {
        const pIdx = sortedIndices[i];
        const pct = Math.round(15 + ((i + 1) / total) * 65);
        onProgress(pct, 100, t('split_progress_slicing', { current: i + 1, total }, `Generating slice ${i + 1}/${total}...`));
        await new Promise(r => setTimeout(r, 40));

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
    const total = totalPages.value;
    for (let p = 0; p < total; p++) {
      const pct = Math.round(15 + ((p + 1) / total) * 65);
      onProgress(pct, 100, t('split_progress_slicing', { current: p + 1, total }, `Generating slice ${p + 1}/${total}...`));
      await new Promise(r => setTimeout(r, 40));

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
    const plan = computedIntervalPlan.value;
    const total = plan.length;
    for (let idx = 0; idx < total; idx++) {
      const item = plan[idx];
      const pct = Math.round(15 + ((idx + 1) / total) * 65);
      onProgress(pct, 100, t('split_progress_slicing', { current: idx + 1, total }, `Generating slice ${idx + 1}/${total}...`));
      await new Promise(r => setTimeout(r, 40));

      const chunk = [];
      for (let c = item.from - 1; c < item.to; c++) {
        chunk.push(c);
      }
      const chunkDoc = await PDFDocument.create();
      const copied = await chunkDoc.copyPages(cleanDoc, chunk);
      copied.forEach(cp => chunkDoc.addPage(cp));
      const bytes = await chunkDoc.save({ useObjectStreams: true });
      outputs.push({
        name: `${baseCleanName}_Part_${item.part}.pdf`,
        data: bytes,
        pageCount: chunk.length
      });
    }
  } else if (activeMode.value === 'multi_range') {
    // Multiple custom ranges
    const total = customRanges.value.length;
    for (let r = 0; r < total; r++) {
      const range = customRanges.value[r];
      const from = Math.max(1, Math.min(range.from, range.to));
      const to = Math.min(totalPages.value, Math.max(range.from, range.to));
      const indices = [];
      for (let i = from; i <= to; i++) {
        indices.push(i - 1);
      }
      if (indices.length === 0) continue;

      const pct = Math.round(15 + ((r + 1) / total) * 65);
      onProgress(pct, 100, t('split_progress_slicing', { current: r + 1, total }, `Generating slice ${r + 1}/${total}...`));
      await new Promise(r => setTimeout(r, 40));

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
  progressPercent.value = 5;
  progressMessage.value = t('split_progress_preparing', 'Analyzing document structure & split plan...');

  try {
    const files = await buildSplitOutputFiles((pct, total, msg) => {
      progressPercent.value = pct;
      progressMessage.value = msg;
    });

    if (files.length === 0) {
      isProcessing.value = false;
      return;
    }

    cachedGeneratedOutputs = files;
    lastExportedCount.value = files.length;

    if (files.length === 1 || (activeMode.value === 'extract' && extractFormat.value === 'merge')) {
      // Direct single-file download
      const singleFile = files[0];
      progressPercent.value = 90;
      progressMessage.value = t('split_progress_done', 'Split Complete!');
      await new Promise(r => setTimeout(r, 50));

      triggerDownload(new Blob([singleFile.data], { type: 'application/pdf' }), singleFile.name);
      
      lastExportedPageCount.value = singleFile.pageCount;
      lastExportedFile.value = {
        name: singleFile.name,
        arrayBuffer: singleFile.data.buffer ? singleFile.data.buffer.slice(singleFile.data.byteOffset, singleFile.data.byteOffset + singleFile.data.byteLength) : singleFile.data,
        size: singleFile.data.byteLength,
        isZip: false,
        isSeparate: false
      };
      showNextActions.value = true;

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

      progressPercent.value = 100;
      progressMessage.value = t('split_progress_done', 'Split Complete!');
      await new Promise(r => setTimeout(r, 150));
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
      progressMessage.value = t('split_progress_packaging_zip', 'Packaging into ZIP archive...');
      const zipName = `${baseCleanName}_Split_Bundle.zip`;
      
      const { zipBlob, zipFileName } = await createAndDownloadZip(
        pendingSplitPlan.value, 
        zipName, 
        (pct) => {
          progressPercent.value = Math.min(98, Math.round(85 + (pct * 0.13)));
          progressMessage.value = `${t('split_progress_packaging_zip', 'Packaging into ZIP archive...')} (${pct}%)`;
        }
      );

      cachedZipBlob = zipBlob;
      cachedZipName = zipFileName;

      const zipBuffer = await zipBlob.arrayBuffer();

      lastExportedFile.value = {
        name: zipFileName,
        arrayBuffer: zipBuffer,
        size: zipBlob.size,
        isZip: true,
        isSeparate: false
      };
      lastExportedPageCount.value = 0;
      showNextActions.value = true;
    } else {
      // Sequential separate download with anti-choke delay & event loop yield
      const total = pendingSplitPlan.value.length;
      for (let i = 0; i < total; i++) {
        const f = pendingSplitPlan.value[i];
        const pct = Math.round(85 + ((i + 1) / total) * 12);
        progressPercent.value = pct;
        progressMessage.value = t('split_delivery_downloading_files', { current: i + 1, total }, `Downloading files (${i + 1}/${total})...`);
        triggerDownload(new Blob([f.data], { type: 'application/pdf' }), f.name);
        if (i < total - 1) {
          await new Promise(r => setTimeout(r, 200));
        }
      }

      const totalBytes = pendingSplitPlan.value.reduce((acc, f) => acc + (f.data?.byteLength || 0), 0);
      lastExportedFile.value = {
        name: `${baseCleanName} (${total} files)`,
        arrayBuffer: pendingSplitPlan.value[0]?.data.buffer || new ArrayBuffer(0),
        size: totalBytes,
        isZip: false,
        isSeparate: true
      };
      lastExportedPageCount.value = 0;
      showNextActions.value = true;
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

    progressPercent.value = 100;
    progressMessage.value = t('split_progress_done', 'Split Complete!');
    await new Promise(r => setTimeout(r, 150));
  } catch (err) {
    logger.error('SPLIT_DELIVERY', `Delivery failed: ${err.message}`);
    alert('Delivery failed: ' + err.message);
  } finally {
    isDelivering.value = false;
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
onUnmounted(destroySplitPdfDoc);
</script>
