<template>
  <section class="w-full flex-1 flex flex-col">
    <div class="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-7 shadow-xl border border-slate-100 flex flex-col flex-1">
      <!-- Universal File Input -->
      <input ref="fileInputRef" type="file" accept="application/pdf,.pdf" class="hidden" @change="onFileSelected">

      <!-- Top Title Header (Fused Compact Header with Dynamic Subtitle & Action Bar) -->
      <div class="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 sm:pb-3 border-b border-slate-100 shrink-0">
        <div class="flex items-center space-x-3 min-w-0">
          <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold shadow-2xs">
            <EyeOff class="w-4.5 h-4.5 sm:w-5 sm:h-5" />
          </div>
          <div class="min-w-0">
            <h2 class="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
              {{ t('redact_title') }}
            </h2>
            <!-- Dynamic Subtitle: File selection info when active, otherwise tool description -->
            <div v-if="docBytes && !isProcessing && !lastExportedFile" class="flex items-center space-x-2 mt-0.5 min-w-0">
              <span class="text-xs sm:text-sm font-extrabold text-slate-800 shrink-0">
                {{ totalPages }} {{ t('pages_label') || 'pages' }}
              </span>
              <span class="text-xs font-bold text-slate-700 truncate max-w-[140px] sm:max-w-xs" :title="filename">
                {{ filename }}
              </span>
              <span 
                v-if="unlockedPassword" 
                class="text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded-md font-bold shrink-0 flex items-center"
              >
                <Unlock class="w-3 h-3 mr-0.5" />
                {{ t('badge_unlocked') || 'Unlocked' }}
              </span>
            </div>
            <p v-else class="text-xs text-slate-400 font-medium hidden sm:block mt-0.5">
              {{ t('redact_desc') }}
            </p>
          </div>
        </div>

        <!-- Quick Action Buttons (Fused into Top Header when file is active) -->
        <div v-if="docBytes && !isProcessing && !lastExportedFile" class="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          <!-- Choose Another Local File -->
          <button
            @click="fileInputRef.click()"
            class="text-xs text-slate-700 hover:bg-slate-100 font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 transition flex items-center space-x-1 cursor-pointer"
          >
            <RefreshCw class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">{{ t('btn_choose_another') || 'Choose Another File' }}</span>
          </button>

          <!-- Choose From Vault -->
          <button
            @click="isVaultPickerOpen = true"
            class="text-xs text-slate-700 hover:bg-slate-100 font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 transition flex items-center space-x-1 cursor-pointer"
          >
            <FolderLock class="w-3.5 h-3.5 text-slate-700" />
            <span class="hidden sm:inline">{{ t('merge_btn_from_vault') || 'Pick from Vault' }}</span>
          </button>

          <!-- Clear / Reset -->
          <button
            @click="reset"
            data-testid="redact-reset-btn"
            class="text-xs text-rose-600 hover:bg-rose-50 font-semibold px-2.5 py-1.5 rounded-xl transition cursor-pointer"
          >
            {{ t('btn_clear_all') }}
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
          'flex-1 border-2 border-dashed rounded-2xl sm:rounded-3xl p-6 sm:p-14 text-center transition flex flex-col items-center justify-center my-3 sm:my-4',
          isDragOver ? 'border-slate-800 bg-slate-100/50 scale-[0.99]' : 'border-slate-200 hover:border-slate-400 bg-slate-50/50'
        ]"
      >
        <div class="w-14 h-14 sm:w-16 sm:h-16 bg-slate-100 text-slate-800 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-3 shadow-inner">
          <EyeOff class="w-7 h-7 sm:w-8 sm:h-8" />
        </div>
        <h3 class="text-base sm:text-lg font-bold text-slate-800">{{ t('redact_drop_title') }}</h3>
        <p class="text-xs text-slate-400 mt-1 max-w-sm hidden sm:block">{{ t('redact_drop_subtitle') }}</p>

        <!-- Dual Source Selection Buttons -->
        <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            @click="fileInputRef.click()"
            class="bg-slate-900 hover:bg-slate-800 active:scale-98 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition flex items-center space-x-2 shadow-md hover:shadow-slate-900/25 cursor-pointer"
          >
            <Plus class="w-4 h-4" />
            <span>{{ t('merge_btn_from_local') || 'Add from Computer' }}</span>
          </button>
          <button
            type="button"
            @click="isVaultPickerOpen = true"
            class="bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center space-x-2 border border-slate-200 shadow-2xs hover:border-slate-300 cursor-pointer"
          >
            <FolderLock class="w-4 h-4 text-slate-700" />
            <span>{{ t('merge_btn_from_vault') || 'Pick from Vault' }}</span>
          </button>
        </div>
      </div>

      <!-- State B: Active Document Workspace OR UNIFIED RESULT DELIVERY -->
      <div v-else :class="['flex-1 flex flex-col justify-between min-h-0 overflow-hidden', isProcessing || lastExportedFile ? 'pt-4' : 'pt-2.5 sm:pt-3']">
        <!-- Unified Processing & Result Delivery View -->
        <ResultDeliveryView
          v-if="isProcessing || lastExportedFile"
          :is-processing="isProcessing"
          :progress-percent="progressPercent"
          :progress-message="progressMessage"
          :file="lastExportedFile"
          source-tool="redact"
          :page-count="totalPages"
          @redownload="handleReDownload"
          @new-task="handleNewTask"
          @back-to-edit="handleBackToEdit"
          @send-to-tool="(tId) => emit('send-to-tool', tId)"
        >
          <template #metrics>
            <span class="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60 shadow-2xs">
              <CheckCircle2 class="w-3.5 h-3.5 text-emerald-600" />
              <span>{{ t('redact_metric_badge', '{ops} text items erased · {pages} pages rasterized · zero residue verified', { ops: lastReport?.totalRemovedOps ?? 0, pages: lastReport?.rasterPages?.length ?? 0 }) }}</span>
            </span>
          </template>
        </ResultDeliveryView>

        <!-- Staging Workspace & Bottom Execution Bar -->
        <div v-else class="flex-1 flex flex-col min-h-0 overflow-hidden">

          <!-- Loading State -->
          <div v-if="isLoading" class="flex-1 flex flex-col items-center justify-center py-16 text-center text-xs text-slate-500 font-medium">
            <Loader2 class="w-8 h-8 animate-spin mx-auto mb-3 text-slate-700" />
            <span>{{ t('rendering_pages') }}...</span>
          </div>

          <!-- Center Workspace: Controls & Live Preview -->
          <div
            v-else
            class="grid grid-cols-1 lg:grid-cols-12 gap-3 my-1.5 flex-1 items-stretch min-h-[380px] lg:max-h-[calc(100vh-295px)] overflow-hidden"
            :style="{ gridTemplateRows: 'minmax(0, 1fr)' }"
          >
            <!-- Left Controls (5 cols on lg) -->
            <div class="lg:col-span-5 bg-slate-50/80 rounded-2xl p-2 sm:p-2.5 border border-slate-200/80 flex flex-col min-h-0 overflow-y-auto custom-scrollbar gap-1.5 h-full max-h-full">
              <!-- Top Controls: Header & Mask Style (shrink-0) -->
              <div class="shrink-0 space-y-1.5">
                <!-- Section Header with Snap Toggle -->
                <div class="flex items-center justify-between font-bold text-slate-800 text-xs border-b border-slate-200/70 pb-1.5 shrink-0">
                  <div class="flex items-center space-x-1.5">
                    <Sliders class="w-3.5 h-3.5 text-slate-700" />
                    <span>{{ t('redact_controls') || 'Redaction Controls' }}</span>
                  </div>
                  <button
                    type="button"
                    @click="snapToText = !snapToText"
                    :class="[
                      'text-[10.5px] font-bold rounded-lg px-2 py-0.5 border transition flex items-center gap-1 cursor-pointer select-none',
                      snapToText ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-2xs' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    ]"
                    :title="t('redact_snap_toggle')"
                  >
                    <Magnet class="w-3 h-3" />
                    <span>{{ t('redact_snap_toggle') }}</span>
                  </button>
                </div>

                <!-- Mask Style Selector: 2-Mode Cards + Universal Color + Stamp Config -->
                <div class="space-y-1.5">
                  <label class="block text-[11px] font-semibold text-slate-700">{{ t('redact_style_title') || 'Mask Style' }}</label>

                  <!-- Two Primary Mask Mode Cards (Solid Block vs Text Stamp) -->
                  <div class="grid grid-cols-2 gap-1.5">
                    <!-- Block Mode Card -->
                    <button
                      type="button"
                      @click="maskType = 'block'"
                      :class="[
                        'border rounded-xl p-1.5 px-2 text-left transition cursor-pointer flex items-center gap-2 select-none',
                        maskType === 'block'
                          ? 'border-slate-800 bg-white ring-1 ring-slate-800 shadow-xs'
                          : 'border-slate-200 bg-white/70 hover:border-slate-300'
                      ]"
                    >
                      <div
                        class="w-14 sm:w-16 h-6 rounded-md shrink-0 border border-black/15 shadow-2xs flex items-center justify-center transition-colors"
                        :style="{ backgroundColor: customColor }"
                      >
                        <span v-if="customColor.toLowerCase() === '#ffffff'" class="text-[7.5px] text-slate-400 font-bold uppercase tracking-wider">WHITE</span>
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="text-[11px] font-bold text-slate-800 truncate leading-tight">{{ t('redact_type_block') }}</div>
                        <div class="text-[9.5px] text-slate-400 truncate leading-tight mt-0.5">{{ t('redact_type_block_desc') }}</div>
                      </div>
                    </button>

                    <!-- Stamp Mode Card -->
                    <button
                      type="button"
                      @click="maskType = 'stamp'"
                      :class="[
                        'border rounded-xl p-1.5 px-2 text-left transition cursor-pointer flex items-center gap-2 select-none',
                        maskType === 'stamp'
                          ? 'border-slate-800 bg-white ring-1 ring-slate-800 shadow-xs'
                          : 'border-slate-200 bg-white/70 hover:border-slate-300'
                      ]"
                    >
                      <div
                        class="w-14 sm:w-16 h-6 rounded-md shrink-0 border border-black/15 shadow-2xs flex items-center justify-center text-[7.5px] font-black uppercase px-1 truncate transition-colors"
                        :style="{
                          backgroundColor: customColor,
                          color: isLightColor(customColor) ? '#000000' : '#ffffff'
                        }"
                      >
                        {{ stampText || '[REDACTED]' }}
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="text-[11px] font-bold text-slate-800 truncate leading-tight">{{ t('redact_type_stamp') }}</div>
                        <div class="text-[9.5px] text-slate-400 truncate leading-tight mt-0.5">{{ t('redact_type_stamp_desc') }}</div>
                      </div>
                    </button>
                  </div>

                  <!-- Universal Color Palette Bar (for BOTH Block and Stamp) -->
                  <div class="p-1.5 px-2 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                    <div class="flex items-center justify-between text-[10.5px] font-bold text-slate-700">
                      <span class="flex items-center gap-1">
                        <Palette class="w-3 h-3 text-slate-500" />
                        <span>{{ maskType === 'stamp' ? t('redact_stamp_color_label') : t('redact_custom_color_label') }}</span>
                      </span>
                      <span class="text-[9.5px] text-slate-500 font-mono uppercase">{{ customColor }}</span>
                    </div>
                    <div class="flex items-center space-x-1.5">
                      <div class="flex items-center space-x-1.5 flex-1 overflow-x-auto py-0.5 custom-scrollbar">
                        <button
                          v-for="c in colorPresets"
                          :key="c"
                          type="button"
                          @click="customColor = c"
                          :style="{ backgroundColor: c }"
                          :class="[
                            'w-5 h-5 rounded-full ring-2 ring-offset-1 transition cursor-pointer shrink-0 border border-black/15',
                            customColor.toLowerCase() === c.toLowerCase() ? 'ring-slate-900 scale-110 shadow-xs' : 'ring-transparent opacity-85 hover:opacity-100'
                          ]"
                          :title="c"
                        />
                      </div>
                      <div class="relative w-5.5 h-5.5 rounded-lg border border-slate-300 overflow-hidden shadow-2xs cursor-pointer shrink-0">
                        <input
                          type="color"
                          v-model="customColor"
                          class="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                        />
                        <div class="w-full h-full" :style="{ backgroundColor: customColor }"></div>
                      </div>
                      <div class="relative w-16 shrink-0">
                        <span class="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-[9.5px]">#</span>
                        <input
                          :value="customColor.replace(/^#/, '')"
                          @input="handleCustomColorInput"
                          type="text"
                          maxlength="6"
                          placeholder="000000"
                          class="w-full text-[10.5px] bg-white border border-slate-200 rounded-lg pl-3 pr-1 py-0.5 focus:ring-2 focus:ring-slate-500 outline-hidden font-mono uppercase text-slate-700 shadow-2xs font-semibold"
                        />
                      </div>
                    </div>
                  </div>

                  <!-- Stamp Text Configuration (when maskType === 'stamp') -->
                  <div v-if="maskType === 'stamp'" class="p-1.5 px-2 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1 animate-in fade-in duration-150">
                    <div class="flex items-center justify-between text-[10.5px] font-bold text-slate-700">
                      <span class="flex items-center gap-1">
                        <Stamp class="w-3 h-3 text-slate-500" />
                        <span>{{ t('redact_stamp_text_label') }}</span>
                      </span>
                      <span class="text-[9px] text-slate-400 font-mono">{{ stampText.length }} chars</span>
                    </div>
                    <input
                      v-model="stampText"
                      type="text"
                      placeholder="[REDACTED]"
                      class="w-full text-[11px] bg-white border border-slate-200 rounded-lg px-2 py-0.5 focus:ring-2 focus:ring-slate-800 outline-hidden font-mono font-bold text-slate-800 shadow-2xs"
                    />
                    <div class="flex items-center gap-1 overflow-x-auto pb-0.5 custom-scrollbar">
                      <button
                        v-for="chip in stampPresets"
                        :key="chip"
                        type="button"
                        @click="stampText = chip"
                        :class="[
                          'text-[9px] px-1.5 py-0.5 rounded-md border font-semibold transition cursor-pointer shrink-0 whitespace-nowrap',
                          stampText === chip ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                        ]"
                      >
                        {{ chip }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Search & Rule Redact Card (shrink-0) -->
              <div class="border border-slate-200/80 bg-white rounded-2xl p-2 shrink-0 space-y-1.5">
                <!-- Header with Expand/Collapse & Scope Toggle -->
                <div
                  class="flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer select-none group"
                  @click="isSearchPanelExpanded = !isSearchPanelExpanded"
                >
                  <div class="flex items-center gap-1.5 group-hover:text-indigo-600 transition">
                    <Search class="w-3.5 h-3.5 text-indigo-600" />
                    <span>{{ t('redact_search_title') }}</span>
                    <component :is="isSearchPanelExpanded ? ChevronUp : ChevronDown" class="w-3 h-3 text-slate-400 group-hover:text-indigo-500 transition" />
                  </div>

                  <!-- Scope selector: All Pages vs Current Page -->
                  <div
                    @click.stop
                    class="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 text-[10px] font-semibold"
                  >
                    <button
                      type="button"
                      @click="searchScope = 'doc'"
                      :class="[
                        'px-1.5 py-0.5 rounded-md transition cursor-pointer',
                        searchScope === 'doc' ? 'bg-white text-indigo-700 font-bold shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                      ]"
                    >
                      {{ t('redact_search_scope_doc') }}
                    </button>
                    <button
                      type="button"
                      @click="searchScope = 'page'"
                      :class="[
                        'px-1.5 py-0.5 rounded-md transition cursor-pointer',
                        searchScope === 'page' ? 'bg-white text-indigo-700 font-bold shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                      ]"
                    >
                      {{ t('redact_search_scope_page') }}
                    </button>
                  </div>
                </div>

                <!-- Quick Rule Presets Chips (Single-row horizontal scrollable strip, never wraps) -->
                <div class="flex items-center gap-1 overflow-x-auto pb-0.5 custom-scrollbar">
                  <span class="text-[9.5px] text-slate-400 font-semibold shrink-0 mr-0.5">{{ t('redact_search_quick_presets') }}:</span>
                  <button
                    v-for="preset in localizedPiiPresets"
                    :key="preset.id"
                    type="button"
                    @click="applyPiiPreset(preset)"
                    class="text-[9.5px] px-1.5 py-0.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 font-medium transition cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    + {{ t(preset.labelKey) }}
                  </button>
                </div>

                <!-- Expanded Custom Search Form (keyword/regex input & execute button) -->
                <div v-show="isSearchPanelExpanded" class="space-y-1.5 pt-1.5 border-t border-slate-100">
                  <!-- Search Input with Type Pill & Execute Button -->
                  <div class="flex items-center gap-1.5">
                    <div class="relative flex-1">
                      <input
                        v-model="searchQuery"
                        type="text"
                        :placeholder="t('redact_search_placeholder')"
                        @keydown.enter.prevent="executeSearchAndRedact"
                        class="w-full text-[11px] bg-slate-50 border border-slate-200 rounded-xl pl-2.5 pr-14 py-1 font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 outline-hidden transition shadow-2xs"
                      />
                      <!-- Type toggle inside input on right -->
                      <div class="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                        <button
                          type="button"
                          @click="searchType = searchType === 'keyword' ? 'regex' : 'keyword'"
                          :class="[
                            'text-[9px] px-1 py-0.5 rounded font-mono font-bold transition cursor-pointer border',
                            searchType === 'regex' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                          ]"
                          :title="searchType === 'regex' ? t('node_redact_rule_regex') : t('node_redact_rule_keyword')"
                        >
                          {{ searchType === 'regex' ? '.*' : 'Abc' }}
                        </button>
                        <button
                          type="button"
                          @click="searchCaseSensitive = !searchCaseSensitive"
                          :class="[
                            'text-[9px] px-1 py-0.5 rounded font-mono font-bold transition cursor-pointer border',
                            searchCaseSensitive ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                          ]"
                          :title="t('node_redact_case_sensitive')"
                        >
                          Aa
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      :disabled="!searchQuery.trim() || isSearching"
                      @click="executeSearchAndRedact"
                      class="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-[11px] font-bold transition cursor-pointer shrink-0 shadow-xs flex items-center gap-1"
                    >
                      <Loader2 v-if="isSearching" class="w-3.5 h-3.5 animate-spin" />
                      <Sparkles v-else class="w-3.5 h-3.5 text-amber-300" />
                      <span>{{ t('redact_search_btn') }}</span>
                    </button>
                  </div>

                  <!-- Feedback Alert / Toast -->
                  <div
                    v-if="searchFeedback"
                    :class="[
                      'text-[10px] px-2 py-0.5 rounded-xl flex items-center gap-1.5 transition-all animate-fade-in',
                      searchFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : '',
                      searchFeedback.type === 'info' ? 'bg-amber-50 text-amber-800 border border-amber-200' : '',
                      searchFeedback.type === 'error' ? 'bg-rose-50 text-rose-800 border border-rose-200' : ''
                    ]"
                  >
                    <CheckCircle2 v-if="searchFeedback.type === 'success'" class="w-3 h-3 text-emerald-600 shrink-0" />
                    <AlertTriangle v-else class="w-3 h-3 shrink-0" :class="searchFeedback.type === 'info' ? 'text-amber-600' : 'text-rose-600'" />
                    <span class="truncate">{{ searchFeedback.text }}</span>
                  </div>
                </div>
              </div>

              <!-- Redaction Marks on Current Page List (Flex-1 adaptive height, stretches down to Summary) -->
              <div class="flex-1 min-h-[68px] sm:min-h-[80px] border border-slate-200/80 bg-white rounded-2xl p-2 flex flex-col overflow-hidden">
                <div class="flex items-center justify-between text-xs font-bold text-slate-700 mb-1 shrink-0">
                  <span class="flex items-center gap-1.5">
                    <ListOrdered class="w-3.5 h-3.5 text-slate-500" />
                    {{ t('redact_list_title') }}
                  </span>
                  <div class="flex items-center space-x-2">
                    <button
                      v-if="totalPages > 1 && currentRects.length > 0"
                      type="button"
                      @click="applyCurrentPageToAll"
                      class="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5 transition cursor-pointer hover:underline"
                      :title="t('redact_apply_all_title')"
                    >
                      <Copy class="w-3 h-3" />
                      <span>{{ t('redact_apply_all') }}</span>
                    </button>
                    <span class="text-[10px] text-slate-400 font-medium">
                      {{ t('redact_list_count', '{count} on this page', { count: currentRects.length }) }}
                    </span>
                  </div>
                </div>

                <div class="flex-1 min-h-0 overflow-y-auto space-y-1 pr-0.5 custom-scrollbar">
                  <div
                    v-for="(r, idx) in currentRects"
                    :key="r.id"
                    @click="selectedRectId = r.id"
                    :class="[
                      'flex items-center justify-between gap-1.5 text-[10.5px] px-2 py-1 rounded-lg border transition cursor-pointer',
                      selectedRectId === r.id ? 'border-blue-400 bg-blue-50/80 text-blue-900 font-bold' : 'border-slate-100 bg-slate-50 hover:border-slate-300 text-slate-700'
                    ]"
                  >
                    <div class="flex items-center space-x-1.5 min-w-0">
                      <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="selectedRectId === r.id ? 'bg-blue-600' : 'bg-slate-400'"></span>
                      <span class="truncate">
                        {{ r.snapped ? r.snapped : t('redact_rect_mark', 'Mark {index}', { index: idx + 1 }) }}
                      </span>
                    </div>
                    <div class="flex items-center space-x-1 shrink-0">
                      <button
                        v-if="totalPages > 1"
                        type="button"
                        class="text-slate-400 hover:text-blue-600 p-0.5 rounded transition cursor-pointer"
                        @click.stop="applySingleRectToAll(r.id)"
                        :title="t('redact_apply_single_all')"
                      >
                        <Copy class="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        class="text-slate-400 hover:text-rose-600 p-0.5 rounded transition cursor-pointer"
                        @click.stop="deleteRect(r.id)"
                        :title="t('btn_delete', 'Delete')"
                      >
                        <Trash2 class="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div v-if="!currentRects.length" class="h-full min-h-[50px] flex flex-col items-center justify-center text-center py-1 px-2">
                    <EyeOff class="w-4 h-4 text-slate-300 mb-0.5" />
                    <p class="text-[10px] text-slate-400 max-w-[220px] leading-tight">
                      {{ t('redact_list_empty', 'No marks on this page · drag on preview to select') }}
                    </p>
                  </div>
                </div>

                <div v-if="otherPagesCount" class="pt-1 mt-0.5 border-t border-slate-100 text-[9.5px] text-slate-400 flex items-center justify-between shrink-0">
                  <span>{{ t('redact_list_other_pages', '{count} more marks on other pages', { count: otherPagesCount }) }}</span>
                  <span class="font-bold text-slate-600">{{ totalRects }} {{ t('redact_total_marks', 'total marks') }}</span>
                </div>
              </div>

              <!-- Summary Card (shrink-0 at bottom) -->
              <div class="border border-slate-200/80 bg-white rounded-2xl p-2 shrink-0 space-y-1">
                <div class="flex items-center text-xs font-bold text-slate-700">
                  <span class="flex items-center gap-1.5">
                    <BarChart3 class="w-3.5 h-3.5 text-slate-500" />
                    {{ t('redact_summary_title') }}
                  </span>
                </div>
                <div class="text-[10.5px] text-slate-600 space-y-0.5 bg-slate-50 rounded-xl p-1.5 px-2 border border-slate-100">
                  <div class="flex justify-between">
                    <span>{{ t('redact_summary_rects') }}</span>
                    <b class="text-slate-900 tabular-nums">{{ marksSummaryText }}</b>
                  </div>
                  <div class="flex justify-between">
                    <span>{{ t('redact_summary_text_ops') }}</span>
                    <b class="text-slate-900 tabular-nums">{{ textOpsSummaryText }}</b>
                  </div>
                  <div class="flex justify-between">
                    <span>{{ t('redact_summary_raster') }}</span>
                    <b class="text-slate-900 tabular-nums">{{ rasterWarnSummaryText }}</b>
                  </div>
                </div>
                <div
                  v-if="rasterWarnPages.length"
                  class="bg-amber-50 border border-amber-200 rounded-xl px-2 py-0.5 text-[9.5px] text-amber-800 leading-snug"
                >
                  {{ t('redact_raster_warning', 'Page {pages} contains scanned/image content: the whole page will be rasterized and burned in, and its text will no longer be selectable.', { pages: rasterWarnPages.map(p => p + 1).join(', ') }) }}
                </div>
              </div>
            </div>

            <!-- Right Live Preview (7 cols on lg) -->
            <div class="lg:col-span-7 bg-slate-100/70 rounded-2xl p-2.5 sm:p-3 border border-slate-200/80 flex flex-col overflow-hidden min-h-0 relative h-full max-h-full">
              <!-- Preview Header & Page Switcher -->
              <div class="flex items-center justify-between gap-2 mb-1.5 shrink-0">
                <div class="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
                  <span class="w-2 h-2 rounded-full bg-slate-800"></span>
                  <span>{{ t('live_preview') || 'Live Preview' }} · P.{{ pageIndex + 1 }}</span>
                </div>

                <!-- Page Navigation Controls -->
                <div class="flex items-center space-x-1 text-xs">
                  <button
                    type="button"
                    :disabled="pageIndex <= 0"
                    @click="goPage(-1)"
                    class="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold disabled:opacity-40 transition cursor-pointer"
                    :title="t('page_prev', 'Previous Page')"
                  >
                    ◀
                  </button>
                  <span class="font-mono font-bold text-slate-800 px-2 py-0.5 bg-white rounded-md border border-slate-200 text-xs">
                    {{ pageIndex + 1 }} / {{ totalPages }}
                  </span>
                  <button
                    type="button"
                    :disabled="pageIndex >= totalPages - 1"
                    @click="goPage(1)"
                    class="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold disabled:opacity-40 transition cursor-pointer"
                    :title="t('page_next', 'Next Page')"
                  >
                    ▶
                  </button>

                  <!-- Quick Jumps -->
                  <div class="hidden sm:flex items-center space-x-1 pl-1">
                    <button
                      type="button"
                      @click="changePreviewPage(0)"
                      :class="['px-1.5 py-0.5 rounded-md text-[10px] font-semibold border transition cursor-pointer', pageIndex === 0 ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50']"
                    >
                      {{ t('pn_quick_cover', 'Cover') }}
                    </button>
                    <button
                      v-if="totalPages > 1"
                      type="button"
                      @click="changePreviewPage(1)"
                      :class="['px-1.5 py-0.5 rounded-md text-[10px] font-semibold border transition cursor-pointer', pageIndex === 1 ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50']"
                    >
                      P.2
                    </button>
                    <button
                      v-if="totalPages > 2"
                      type="button"
                      @click="changePreviewPage(totalPages - 1)"
                      :class="['px-1.5 py-0.5 rounded-md text-[10px] font-semibold border transition cursor-pointer', pageIndex === totalPages - 1 ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50']"
                    >
                      P.{{ totalPages }}
                    </button>
                  </div>
                </div>

                <!-- Actions: Undo, Apply to All & Clear Page -->
                <div class="flex items-center space-x-1.5">
                  <button
                    v-if="totalPages > 1 && currentRects.length > 0"
                    type="button"
                    @click="applyCurrentPageToAll"
                    class="text-[11px] font-bold rounded-lg px-2 py-0.5 border border-slate-200 bg-white text-slate-700 hover:text-blue-600 hover:border-blue-200 transition flex items-center gap-1 cursor-pointer shadow-2xs"
                    :title="t('redact_apply_all_title')"
                  >
                    <Copy class="w-3 h-3 text-blue-600" />
                    <span class="hidden sm:inline">{{ t('redact_apply_all') }}</span>
                  </button>

                  <button
                    v-if="undoStack.length > 0"
                    type="button"
                    @click="undo"
                    class="text-[11px] font-bold rounded-lg px-2 py-0.5 border border-slate-200 bg-white text-slate-600 hover:text-slate-900 transition flex items-center gap-1 cursor-pointer shadow-2xs"
                    :title="t('org_btn_undo', 'Undo') + ' (Ctrl+Z)'"
                  >
                    <RotateCcw class="w-3 h-3" />
                    <span class="hidden sm:inline">{{ t('org_btn_undo', 'Undo') }}</span>
                  </button>

                  <button
                    type="button"
                    @click="clearPage"
                    :disabled="!currentRects.length"
                    class="text-[11px] font-bold rounded-lg px-2 py-0.5 border border-slate-200 bg-white text-slate-500 hover:text-rose-600 hover:border-rose-200 transition flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    :title="t('redact_clear_page')"
                  >
                    <Trash2 class="w-3 h-3" />
                    <span>{{ t('redact_clear_page') }}</span>
                  </button>
                </div>
              </div>

              <!-- Canvas Stage Container -->
              <div
                ref="stageAreaRef"
                @wheel="onStageWheel"
                :class="[
                  'max-w-full max-h-full flex-1 w-full flex relative min-h-0 p-2 sm:p-3 overscroll-contain custom-scrollbar [scrollbar-gutter:stable]',
                  zoomMode === 'fit' ? 'overflow-hidden items-center justify-center' : 'overflow-auto'
                ]"
              >
                <div
                  ref="stageBoxRef"
                  :class="[
                    'relative bg-white rounded-lg shadow-md border border-slate-300/80 overflow-hidden',
                    zoomMode === 'fit' ? '' : 'm-auto shrink-0'
                  ]"
                  :style="stageBoxStyle"
                >
                  <canvas ref="pageCanvasRef" class="w-full h-full block select-none" />

                  <!-- Interactive Overlay -->
                  <div
                    ref="overlayRef"
                    :class="[
                      'absolute inset-0 touch-none',
                      isHoveringRect ? 'cursor-move' : 'cursor-crosshair'
                    ]"
                    data-testid="redact-overlay"
                    @pointerdown="onPointerDown"
                    @pointermove="onPointerMove"
                    @pointerup="onPointerUp"
                    @pointercancel="onPointerUp"
                  >
                    <!-- Draft rect while drawing -->
                    <div
                      v-if="draftRect"
                      :class="[
                        'absolute rounded-[2px] pointer-events-none transition-none flex items-center justify-center overflow-hidden',
                        maskType === 'stamp' ? 'border-2 border-dashed border-slate-900' : (customColor.toLowerCase() === '#ffffff' ? 'border border-slate-400' : 'border border-slate-800')
                      ]"
                      :style="[
                        rectStyle(draftRect),
                        { backgroundColor: customColor, opacity: 0.85 }
                      ]"
                    >
                      <span
                        v-if="maskType === 'stamp'"
                        class="text-[9px] font-black tracking-wider uppercase truncate px-0.5 leading-none select-none"
                        :style="{ color: isLightColor(customColor) ? '#000000' : '#ffffff' }"
                      >
                        {{ stampText || '[REDACTED]' }}
                      </span>
                    </div>

                    <!-- Committed rects (WYSIWYG styling matching selected style) -->
                    <div
                      v-for="r in currentRects"
                      :key="r.id"
                      :class="[
                        'absolute rounded-[2px] pointer-events-none select-none overflow-hidden transition-shadow flex items-center justify-center',
                        maskType === 'stamp' ? 'font-extrabold shadow-2xs' : (customColor.toLowerCase() === '#ffffff' ? 'border border-slate-300 shadow-2xs' : 'shadow-2xs'),
                        selectedRectId === r.id ? 'ring-2 ring-blue-500 ring-offset-1 z-10' : ''
                      ]"
                      :style="[
                        rectStyle(r.canvas),
                        { backgroundColor: customColor }
                      ]"
                    >
                      <span
                        v-if="maskType === 'stamp'"
                        class="text-[9px] font-black tracking-wider uppercase truncate px-0.5 leading-none select-none"
                        :style="{ color: isLightColor(customColor) ? '#000000' : '#ffffff' }"
                      >
                        {{ stampText || '[REDACTED]' }}
                      </span>

                      <!-- Corner Resize Handles (when selected) -->
                      <template v-if="selectedRectId === r.id">
                        <span
                          v-for="h in ['nw', 'ne', 'sw', 'se']"
                          :key="h"
                          :class="[
                            'absolute w-2.5 h-2.5 bg-white border-2 border-blue-500 rounded-[2px] pointer-events-auto shadow-xs z-20',
                            handlePos[h],
                            handleCursors[h]
                          ]"
                          @pointerdown.stop.prevent="onHandleDown($event, r.id, h)"
                        />
                        <span
                          v-if="r.snapped"
                          class="absolute -top-6 left-0 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap max-w-[240px] truncate pointer-events-none shadow-xs z-30"
                        >
                          {{ r.snapped }}
                        </span>
                        <!-- Quick apply mark to all pages -->
                        <button
                          v-if="totalPages > 1"
                          type="button"
                          @pointerdown.stop
                          @click.stop.prevent="applySingleRectToAll(r.id)"
                          class="absolute -bottom-6 left-0 bg-slate-900/90 hover:bg-blue-600 text-white text-[9.5px] font-bold px-1.5 py-0.5 rounded-md shadow-xs flex items-center gap-1 cursor-pointer pointer-events-auto z-30 transition whitespace-nowrap"
                          :title="t('redact_apply_single_all')"
                        >
                          <Copy class="w-2.5 h-2.5" />
                          <span>{{ t('redact_apply_all') }}</span>
                        </button>
                      </template>
                    </div>

                    <!-- Draw Hint when empty (Positioned at top to avoid floating zoom controller) -->
                    <div
                      v-if="!currentRects.length && !draftRect"
                      class="absolute top-2.5 left-1/2 -translate-x-1/2 text-[10.5px] text-slate-500 bg-white/95 border border-slate-200 px-3 py-1 rounded-xl whitespace-nowrap pointer-events-none shadow-xs backdrop-blur-xs flex items-center space-x-1.5 z-20"
                    >
                      <Magnet class="w-3 h-3 text-blue-600" />
                      <span>{{ t('redact_snap_hint', 'Drag to draw · release to snap to text · press Delete to remove') }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Floating Zoom & Fit Controller (Bottom Right) -->
              <div class="absolute bottom-3 right-4 z-40 flex items-center bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-lg px-2 py-1 space-x-1 select-none text-xs font-semibold text-slate-700 pointer-events-auto">
                <!-- Zoom Out -->
                <button
                  type="button"
                  @click="zoomOut"
                  :disabled="zoomPercent <= 50"
                  class="w-6 h-6 flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer font-bold"
                  :title="t('redact_zoom_out', 'Zoom Out') + ' (Ctrl+-)'"
                >
                  <Minus class="w-3.5 h-3.5" />
                </button>

                <!-- Zoom Level Display & Click to Cycle -->
                <button
                  type="button"
                  @click="cycleZoom"
                  class="px-1.5 py-0.5 text-[11px] font-mono font-bold text-slate-700 hover:bg-slate-100 rounded-md transition cursor-pointer min-w-[48px] text-center"
                  :title="t('redact_zoom_cycle', 'Click to switch zoom level')"
                >
                  {{ zoomPercent }}%
                </button>

                <!-- Zoom In -->
                <button
                  type="button"
                  @click="zoomIn"
                  :disabled="zoomPercent >= 300"
                  class="w-6 h-6 flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer font-bold"
                  :title="t('redact_zoom_in', 'Zoom In') + ' (Ctrl++)'"
                >
                  <Plus class="w-3.5 h-3.5" />
                </button>

                <div class="w-px h-3.5 bg-slate-200 mx-0.5"></div>

                <!-- Fit Page Button -->
                <button
                  type="button"
                  @click="setZoomMode('fit')"
                  :class="[
                    'px-2 py-0.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer',
                    zoomMode === 'fit' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  ]"
                  :title="t('redact_zoom_fit_title', 'Fit entire page to window') + ' (Ctrl+0)'"
                >
                  <Maximize2 class="w-3 h-3" />
                  <span class="hidden sm:inline">{{ t('redact_zoom_fit', 'Fit') }}</span>
                </button>

                <!-- Fit Width Button -->
                <button
                  type="button"
                  @click="setZoomMode('fit-width')"
                  :class="[
                    'px-2 py-0.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer',
                    zoomMode === 'fit-width' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  ]"
                  :title="t('redact_zoom_width_title', 'Fit page width to window')"
                >
                  <MoveHorizontal class="w-3 h-3" />
                  <span class="hidden sm:inline">{{ t('redact_zoom_width', 'Width') }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Bottom Cluster: Output Settings Bar -->
          <div class="shrink-0 pt-2.5 sm:pt-3">
            <div class="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
              <!-- Left: Output Filename & Auto-save Checkbox -->
              <div class="flex flex-wrap items-center gap-3">
                <div class="flex items-center space-x-1.5">
                  <label class="text-xs text-slate-500 font-semibold shrink-0">
                    {{ t('vault_field_name') }}:
                  </label>
                  <input
                    v-model="customOutputBaseName"
                    type="text"
                    data-testid="redact-filename-input"
                    :placeholder="defaultFileNamePlaceholder"
                    class="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 focus:bg-white focus:ring-2 focus:ring-slate-500 outline-hidden font-medium text-slate-700 w-44 sm:w-64 shadow-2xs"
                  >
                </div>

                <label class="flex items-center space-x-1.5 text-xs text-slate-600 font-semibold cursor-pointer select-none">
                  <input
                    type="checkbox"
                    v-model="autoSaveToVault"
                    class="w-4 h-4 text-slate-800 rounded-md border-slate-300 focus:ring-slate-500 cursor-pointer"
                  >
                  <FolderLock class="w-3.5 h-3.5 text-slate-600" />
                  <span>{{ t('vault_autosave_checkbox') }}</span>
                </label>
              </div>

              <!-- Right: Execution Button -->
              <button
                :disabled="isProcessing || isLoading || !totalRects"
                @click="openConfirm"
                :title="!totalRects ? t('redact_err_no_rects') : ''"
                data-testid="redact-burn-btn"
                class="bg-rose-600 hover:bg-rose-700 active:scale-98 text-white text-xs sm:text-sm font-bold px-6 py-2.5 rounded-xl transition flex items-center justify-center space-x-2 shadow-md hover:shadow-rose-600/25 disabled:opacity-50 cursor-pointer ml-auto"
              >
                <Loader2 v-if="isProcessing" class="w-4 h-4 animate-spin" />
                <Flame v-else class="w-4 h-4 text-amber-300" />
                <span>{{ isProcessing ? (t('loading') || 'Processing...') : t('redact_btn_burn', 'Burn Redaction ({count} marks)', { count: totalRects }) }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- State C: Burn Confirmation Modal -->
    <div
      v-if="showConfirm"
      class="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-6"
      @click.self="showConfirm = false"
    >
      <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
        <h4 class="text-base font-extrabold text-slate-900 flex items-center gap-2.5">
          <span class="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle class="w-4 h-4" />
          </span>
          {{ t('redact_confirm_title') }}
        </h4>
        <p class="text-xs text-slate-600 leading-relaxed mt-2.5">{{ t('redact_confirm_body') }}</p>
        <div class="mt-3 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 space-y-1 text-xs text-slate-600">
          <div class="flex justify-between"><span>{{ t('redact_confirm_marks') }}</span><b class="text-slate-900 tabular-nums">{{ marksSummaryText }}</b></div>
          <div class="flex justify-between"><span>{{ t('redact_confirm_erase') }}</span><b class="text-slate-900 tabular-nums">{{ textOpsSummaryText }}</b></div>
          <div class="flex justify-between"><span>{{ t('redact_confirm_raster') }}</span><b class="text-slate-900 tabular-nums">{{ rasterWarnSummaryText }}</b></div>
          <div class="flex justify-between"><span>{{ t('redact_confirm_style') }}</span><b class="text-slate-900">{{ currentStyleSummaryDisplay }}</b></div>
          <div class="flex justify-between"><span>{{ t('redact_confirm_verify') }}</span><b class="text-slate-900">{{ t('redact_confirm_verify_auto') }}</b></div>
        </div>
        <div class="flex justify-end gap-2.5 mt-4">
          <button
            @click="showConfirm = false"
            class="bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-200 transition cursor-pointer"
          >{{ t('redact_confirm_cancel') }}</button>
          <button
            @click="executeBurn"
            data-testid="redact-confirm-btn"
            class="bg-red-600 hover:bg-red-700 active:scale-98 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl transition shadow-md hover:shadow-red-600/25 cursor-pointer"
          >{{ t('redact_confirm_proceed') }}</button>
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

    <!-- Vault File Picker Modal (Single-Select) -->
    <VaultFilePickerModal
      :is-open="isVaultPickerOpen"
      :multiple="false"
      @select-files="handleVaultFilesSelected"
      @close="isVaultPickerOpen = false"
    />
  </section>
</template>

<script setup>
import { ref, computed, watch, inject, onMounted, onActivated, onUnmounted, nextTick } from 'vue';
import {
  EyeOff, Plus, Minus, Maximize2, MoveHorizontal, Loader2, FolderLock, RotateCcw, Trash2, Flame, AlertTriangle,
  CheckCircle2, ChevronLeft, ChevronRight, Magnet, ListOrdered, BarChart3, ShieldCheck,
  RefreshCw, Sliders, Unlock, Copy, Search, ChevronDown, ChevronUp, Sparkles, Stamp, Palette
} from 'lucide-vue-next';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, PDFName, PDFDict, PDFRef } from 'pdf-lib';
import { t, currentLang } from '../i18n';
import { triggerDownload } from '../utils/download';
import { verifyPdfSecurity } from '../utils/pdfSecurity';
import { consumePendingFile } from '../utils/toolBridge';
import { saveFile } from '../utils/vaultDb';
import { userSettings } from '../utils/userSettings';
import { logger } from '../utils/logger';
import { generateExportFileName } from '../utils/filenameUtils';
import PasswordModal from '../components/PasswordModal.vue';
import VaultFilePickerModal from '../components/VaultFilePickerModal.vue';
import ResultDeliveryView from '../components/ResultDeliveryView.vue';
import { redactPdf } from '../utils/redaction/redactEngine.js';
import { matchRules, getLocalizedPiiPresets } from '../utils/redaction/ruleMatcher.js';
import {
  textItemToUserBBox, userRectToCanvas, canvasRectToUser, rectsIntersect, shouldRemoveOp
} from '../utils/redaction/coords.js';

const emit = defineEmits(['send-to-tool']);
const workspaceState = inject('workspaceActiveState', null);

// ---------- File / doc state ----------
const fileInputRef = ref(null);
const pageCanvasRef = ref(null);
const overlayRef = ref(null);
const stageBoxRef = ref(null);

const docBytes = ref(null); // ArrayBuffer (original, never mutated by the UI)
const filename = ref('');
const totalPages = ref(0);
const pageIndex = ref(0);
const unlockedPassword = ref('');

// Output and interaction settings
const customOutputBaseName = ref('');
const autoSaveToVault = ref(userSettings.autoSaveToVault ?? true);

watch(() => userSettings.autoSaveToVault, (newVal) => {
  autoSaveToVault.value = newVal ?? true;
});

const defaultFileNamePlaceholder = computed(() => {
  return generateExportFileName(filename.value, 'Redacted');
});

const isHoveringRect = ref(false);
const undoStack = ref([]);

let pdfjsDoc = null; // pdf.js document proxy (preview only, never fed to the engine)
let currentViewport = null; // pdf.js viewport @ scale 1.5 (canvas pixel space)
const viewportTick = ref(0); // forces canvas-space recomputes after render

// ---------- Stage fit-to-area & Zoom System ----------
const stageAreaRef = ref(null);
const stageBoxSize = ref({ w: 0, h: 0 });
const zoomMode = ref('fit'); // 'fit' | 'fit-width' | 'custom'
const customZoomPercent = ref(100);
const ZOOM_PRESETS = [50, 75, 100, 125, 150, 200, 250, 300];

// Natural (1.0x native PDF point) dimensions
const nativeSize = computed(() => {
  void viewportTick.value;
  if (!currentViewport) return { w: 595, h: 842 };
  const scale = currentViewport.scale || 2.0;
  return {
    w: currentViewport.width / scale,
    h: currentViewport.height / scale
  };
});

// Calculate Fit-to-Window size with comfortable safe margins (clearing padding and zoom controls)
function computeFitSize() {
  const el = stageAreaRef.value;
  if (!el || !currentViewport || !el.clientWidth || !el.clientHeight) return { w: 0, h: 0 };
  const availW = Math.max(10, el.clientWidth - 32);
  const availH = Math.max(10, el.clientHeight - 52);
  const scale = Math.min(availW / currentViewport.width, availH / currentViewport.height);
  return {
    w: Math.floor(currentViewport.width * scale),
    h: Math.floor(currentViewport.height * scale)
  };
}

// Calculate Fit-to-Width size
function computeFitWidthSize() {
  const el = stageAreaRef.value;
  if (!el || !currentViewport || !el.clientWidth) return { w: 0, h: 0 };
  const availW = Math.max(10, el.clientWidth - 32);
  const scale = availW / currentViewport.width;
  return {
    w: Math.floor(currentViewport.width * scale),
    h: Math.floor(currentViewport.height * scale)
  };
}

const zoomPercent = computed(() => {
  void viewportTick.value;
  if (!nativeSize.value.w || !stageBoxSize.value.w) return customZoomPercent.value || 100;
  return Math.round((stageBoxSize.value.w / nativeSize.value.w) * 100);
});

function applyCurrentZoom() {
  if (!currentViewport) return;
  if (zoomMode.value === 'fit') {
    const fit = computeFitSize();
    if (fit.w && fit.h) stageBoxSize.value = fit;
  } else if (zoomMode.value === 'fit-width') {
    const fw = computeFitWidthSize();
    if (fw.w && fw.h) stageBoxSize.value = fw;
  } else {
    const factor = customZoomPercent.value / 100;
    const w = Math.round(nativeSize.value.w * factor);
    const h = Math.round(nativeSize.value.h * factor);
    stageBoxSize.value = { w, h };
  }
}

let fitRaf = null;

function fitStageBox() {
  if (fitRaf) cancelAnimationFrame(fitRaf);
  fitRaf = requestAnimationFrame(() => {
    applyCurrentZoom();
  });
}

function setZoomMode(mode) {
  zoomMode.value = mode;
  if (stageAreaRef.value) {
    stageAreaRef.value.scrollTop = 0;
    stageAreaRef.value.scrollLeft = 0;
  }
  applyCurrentZoom();
}

function zoomIn() {
  const cur = zoomPercent.value;
  const next = ZOOM_PRESETS.find((p) => p > cur + 5) || Math.min(300, cur + 25);
  customZoomPercent.value = next;
  zoomMode.value = 'custom';
  applyCurrentZoom();
}

function zoomOut() {
  const cur = zoomPercent.value;
  const prev = [...ZOOM_PRESETS].reverse().find((p) => p < cur - 5) || Math.max(50, cur - 25);
  customZoomPercent.value = prev;
  zoomMode.value = 'custom';
  applyCurrentZoom();
}

function cycleZoom() {
  if (zoomMode.value === 'fit') {
    customZoomPercent.value = 100;
    zoomMode.value = 'custom';
  } else if (customZoomPercent.value === 100) {
    customZoomPercent.value = 150;
    zoomMode.value = 'custom';
  } else if (customZoomPercent.value === 150) {
    customZoomPercent.value = 200;
    zoomMode.value = 'custom';
  } else {
    zoomMode.value = 'fit';
  }
  applyCurrentZoom();
}

function onStageWheel(e) {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    if (e.deltaY < 0) {
      zoomIn();
    } else if (e.deltaY > 0) {
      zoomOut();
    }
  }
}

const stageBoxStyle = computed(() => {
  if (stageBoxSize.value.w && stageBoxSize.value.h) {
    return { width: `${stageBoxSize.value.w}px`, height: `${stageBoxSize.value.h}px` };
  }
  void viewportTick.value; // fallback before first measurement: fill width by page ratio
  const ratio = currentViewport ? currentViewport.width / currentViewport.height : 0.707;
  return {
    width: '100%',
    maxWidth: `${ratio * 100}%`,
    aspectRatio: currentViewport ? `${currentViewport.width} / ${currentViewport.height}` : '210 / 297'
  };
});

let stageRO = null;
watch(stageAreaRef, (el) => {
  stageRO?.disconnect();
  stageRO = null;
  if (el) {
    stageRO = new ResizeObserver(fitStageBox);
    stageRO.observe(el);
  }
  fitStageBox();
});

onUnmounted(() => {
  if (fitRaf) cancelAnimationFrame(fitRaf);
  stageRO?.disconnect();
  stageRO = null;
});


watch(() => Boolean(docBytes.value), (active) => {
  workspaceState?.setActiveFile(active);
}, { immediate: true });
onActivated(() => {
  workspaceState?.setActiveFile(Boolean(docBytes.value));
});

const isDragOver = ref(false);
const isLoading = ref(false);
const isProcessing = ref(false);
const isVaultPickerOpen = ref(false);

// Password modal state
const isPasswordOpen = ref(false);
const passwordError = ref('');
const isUnlocking = ref(false);
const pendingFileName = ref('');
let pendingFileObj = null;

// ---------- Editor state ----------
/** { [pageIndex]: [{ id, x, y, w, h, snapped? }] } — user space (y-up, engine coordinate system) */
const rectsByPage = ref({});
const selectedRectId = ref(null);
const snapToText = ref(true);
// Mask appearance & color
const maskType = ref('block'); // 'block' | 'stamp'
const customColor = ref('#000000');
const stampText = ref('[REDACTED]');
const colorPresets = ['#000000', '#334155', '#ffffff', '#b91c1c', '#1e3a8a', '#047857'];
const stampPresets = ['[REDACTED]', '[已脱敏]', '[CONFIDENTIAL]', '(b)(4)', '[GESCHWÄRZT]', '[CAVIARDÉ]'];

function isLightColor(hex) {
  if (!hex || typeof hex !== 'string') return false;
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) clean = clean.split('').map((c) => c + c).join('');
  if (clean.length !== 6) return false;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return (r * 0.299 + g * 0.587 + b * 0.114) > 0.65;
}

const style = computed({
  get() {
    if (maskType.value === 'stamp') return 'stamp';
    const c = (customColor.value || '').toLowerCase();
    if (c === '#000000') return 'black';
    if (c === '#ffffff') return 'white';
    if (c === '#334155') return 'gray';
    return 'custom';
  },
  set(val) {
    if (val === 'stamp') {
      maskType.value = 'stamp';
    } else if (val === 'black') {
      maskType.value = 'block';
      customColor.value = '#000000';
    } else if (val === 'white') {
      maskType.value = 'block';
      customColor.value = '#ffffff';
    } else if (val === 'gray') {
      maskType.value = 'block';
      customColor.value = '#334155';
    } else {
      maskType.value = 'block';
    }
  }
});

function handleCustomColorInput(e) {
  let val = e.target.value.replace(/[^0-9a-fA-F]/g, '');
  if (val.length <= 6) {
    customColor.value = '#' + val;
  }
}

const draftRect = ref(null); // viewport-space rect while drawing
const textOpsCount = ref(0);
/** pages whose resources contain image XObjects (rasterization risk hint) */
const imagePages = ref([]);

const currentStyleLabelKey = computed(() => {
  return maskType.value === 'stamp' ? 'redact_type_stamp' : 'redact_type_block';
});

const currentStyleSummaryDisplay = computed(() => {
  const colorUpper = (customColor.value || '#000000').toUpperCase();
  if (maskType.value === 'stamp') {
    return `${t('redact_type_stamp')} · ${stampText.value || '[REDACTED]'} (${colorUpper})`;
  }
  return `${t('redact_type_block')} (${colorUpper})`;
});

// ---------- Text item cache (LRU 8 pages, for snapping & summary) ----------
const textItemCache = new Map();
async function getTextItems(idx) {
  if (textItemCache.has(idx)) return textItemCache.get(idx);
  const page = await pdfjsDoc.getPage(idx + 1);
  const tc = await page.getTextContent();
  const items = tc.items
    .filter((it) => it.str && it.str.trim())
    .map((it) => ({
      str: it.str,
      transform: it.transform,
      width: it.width,
      height: it.height,
      bbox: textItemToUserBBox(it)
    }));
  textItemCache.set(idx, items);
  if (textItemCache.size > 8) textItemCache.delete(textItemCache.keys().next().value);
  return items;
}

// ---------- Delivery state ----------
const lastExportedFile = ref(null);
const progressPercent = ref(0);
const progressMessage = ref('');
let cachedPdfBlob = null;
let cachedPdfName = '';
let lastReport = null;

function handleReDownload() {
  if (cachedPdfBlob && cachedPdfName) triggerDownload(cachedPdfBlob, cachedPdfName);
}
function handleNewTask() {
  reset();
}
function handleBackToEdit() {
  lastExportedFile.value = null;
  nextTick(() => {
    renderPage();
  });
}

// ---------- Computed: list & summary ----------
const currentRects = computed(() => {
  void viewportTick.value;
  const list = rectsByPage.value[pageIndex.value] || [];
  if (!currentViewport) return list.map((r) => ({ id: r.id, canvas: r, snapped: r.snapped }));
  return list.map((r) => ({ id: r.id, canvas: userRectToCanvas(r, currentViewport), snapped: r.snapped }));
});
const totalRects = computed(() =>
  Object.values(rectsByPage.value).reduce((n, list) => n + (list?.length || 0), 0)
);

/** Positioning classes for the four corner resize handles of a selected mark */
const handlePos = {
  nw: '-top-1 -left-1',
  ne: '-top-1 -right-1',
  sw: '-bottom-1 -left-1',
  se: '-bottom-1 -right-1'
};

/** Cursor classes for the four corner resize handles of a selected mark */
const handleCursors = {
  nw: 'cursor-nwse-resize',
  ne: 'cursor-nesw-resize',
  sw: 'cursor-nesw-resize',
  se: 'cursor-nwse-resize'
};

/** Converts canvas pixel rect to percentage-based absolute positioning styles within the overlay (canvas and overlay share the same bounding box) */
function rectStyle(c) {
  if (!currentViewport || !c) return {};
  void viewportTick.value; // Recompute when viewport updates
  return {
    left: `${(c.x / currentViewport.width) * 100}%`,
    top: `${(c.y / currentViewport.height) * 100}%`,
    width: `${(c.w / currentViewport.width) * 100}%`,
    height: `${(c.h / currentViewport.height) * 100}%`
  };
}

const markedPageIndexes = computed(() =>
  Object.keys(rectsByPage.value).filter((k) => rectsByPage.value[k]?.length > 0).map(Number)
);
const markedPageCount = computed(() => markedPageIndexes.value.length);
const otherPagesCount = computed(() => totalRects.value - currentRects.value.length);
const rasterWarnPages = computed(() => markedPageIndexes.value.filter((p) => imagePages.value.includes(p)));

const marksSummaryText = computed(() => {
  const c = totalRects.value;
  const p = markedPageCount.value;
  if (currentLang.value === 'en') {
    const markStr = c === 1 ? '1 mark' : `${c} marks`;
    const pageStr = p === 1 ? '1 page' : `${p} pages`;
    return `${markStr} · ${pageStr}`;
  }
  return t('redact_marks_pages_val', { count: c, pages: p });
});

const textOpsSummaryText = computed(() => {
  const n = textOpsCount.value;
  if (currentLang.value === 'en') {
    return n === 1 ? '1 text item' : `${n} text items`;
  }
  return t('redact_text_ops_val', { count: n });
});

const rasterWarnSummaryText = computed(() => {
  if (!rasterWarnPages.value.length) return t('none_value', 'None');
  return t('redact_raster_pages_val', { pages: rasterWarnPages.value.map((p) => p + 1).join(', ') });
});

// Debounced summary recompute: text ops that would be destroyed
let summaryTimer = null;
watch([rectsByPage], () => {
  clearTimeout(summaryTimer);
  summaryTimer = setTimeout(recomputeSummary, 150);
}, { deep: true });

async function recomputeSummary() {
  if (!pdfjsDoc) { textOpsCount.value = 0; return; }
  let n = 0;
  for (const pi of markedPageIndexes.value) {
    const rects = rectsByPage.value[pi];
    if (!rects?.length) continue;
    try {
      const items = await getTextItems(pi);
      n += items.filter((it) => shouldRemoveOp(it.bbox, rects)).length;
    } catch (e) {
      logger.warn('REDACT', `Summary extraction failed on page ${pi + 1}: ${e.message}`);
    }
  }
  textOpsCount.value = n;
}

// ---------- Search & Rule-Based Redaction ----------
const searchQuery = ref('');
const searchType = ref('keyword'); // 'keyword' | 'regex'
const searchCaseSensitive = ref(false);
const searchScope = ref('doc'); // 'doc' (all pages) | 'page' (current page)
const isSearching = ref(false);
const searchFeedback = ref(null); // { type: 'success' | 'info' | 'error', text: string }
const isSearchPanelExpanded = ref(false);
let searchFeedbackTimer = null;

const localizedPiiPresets = computed(() => getLocalizedPiiPresets(currentLang.value));

function applyPiiPreset(preset) {
  searchQuery.value = preset.value;
  searchType.value = preset.type;
  searchCaseSensitive.value = Boolean(preset.caseSensitive);
  executeSearchAndRedact();
}

async function executeSearchAndRedact() {
  const q = searchQuery.value.trim();
  if (!q || !pdfjsDoc || isSearching.value) return;

  isSearching.value = true;
  clearTimeout(searchFeedbackTimer);
  searchFeedback.value = null;

  try {
    const rule = {
      type: searchType.value,
      value: q,
      caseSensitive: searchCaseSensitive.value
    };

    const targetPages = searchScope.value === 'doc'
      ? Array.from({ length: totalPages.value }, (_, i) => i)
      : [pageIndex.value];

    const beforeState = JSON.parse(JSON.stringify(rectsByPage.value));
    let totalAdded = 0;

    for (const pi of targetPages) {
      const items = await getTextItems(pi);
      if (!items || !items.length) continue;

      const { rects } = matchRules(items, [rule]);
      if (!rects || !rects.length) continue;

      if (!rectsByPage.value[pi]) {
        rectsByPage.value[pi] = [];
      }
      const existingList = rectsByPage.value[pi];

      for (const r of rects) {
        const isDuplicate = existingList.some((ex) => {
          if (!rectsIntersect(ex, r)) return false;
          const interW = Math.min(ex.x + ex.w, r.x + r.w) - Math.max(ex.x, r.x);
          const interH = Math.min(ex.y + ex.h, r.y + r.h) - Math.max(ex.y, r.y);
          if (interW <= 0 || interH <= 0) return false;
          const interArea = interW * interH;
          const minArea = Math.min(ex.w * ex.h, r.w * r.h);
          return minArea > 0 && (interArea / minArea) > 0.7;
        });

        if (!isDuplicate) {
          existingList.push({
            id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            x: Math.round(r.x * 100) / 100,
            y: Math.round(r.y * 100) / 100,
            w: Math.round(r.w * 100) / 100,
            h: Math.round(r.h * 100) / 100,
            snapped: r.snapped || q
          });
          totalAdded++;
        }
      }
    }

    if (totalAdded > 0) {
      recordUndo({
        type: 'batch_all',
        page: pageIndex.value,
        beforeState
      });
      searchFeedback.value = {
        type: 'success',
        text: t('redact_search_hits_msg', 'Found and marked {count} sensitive item(s)', { count: totalAdded })
      };
    } else {
      searchFeedback.value = {
        type: 'info',
        text: t('redact_search_no_hits', 'No matching content found')
      };
    }

    searchFeedbackTimer = setTimeout(() => {
      searchFeedback.value = null;
    }, 4000);

  } catch (err) {
    logger.error('REDACT_SEARCH', err);
    searchFeedback.value = {
      type: 'error',
      text: err.message || 'Search failed'
    };
  } finally {
    isSearching.value = false;
  }
}

// ---------- Rendering ----------
function goPage(delta) {
  const next = pageIndex.value + delta;
  if (next < 0 || next >= totalPages.value) return;
  pageIndex.value = next;
  selectedRectId.value = null;
  renderPage();
}

function changePreviewPage(targetIndex) {
  if (targetIndex < 0 || targetIndex >= totalPages.value || targetIndex === pageIndex.value) return;
  pageIndex.value = targetIndex;
  selectedRectId.value = null;
  renderPage();
}

async function renderPage() {
  if (!pdfjsDoc || !pageCanvasRef.value) return;
  try {
    const page = await pdfjsDoc.getPage(pageIndex.value + 1);
    const viewport = page.getViewport({ scale: 2.0 });
    currentViewport = viewport;
    viewportTick.value++;
    await nextTick();
    fitStageBox();
    const canvas = pageCanvasRef.value;
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    viewportTick.value++;
    fitStageBox();
  } catch (e) {
    logger.error('REDACT', `Page render failed: ${e.message}`);
  }
}

// ---------- Overlay interactions (viewport space) ----------
let drag = null; // { mode:'new'|'move'|'resize', startPt, origRect, rectId, handle }

function eventToViewportPt(e) {
  const box = overlayRef.value.getBoundingClientRect();
  return {
    x: ((e.clientX - box.left) / box.width) * currentViewport.width,
    y: ((e.clientY - box.top) / box.height) * currentViewport.height
  };
}

function hitTestRect(pt) {
  const list = rectsByPage.value[pageIndex.value] || [];
  for (let i = list.length - 1; i >= 0; i--) {
    const c = userRectToCanvas(list[i], currentViewport);
    if (pt.x >= c.x && pt.x <= c.x + c.w && pt.y >= c.y && pt.y <= c.y + c.h) {
      return { rect: list[i], canvas: c };
    }
  }
  return null;
}

function onPointerDown(e) {
  if (!currentViewport || e.button !== 0) return;
  const pt = eventToViewportPt(e);
  const hit = hitTestRect(pt);
  if (hit) {
    selectedRectId.value = hit.rect.id;
    drag = {
      mode: 'move',
      startPt: pt,
      origCanvas: { ...hit.canvas },
      rectId: hit.rect.id,
      origUser: { x: hit.rect.x, y: hit.rect.y, w: hit.rect.w, h: hit.rect.h, snapped: hit.rect.snapped }
    };
  } else {
    selectedRectId.value = null;
    drag = { mode: 'new', startPt: pt };
    draftRect.value = { x: pt.x, y: pt.y, w: 0, h: 0 };
  }
  overlayRef.value.setPointerCapture(e.pointerId);
}

function onHandleDown(e, rectId, handle) {
  if (!currentViewport) return;
  const pt = eventToViewportPt(e);
  const rect = (rectsByPage.value[pageIndex.value] || []).find((r) => r.id === rectId);
  if (!rect) return;
  selectedRectId.value = rectId;
  drag = {
    mode: 'resize',
    startPt: pt,
    origCanvas: { ...userRectToCanvas(rect, currentViewport) },
    rectId,
    handle,
    origUser: { x: rect.x, y: rect.y, w: rect.w, h: rect.h, snapped: rect.snapped }
  };
  overlayRef.value.setPointerCapture(e.pointerId);
}

function onPointerMove(e) {
  if (!currentViewport) return;
  const pt = eventToViewportPt(e);
  if (!drag) {
    isHoveringRect.value = Boolean(hitTestRect(pt));
    return;
  }
  if (drag.mode === 'new') {
    draftRect.value = {
      x: Math.min(drag.startPt.x, pt.x),
      y: Math.min(drag.startPt.y, pt.y),
      w: Math.abs(pt.x - drag.startPt.x),
      h: Math.abs(pt.y - drag.startPt.y)
    };
  } else if (drag.mode === 'move') {
    const dx = pt.x - drag.startPt.x;
    const dy = pt.y - drag.startPt.y;
    // live-update the stored rect via viewport round-trip
    const moved = {
      x: drag.origCanvas.x + dx,
      y: drag.origCanvas.y + dy,
      w: drag.origCanvas.w,
      h: drag.origCanvas.h
    };
    commitViewportRect(drag.rectId, moved, 'move');
  } else if (drag.mode === 'resize') {
    const dx = pt.x - drag.startPt.x;
    const dy = pt.y - drag.startPt.y;
    const o = drag.origCanvas;
    let { x, y, w, h } = o;
    if (drag.handle.includes('e')) w = o.w + dx;
    if (drag.handle.includes('s')) h = o.h + dy;
    if (drag.handle.includes('w')) { x = o.x + dx; w = o.w - dx; }
    if (drag.handle.includes('n')) { y = o.y + dy; h = o.h - dy; }
    // normalize negative sizes while dragging across the origin
    const moved = {
      x: Math.min(x, x + w), y: Math.min(y, y + h),
      w: Math.abs(w), h: Math.abs(h)
    };
    commitViewportRect(drag.rectId, moved, 'resize');
  }
}

function commitViewportRect(rectId, canvasRect, phase) {
  const list = rectsByPage.value[pageIndex.value];
  const rect = list?.find((r) => r.id === rectId);
  if (!rect) return;
  const user = canvasRectToUser(canvasRect, currentViewport);
  rect.x = user.x; rect.y = user.y; rect.w = user.w; rect.h = user.h;
  if (phase === 'move') rect.snapped = undefined; // manual move breaks the snap provenance
}

async function onPointerUp() {
  if (!drag) return;
  const d = drag;
  drag = null;
  // Pointer capture is implicitly released by the browser on pointerup; no explicit release needed

  if (d.mode === 'new') {
    const dr = draftRect.value;
    draftRect.value = null;
    if (!dr || dr.w < 3 || dr.h < 3) return; // ignore accidental micro-drags

    let userRect = canvasRectToUser(dr, currentViewport);
    let snappedPreview = null;

    if (snapToText.value && pdfjsDoc) {
      try {
        const items = await getTextItems(pageIndex.value);
        const hits = items.filter((it) => rectsIntersect(it.bbox, userRect));
        if (hits.length) {
          const x1 = Math.min(...hits.map((h) => h.bbox.x));
          const y1 = Math.min(...hits.map((h) => h.bbox.y));
          const x2 = Math.max(...hits.map((h) => h.bbox.x + h.bbox.w));
          const y2 = Math.max(...hits.map((h) => h.bbox.y + h.bbox.h));
          userRect = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
          snappedPreview = hits.map((h) => h.str).join(' ').slice(0, 40);
        }
      } catch (e) {
        logger.warn('REDACT', `Snap extraction failed: ${e.message}`);
      }
    }

    const id = `r${pageIndex.value}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    if (!rectsByPage.value[pageIndex.value]) rectsByPage.value[pageIndex.value] = [];
    const newRect = {
      id, x: userRect.x, y: userRect.y, w: userRect.w, h: userRect.h,
      ...(snappedPreview ? { snapped: snappedPreview } : {})
    };
    rectsByPage.value[pageIndex.value].push(newRect);
    recordUndo({ type: 'add', page: pageIndex.value, rect: { ...newRect } });
    selectedRectId.value = id;
  } else if (d.mode === 'move' || d.mode === 'resize') {
    const list = rectsByPage.value[pageIndex.value];
    const rect = list?.find((r) => r.id === d.rectId);
    if (rect && d.origUser && (rect.x !== d.origUser.x || rect.y !== d.origUser.y || rect.w !== d.origUser.w || rect.h !== d.origUser.h)) {
      recordUndo({
        type: 'modify',
        page: pageIndex.value,
        rectId: d.rectId,
        before: { ...d.origUser },
        after: { x: rect.x, y: rect.y, w: rect.w, h: rect.h, snapped: rect.snapped }
      });
    }
  }
}

function recordUndo(action) {
  undoStack.value.push(action);
  if (undoStack.value.length > 30) undoStack.value.shift();
}

function undo() {
  const action = undoStack.value.pop();
  if (!action) return;

  if (action.type === 'add') {
    const list = rectsByPage.value[action.page] || [];
    const idx = list.findIndex((r) => r.id === action.rect.id);
    if (idx >= 0) list.splice(idx, 1);
    if (!list.length) delete rectsByPage.value[action.page];
    if (selectedRectId.value === action.rect.id) selectedRectId.value = null;
  } else if (action.type === 'delete') {
    if (!rectsByPage.value[action.page]) rectsByPage.value[action.page] = [];
    rectsByPage.value[action.page].push(action.rect);
    selectedRectId.value = action.rect.id;
  } else if (action.type === 'modify') {
    const list = rectsByPage.value[action.page] || [];
    const rect = list.find((r) => r.id === action.rectId);
    if (rect) {
      Object.assign(rect, action.before);
      selectedRectId.value = action.rectId;
    }
  } else if (action.type === 'clear') {
    rectsByPage.value[action.page] = [...action.rects];
  } else if (action.type === 'batch_all') {
    rectsByPage.value = action.beforeState;
  }

  if (pageIndex.value !== action.page) {
    changePreviewPage(action.page);
  }
}

function applyCurrentPageToAll() {
  const current = rectsByPage.value[pageIndex.value] || [];
  if (!current.length || totalPages.value <= 1) return;

  const beforeState = JSON.parse(JSON.stringify(rectsByPage.value));

  for (let p = 0; p < totalPages.value; p++) {
    if (p === pageIndex.value) continue;
    if (!rectsByPage.value[p]) rectsByPage.value[p] = [];
    const list = rectsByPage.value[p];

    for (const r of current) {
      const exists = list.some(
        (existing) => Math.abs(existing.x - r.x) < 2 && Math.abs(existing.y - r.y) < 2 &&
                      Math.abs(existing.w - r.w) < 4 && Math.abs(existing.h - r.h) < 4
      );
      if (!exists) {
        list.push({
          id: `r${p}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          x: r.x,
          y: r.y,
          w: r.w,
          h: r.h,
          ...(r.snapped ? { snapped: r.snapped } : {})
        });
      }
    }
  }

  recordUndo({ type: 'batch_all', beforeState, page: pageIndex.value });
}

function applySingleRectToAll(id) {
  const list = rectsByPage.value[pageIndex.value] || [];
  const target = list.find((r) => r.id === id);
  if (!target || totalPages.value <= 1) return;

  const beforeState = JSON.parse(JSON.stringify(rectsByPage.value));

  for (let p = 0; p < totalPages.value; p++) {
    if (p === pageIndex.value) continue;
    if (!rectsByPage.value[p]) rectsByPage.value[p] = [];
    const pageList = rectsByPage.value[p];

    const exists = pageList.some(
      (existing) => Math.abs(existing.x - target.x) < 2 && Math.abs(existing.y - target.y) < 2 &&
                    Math.abs(existing.w - target.w) < 4 && Math.abs(existing.h - target.h) < 4
    );
    if (!exists) {
      pageList.push({
        id: `r${p}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        x: target.x,
        y: target.y,
        w: target.w,
        h: target.h,
        ...(target.snapped ? { snapped: target.snapped } : {})
      });
    }
  }

  recordUndo({ type: 'batch_all', beforeState, page: pageIndex.value });
}

function deleteRect(id) {
  const list = rectsByPage.value[pageIndex.value] || [];
  const idx = list.findIndex((r) => r.id === id);
  if (idx >= 0) {
    const removed = list.splice(idx, 1)[0];
    recordUndo({ type: 'delete', page: pageIndex.value, rect: { ...removed } });
  }
  if (!list.length) delete rectsByPage.value[pageIndex.value];
  if (selectedRectId.value === id) selectedRectId.value = null;
}

function clearPage() {
  const list = rectsByPage.value[pageIndex.value];
  if (list?.length) {
    recordUndo({ type: 'clear', page: pageIndex.value, rects: list.map((r) => ({ ...r })) });
    delete rectsByPage.value[pageIndex.value];
    selectedRectId.value = null;
  }
}

function onKeydown(e) {
  if (isProcessing.value || lastExportedFile.value) return;
  const tag = e.target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
    e.preventDefault();
    undo();
  } else if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
    e.preventDefault();
    zoomIn();
  } else if ((e.ctrlKey || e.metaKey) && (e.key === '-' || e.key === '_')) {
    e.preventDefault();
    zoomOut();
  } else if ((e.ctrlKey || e.metaKey) && (e.key === '0')) {
    e.preventDefault();
    setZoomMode('fit');
  } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedRectId.value) {
    e.preventDefault();
    deleteRect(selectedRectId.value);
  } else if (e.key === 'Escape') {
    selectedRectId.value = null;
    showConfirm.value = false;
  }
}

// ---------- Burn flow ----------
const showConfirm = ref(false);
function openConfirm() {
  if (!totalRects.value) return;
  recomputeSummary();
  showConfirm.value = true;
}

const PHASE_KEYS = {
  analyzing: 'redact_progress_analyzing',
  vector: 'redact_progress_burning',
  saving: 'redact_progress_burning',
  raster: 'redact_progress_raster',
  verify: 'redact_progress_verify'
};

async function executeBurn() {
  showConfirm.value = false;
  if (!docBytes.value || !totalRects.value) return;
  isProcessing.value = true;
  progressPercent.value = 5;
  progressMessage.value = t('redact_progress_analyzing');

  try {
    const pages = {};
    for (const [k, list] of Object.entries(rectsByPage.value)) {
      if (list?.length) {
        pages[Number(k)] = { rects: list.map(({ x, y, w, h }) => ({ x, y, w, h })) };
      }
    }

    const { bytes: outBytes, report } = await redactPdf(docBytes.value.slice(0), {
      pages,
      style: style.value,
      customColor: customColor.value,
      stampText: stampText.value
    }, {
      password: unlockedPassword.value || '',
      onProgress: (p, phase) => {
        progressPercent.value = Math.max(5, Math.round(p * 100));
        progressMessage.value = t(PHASE_KEYS[phase] || 'redact_progress_burning');
      }
    });

    if (!report.ok) {
      // Engine already retried with forced raster; residue remains -> keep original, surface failure
      logger.error('REDACT', `Verification failed: ${JSON.stringify(report.verify?.leftovers || [])}`);
      alert(t('redact_verify_failed'));
      return;
    }
    lastReport = {
      totalRemovedOps: (report.pages || []).reduce((n, p) => n + (p.removedOps || 0), 0),
      rasterPages: report.rasterPages || []
    };

    let outName = (customOutputBaseName.value?.trim() || generateExportFileName(filename.value, 'Redacted'));
    if (!outName.toLowerCase().endsWith('.pdf')) outName += '.pdf';

    const pdfBlob = new Blob([outBytes], { type: 'application/pdf' });
    cachedPdfBlob = pdfBlob;
    cachedPdfName = outName;
    triggerDownload(pdfBlob, outName);
    logger.info('REDACT', `Burn complete: ${outName} (removed ${lastReport.totalRemovedOps} ops, raster pages: [${lastReport.rasterPages.join(', ')}])`);

    const ab = outBytes.buffer
      ? outBytes.buffer.slice(outBytes.byteOffset, outBytes.byteOffset + outBytes.byteLength)
      : outBytes;
    lastExportedFile.value = {
      name: outName,
      size: outBytes.byteLength || outBytes.length,
      arrayBuffer: ab,
      blob: pdfBlob
    };

    if (autoSaveToVault.value) {
      try {
        await saveFile({
          name: outName,
          arrayBuffer: ab,
          folderId: 'default',
          category: 'export',
          pageCount: totalPages.value,
          isEncrypted: false
        });
        logger.info('VAULT', `Redacted result auto-saved to Vault: ${outName}`);
      } catch (e) {
        logger.warn('VAULT', `Failed to auto-save to Vault: ${e.message}`);
      }
    }
  } catch (err) {
    logger.error('REDACT', `Burn failed: ${err.message}`);
    alert('Redaction failed: ' + err.message);
  } finally {
    isProcessing.value = false;
  }
}

// ---------- Image page detection (rasterization risk hint) ----------
function scanImagePages(pdfDoc) {
  const found = [];
  pdfDoc.getPages().forEach((page, idx) => {
    if (pageResourcesContainImage(page.node, pdfDoc.context, 0)) found.push(idx);
  });
  return found;
}

function pageResourcesContainImage(node, context, depth) {
  let res = node.get ? node.get(PDFName.of('Resources')) : null;
  if (res instanceof PDFRef) res = context.lookup(res);
  if (!(res instanceof PDFDict) || depth > 3) return false;
  let xo = res.get(PDFName.of('XObject'));
  if (xo instanceof PDFRef) xo = context.lookup(xo);
  if (!(xo instanceof PDFDict)) return false;
  for (const [, val] of xo.entries()) {
    let obj = val instanceof PDFRef ? context.lookup(val) : val;
    if (!obj) continue;
    const dict = obj.dict instanceof PDFDict ? obj.dict : (obj instanceof PDFDict ? obj : null);
    if (!dict) continue;
    const subtype = dict.get(PDFName.of('Subtype'));
    if (subtype === PDFName.of('Image')) return true;
    if (subtype === PDFName.of('Form') && pageResourcesContainImage({ get: (n) => dict.get(n) }, context, depth + 1)) {
      return true; // image nested inside a Form XObject
    }
  }
  return false;
}

// ---------- File loading ----------
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
  if (selectedFiles && selectedFiles.length > 0) loadFile(selectedFiles[0]);
}

async function loadFile(file, password = '') {
  isLoading.value = true;
  pendingFileName.value = file.name;
  pendingFileObj = file;
  try {
    const rawBytes = await file.arrayBuffer();

    const security = await verifyPdfSecurity(rawBytes, password);
    if (security.isEncrypted && !security.isValid) {
      isUnlocking.value = false;
      docBytes.value = null;
      isPasswordOpen.value = true;
      if (password) passwordError.value = t('pwd_error_wrong');
      return;
    }

    // Preview document (pdf.js): rendered pages only, engine always starts from original bytes
    const loadingTask = pdfjsLib.getDocument({
      data: rawBytes.slice(0),
      password: password || undefined,
      cMapUrl: '/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: '/standard_fonts/'
    });
    if (pdfjsDoc) { try { await pdfjsDoc.destroy(); } catch (e) {} }
    pdfjsDoc = await loadingTask.promise;

    // Rasterization-risk scan (pdf-lib): pages whose resources embed image XObjects
    let imgPages = [];
    try {
      const probe = await PDFDocument.load(rawBytes, {
        password: password || undefined,
        ignoreEncryption: true,
        updateMetadata: false
      });
      imgPages = scanImagePages(probe);
    } catch (e) {
      logger.warn('REDACT', `Image page scan skipped: ${e.message}`);
    }

    docBytes.value = rawBytes;
    filename.value = file.name;
    customOutputBaseName.value = generateExportFileName(file.name, 'Redacted');
    totalPages.value = pdfjsDoc.numPages;
    imagePages.value = imgPages;
    pageIndex.value = 0;
    rectsByPage.value = {};
    selectedRectId.value = null;
    textOpsCount.value = 0;
    textItemCache.clear();
    lastExportedFile.value = null;
    lastReport = null;
    cachedPdfBlob = null;
    cachedPdfName = '';
    unlockedPassword.value = password;
    isPasswordOpen.value = false;
    passwordError.value = '';

    logger.info('REDACT', `Loaded PDF for redaction: ${file.name} (${totalPages.value} pages, image pages: [${imgPages.join(', ')}])`);
  } catch (err) {
    if (err.name === 'PasswordException' || err.message?.toLowerCase().includes('password')) {
      docBytes.value = null;
      isPasswordOpen.value = true;
      if (password) passwordError.value = t('pwd_error_wrong');
    } else {
      logger.error('REDACT', `Failed to load PDF: ${err.message}`);
      alert('Failed to load PDF: ' + err.message);
    }
  } finally {
    isLoading.value = false;
    isUnlocking.value = false;
    await nextTick();
    await renderPage();
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
  unlockedPassword.value = '';
}

function reset() {
  if (pdfjsDoc) { try { pdfjsDoc.destroy()?.catch(() => {}); } catch (e) {} }
  pdfjsDoc = null;
  currentViewport = null;
  viewportTick.value++;
  docBytes.value = null;
  filename.value = '';
  totalPages.value = 0;
  pageIndex.value = 0;
  imagePages.value = [];
  rectsByPage.value = {};
  selectedRectId.value = null;
  textItemCache.clear();
  textOpsCount.value = 0;
  pendingFileName.value = '';
  pendingFileObj = null;
  unlockedPassword.value = '';
  lastExportedFile.value = null;
  lastReport = null;
  cachedPdfBlob = null;
  cachedPdfName = '';
  progressPercent.value = 0;
  progressMessage.value = '';
  showConfirm.value = false;
  draftRect.value = null;
  drag = null;
  customOutputBaseName.value = '';
  style.value = 'black';
  customColor.value = '#000000';
  stampText.value = '[REDACTED]';
  autoSaveToVault.value = userSettings.autoSaveToVault ?? true;
  undoStack.value = [];
  zoomMode.value = 'fit';
  customZoomPercent.value = 100;
  stageBoxSize.value = { w: 0, h: 0 };
  isHoveringRect.value = false;
  searchQuery.value = '';
  searchFeedback.value = null;
  isSearching.value = false;
  if (fileInputRef.value) fileInputRef.value.value = '';
}

// ---------- Tool bridge (Vault / other tools -> redact) ----------
function checkIncomingFile() {
  const incoming = consumePendingFile('redact');
  if (incoming) {
    const file = new File([incoming.arrayBuffer], incoming.name, { type: 'application/pdf' });
    loadFile(file, incoming.password || '');
  }
}

onMounted(() => {
  checkIncomingFile();
  window.addEventListener('keydown', onKeydown);
});
onActivated(checkIncomingFile);
onUnmounted(() => {
  stageRO?.disconnect();
  window.removeEventListener('keydown', onKeydown);
  if (pdfjsDoc) { try { pdfjsDoc.destroy()?.catch(() => {}); } catch (e) {} }
  pdfjsDoc = null;
  clearTimeout(summaryTimer);
});
</script>
