<template>
  <section class="w-full flex-1 flex flex-col">
    <!-- Main Assembly Container matching Merge & Split tools (Fills entire available space cleanly) -->
    <div class="relative bg-white rounded-3xl p-5 sm:p-7 shadow-xl border border-slate-100 flex flex-col flex-1 space-y-3 overflow-hidden">
      
      <!-- Top Title Header (shrink-0) -->
      <div class="flex items-center justify-between pb-2.5 border-b border-slate-100 shrink-0 gap-3">
        <div class="flex items-center space-x-3 min-w-0 flex-1">
          <div class="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0 shadow-2xs">
            <Zap class="w-5 h-5" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center space-x-2">
              <h2 class="text-base sm:text-lg font-extrabold text-slate-900 leading-tight whitespace-nowrap truncate">
                {{ t('pipeline_title') }}
              </h2>
              <span class="text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                Pipeline Engine
              </span>
            </div>
            <p class="text-xs text-slate-400 font-medium hidden sm:block mt-0.5 truncate max-w-xl lg:max-w-2xl" :title="t('pipeline_subtitle')">
              {{ t('pipeline_subtitle') }}
            </p>
          </div>
        </div>

        <div class="text-xs text-slate-400 font-mono hidden md:flex items-center space-x-2.5 shrink-0">
          <!-- Workflow Slot Capacity Badge (3 slots for Free, Unlimited for Pro) -->
          <div 
            @click="!isProSupporter && savedUserFlows.length >= 3 ? emit('open-enterprise') : null"
            :class="[
              'flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs border whitespace-nowrap shrink-0 transition select-none',
              isProSupporter 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 font-bold' 
                : savedUserFlows.length >= 3
                  ? 'bg-amber-50/90 text-amber-800 border-amber-300 font-semibold cursor-pointer hover:bg-amber-100 shadow-2xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 font-medium'
            ]"
            :title="isProSupporter ? t('pipeline_slot_tooltip_pro') : (savedUserFlows.length >= 3 ? t('pipeline_slot_tooltip_full') : t('pipeline_slot_tooltip_free'))"
          >
            <Crown v-if="isProSupporter" class="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <BookmarkPlus v-else-if="savedUserFlows.length >= 3" class="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <Bookmark v-else class="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span class="whitespace-nowrap">
              {{ isProSupporter ? t('pipeline_slot_pro') : (savedUserFlows.length >= 3 ? t('pipeline_slot_full') : t('pipeline_slot_free', { count: savedUserFlows.length })) }}
            </span>
          </div>

          <button 
            v-if="!isProSupporter && siteConfig.features.enableProDesktopSuggestion"
            @click="emit('open-enterprise')"
            class="text-xs bg-amber-500 hover:bg-amber-600 text-white font-bold px-2.5 py-1 rounded-xl transition shadow-2xs cursor-pointer flex items-center space-x-1 whitespace-nowrap shrink-0"
          >
            <Crown class="w-3 h-3 text-white shrink-0" />
            <span class="whitespace-nowrap">{{ t('pro_desktop_btn') }}</span>
          </button>

        </div>
      </div>

      <!-- Two-Column Workbench Layout (Flexible Grid Filling the Card) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-stretch">
        
        <!-- LEFT COLUMN: Workflow Selector, Step Box & Bottom Add Button (5 cols) -->
        <div class="lg:col-span-5 flex flex-col space-y-2">
          
          <!-- 1. Workflow Selector & Save Control Bar (Pinned at Top of Left Column) -->
          <div class="bg-slate-50/90 rounded-2xl p-2.5 sm:p-3 border border-slate-200/80 space-y-1.5 shrink-0">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-bold text-slate-700 flex items-center space-x-1.5 min-w-0">
                <Sliders class="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span class="truncate" :title="t('pipeline_config_panel_title')">{{ t('pipeline_config_panel_title') }}</span>
              </span>

              <!-- Action buttons: Save Flow / Reset -->
              <div class="flex items-center space-x-2 shrink-0">
                <button 
                  v-if="currentCustomFlowRecord && isCurrentFlowModified"
                  type="button"
                  @click="saveChangesSilently"
                  class="text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-md transition cursor-pointer flex items-center space-x-1 whitespace-nowrap shrink-0 shadow-xs"
                >
                  <Save class="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span class="whitespace-nowrap">{{ t('pipeline_btn_save_changes') }}</span>
                </button>
                <button 
                  v-else-if="!currentCustomFlowRecord"
                  type="button"
                  @click="openSaveFlowModal('new')"
                  class="text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-md transition cursor-pointer flex items-center space-x-1 whitespace-nowrap shrink-0 shadow-xs"
                >
                  <BookmarkPlus class="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span class="whitespace-nowrap">{{ t('pipeline_btn_save_as_my_flow') }}</span>
                </button>

                <button 
                  v-if="isCurrentFlowModified"
                  type="button"
                  @click="resetCurrentFlow"
                  class="text-[11px] font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md transition cursor-pointer flex items-center space-x-1 whitespace-nowrap shrink-0"
                >
                  <RotateCcw class="w-3.5 h-3.5" />
                  <span class="whitespace-nowrap shrink-0">{{ t('pipeline_btn_reset') }}</span>
                </button>
              </div>
            </div>

            <!-- Flow Dropdown Selector -->
            <div class="relative">
              <select 
                v-model="activeFlowSelectionKey" 
                data-testid="pipeline-flow-select"
                @change="handleFlowChange"
                class="w-full appearance-none text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-1.5 pr-8 text-slate-800 focus:outline-indigo-500 cursor-pointer shadow-2xs"
              >
                <optgroup :label="t('pipeline_preset_flows_group')">
                  <option v-for="preset in PRESET_PIPELINES" :key="'preset_' + preset.id" :value="'preset_' + preset.id">
                    ⚡ {{ t(preset.nameKey, preset.defaultName) }}
                  </option>
                </optgroup>

                <optgroup v-if="savedUserFlows.length > 0" :label="t('pipeline_saved_flows_group')">
                  <option v-for="flow in savedUserFlows" :key="'user_' + flow.id" :value="'user_' + flow.id">
                    ⭐ {{ flow.name }}
                  </option>
                </optgroup>

                <option value="new_blank">
                  {{ t('pipeline_new_blank_flow') }}
                </option>
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                <ChevronDown class="w-3.5 h-3.5" />
              </div>
            </div>

            <!-- Active Flow Description & Status -->
            <div class="flex items-center justify-between text-[11px] text-slate-500 pt-1 px-1">
              <span class="truncate text-slate-500 flex-1 mr-2" :title="currentPipelineDesc">
                {{ currentPipelineDesc }}
              </span>
              <div class="flex items-center space-x-1.5 shrink-0">
                <span v-if="isCurrentFlowModified" class="text-amber-600 font-bold text-[10px] bg-amber-50 px-1 py-0.5 rounded">
                  * {{ t('pipeline_flow_modified') }}
                </span>
                
                <!-- Action Icons for Custom Flow -->
                <template v-if="currentCustomFlowRecord">
                  <button type="button" @click="openSaveFlowModal('rename')" class="text-slate-400 hover:text-indigo-600 p-0.5 rounded transition cursor-pointer" :title="t('pipeline_btn_rename')">
                    <Pencil class="w-3.5 h-3.5" />
                  </button>
                  <button type="button" @click="duplicateCurrentFlow" class="text-slate-400 hover:text-indigo-600 p-0.5 rounded transition cursor-pointer" :title="t('pipeline_btn_duplicate')">
                    <Copy class="w-3.5 h-3.5" />
                  </button>
                  <button type="button" @click="deleteCurrentCustomFlow" class="text-slate-400 hover:text-red-600 p-0.5 rounded transition cursor-pointer" :title="t('btn_delete')">
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </template>
              </div>
            </div>
          </div>

          <!-- 2. Step Scroll Box (flex-1 fills available left column height with inner scrollbar) -->
          <div class="flex-1 min-h-[260px] bg-slate-50/60 rounded-2xl border border-slate-200/90 p-2.5 flex flex-col overflow-hidden shadow-2xs">
            <!-- Pinned Step Box Header -->
            <div class="flex items-center justify-between px-1 pb-2 border-b border-slate-200/70 shrink-0 text-xs">
              <span class="font-bold text-slate-700 flex items-center space-x-1.5">
                <span>{{ t('pipeline_steps_title') }}</span>
                <span class="text-[10px] bg-indigo-50 text-indigo-700 font-extrabold px-1.5 py-0.2 rounded-full border border-indigo-100">
                  {{ activeWorkflowSteps.length }}
                </span>
              </span>
              <span class="text-[10px] text-slate-400">
                {{ t('pipeline_step_click_hint') }}
              </span>
            </div>

            <!-- Scrollable Step List Container (Scrolls cleanly when exceeding box height) -->
            <transition-group 
              name="list" 
              tag="div" 
              class="flex-1 overflow-y-auto space-y-1.5 pt-2 pr-1 custom-scrollbar relative"
            >
              <div 
                v-for="(st, idx) in activeWorkflowSteps" 
                :key="st.id || idx"
                :draggable="true"
                @dragstart="onDragStart($event, idx)"
                @dragover.prevent="onDragOver($event, idx)"
                @drop="onDrop($event, idx)"
                @dragend="onDragEnd"
                :class="[
                  'group flex items-center justify-between px-2.5 py-2 rounded-xl bg-white border transition-all duration-300 gap-2 cursor-pointer shrink-0',
                  draggedStepIndex === idx ? 'opacity-30 border-dashed border-indigo-400 bg-indigo-50/20' : 'border-slate-200/90 hover:border-indigo-300 hover:shadow-xs'
                ]"
                @click="openStepConfigModal(idx)"
              >
                <!-- Left: Step Index + Node Name + Summary Badge -->
                <div class="flex items-center space-x-2 min-w-0 flex-1">
                  <span class="w-5 h-5 rounded-md bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center shrink-0 shadow-2xs">
                    {{ idx + 1 }}
                  </span>
                  
                  <span class="font-bold text-slate-800 text-xs truncate shrink-0">
                    {{ getNodeName(st.nodeId) }}
                  </span>

                  <!-- Parameter Summary Pill -->
                  <span 
                    class="px-2 py-0.5 rounded-md text-[10px] font-medium border truncate max-w-[140px] hidden sm:inline-block"
                    :class="getStepTagClass(st.nodeId, st)"
                    :title="getStepSummary(st)"
                  >
                    {{ getStepSummary(st) }}
                  </span>
                </div>

                <!-- Right: Config Button + Reorder + Delete -->
                <div class="flex items-center space-x-1 shrink-0" @click.stop>
                  <!-- Configure Button -->
                  <button 
                    type="button"
                    @click.stop="openStepConfigModal(idx)"
                    class="flex items-center space-x-1 text-[11px] font-semibold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 px-2 py-0.5 rounded-lg transition cursor-pointer"
                    :title="t('pipeline_step_config_btn')"
                  >
                    <Settings2 class="w-3 h-3 text-slate-500 group-hover:text-indigo-600" />
                    <span class="hidden md:inline">{{ t('pipeline_step_config_btn') }}</span>
                  </button>

                  <!-- Drag Handle -->
                  <div 
                    class="drag-handle p-1 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50 transition cursor-grab active:cursor-grabbing shrink-0"
                    :title="t('pipeline_btn_drag_reorder') || 'Drag to reorder'"
                  >
                    <GripVertical class="w-3.5 h-3.5" />
                  </div>

                  <!-- Remove -->
                  <button 
                    v-if="activeWorkflowSteps.length > 1"
                    type="button"
                    @click.stop="removeStep(idx)"
                    class="p-1 text-slate-300 hover:text-red-500 rounded-md hover:bg-red-50 transition cursor-pointer"
                    :title="t('pipeline_delete_step')"
                  >
                    <Trash2 class="w-3 h-3" />
                  </button>
                </div>
              </div>

              <!-- Empty Steps State -->
              <div v-if="activeWorkflowSteps.length === 0" class="text-center py-8 text-slate-400 text-xs">
                {{ t('pipeline_no_steps_hint') }}
              </div>
            </transition-group>
          </div>

          <!-- 3. Append Node Button: Docked at Bottom of Left Column (shrink-0) -->
          <button 
            type="button"
            @click="addStepModal = true"
            class="w-full py-2 rounded-xl border-2 border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-indigo-600 text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-2xs shrink-0"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>{{ t('pipeline_btn_add_step') }}</span>
          </button>

        </div>

        <!-- RIGHT COLUMN: Minimal Gap Between File Selection, Run Button & Deliverables (7 cols) -->
        <div class="lg:col-span-7 flex flex-col space-y-2">
          
          <input 
            ref="fileInput" 
            type="file" 
            multiple 
            data-testid="pipeline-file-input"
            class="hidden" 
            @change="handleFileInput" 
          />

          <!-- 1. Top Box: File Batch Area (Adaptive height with strict min/max constraints) -->
          <div 
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="handleFileDrop"
            :class="[
              'relative border-2 border-dashed rounded-2xl transition-all duration-300 flex flex-col overflow-hidden shrink-0',
              inputFiles.length === 0 
                ? 'min-h-[150px] max-h-[190px]' 
                : 'min-h-[110px] max-h-[220px]',
              isDragging 
                ? 'border-indigo-500 bg-indigo-50/60 scale-[0.995]' 
                : 'border-slate-300 hover:border-indigo-300 bg-slate-50/40'
            ]"
          >
            <!-- STATE A: When Empty (Centered Dropzone with Dual Source Buttons Inside) -->
            <div 
              v-if="inputFiles.length === 0"
              class="flex-1 flex flex-col items-center justify-center p-3 sm:p-4 text-center cursor-pointer"
              @click="fileInput?.click()"
            >
              <div class="w-9 h-9 bg-indigo-100/80 text-indigo-600 rounded-xl flex items-center justify-center mb-1.5 shadow-xs">
                <UploadCloud class="w-5 h-5" />
              </div>
              <h4 class="text-xs sm:text-sm font-bold text-slate-800">
                {{ t('pipeline_drop_box_title') }}
              </h4>
              <p class="text-[11px] text-slate-400 mt-0.5 max-w-sm">
                {{ t('pipeline_drop_box_subtitle') }}
              </p>

              <!-- Integrated Upload Buttons Inside the Dashed Box -->
              <div class="mt-2 flex items-center justify-center space-x-2" @click.stop>
                <button 
                  type="button" 
                  @click="fileInput?.click()"
                  class="flex items-center space-x-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-xl transition cursor-pointer shadow-xs"
                >
                  <Plus class="w-3.5 h-3.5" />
                  <span>{{ t('btn_add_from_pc') }}</span>
                </button>

                <button 
                  type="button" 
                  @click="isVaultPickerOpen = true"
                  class="flex items-center space-x-1 text-xs bg-white hover:bg-slate-100 text-slate-700 font-semibold px-3 py-1.5 rounded-xl border border-slate-200 transition cursor-pointer shadow-2xs"
                >
                  <FolderLock class="w-3.5 h-3.5 text-blue-600" />
                  <span>{{ t('btn_choose_from_vault') }}</span>
                </button>
              </div>
            </div>

            <!-- STATE B: When Files Exist (Mini Toolbar + Compact Scrollable List Inside the Dashed Box) -->
            <div v-else class="flex flex-col overflow-hidden">
              <!-- Pinned Top Mini-Bar Inside the Box -->
              <div class="flex items-center justify-between px-3 py-1.5 bg-white/90 border-b border-slate-200/80 shrink-0 text-xs">
                <span class="text-slate-600 font-semibold flex items-center space-x-1.5">
                  <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
                  <span>{{ t('pipeline_files_selected_prefix') }} <b class="text-indigo-600">{{ inputFiles.length }}</b> {{ t('pipeline_files_unit') }} ({{ formatSize(totalInputSize) }})</span>
                </span>

                <div class="flex items-center space-x-1">
                  <button 
                    type="button" 
                    @click.stop="fileInput?.click()"
                    class="text-[11px] text-indigo-700 hover:bg-indigo-50 font-bold px-2 py-0.5 rounded-md transition cursor-pointer flex items-center space-x-1"
                  >
                    <Plus class="w-3 h-3" />
                    <span>{{ t('btn_add_from_pc') }}</span>
                  </button>

                  <button 
                    type="button" 
                    @click.stop="isVaultPickerOpen = true"
                    class="text-[11px] text-slate-600 hover:bg-slate-100 font-medium px-2 py-0.5 rounded-md transition cursor-pointer flex items-center space-x-1"
                  >
                    <FolderLock class="w-3 h-3 text-blue-600" />
                    <span>{{ t('btn_choose_from_vault') }}</span>
                  </button>

                  <button 
                    type="button" 
                    @click.stop="inputFiles = []"
                    class="text-[11px] text-slate-400 hover:text-red-500 font-medium px-1.5 py-0.5 transition cursor-pointer"
                  >
                    {{ t('btn_clear_list') }}
                  </button>
                </div>
              </div>

              <!-- Compact Scrollable File List (Adaptive height with internal scroll) -->
              <div class="overflow-y-auto p-2 space-y-1.5 custom-scrollbar max-h-[135px]">
                <div 
                  v-for="(file, fIdx) in inputFiles" 
                  :key="fIdx"
                  class="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white border border-slate-200/90 shadow-2xs hover:border-indigo-300 transition text-xs shrink-0"
                >
                  <div class="flex items-center space-x-2 min-w-0 flex-1">
                    <span class="w-4 h-4 rounded bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {{ fIdx + 1 }}
                    </span>
                    <Images v-if="isImageFile(file)" class="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <FileText v-else class="w-3.5 h-3.5 text-red-600 shrink-0" />
                    <span class="font-bold text-slate-800 text-xs truncate max-w-[240px]" :title="file.name">
                      {{ file.name }}
                    </span>
                    <span class="text-[10px] text-slate-400 font-mono shrink-0">
                      {{ formatSize(file.size) }}
                    </span>

                    <!-- Completed Badge when output exists -->
                    <span 
                      v-if="!isRunning && outputResults.length > 0" 
                      class="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.2 rounded font-medium shrink-0 flex items-center space-x-0.5"
                    >
                      <CheckCircle2 class="w-2.5 h-2.5 text-emerald-600" />
                      <span>{{ t('pipeline_tag_processed') }}</span>
                    </span>
                  </div>

                  <button 
                    type="button" 
                    @click.stop="removeFile(fIdx)" 
                    class="text-slate-300 hover:text-red-500 p-1 rounded transition cursor-pointer shrink-0"
                  >
                    <X class="w-3 h-3" />
                  </button>
                </div>
              </div>

              <!-- Bottom Subtle Append Hint Strip -->
              <div 
                @click="fileInput?.click()"
                class="px-3 py-1 bg-slate-100/70 border-t border-slate-200/60 text-[11px] text-slate-400 flex items-center justify-between cursor-pointer hover:bg-slate-200/50 transition shrink-0"
              >
                <span class="flex items-center space-x-1 text-slate-500 font-medium">
                  <Plus class="w-3 h-3 text-indigo-600" />
                  <span>{{ t('pipeline_drag_more_hint') }}</span>
                </span>
                <span class="text-[10px] text-slate-400">
                  {{ t('picker_multi_page_accumulate') }}
                </span>
              </div>
            </div>
          </div>

          <!-- 2. Middle Bar: Compact Execution Launch Control / Completed Harvest Bar -->
          <div 
            :class="[
              'rounded-2xl border p-2.5 space-y-1.5 shrink-0 shadow-2xs transition-all duration-300',
              (!isRunning && outputResults.length > 0)
                ? 'bg-gradient-to-r from-emerald-50/90 to-teal-50/70 border-emerald-200'
                : 'bg-gradient-to-r from-slate-50 to-indigo-50/40 border-indigo-100'
            ]"
          >
            <!-- Sub-state 1: Completed Harvest Bar -->
            <template v-if="!isRunning && outputResults.length > 0">
              <div class="flex items-center justify-between text-xs px-0.5">
                <div class="flex items-center space-x-1.5 min-w-0">
                  <CheckCircle2 class="w-4 h-4 text-emerald-600 shrink-0" />
                  <span class="font-bold text-slate-800 truncate">
                    {{ t('pipeline_completed_status_title') }}
                  </span>
                  <span class="font-extrabold text-emerald-700 bg-emerald-100/80 px-2 py-0.2 rounded-full text-[11px] shrink-0 border border-emerald-200/80">
                    {{ outputResults.length }} {{ t('pipeline_files_unit') }}
                  </span>
                </div>
                <div v-if="compressionSavings" class="text-[11px] text-emerald-700 font-bold bg-white/90 px-2 py-0.5 rounded-md border border-emerald-200 shadow-2xs shrink-0">
                  {{ t('pipeline_stat_saved') }} -{{ compressionSavings }}%
                </div>
              </div>

              <!-- Main Harvest Button (Large vibrant emerald button) -->
              <!-- Case A: Single File Output -->
              <button 
                v-if="outputResults.length === 1"
                type="button"
                data-testid="pipeline-harvest-download-single-btn"
                @click="downloadSingle(outputResults[0])" 
                class="w-full py-2.5 rounded-xl font-extrabold text-xs sm:text-sm text-white flex items-center justify-center space-x-2 shadow-md bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/20 active:scale-[0.99] transition cursor-pointer"
              >
                <Download class="w-4 h-4 text-white" />
                <span>{{ t('pipeline_btn_download_single_harvest') }} ({{ formatSize(totalOutputSize) }})</span>
              </button>

              <!-- Case B: Multi-File Output (ZIP Archive) -->
              <button 
                v-else
                type="button"
                data-testid="pipeline-harvest-download-all-btn"
                :disabled="isZipping"
                @click="downloadAllZip" 
                class="w-full py-2.5 rounded-xl font-extrabold text-xs sm:text-sm text-white flex items-center justify-center space-x-2 shadow-md bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/20 active:scale-[0.99] transition cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
              >
                <Loader2 v-if="isZipping" class="w-4 h-4 animate-spin text-white" />
                <Archive v-else class="w-4 h-4 text-white" />
                <span>{{ isZipping ? zipProgressText : `${t('pipeline_btn_download_zip_harvest', { count: outputResults.length })} (${formatSize(totalOutputSize)})` }}</span>
              </button>

              <!-- Secondary Action Controls (Rerun, Download Separately, Save to Vault, Start New) -->
              <div class="flex items-center justify-between pt-0.5 px-0.5 text-xs">
                <button 
                  type="button" 
                  @click="startExecution"
                  class="flex items-center space-x-1 text-[11px] text-slate-600 hover:text-indigo-600 font-semibold py-1 px-2 rounded-lg hover:bg-white/80 transition cursor-pointer"
                  :title="t('pipeline_btn_rerun_tooltip')"
                >
                  <RotateCcw class="w-3 h-3" />
                  <span>{{ t('pipeline_btn_rerun') }}</span>
                </button>

                <!-- When multi-file, offer Download Separately option -->
                <button 
                  v-if="outputResults.length > 1"
                  type="button" 
                  @click="downloadAllSequential"
                  class="flex items-center space-x-1 text-[11px] text-slate-600 hover:text-emerald-700 font-semibold py-1 px-2 rounded-lg hover:bg-white/80 transition cursor-pointer"
                  :title="t('pipeline_btn_download_separate')"
                >
                  <Files class="w-3.5 h-3.5 text-slate-500" />
                  <span>{{ t('pipeline_btn_download_separate') }}</span>
                </button>

                <button 
                  type="button" 
                  @click="saveAllToVault"
                  class="flex items-center space-x-1 text-[11px] text-blue-700 hover:text-blue-800 font-semibold py-1 px-2 rounded-lg hover:bg-white/80 transition cursor-pointer"
                >
                  <FolderLock class="w-3.5 h-3.5 text-blue-600" />
                  <span>{{ t('pipeline_btn_save_vault') }}</span>
                </button>

                <button 
                  type="button" 
                  @click="resetBatchAndResults"
                  class="flex items-center space-x-1 text-[11px] text-slate-400 hover:text-red-600 font-medium py-1 px-2 rounded-lg hover:bg-white/80 transition cursor-pointer"
                >
                  <X class="w-3 h-3" />
                  <span>{{ t('pipeline_btn_new_batch') }}</span>
                </button>
              </div>
            </template>

            <!-- Sub-state 2: Normal Ready / Running Control Bar -->
            <template v-else>
              <div class="flex items-center justify-between text-xs px-0.5">
                <div class="flex items-center space-x-2">
                  <span class="font-bold text-slate-700">{{ t('pipeline_ready_to_run') }}</span>
                  <span class="font-black text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-100 shadow-2xs">
                    {{ currentPipeline.name || (currentPipeline.nameKey ? t(currentPipeline.nameKey, currentPipeline.defaultName) : currentPipeline.defaultName) }}
                  </span>
                </div>
                <div class="text-slate-500 text-[11px]">
                  {{ activeWorkflowSteps.length }} {{ t('pipeline_steps_count_unit') }} · {{ inputFiles.length }} {{ t('pipeline_files_unit') }}
                </div>
              </div>

              <!-- Primary Run Button (Sleek, Compact Height) -->
              <button 
                type="button"
                data-testid="pipeline-run-btn"
                @click="startExecution" 
                :disabled="isRunning || inputFiles.length === 0 || activeWorkflowSteps.length === 0"
                :class="[
                  'w-full py-2 rounded-xl font-bold text-xs sm:text-sm text-white flex items-center justify-center space-x-2 shadow-md transition cursor-pointer',
                  (isRunning || inputFiles.length === 0 || activeWorkflowSteps.length === 0) 
                    ? 'bg-slate-300 cursor-not-allowed text-slate-500 shadow-none' 
                    : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-indigo-500/20 active:scale-[0.99]'
                ]"
              >
                <Loader2 v-if="isRunning" class="w-4 h-4 animate-spin text-white" />
                <Play v-else class="w-4 h-4 text-white fill-white" />
                <span>{{ isRunning ? t('pipeline_btn_running') : t('pipeline_btn_run_main') }}</span>
              </button>

              <!-- Live Progress Bar when Running -->
              <div v-if="isRunning" class="space-y-1 pt-0.5">
                <div class="flex items-center justify-between text-xs">
                  <div class="font-bold text-indigo-700 flex items-center space-x-2 truncate">
                    <span>{{ progressState.stepName }}:</span>
                    <span class="text-slate-600 font-normal truncate">{{ progressState.stepMessage }}</span>
                  </div>
                  <div class="flex items-center space-x-2 shrink-0">
                    <span class="font-extrabold text-indigo-600">{{ progressState.overallPercent }}%</span>
                    <button 
                      @click="cancelExecution"
                      class="text-[10px] text-red-500 hover:text-red-700 font-semibold px-1.5 py-0.5 rounded border border-red-200 bg-red-50 transition cursor-pointer"
                    >
                      {{ t('btn_cancel') || 'Cancel' }}
                    </button>
                  </div>
                </div>
                <div class="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                  <div 
                    class="h-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-300 rounded-full"
                    :style="{ width: progressState.overallPercent + '%' }"
                  ></div>
                </div>
              </div>
            </template>
          </div>

          <!-- 3. Bottom Box: Deliverables & Output Area (flex-1: Fills lower half with only 8px gap to run button) -->
          <!-- State A: Deliverables Available -->
          <div v-if="outputResults.length > 0" class="flex-1 min-h-[160px] bg-white rounded-2xl shadow-sm border border-emerald-200 p-2.5 flex flex-col overflow-hidden animate-in fade-in duration-300">
            <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 shrink-0">
              <div class="flex items-center space-x-1.5">
                <CheckCircle2 class="w-4 h-4 text-emerald-600" />
                <h3 class="font-bold text-slate-800 text-xs">
                  {{ t('pipeline_completed_title') }} ({{ outputResults.length }} {{ t('pipeline_files_unit') }})
                </h3>
              </div>

              <div class="flex items-center space-x-1.5">
                <!-- If multi-file: primary ZIP download button -->
                <button 
                  v-if="outputResults.length > 1"
                  @click="downloadAllZip"
                  :disabled="isZipping"
                  data-testid="pipeline-download-zip-btn"
                  class="flex items-center space-x-1 px-2.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition cursor-pointer shadow-xs disabled:opacity-75"
                >
                  <Loader2 v-if="isZipping" class="w-3 h-3 animate-spin" />
                  <Archive v-else class="w-3 h-3" />
                  <span>{{ t('pipeline_btn_download_zip') }}</span>
                </button>

                <!-- If multi-file: separate sequential download button -->
                <button 
                  v-if="outputResults.length > 1"
                  @click="downloadAllSequential"
                  data-testid="pipeline-download-separate-btn"
                  class="flex items-center space-x-1 px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-lg transition cursor-pointer"
                >
                  <Files class="w-3 h-3 text-slate-500" />
                  <span>{{ t('pipeline_btn_download_separate') }}</span>
                </button>

                <!-- If single file: standard download button -->
                <button 
                  v-if="outputResults.length === 1"
                  @click="downloadSingle(outputResults[0])"
                  data-testid="pipeline-download-all-btn"
                  class="flex items-center space-x-1 px-2.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition cursor-pointer shadow-xs"
                >
                  <Download class="w-3 h-3" />
                  <span>{{ t('pipeline_btn_download_all') }}</span>
                </button>

                <button 
                  @click="saveAllToVault"
                  class="flex items-center space-x-1 px-2.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-lg transition cursor-pointer"
                >
                  <FolderLock class="w-3 h-3 text-blue-600" />
                  <span>{{ t('pipeline_btn_save_vault') }}</span>
                </button>
              </div>
            </div>

            <!-- Value Recap Strip (ROI / Savings Banner) -->
            <div v-if="compressionSavings" class="mt-1 px-2.5 py-1 bg-emerald-50/70 border border-emerald-100 rounded-lg text-emerald-800 text-[11px] flex items-center justify-between shrink-0">
              <div class="flex items-center space-x-1.5 min-w-0">
                <Sparkles class="w-3 h-3 text-emerald-600 shrink-0" />
                <span class="truncate">{{ t('pipeline_summary_savings_recap') }}: <b>{{ formatSize(totalInputSize) }}</b> ➔ <b>{{ formatSize(totalOutputSize) }}</b></span>
              </div>
              <span class="text-[10px] font-extrabold text-emerald-700 bg-white px-1.5 py-0.2 rounded border border-emerald-200 shrink-0">
                -{{ compressionSavings }}%
              </span>
            </div>

            <!-- Processed Files List -->
            <div class="flex-1 overflow-y-auto space-y-1 mt-1.5 pr-1 custom-scrollbar">
              <div 
                v-for="(item, oIdx) in outputResults" 
                :key="oIdx"
                class="flex items-center justify-between p-1.5 px-2 rounded-lg bg-slate-50 hover:bg-white border border-slate-200/80 transition text-xs shrink-0"
              >
                <div class="flex items-center space-x-2 min-w-0 flex-1">
                  <div class="w-5 h-5 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <FileCheck class="w-3 h-3" />
                  </div>
                  <span class="font-bold text-slate-800 text-xs truncate max-w-[200px]" :title="item.name">{{ item.name }}</span>
                  <span class="text-[10px] text-slate-400 font-mono">{{ formatSize(item.data.byteLength) }}</span>
                </div>

                <div class="flex items-center space-x-1 shrink-0">
                  <button 
                    type="button"
                    @click="previewSingle(item)"
                    class="flex items-center space-x-1 text-[11px] text-slate-600 hover:text-indigo-600 font-semibold px-2 py-0.5 bg-white hover:bg-indigo-50 border border-slate-200/80 rounded-md transition cursor-pointer shrink-0"
                    :title="t('btn_preview')"
                  >
                    <Eye class="w-3 h-3 text-slate-500 group-hover:text-indigo-600" />
                    <span>{{ t('btn_preview') }}</span>
                  </button>

                  <button 
                    @click="downloadSingle(item)"
                    class="flex items-center space-x-1 text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 rounded-md transition cursor-pointer shrink-0"
                  >
                    <Download class="w-3 h-3" />
                    <span>{{ t('pipeline_btn_download_single') }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- State B: Executing in Progress -->
          <div v-else-if="isRunning" class="flex-1 min-h-[160px] bg-indigo-50/20 rounded-2xl border border-dashed border-indigo-200/90 p-4 text-center flex flex-col items-center justify-center space-y-2 animate-in fade-in duration-300">
            <div class="w-9 h-9 rounded-2xl bg-indigo-100/80 text-indigo-600 flex items-center justify-center shadow-2xs">
              <Loader2 class="w-5 h-5 animate-spin" />
            </div>
            <div>
              <div class="text-xs font-bold text-slate-800 flex items-center justify-center space-x-1.5">
                <span>{{ progressState.stepName || t('pipeline_deliverables_running_title') }}</span>
                <span class="text-indigo-600 font-black">({{ progressState.overallPercent }}%)</span>
              </div>
              <p class="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed truncate">
                {{ progressState.stepMessage || t('pipeline_deliverables_running_desc') }}
              </p>
            </div>
            <div class="text-[10px] text-slate-400 bg-white/70 px-2.5 py-1 rounded-full border border-indigo-100/70">
              {{ t('pipeline_deliverables_running_hint') }}
            </div>
          </div>

          <!-- State C: Empty Deliverables State -->
          <div v-else class="flex-1 min-h-[160px] bg-slate-50/40 rounded-2xl border border-dashed border-slate-200/80 p-3 text-center flex flex-col items-center justify-center space-y-1">
            <div class="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-500 mx-auto flex items-center justify-center mb-0.5">
              <Sparkles class="w-3.5 h-3.5" />
            </div>
            <div class="text-xs font-bold text-slate-700">
              {{ t('pipeline_deliverables_empty_title') }}
            </div>
            <p class="text-[11px] text-slate-400 max-w-sm mx-auto leading-relaxed">
              {{ t('pipeline_deliverables_empty_desc') }}
            </p>
          </div>

        </div>

      </div>

      <!-- Step Parameter Configuration Side Drawer -->
      <div 
        v-if="isConfigStepModalOpen && editingStepDraft"
        class="absolute inset-0 z-50 overflow-hidden flex justify-end"
      @keydown.esc="isConfigStepModalOpen = false"
    >
      <!-- Backdrop -->
      <div 
        class="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" 
        @click="isConfigStepModalOpen = false"
      ></div>

      <!-- Drawer Panel -->
      <div class="relative w-full max-w-sm sm:max-w-lg bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300 ease-out border-l border-slate-200">
        <!-- Drawer Header -->
        <div class="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div>
            <h3 class="font-extrabold text-slate-900 text-base flex items-center space-x-2">
              <Settings2 class="w-5 h-5 text-indigo-600" />
              <span>{{ t('pipeline_modal_config_title') }}: {{ currentEditingStepName }}</span>
            </h3>
            <p class="text-[11px] text-slate-500 mt-1">
              {{ t('pipeline_modal_config_desc') }}
            </p>
          </div>
          <button @click="isConfigStepModalOpen = false" class="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-200 transition cursor-pointer">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Dynamic Form for Active Step Node (Scrollable Body) -->
        <div class="flex-1 overflow-y-auto p-6 space-y-5 text-xs custom-scrollbar">
          <!-- 1. Watermark Parameters -->
          <div v-if="currentEditingStepNodeId === 'node_watermark'" class="space-y-4">
            <div>
              <label class="block text-slate-700 font-bold mb-1.5">{{ t('param_watermark_text') }}</label>
              <input 
                type="text" 
                v-model="editingStepDraft.text" 
                :placeholder="t('param_watermark_placeholder')"
                class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
              />
            </div>

            <div>
              <div class="flex justify-between text-slate-700 font-bold mb-1.5">
                <span>{{ t('wm_size_label') || 'Font Size' }}</span>
                <span class="text-indigo-600 font-mono font-bold">{{ editingStepDraft.size || 48 }}px</span>
              </div>
              <input 
                type="range" 
                min="16" 
                max="96" 
                v-model.number="editingStepDraft.size" 
                class="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            <div>
              <div class="flex justify-between text-slate-700 font-bold mb-1.5">
                <span>{{ t('param_watermark_opacity') }}</span>
                <span class="text-indigo-600 font-mono font-bold">{{ Math.round((editingStepDraft.opacity || 0.18) * 100) }}%</span>
              </div>
              <input 
                type="range" 
                min="0.05" 
                max="0.9" 
                step="0.01" 
                v-model.number="editingStepDraft.opacity" 
                class="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            <div>
              <div class="flex justify-between text-slate-700 font-bold mb-1.5">
                <span>{{ t('param_watermark_rotation') || 'Rotation' }}</span>
                <span class="text-indigo-600 font-mono font-bold">{{ editingStepDraft.rotation || 45 }}°</span>
              </div>
              <input 
                type="range" 
                min="-90" 
                max="90" 
                step="5" 
                v-model.number="editingStepDraft.rotation" 
                class="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            <div>
              <label class="block text-slate-700 font-bold mb-1.5">{{ t('param_watermark_color') }}</label>
              <div class="flex items-center space-x-2.5">
                <div class="relative w-8 h-8 rounded-lg border border-slate-200 overflow-hidden cursor-pointer shrink-0 shadow-sm">
                  <input type="color" v-model="editingStepDraft.color" class="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
                  <div class="w-full h-full" :style="{ backgroundColor: editingStepDraft.color || '#ef4444' }"></div>
                </div>
                <span class="font-mono text-xs text-slate-700 font-bold uppercase mr-2">{{ editingStepDraft.color || '#ef4444' }}</span>
                <div class="flex items-center space-x-1.5">
                  <button 
                    type="button"
                    v-for="c in ['#ef4444', '#2563eb', '#475569', '#10b981', '#000000']"
                    :key="c"
                    @click="editingStepDraft.color = c"
                    class="w-6 h-6 rounded-md border border-slate-200/80 cursor-pointer transition hover:scale-110 shadow-2xs"
                    :style="{ backgroundColor: c }"
                    :title="c"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Page Number Parameters -->
          <div v-else-if="currentEditingStepNodeId === 'node_page_number'" class="space-y-4">
            <!-- Format Macro Input & Presets -->
            <div>
              <label class="block text-slate-700 font-bold mb-1.5">{{ t('pn_format_label') || 'Page Number Format' }}</label>
              <input 
                type="text" 
                v-model="editingStepDraft.format" 
                :placeholder="'Page {n} of {total}'"
                class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
              />
              <div class="flex flex-wrap gap-1.5 mt-2">
                <button 
                  type="button" 
                  v-for="macro in ['{n}', '{n} / {total}', t('pn_preset_page_n'), t('pn_preset_page_n_of_total')]"
                  :key="macro"
                  @click="editingStepDraft.format = macro"
                  class="text-[11px] px-2 py-0.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-mono transition cursor-pointer"
                >
                  {{ macro }}
                </button>
              </div>
            </div>

            <!-- Position Selector (6-Anchor Grid) -->
            <div>
              <label class="block text-slate-700 font-bold mb-1.5">{{ t('pn_position_label') || 'Position' }}</label>
              <div class="grid grid-cols-3 gap-1.5">
                <button 
                  type="button" 
                  v-for="pos in [
                    { id: 'top_left', label: t('pn_pos_top_left') || 'Top Left' },
                    { id: 'top_center', label: t('pn_pos_top_center') || 'Top Center' },
                    { id: 'top_right', label: t('pn_pos_top_right') || 'Top Right' },
                    { id: 'bottom_left', label: t('pn_pos_bottom_left') || 'Bottom Left' },
                    { id: 'bottom_center', label: t('pn_pos_bottom_center') || 'Bottom Center' },
                    { id: 'bottom_right', label: t('pn_pos_bottom_right') || 'Bottom Right' }
                  ]" 
                  :key="pos.id"
                  @click="editingStepDraft.position = pos.id"
                  :class="[
                    'text-[11px] py-1.5 px-2 rounded-xl border text-center transition font-semibold cursor-pointer',
                    editingStepDraft.position === pos.id 
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold shadow-2xs' 
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  ]"
                >
                  {{ pos.label }}
                </button>
              </div>
            </div>

            <!-- Start Number & Skip Cover -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-slate-700 font-bold mb-1.5">{{ t('pn_start_number') || 'Start Number' }}</label>
                <input 
                  type="number" 
                  min="1" 
                  v-model.number="editingStepDraft.startNumber"
                  class="w-full px-3.5 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                />
              </div>

              <div class="flex flex-col justify-end">
                <label class="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer select-none py-2">
                  <input 
                    type="checkbox" 
                    v-model="editingStepDraft.skipCover" 
                    class="w-4 h-4 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>{{ t('pn_skip_cover') || 'Skip Cover Page' }}</span>
                </label>
              </div>
            </div>

            <!-- Masking Mode & Mask Color -->
            <div>
              <label class="block text-slate-700 font-bold mb-1.5">{{ t('pn_mask_label') || 'Background Whiteout Mask' }}</label>
              <div class="grid grid-cols-3 gap-1.5 mb-2">
                <button 
                  type="button" 
                  v-for="mask in [
                    { id: 'full_ribbon', label: t('pn_mask_ribbon') || 'Full Ribbon' },
                    { id: 'local_box', label: t('pn_mask_box') || 'Local Box' },
                    { id: 'none', label: t('pn_mask_none') || 'None (Transparent)' }
                  ]"
                  :key="mask.id"
                  @click="editingStepDraft.maskMode = mask.id"
                  :class="[
                    'text-[11px] py-1.5 px-2 rounded-xl border text-center transition font-semibold cursor-pointer',
                    editingStepDraft.maskMode === mask.id 
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold shadow-2xs' 
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  ]"
                >
                  {{ mask.label }}
                </button>
              </div>

              <!-- Mask Color Controls in Pipeline -->
              <div v-if="editingStepDraft.maskMode !== 'none'" class="mt-2 space-y-1.5">
                <span class="block text-[11px] text-slate-600 font-semibold">{{ t('pn_mask_color_label') || 'Mask Color' }}:</span>
                
                <div class="flex flex-wrap items-center gap-1.5">
                  <!-- 1. Smart Auto-Detect: Samples document dynamically at runtime -->
                  <button 
                    type="button" 
                    @click="editingStepDraft.maskColor = 'auto'"
                    class="text-[10px] px-2.5 py-1 rounded-xl border transition flex items-center space-x-1 font-semibold cursor-pointer"
                    :class="[
                      editingStepDraft.maskColor === 'auto' || !editingStepDraft.maskColor
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold shadow-2xs ring-1 ring-indigo-500/20' 
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    ]"
                  >
                    <Sparkles class="w-3 h-3 text-indigo-600" />
                    <span>{{ t('pn_mask_color_auto') || 'Smart Auto-Detect' }}</span>
                  </button>

                  <!-- 2. White swatch -->
                  <button 
                    type="button" 
                    @click="editingStepDraft.maskColor = '#ffffff'" 
                    class="text-[10px] px-2.5 py-1 rounded-xl border transition flex items-center space-x-1.5 font-semibold cursor-pointer"
                    :class="[
                      editingStepDraft.maskColor === '#ffffff'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold shadow-2xs ring-1 ring-indigo-500/20' 
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    ]"
                  >
                    <span class="w-3 h-3 rounded-full bg-white border border-slate-300 shadow-2xs"></span>
                    <span>{{ t('pn_mask_color_white') || 'White' }}</span>
                  </button>

                  <!-- 3. Cream / Parchment swatch -->
                  <button 
                    type="button" 
                    @click="editingStepDraft.maskColor = '#fbf9f4'" 
                    class="text-[10px] px-2.5 py-1 rounded-xl border transition flex items-center space-x-1.5 font-semibold cursor-pointer"
                    :class="[
                      editingStepDraft.maskColor === '#fbf9f4'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold shadow-2xs ring-1 ring-indigo-500/20' 
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    ]"
                  >
                    <span class="w-3 h-3 rounded-full bg-[#fbf9f4] border border-amber-200 shadow-2xs"></span>
                    <span>{{ t('pn_mask_color_cream') || 'Parchment / Cream' }}</span>
                  </button>

                  <!-- 4. Custom Fixed Color Picker Box -->
                  <div class="flex items-center space-x-1.5 pl-1 border-l border-slate-200">
                    <div class="relative w-6 h-6 rounded-lg border border-slate-300 overflow-hidden shadow-2xs cursor-pointer flex items-center justify-center" :title="t('wm_color_picker', 'Custom Color')">
                      <input 
                        type="color" 
                        :value="editingStepDraft.maskColor !== 'auto' ? (editingStepDraft.maskColor || '#ffffff') : '#ffffff'" 
                        @input="e => editingStepDraft.maskColor = e.target.value"
                        class="absolute inset-0 opacity-0 w-full h-full cursor-pointer" 
                      />
                      <div class="w-full h-full" :style="{ backgroundColor: editingStepDraft.maskColor !== 'auto' ? (editingStepDraft.maskColor || '#ffffff') : '#ffffff' }"></div>
                    </div>
                  </div>
                </div>

                <!-- Auto mode vs Fixed mode hint -->
                <div v-if="editingStepDraft.maskColor === 'auto' || !editingStepDraft.maskColor" class="text-[10.5px] text-indigo-600 flex items-center space-x-1 font-medium pt-0.5">
                  <Sparkles class="w-3 h-3 shrink-0" />
                  <span>{{ t('pn_mask_color_auto_hint') || 'Dynamically samples each document background at runtime' }}</span>
                </div>
                <div v-else class="text-[10.5px] text-slate-500 flex items-center space-x-1.5 pt-0.5">
                  <span class="font-mono font-bold">{{ editingStepDraft.maskColor }}</span>
                  <span class="text-slate-400">({{ t('pn_mask_color_fixed') || 'Fixed Color' }})</span>
                </div>
              </div>
            </div>

            <!-- Typography & Color -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <div class="flex justify-between text-slate-700 font-bold mb-1.5">
                  <span>{{ t('wm_size_label') || 'Font Size' }}</span>
                  <span class="text-indigo-600 font-mono">{{ editingStepDraft.fontSize || 10 }}pt</span>
                </div>
                <input 
                  type="range" 
                  min="8" 
                  max="24" 
                  v-model.number="editingStepDraft.fontSize" 
                  class="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div>
                <div class="flex justify-between text-slate-700 font-bold mb-1.5">
                  <span>{{ t('pn_text_color') || 'Text Color' }}</span>
                  <span class="font-mono text-[11px] text-slate-500 uppercase font-bold">{{ editingStepDraft.textColor || '#334155' }}</span>
                </div>
                <div class="flex items-center space-x-2">
                  <div class="relative w-7 h-7 rounded-lg border border-slate-300 overflow-hidden cursor-pointer shadow-2xs flex items-center justify-center">
                    <input type="color" v-model="editingStepDraft.textColor" class="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
                    <div class="w-full h-full" :style="{ backgroundColor: editingStepDraft.textColor || '#334155' }"></div>
                  </div>
                  <div class="flex items-center space-x-1">
                    <button 
                      v-for="c in ['#334155', '#000000', '#1e293b', '#1d4ed8']" 
                      :key="c"
                      type="button"
                      @click="editingStepDraft.textColor = c"
                      :style="{ backgroundColor: c }"
                      :class="[
                        'w-4 h-4 rounded-full transition cursor-pointer',
                        (editingStepDraft.textColor || '#334155').toLowerCase() === c.toLowerCase() ? 'ring-2 ring-indigo-600 scale-110' : 'opacity-80 hover:opacity-100'
                      ]"
                    ></button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Margin Slider -->
            <div>
              <div class="flex justify-between text-slate-700 font-bold mb-1.5">
                <span>{{ t('pn_margin') || 'Edge Margin' }}</span>
                <span class="text-indigo-600 font-mono">{{ editingStepDraft.margin || 24 }}pt</span>
              </div>
              <input 
                type="range" 
                min="12" 
                max="48" 
                v-model.number="editingStepDraft.margin" 
                class="w-full accent-indigo-600 cursor-pointer"
              />
            </div>
          </div>

          <!-- 2. Compress Parameters -->
          <div v-else-if="currentEditingStepNodeId === 'node_compress'" class="space-y-2.5">
            <label class="block text-slate-700 font-bold mb-1">{{ t('param_compress_level') }}</label>
            <div class="flex flex-col space-y-2.5">
              <button 
                type="button"
                @click="editingStepDraft.level = 'balanced'"
                :class="[
                  'p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col relative overflow-hidden',
                  editingStepDraft.level === 'balanced' 
                    ? 'border-amber-500 bg-amber-50/70 text-amber-800 shadow-xs' 
                    : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100'
                ]"
              >
                <div class="flex items-start justify-between gap-1.5 w-full">
                  <div class="text-sm font-bold flex items-start space-x-1.5 min-w-0 flex-1 leading-snug">
                    <span class="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1.5"></span>
                    <span>{{ t('compress_level_balanced') }}</span>
                  </div>
                  <span class="shrink-0 whitespace-nowrap text-[10px] font-mono font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200/60">
                    -50% ~ -75%
                  </span>
                </div>
                <div class="text-[11px] mt-1 opacity-80 leading-relaxed">{{ t('compress_level_balanced_desc') }}</div>
              </button>

              <button 
                type="button"
                @click="editingStepDraft.level = 'extreme'"
                :class="[
                  'p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col relative overflow-hidden',
                  editingStepDraft.level === 'extreme' 
                    ? 'border-rose-500 bg-rose-50/70 text-rose-800 shadow-xs' 
                    : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100'
                ]"
              >
                <div class="flex items-start justify-between gap-1.5 w-full">
                  <div class="text-sm font-bold flex items-start space-x-1.5 min-w-0 flex-1 leading-snug">
                    <span class="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1.5"></span>
                    <span>{{ t('compress_level_extreme') }}</span>
                  </div>
                  <span class="shrink-0 whitespace-nowrap text-[10px] font-mono font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-200/60">
                    -75% ~ -90%
                  </span>
                </div>
                <div class="text-[11px] mt-1 opacity-80 leading-relaxed">{{ t('compress_level_extreme_desc') }}</div>
              </button>

              <!-- Target File Size Mode -->
              <button 
                type="button"
                @click="editingStepDraft.level = 'target'"
                :class="[
                  'p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col relative overflow-hidden',
                  editingStepDraft.level === 'target' 
                    ? 'border-indigo-500 bg-indigo-50/70 text-indigo-800 shadow-xs ring-1 ring-indigo-500/20' 
                    : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100'
                ]"
              >
                <div class="flex items-start justify-between gap-1.5 w-full">
                  <div class="text-sm font-bold flex items-start space-x-1.5 min-w-0 flex-1 leading-snug">
                    <span class="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1.5"></span>
                    <span>{{ t('compress_level_target') }}</span>
                  </div>
                  <span class="shrink-0 whitespace-nowrap text-[10px] font-mono font-bold text-indigo-600 bg-white/80 px-1.5 py-0.5 rounded-md border border-indigo-200/60">
                    ≤ {{ editingStepDraft.targetSizeMb || 2 }} MB
                  </span>
                </div>
                <div class="text-[11px] mt-1 opacity-80 leading-relaxed">{{ t('compress_level_target_desc') }}</div>
              </button>

              <!-- Target Size Settings inside Drawer -->
              <div v-if="editingStepDraft.level === 'target'" class="p-3 bg-indigo-50/50 rounded-xl border border-indigo-200/80 space-y-2 mt-1">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-slate-700 text-[11px]">{{ t('compress_target_size_label') || 'Target Size Limit' }}:</span>
                  <div class="flex items-center space-x-1">
                    <input 
                      type="number" 
                      min="0.1" 
                      max="100" 
                      step="0.5" 
                      v-model.number="editingStepDraft.targetSizeMb" 
                      class="w-20 px-2 py-1 bg-white border border-indigo-200 rounded-lg text-xs font-mono font-bold text-indigo-700 focus:ring-1 focus:ring-indigo-500 outline-none text-right"
                    />
                    <span class="font-bold text-slate-500 text-xs">MB</span>
                  </div>
                </div>
                <div class="flex flex-wrap gap-1">
                  <button 
                    type="button" 
                    v-for="preset in [1, 2, 5, 10]" 
                    :key="preset"
                    @click="editingStepDraft.targetSizeMb = preset"
                    :class="[
                      'px-2 py-0.5 rounded-md text-[10.5px] font-mono font-bold transition cursor-pointer border',
                      editingStepDraft.targetSizeMb === preset 
                        ? 'bg-indigo-600 text-white border-indigo-600' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    ]"
                  >
                    {{ preset }} MB
                  </button>
                </div>
              </div>

              <button 
                type="button"
                @click="editingStepDraft.level = 'lossless'"
                :class="[
                  'p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col relative overflow-hidden',
                  editingStepDraft.level === 'lossless' 
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-800 shadow-xs' 
                    : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100'
                ]"
              >
                <div class="flex items-start justify-between gap-1.5 w-full">
                  <div class="text-sm font-bold flex items-start space-x-1.5 min-w-0 flex-1 leading-snug">
                    <span class="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5"></span>
                    <span>{{ t('compress_level_lossless') }}</span>
                  </div>
                  <span class="shrink-0 whitespace-nowrap text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200/60">
                    -15% ~ -35%
                  </span>
                </div>
                <div class="text-[11px] mt-1 opacity-80 leading-relaxed">{{ t('compress_level_lossless_desc') }}</div>
              </button>
            </div>
          </div>

          <!-- Sanitize Parameters -->
          <div v-else-if="currentEditingStepNodeId === 'node_sanitize'" class="space-y-3">
            <label class="flex items-center space-x-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-slate-700 font-medium transition">
              <input type="checkbox" v-model="editingStepDraft.stripDocInfo" class="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
              <div>
                <div class="font-bold text-slate-800">{{ t('param_sanitize_docinfo') }}</div>
                <div class="text-[11px] text-slate-400 mt-0.5">{{ t('pipe_san_meta', 'Clear PDF Title, Author, Creator, ModDate') }}</div>
              </div>
            </label>
            <label class="flex items-center space-x-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-slate-700 font-medium transition">
              <input type="checkbox" v-model="editingStepDraft.stripPieceInfo" class="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
              <div>
                <div class="font-bold text-slate-800">{{ t('param_sanitize_pieceinfo') }}</div>
                <div class="text-[11px] text-slate-400 mt-0.5">{{ t('pipe_san_dict', 'Erase private dictionaries (Illustrator, Photoshop)') }}</div>
              </div>
            </label>
            <label class="flex items-center space-x-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-slate-700 font-medium transition">
              <input type="checkbox" v-model="editingStepDraft.stripAnnots" class="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
              <div>
                <div class="font-bold text-slate-800">{{ t('param_sanitize_annots') }}</div>
                <div class="text-[11px] text-slate-400 mt-0.5">{{ t('pipe_san_annots_desc', 'Remove comments, sticky notes, hyperlinks, and flatten forms') }}</div>
              </div>
            </label>
          </div>

          <!-- Redact Parameters -->
          <div v-else-if="currentEditingStepNodeId === 'node_redact'" class="space-y-3">
            <!-- Boundary note: rules cannot cover image-based pages -->
            <div class="flex items-start space-x-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 leading-relaxed">
              <Info class="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <span>{{ t('node_redact_boundary_note') }}</span>
            </div>

            <!-- PII Preset Chips -->
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="preset in localizedRedactPresets"
                :key="preset.id"
                type="button"
                @click="addRedactPreset(preset)"
                class="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-slate-300 text-slate-600 bg-white hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
              >
                + {{ t(preset.labelKey) }}
              </button>
            </div>

            <!-- Rule List Editor -->
            <div class="space-y-2">
              <div
                v-for="(rule, ri) in editingStepDraft.rules"
                :key="ri"
                class="p-3 rounded-xl border border-slate-200 space-y-2"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-3 text-[11px] font-bold">
                    <label class="inline-flex items-center space-x-1 cursor-pointer">
                      <input type="radio" :name="`redact_type_${ri}`" value="keyword" v-model="rule.type" class="text-indigo-600 w-3.5 h-3.5" />
                      <span class="text-slate-600">{{ t('node_redact_rule_keyword') }}</span>
                    </label>
                    <label class="inline-flex items-center space-x-1 cursor-pointer">
                      <input type="radio" :name="`redact_type_${ri}`" value="regex" v-model="rule.type" class="text-indigo-600 w-3.5 h-3.5" />
                      <span class="text-slate-600">{{ t('node_redact_rule_regex') }}</span>
                    </label>
                  </div>
                  <button
                    type="button"
                    @click="removeRedactRule(ri)"
                    class="text-slate-300 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  v-model="rule.value"
                  :placeholder="rule.type === 'regex' ? '\\d{16,19}' : 'Secret'"
                  class="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 font-mono"
                />
                <label class="inline-flex items-center space-x-1.5 text-[11px] text-slate-500 cursor-pointer">
                  <input type="checkbox" v-model="rule.caseSensitive" class="rounded text-indigo-600 w-3.5 h-3.5" />
                  <span>{{ t('node_redact_case_sensitive') }}</span>
                </label>
              </div>

              <button
                type="button"
                @click="addRedactRule"
                class="w-full py-2 rounded-xl border border-dashed border-slate-300 text-slate-500 hover:border-indigo-400 hover:text-indigo-600 text-xs font-bold transition cursor-pointer flex items-center justify-center space-x-1"
              >
                <Plus class="w-3.5 h-3.5" />
                <span>{{ t('node_redact_rules_add') }}</span>
              </button>
            </div>

            <!-- Mask Style: 2-Mode Cards + Universal Color + Stamp Config -->
            <div class="p-4 rounded-xl border border-slate-200 space-y-2.5">
              <span class="text-slate-800 font-bold block text-xs">{{ t('redact_confirm_style') }}</span>

              <!-- Two Primary Mask Mode Cards (Solid Block vs Text Stamp) -->
              <div class="grid grid-cols-2 gap-1.5">
                <!-- Block Mode Card -->
                <button
                  type="button"
                  @click="setPipelineRedactMode('block')"
                  :class="[
                    'border rounded-xl p-2 text-left transition cursor-pointer flex items-center gap-2 select-none',
                    editingStepDraft.style !== 'stamp'
                      ? 'border-indigo-600 bg-white ring-1 ring-indigo-600 shadow-xs text-indigo-900'
                      : 'border-slate-200 bg-white/70 hover:border-slate-300 text-slate-700'
                  ]"
                >
                  <div
                    class="w-14 sm:w-16 h-6 rounded-md shrink-0 border border-black/15 shadow-2xs flex items-center justify-center transition-colors"
                    :style="{ backgroundColor: editingStepDraft.customColor || '#000000' }"
                  >
                    <span v-if="(editingStepDraft.customColor || '#000000').toLowerCase() === '#ffffff'" class="text-[7.5px] text-slate-400 font-bold uppercase tracking-wider">WHITE</span>
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="text-[11px] font-bold truncate leading-tight">{{ t('redact_type_block') }}</div>
                    <div class="text-[9.5px] text-slate-400 truncate leading-tight mt-0.5">{{ t('redact_type_block_desc') }}</div>
                  </div>
                </button>

                <!-- Stamp Mode Card -->
                <button
                  type="button"
                  @click="setPipelineRedactMode('stamp')"
                  :class="[
                    'border rounded-xl p-2 text-left transition cursor-pointer flex items-center gap-2 select-none',
                    editingStepDraft.style === 'stamp'
                      ? 'border-indigo-600 bg-white ring-1 ring-indigo-600 shadow-xs text-indigo-900'
                      : 'border-slate-200 bg-white/70 hover:border-slate-300 text-slate-700'
                  ]"
                >
                  <div
                    class="w-14 sm:w-16 h-6 rounded-md shrink-0 border border-black/15 shadow-2xs flex items-center justify-center text-[7.5px] font-black uppercase px-1 truncate transition-colors"
                    :style="{
                      backgroundColor: editingStepDraft.customColor || '#000000',
                      color: isLightPipelineColor(editingStepDraft.customColor || '#000000') ? '#000000' : '#ffffff'
                    }"
                  >
                    {{ editingStepDraft.stampText || '[REDACTED]' }}
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="text-[11px] font-bold truncate leading-tight">{{ t('redact_type_stamp') }}</div>
                    <div class="text-[9.5px] text-slate-400 truncate leading-tight mt-0.5">{{ t('redact_type_stamp_desc') }}</div>
                  </div>
                </button>
              </div>

              <!-- Universal Color Bar (for BOTH Block and Stamp) -->
              <div class="pt-2 border-t border-slate-100 space-y-1.5">
                <div class="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                  <span>{{ editingStepDraft.style === 'stamp' ? t('redact_stamp_color_label') : t('redact_custom_color_label') }}</span>
                  <span class="text-[10px] text-slate-500 font-mono uppercase">{{ editingStepDraft.customColor || '#000000' }}</span>
                </div>
                <div class="flex items-center space-x-2">
                  <div class="flex items-center space-x-1.5 flex-1 overflow-x-auto py-0.5">
                    <button
                      v-for="c in ['#000000', '#334155', '#ffffff', '#b91c1c', '#1e3a8a', '#047857']"
                      :key="c"
                      type="button"
                      @click="setPipelineRedactColor(c)"
                      :style="{ backgroundColor: c }"
                      :class="[
                        'w-5 h-5 rounded-full ring-2 ring-offset-1 transition cursor-pointer shrink-0 border border-black/15',
                        (editingStepDraft.customColor || '#000000').toLowerCase() === c.toLowerCase() ? 'ring-indigo-600 scale-110 shadow-xs' : 'ring-transparent opacity-85 hover:opacity-100'
                      ]"
                      :title="c"
                    />
                  </div>
                  <div class="relative w-6 h-6 rounded-lg border border-slate-300 overflow-hidden shadow-2xs cursor-pointer shrink-0">
                    <input
                      type="color"
                      :value="editingStepDraft.customColor || '#000000'"
                      @input="setPipelineRedactColor($event.target.value)"
                      class="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                    <div class="w-full h-full" :style="{ backgroundColor: editingStepDraft.customColor || '#000000' }"></div>
                  </div>
                  <div class="relative w-18 shrink-0">
                    <span class="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-[10px]">#</span>
                    <input
                      :value="(editingStepDraft.customColor || '#000000').replace(/^#/, '')"
                      @input="handlePipelineRedactColorInput"
                      type="text"
                      maxlength="6"
                      placeholder="000000"
                      class="w-full text-[11px] bg-white border border-slate-200 rounded-lg pl-3.5 pr-1 py-0.5 focus:ring-2 focus:ring-indigo-500 outline-hidden font-mono uppercase text-slate-700 shadow-2xs font-semibold"
                    />
                  </div>
                </div>
              </div>

              <!-- Stamp Text Input (when style === 'stamp') -->
              <div v-if="editingStepDraft.style === 'stamp'" class="pt-2 border-t border-slate-100 space-y-2 animate-in fade-in duration-150">
                <div class="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                  <span>{{ t('redact_stamp_text_label') }}</span>
                  <span class="text-[9.5px] text-slate-400 font-mono">{{ (editingStepDraft.stampText || '').length }} chars</span>
                </div>
                <input
                  type="text"
                  v-model="editingStepDraft.stampText"
                  placeholder="[REDACTED]"
                  class="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                />
                <div class="flex flex-wrap gap-1">
                  <button
                    v-for="chip in ['[REDACTED]', '[已脱敏]', '[CONFIDENTIAL]', '(b)(4)', '[GESCHWÄRZT]', '[CAVIARDÉ]']"
                    :key="chip"
                    type="button"
                    @click="editingStepDraft.stampText = chip"
                    :class="[
                      'text-[10px] px-2 py-0.5 rounded-md border font-semibold transition cursor-pointer',
                      editingStepDraft.stampText === chip ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    ]"
                  >
                    {{ chip }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 4. Img2Pdf Parameters -->
          <div v-else-if="currentEditingStepNodeId === 'node_img2pdf'" class="space-y-3.5">
            <label class="flex items-center space-x-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-slate-700 font-medium">
              <input type="checkbox" v-model="editingStepDraft.mergeIntoOne" class="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
              <div>
                <div class="font-bold text-slate-800">{{ t('param_img2pdf_merge') }}</div>
                <div class="text-[11px] text-slate-400 mt-0.5">{{ t('pipe_img2pdf_desc', 'Merge multiple images sequentially into one PDF') }}</div>
              </div>
            </label>
            <div class="p-4 rounded-xl border border-slate-200 space-y-2.5">
              <span class="text-slate-800 font-bold block">{{ t('param_img2pdf_pagesize') }}</span>
              <div class="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-5">
                <label class="inline-flex items-center space-x-2 cursor-pointer">
                  <input type="radio" value="a4" v-model="editingStepDraft.pageSize" class="text-indigo-600 w-4 h-4" />
                  <span class="font-semibold text-slate-700">{{ t('pipe_img2pdf_a4', 'Standard A4') }}</span>
                </label>
                <label class="inline-flex items-center space-x-2 cursor-pointer">
                  <input type="radio" value="fit_image" v-model="editingStepDraft.pageSize" class="text-indigo-600 w-4 h-4" />
                  <span class="font-semibold text-slate-700">{{ t('pipe_img2pdf_fit', 'Fit to Image') }}</span>
                </label>
              </div>
            </div>
          </div>

          <!-- 5. Pdf2Img Parameters -->
          <div v-else-if="currentEditingStepNodeId === 'node_pdf2img'" class="space-y-3.5">
            <div class="p-4 rounded-xl border border-slate-200 space-y-2.5">
              <span class="text-slate-800 font-bold block">{{ t('p2i_format_label') }}</span>
              <div class="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-5">
                <label class="inline-flex items-center space-x-2 cursor-pointer">
                  <input type="radio" value="png" v-model="editingStepDraft.format" class="text-indigo-600 w-4 h-4" />
                  <span class="font-semibold text-slate-700">{{ t('p2i_format_png') }}</span>
                </label>
                <label class="inline-flex items-center space-x-2 cursor-pointer">
                  <input type="radio" value="jpg" v-model="editingStepDraft.format" class="text-indigo-600 w-4 h-4" />
                  <span class="font-semibold text-slate-700">{{ t('p2i_format_jpg') }}</span>
                </label>
              </div>
            </div>
            <div class="p-4 rounded-xl border border-slate-200 space-y-2.5">
              <span class="text-slate-800 font-bold block">{{ t('p2i_dpi_label') }}</span>
              <div class="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-5">
                <label class="inline-flex items-center space-x-2 cursor-pointer">
                  <input type="radio" :value="150" v-model="editingStepDraft.dpi" class="text-indigo-600 w-4 h-4" />
                  <span class="font-semibold text-slate-700">{{ t('p2i_dpi_standard') }}</span>
                </label>
                <label class="inline-flex items-center space-x-2 cursor-pointer">
                  <input type="radio" :value="300" v-model="editingStepDraft.dpi" class="text-indigo-600 w-4 h-4" />
                  <span class="font-semibold text-slate-700">{{ t('p2i_dpi_high') }}</span>
                </label>
              </div>
            </div>
          </div>

          <!-- 5. Unlock Parameters -->
          <div v-else-if="currentEditingStepNodeId === 'node_unlock'" class="space-y-2">
            <label class="block text-slate-700 font-bold mb-1.5">{{ t('param_unlock_pwd') }}</label>
            <input 
              type="password" 
              v-model="editingStepDraft.password" 
              :placeholder="t('param_unlock_pwd_hint')"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
            />
          </div>

          <!-- Organize Parameters (Normalize) -->
          <div v-else-if="currentEditingStepNodeId === 'node_organize'" class="space-y-4">
            <!-- Paper Size -->
            <div>
              <label class="block text-slate-700 font-bold mb-1.5">{{ t('param_org_size') }}</label>
              <div class="space-y-2">
                <button type="button" @click="editingStepDraft.standardizeSize = 'none'"
                  :class="['w-full p-3 rounded-xl border text-left transition cursor-pointer', editingStepDraft.standardizeSize === 'none' ? 'border-indigo-500 bg-indigo-50/70 text-indigo-700 font-bold shadow-xs' : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100']">
                  <div class="text-xs">{{ t('param_org_sz_none') }}</div>
                </button>
                <button type="button" @click="editingStepDraft.standardizeSize = 'a4'"
                  :class="['w-full p-3 rounded-xl border text-left transition cursor-pointer', editingStepDraft.standardizeSize === 'a4' ? 'border-amber-500 bg-amber-50/70 text-amber-700 font-bold shadow-xs' : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100']">
                  <div class="text-xs flex items-center space-x-1.5"><Wand2 class="w-3.5 h-3.5"/><span>{{ t('param_org_sz_a4') }}</span></div>
                </button>
              </div>
            </div>

            <!-- Orientation -->
            <div>
              <label class="block text-slate-700 font-bold mb-1.5">{{ t('param_org_orient') }}</label>
              <div class="space-y-2">
                <button type="button" @click="editingStepDraft.forceOrientation = 'none'"
                  :class="['w-full p-3 rounded-xl border text-left transition cursor-pointer', editingStepDraft.forceOrientation === 'none' ? 'border-indigo-500 bg-indigo-50/70 text-indigo-700 font-bold shadow-xs' : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100']">
                  <div class="text-xs">{{ t('param_org_or_none') }}</div>
                </button>
                <button type="button" @click="editingStepDraft.forceOrientation = 'portrait'"
                  :class="['w-full p-3 rounded-xl border text-left transition cursor-pointer', editingStepDraft.forceOrientation === 'portrait' ? 'border-emerald-500 bg-emerald-50/70 text-emerald-700 font-bold shadow-xs' : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100']">
                  <div class="text-xs flex items-center space-x-1.5"><Wand2 class="w-3.5 h-3.5"/><span>{{ t('param_org_or_port') }}</span></div>
                </button>
                <button type="button" @click="editingStepDraft.forceOrientation = 'landscape'"
                  :class="['w-full p-3 rounded-xl border text-left transition cursor-pointer', editingStepDraft.forceOrientation === 'landscape' ? 'border-emerald-500 bg-emerald-50/70 text-emerald-700 font-bold shadow-xs' : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100']">
                  <div class="text-xs flex items-center space-x-1.5"><Wand2 class="w-3.5 h-3.5"/><span>{{ t('param_org_or_land') }}</span></div>
                </button>
              </div>
            </div>

            <!-- Rotate All -->
            <div>
              <label class="block text-slate-700 font-bold mb-1.5">{{ t('param_org_rotate') || 'Rotate All Pages' }}</label>
              <div class="grid grid-cols-2 gap-2">
                <button type="button" @click="editingStepDraft.rotateAll = 'none'"
                  :class="['p-3 rounded-xl border text-center transition cursor-pointer', editingStepDraft.rotateAll === 'none' ? 'border-indigo-500 bg-indigo-50/70 text-indigo-700 font-bold shadow-xs' : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100']">
                  <div class="text-xs">{{ t('param_org_rot_none') }}</div>
                </button>
                <button type="button" @click="editingStepDraft.rotateAll = '90'"
                  :class="['p-3 rounded-xl border text-center transition cursor-pointer flex items-center justify-center space-x-1', editingStepDraft.rotateAll === '90' ? 'border-indigo-500 bg-indigo-50/70 text-indigo-700 font-bold shadow-xs' : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100']">
                  <RotateCw class="w-3.5 h-3.5"/><span class="text-xs">90°</span>
                </button>
                <button type="button" @click="editingStepDraft.rotateAll = '-90'"
                  :class="['p-3 rounded-xl border text-center transition cursor-pointer flex items-center justify-center space-x-1', editingStepDraft.rotateAll === '-90' ? 'border-indigo-500 bg-indigo-50/70 text-indigo-700 font-bold shadow-xs' : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100']">
                  <RotateCcw class="w-3.5 h-3.5"/><span class="text-xs">-90°</span>
                </button>
                <button type="button" @click="editingStepDraft.rotateAll = '180'"
                  :class="['p-3 rounded-xl border text-center transition cursor-pointer flex items-center justify-center space-x-1', editingStepDraft.rotateAll === '180' ? 'border-indigo-500 bg-indigo-50/70 text-indigo-700 font-bold shadow-xs' : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100']">
                  <RefreshCw class="w-3.5 h-3.5"/><span class="text-xs">180°</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Split Parameters -->
          <div v-else-if="currentEditingStepNodeId === 'node_split'" class="space-y-4">
            <div>
              <label class="block text-slate-700 font-bold mb-1.5">{{ t('param_split_mode') }}</label>
              <div class="space-y-2">
                <label class="flex items-center space-x-3 p-3.5 rounded-xl border transition cursor-pointer text-slate-700 font-medium"
                  :class="editingStepDraft.mode === 'extract_range' ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 hover:bg-slate-50'">
                  <input type="radio" value="extract_range" v-model="editingStepDraft.mode" class="text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                  <span class="font-bold text-slate-800 text-sm">{{ t('param_split_extract') }}</span>
                </label>
                <label class="flex items-center space-x-3 p-3.5 rounded-xl border transition cursor-pointer text-slate-700 font-medium"
                  :class="editingStepDraft.mode === 'burst' ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 hover:bg-slate-50'">
                  <input type="radio" value="burst" v-model="editingStepDraft.mode" class="text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                  <span class="font-bold text-slate-800 text-sm">{{ t('param_split_burst') }}</span>
                </label>
              </div>
            </div>

            <div v-if="editingStepDraft.mode === 'extract_range'" class="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/30 space-y-3">
              <label class="block text-slate-700 font-bold">{{ t('param_split_range') }}</label>
              <div class="grid grid-cols-2 gap-2">
                <button type="button" @click="editingStepDraft.rangeType = 'first'"
                  :class="['p-2 rounded-lg border text-center transition cursor-pointer text-xs', editingStepDraft.rangeType === 'first' ? 'border-indigo-500 bg-white text-indigo-700 font-bold shadow-xs' : 'border-slate-200 bg-white/50 text-slate-600 hover:bg-white']">
                  {{ t('param_split_range_first') }}
                </button>
                <button type="button" @click="editingStepDraft.rangeType = 'last'"
                  :class="['p-2 rounded-lg border text-center transition cursor-pointer text-xs', editingStepDraft.rangeType === 'last' ? 'border-indigo-500 bg-white text-indigo-700 font-bold shadow-xs' : 'border-slate-200 bg-white/50 text-slate-600 hover:bg-white']">
                  {{ t('param_split_range_last') }}
                </button>
                <button type="button" @click="editingStepDraft.rangeType = 'custom'"
                  :class="['p-2 rounded-lg border text-center transition cursor-pointer text-xs col-span-2', editingStepDraft.rangeType === 'custom' ? 'border-indigo-500 bg-white text-indigo-700 font-bold shadow-xs' : 'border-slate-200 bg-white/50 text-slate-600 hover:bg-white']">
                  {{ t('param_split_range_custom') }}
                </button>
              </div>
              <div v-if="editingStepDraft.rangeType === 'custom'" class="pt-1">
                <input 
                  type="text" 
                  v-model="editingStepDraft.rangeExpr" 
                  :placeholder="t('param_split_range_ph')"
                  class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm bg-white"
                />
              </div>
            </div>
          </div>

          <!-- Sign Parameters -->
          <div v-else-if="currentEditingStepNodeId === 'node_sign'" class="space-y-4">
            <!-- Saved Stamp Quick Pick (if any in library) -->
            <div v-if="savedStampsForPipeline.length > 0" class="p-2.5 bg-indigo-50/50 rounded-2xl border border-indigo-100/80 space-y-1.5">
              <span class="text-[11px] font-bold text-slate-700 flex items-center space-x-1">
                <Star class="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                <span>{{ t('pipeline_sign_pick_stamp') }}</span>
              </span>
              <div class="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                <button
                  type="button"
                  v-for="stamp in savedStampsForPipeline"
                  :key="stamp.id"
                  @click="editingStepDraft.stampDataUrl = stamp.dataUrl"
                  :class="[
                    'p-1.5 rounded-xl border bg-white cursor-pointer transition flex items-center space-x-1.5 shrink-0 shadow-2xs',
                    editingStepDraft.stampDataUrl === stamp.dataUrl ? 'border-indigo-600 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-indigo-300'
                  ]"
                  :title="stamp.title"
                >
                  <div 
                    class="w-9 h-6 rounded border border-slate-100 overflow-hidden flex items-center justify-center bg-slate-50 shrink-0"
                    :style="{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '4px 4px' }"
                  >
                    <img :src="stamp.dataUrl" class="max-w-full max-h-full object-contain pointer-events-none" />
                  </div>
                  <span class="text-[10px] font-bold text-slate-700 max-w-[70px] truncate">{{ stamp.title }}</span>
                </button>
              </div>
            </div>

            <!-- Stamp Image Upload -->
            <div>
              <label class="block text-slate-700 font-bold mb-1.5">{{ t('param_sign_stamp') }}</label>
              <div v-if="editingStepDraft.stampDataUrl" class="relative group rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center p-4 bg-slate-50/50 h-28">
                <img :src="editingStepDraft.stampDataUrl" class="max-h-full max-w-full object-contain drop-shadow-sm" />
                <div class="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <button type="button" @click="editingStepDraft.stampDataUrl = ''" class="bg-red-500 hover:bg-red-600 text-white rounded-full p-2 cursor-pointer shadow-lg transform hover:scale-105 transition">
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>
              <label v-else class="cursor-pointer flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition group h-28 text-slate-500 hover:text-indigo-600">
                <input type="file" accept="image/png, image/jpeg, image/webp" class="hidden" @change="e => handleStampUpload(e, editingStepDraft)" />
                <Plus class="w-6 h-6 mb-1 group-hover:scale-110 transition" />
                <span class="text-xs font-bold">{{ t('param_sign_stamp_upload') }}</span>
              </label>
              <p class="text-[10px] text-slate-400 mt-1.5 leading-relaxed">{{ t('param_sign_stamp_hint') }}</p>
            </div>

            <!-- Placement & Alignment -->
            <div class="space-y-2.5">
              <div>
                <label class="block text-slate-700 font-bold mb-1 text-xs">{{ t('param_sign_placement') }}</label>
                <select 
                  v-model="editingStepDraft.placement" 
                  @change="handlePlacementChange"
                  class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs cursor-pointer bg-white"
                >
                  <option value="last_page_bottom_right">{{ t('param_sign_place_last') }}</option>
                  <option value="except_last">{{ t('param_sign_place_except_last') }}</option>
                  <option value="all_pages">{{ t('param_sign_place_all') }}</option>
                  <option value="first_page">{{ t('param_sign_place_first') }}</option>
                </select>
              </div>

              <!-- Alignment Position Selector -->
              <div>
                <label class="block text-slate-700 font-bold mb-1 text-xs">{{ t('param_sign_align') }}</label>
                <div class="grid grid-cols-3 gap-2 text-center">
                  <button
                    type="button"
                    @click="editingStepDraft.position = 'bottom_right'"
                    :class="['py-2 px-1.5 rounded-xl border transition cursor-pointer flex flex-col items-center justify-center shadow-2xs', (!editingStepDraft.position || editingStepDraft.position === 'bottom_right') ? 'bg-indigo-50/80 border-indigo-500 text-indigo-700 font-bold shadow-xs' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50']"
                  >
                    <span class="text-xs font-bold leading-tight">{{ t('param_sign_pos_bottom_right_title') }}</span>
                    <span class="text-[10px] opacity-75 mt-0.5 leading-none">{{ t('param_sign_pos_bottom_right_sub') }}</span>
                  </button>
                  <button
                    type="button"
                    @click="editingStepDraft.position = 'mid_right'"
                    :class="['py-2 px-1.5 rounded-xl border transition cursor-pointer flex flex-col items-center justify-center shadow-2xs', editingStepDraft.position === 'mid_right' ? 'bg-indigo-50/80 border-indigo-500 text-indigo-700 font-bold shadow-xs' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50']"
                  >
                    <span class="text-xs font-bold leading-tight">{{ t('param_sign_pos_mid_right_title') }}</span>
                    <span class="text-[10px] opacity-75 mt-0.5 leading-none">{{ t('param_sign_pos_mid_right_sub') }}</span>
                  </button>
                  <button
                    type="button"
                    @click="editingStepDraft.position = 'bottom_center'"
                    :class="['py-2 px-1.5 rounded-xl border transition cursor-pointer flex flex-col items-center justify-center shadow-2xs', editingStepDraft.position === 'bottom_center' ? 'bg-indigo-50/80 border-indigo-500 text-indigo-700 font-bold shadow-xs' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50']"
                  >
                    <span class="text-xs font-bold leading-tight">{{ t('param_sign_pos_bottom_center_title') }}</span>
                    <span class="text-[10px] opacity-75 mt-0.5 leading-none">{{ t('param_sign_pos_bottom_center_sub') }}</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Miniature Live Page Preview Card -->
            <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
              <!-- Preview Header: Title + Pure View Switch -->
              <div class="flex items-center justify-between gap-2">
                <p class="font-bold text-slate-700 text-xs flex items-center space-x-1.5">
                  <Eye class="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>{{ t('param_sign_preview_title') }}</span>
                </p>

                <!-- Pure View Orientation Switch (Does not alter pipeline config) -->
                <div class="inline-flex items-center p-0.5 bg-slate-200/80 rounded-md text-[10px] font-medium shrink-0">
                  <button 
                    type="button"
                    @click="signPreviewOrientation = 'portrait'"
                    :class="[
                      'px-2 py-0.5 rounded transition-all cursor-pointer flex items-center space-x-1',
                      signPreviewOrientation === 'portrait' ? 'bg-white text-indigo-700 font-bold shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    ]"
                  >
                    <span>📄</span>
                    <span>{{ t('img2pdf_orient_portrait') }}</span>
                  </button>
                  <button 
                    type="button"
                    @click="signPreviewOrientation = 'landscape'"
                    :class="[
                      'px-2 py-0.5 rounded transition-all cursor-pointer flex items-center space-x-1',
                      signPreviewOrientation === 'landscape' ? 'bg-white text-indigo-700 font-bold shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    ]"
                  >
                    <span>📑</span>
                    <span>{{ t('img2pdf_orient_landscape') }}</span>
                  </button>
                </div>
              </div>

              <!-- Content: Miniature Page + Description & Estimated Size -->
              <div class="flex items-center space-x-3.5">
                <!-- Mini Page Representation (Standard A4 ratio: 65x92 Portrait vs 92x65 Landscape) -->
                <div 
                  class="bg-white border border-slate-300 rounded-lg shadow-xs relative overflow-hidden shrink-0 flex flex-col justify-between p-1.5 select-none transition-all duration-200"
                  :style="{
                    width: signPreviewOrientation === 'landscape' ? '92px' : '65px',
                    height: signPreviewOrientation === 'landscape' ? '65px' : '92px',
                    minWidth: signPreviewOrientation === 'landscape' ? '92px' : '65px',
                  }"
                >
                  <!-- Document Skeleton Lines (Adapts to orientation) -->
                  <div v-if="signPreviewOrientation === 'portrait'" class="space-y-1 opacity-20 pointer-events-none w-full">
                    <div class="h-1 bg-slate-500 rounded-full w-3/4"></div>
                    <div class="h-1 bg-slate-400 rounded-full w-full"></div>
                    <div class="h-1 bg-slate-400 rounded-full w-full"></div>
                    <div class="h-1 bg-slate-400 rounded-full w-4/5"></div>
                    <div class="h-1 bg-slate-400 rounded-full w-2/3"></div>
                  </div>
                  <div v-else class="space-y-1 opacity-20 pointer-events-none w-full">
                    <div class="h-1 bg-slate-500 rounded-full w-1/2"></div>
                    <div class="h-1 bg-slate-400 rounded-full w-3/4"></div>
                    <div class="h-1 bg-slate-400 rounded-full w-2/3"></div>
                  </div>

                  <!-- Positioned Miniature Stamp Indicator -->
                  <div 
                    class="absolute transition-all duration-200 flex items-center justify-center pointer-events-none"
                    :style="{
                      width: `${Math.max(18, Math.min(48, Math.round(26 * ((editingStepDraft.scale || 0.5) / 0.5))))}px`,
                      height: `${Math.max(10, Math.min(24, Math.round(12 * ((editingStepDraft.scale || 0.5) / 0.5))))}px`,
                      right: (editingStepDraft.position === 'mid_right' ? '2px' : (editingStepDraft.position === 'bottom_center' ? `calc(50% - ${Math.round(13 * ((editingStepDraft.scale || 0.5) / 0.5))}px)` : '4px')),
                      bottom: (editingStepDraft.position === 'mid_right' ? `calc(50% - ${Math.round(6 * ((editingStepDraft.scale || 0.5) / 0.5))}px)` : '5px'),
                    }"
                  >
                    <img 
                      v-if="editingStepDraft.stampDataUrl" 
                      :src="editingStepDraft.stampDataUrl" 
                      class="max-w-full max-h-full object-contain drop-shadow-xs" 
                    />
                    <div v-else class="w-full h-full border border-dashed border-indigo-500 bg-indigo-100/70 rounded-xs flex items-center justify-center">
                      <PenLine class="w-2.5 h-2.5 text-indigo-600" />
                    </div>
                  </div>
                </div>

                <!-- Descriptive Information Column -->
                <div class="text-[11px] text-slate-500 space-y-1.5 min-w-0 flex-1">
                  <p class="text-slate-600 text-[11px] leading-relaxed font-medium">
                    {{ getSignPositionDescription(editingStepDraft.position, signPreviewOrientation) }}
                  </p>
                  <div class="inline-flex items-center px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-500 text-[10px] font-mono shadow-2xs">
                    {{ getSignEstimateSizeText(editingStepDraft.scale, signPreviewOrientation) }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Row 1: Separate Stamp Scale Row -->
            <div class="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-700">{{ t('param_sign_scale') }}</span>
                <span class="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                  {{ Math.round((editingStepDraft.scale || 0.5) * 100) }}%
                </span>
              </div>
              <div class="flex items-center space-x-3">
                <input 
                  type="range" 
                  min="0.15" 
                  max="0.85" 
                  step="0.05" 
                  v-model.number="editingStepDraft.scale" 
                  class="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" 
                />
              </div>
              <!-- Preset Scale Pills -->
              <div class="grid grid-cols-3 gap-1.5 pt-0.5 text-[10px] font-semibold">
                <button 
                  type="button" 
                  @click="editingStepDraft.scale = 0.3"
                  :class="['py-1 px-1 text-center rounded-lg border transition cursor-pointer truncate', Math.abs(editingStepDraft.scale - 0.3) < 0.04 ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300']"
                >
                  30% · {{ t('sign_scale_small') }}
                </button>
                <button 
                  type="button" 
                  @click="editingStepDraft.scale = 0.5"
                  :class="['py-1 px-1 text-center rounded-lg border transition cursor-pointer truncate', Math.abs(editingStepDraft.scale - 0.5) < 0.04 ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300']"
                >
                  50% · {{ t('sign_scale_medium') }}
                </button>
                <button 
                  type="button" 
                  @click="editingStepDraft.scale = 0.7"
                  :class="['py-1 px-1 text-center rounded-lg border transition cursor-pointer truncate', Math.abs(editingStepDraft.scale - 0.7) < 0.04 ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300']"
                >
                  70% · {{ t('sign_scale_large') }}
                </button>
              </div>
            </div>


            <!-- Row 2: Separate Date Stamp Card (Perfect Vertical Alignment) -->
            <div class="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
              <div class="space-y-0.5 pr-2">
                <div class="flex items-center space-x-1.5">
                  <Calendar class="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span class="text-xs font-bold text-slate-700">{{ t('param_sign_add_date') }}</span>
                </div>
                <p class="text-[10.5px] text-slate-400">{{ t('param_sign_add_date_desc') }}</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer shrink-0">
                <input type="checkbox" v-model="editingStepDraft.addDateStamp" class="sr-only peer">
                <div class="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>

          <!-- 6. Merge Parameters -->
          <div v-else-if="currentEditingStepNodeId === 'node_merge'" class="space-y-4">
            <div>
              <label class="block text-slate-700 font-bold mb-1.5">{{ t('param_merge_sort') }}</label>
              <div class="space-y-2">
                <label class="flex items-center space-x-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-slate-700 font-medium">
                  <input type="radio" value="order" v-model="editingStepDraft.sortBy" class="text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                  <div>
                    <div class="font-bold text-slate-800">{{ t('param_merge_order_title') }}</div>
                    <div class="text-[11px] text-slate-400 mt-0.5">{{ t('param_merge_order_desc') }}</div>
                  </div>
                </label>
                <label class="flex items-center space-x-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-slate-700 font-medium">
                  <input type="radio" value="name_asc" v-model="editingStepDraft.sortBy" class="text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                  <div>
                    <div class="font-bold text-slate-800">{{ t('param_merge_name_title') }}</div>
                    <div class="text-[11px] text-slate-400 mt-0.5">{{ t('param_merge_name_desc') }}</div>
                  </div>
                </label>
                <label class="flex items-center space-x-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-slate-700 font-medium">
                  <input type="radio" value="date" v-model="editingStepDraft.sortBy" class="text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                  <div>
                    <div class="font-bold text-slate-800">{{ t('param_merge_date_title') }}</div>
                    <div class="text-[11px] text-slate-400 mt-0.5">{{ t('param_merge_date_desc') }}</div>
                  </div>
                </label>
              </div>
            </div>

            <div class="pt-3 border-t border-slate-100">
              <label class="flex items-start space-x-2.5 cursor-pointer group">
                <input type="checkbox" v-model="editingStepDraft.padBlankPageIfOdd" class="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer" />
                <div>
                  <div class="font-bold text-slate-800 group-hover:text-indigo-700 transition">{{ t('param_merge_pad_title') }}</div>
                  <div class="text-[11px] text-slate-400 mt-0.5">{{ t('param_merge_pad_desc') }}</div>
                </div>
              </label>
            </div>
          </div>

          <!-- 7. Protect Node Parameters -->
          <div v-else-if="currentEditingStepNodeId === 'node_protect'" class="space-y-4">
            <!-- 1. Presets Selector -->
            <div>
              <label class="block text-slate-700 font-bold mb-2 flex items-center space-x-1.5">
                <Sparkles class="w-3.5 h-3.5 text-indigo-600" />
                <span>{{ t('protect_preset_title') }}</span>
              </label>
              
              <div class="space-y-2">
                <!-- Preset 1: Confidential -->
                <button 
                  type="button"
                  @click="applyProtectPresetInPipeline('confidential')"
                  :class="[
                    'w-full p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between',
                    editingStepDraft.preset === 'confidential' 
                      ? 'border-indigo-500 bg-indigo-50/70 ring-1 ring-indigo-500/20 shadow-xs' 
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-100'
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

                <!-- Preset 2: Readonly -->
                <button 
                  type="button"
                  @click="applyProtectPresetInPipeline('readonly')"
                  :class="[
                    'w-full p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between',
                    editingStepDraft.preset === 'readonly' 
                      ? 'border-indigo-500 bg-indigo-50/70 ring-1 ring-indigo-500/20 shadow-xs' 
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-100'
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

                <!-- Preset 3: Forms -->
                <button 
                  type="button"
                  @click="applyProtectPresetInPipeline('forms')"
                  :class="[
                    'w-full p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between',
                    editingStepDraft.preset === 'forms' 
                      ? 'border-indigo-500 bg-indigo-50/70 ring-1 ring-indigo-500/20 shadow-xs' 
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-100'
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

            <!-- 2. Passwords Configuration Section -->
            <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3.5">
              <!-- SCENARIO A: Strict Confidential Preset -->
              <div v-if="editingStepDraft.preset === 'confidential'" class="space-y-3">
                <!-- Open Password -->
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between">
                    <label class="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                      <Key class="w-3.5 h-3.5 text-rose-600" />
                      <span>{{ t('protect_mode_open') }}</span>
                    </label>
                    <span class="text-[10px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full font-bold border border-rose-200/60">{{ t('protect_tag_user_pwd') }}</span>
                  </div>

                  <div class="relative">
                    <input 
                      v-model="editingStepDraft.userPassword"
                      :type="showProtectUserPwd ? 'text' : 'password'"
                      :placeholder="t('protect_open_pwd_placeholder')"
                      class="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 pr-10 focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-800 shadow-2xs"
                    >
                    <button 
                      type="button" 
                      @click="showProtectUserPwd = !showProtectUserPwd"
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      :title="showProtectUserPwd ? t('pwd_hide', 'Hide Password') : t('pwd_show', 'Show Password')"
                    >
                      <Eye v-if="!showProtectUserPwd" class="w-3.5 h-3.5" />
                      <EyeOff v-else class="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <!-- Smallpdf Password Strength Meter -->
                  <div v-if="editingStepDraft.userPassword" class="animate-in fade-in duration-200 pt-0.5">
                    <div class="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div :class="['h-full transition-all duration-300 rounded-full', calcPasswordStrength(editingStepDraft.userPassword).widthClass]"></div>
                    </div>
                    <div class="flex justify-between items-center text-[10px] mt-1 text-slate-500">
                      <span>{{ t('protect_pwd_strength_label') }}: <strong :class="calcPasswordStrength(editingStepDraft.userPassword).color">{{ calcPasswordStrength(editingStepDraft.userPassword).label }}</strong></span>
                    </div>
                  </div>

                  <!-- Confirm Open Password -->
                  <div v-if="editingStepDraft.userPassword" class="space-y-1 animate-in fade-in duration-150">
                    <div class="relative">
                      <input 
                        v-model="editingStepDraft.confirmUserPassword"
                        :type="showProtectUserPwd ? 'text' : 'password'"
                        :placeholder="t('protect_confirm_pwd_placeholder')"
                        :class="[
                          'w-full text-xs bg-white border rounded-xl px-3 py-2 pr-10 outline-none font-medium text-slate-800 shadow-2xs transition-colors',
                          editingStepDraft.confirmUserPassword 
                            ? (editingStepDraft.confirmUserPassword === editingStepDraft.userPassword ? 'border-emerald-400 focus:ring-2 focus:ring-emerald-500' : 'border-rose-400 focus:ring-2 focus:ring-rose-500')
                            : 'border-slate-300 focus:ring-2 focus:ring-indigo-500'
                        ]"
                      >
                      <span v-if="editingStepDraft.confirmUserPassword && editingStepDraft.userPassword === editingStepDraft.confirmUserPassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 text-xs font-bold">
                        ✓
                      </span>
                      <span v-else-if="editingStepDraft.confirmUserPassword && editingStepDraft.userPassword !== editingStepDraft.confirmUserPassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-rose-500 text-xs font-bold">
                        ✕
                      </span>
                    </div>

                    <!-- Real-time Matching Feedback -->
                    <div v-if="editingStepDraft.confirmUserPassword" class="flex items-center space-x-1 text-[11px] font-medium pt-0.5 animate-in fade-in duration-150">
                      <span v-if="editingStepDraft.userPassword === editingStepDraft.confirmUserPassword" class="text-emerald-600 flex items-center space-x-1">
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
                      v-model="editingStepDraft.useSamePassword"
                      class="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    >
                    <span class="font-medium text-slate-800">{{ t('protect_use_same_pwd') }}</span>
                  </label>
                </div>

                <!-- Owner / Management Password (Shown only if NOT using same password) -->
                <div v-if="!editingStepDraft.useSamePassword" class="space-y-2 pt-2 border-t border-slate-200/60 animate-in fade-in duration-200">
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
                      v-model="editingStepDraft.ownerPassword"
                      :type="showProtectOwnerPwd ? 'text' : 'password'"
                      :placeholder="t('protect_owner_pwd_placeholder')"
                      class="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 pr-10 focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-800 shadow-2xs"
                    >
                    <button 
                      type="button"
                      @click="showProtectOwnerPwd = !showProtectOwnerPwd"
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      :title="showProtectOwnerPwd ? t('pwd_hide', 'Hide Password') : t('pwd_show', 'Show Password')"
                    >
                      <Eye v-if="!showProtectOwnerPwd" class="w-3.5 h-3.5" />
                      <EyeOff v-else class="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <!-- Smallpdf Password Strength Meter for Separate Owner Password -->
                  <div v-if="editingStepDraft.ownerPassword" class="animate-in fade-in duration-200 pt-0.5">
                    <div class="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div :class="['h-full transition-all duration-300 rounded-full', calcPasswordStrength(editingStepDraft.ownerPassword).widthClass]"></div>
                    </div>
                    <div class="flex justify-between items-center text-[10px] mt-1 text-slate-500">
                      <span>{{ t('protect_pwd_strength_label') }}: <strong :class="calcPasswordStrength(editingStepDraft.ownerPassword).color">{{ calcPasswordStrength(editingStepDraft.ownerPassword).label }}</strong></span>
                    </div>
                  </div>

                  <!-- Confirm Separate Owner Password -->
                  <div v-if="editingStepDraft.ownerPassword" class="space-y-1 animate-in fade-in duration-150">
                    <div class="relative">
                      <input 
                        v-model="editingStepDraft.confirmOwnerPassword"
                        :type="showProtectOwnerPwd ? 'text' : 'password'"
                        :placeholder="t('protect_confirm_owner_pwd_placeholder')"
                        :class="[
                          'w-full text-xs bg-white border rounded-xl px-3 py-2 pr-10 outline-none font-medium text-slate-800 shadow-2xs transition-colors',
                          editingStepDraft.confirmOwnerPassword 
                            ? (editingStepDraft.confirmOwnerPassword === editingStepDraft.ownerPassword ? 'border-emerald-400 focus:ring-2 focus:ring-emerald-500' : 'border-rose-400 focus:ring-2 focus:ring-rose-500')
                            : 'border-slate-300 focus:ring-2 focus:ring-indigo-500'
                        ]"
                      >
                      <span v-if="editingStepDraft.confirmOwnerPassword && editingStepDraft.ownerPassword === editingStepDraft.confirmOwnerPassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 text-xs font-bold">
                        ✓
                      </span>
                      <span v-else-if="editingStepDraft.confirmOwnerPassword && editingStepDraft.ownerPassword !== editingStepDraft.confirmOwnerPassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-rose-500 text-xs font-bold">
                        ✕
                      </span>
                    </div>

                    <!-- Real-time Matching Feedback -->
                    <div v-if="editingStepDraft.confirmOwnerPassword" class="flex items-center space-x-1 text-[11px] font-medium pt-0.5 animate-in fade-in duration-150">
                      <span v-if="editingStepDraft.ownerPassword === editingStepDraft.confirmOwnerPassword" class="text-emerald-600 flex items-center space-x-1">
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
                      v-model="editingStepDraft.ownerPassword"
                      :type="showProtectOwnerPwd ? 'text' : 'password'"
                      :placeholder="t('protect_owner_pwd_placeholder')"
                      class="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 pr-10 focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-800 shadow-2xs"
                    >
                    <button 
                      type="button"
                      @click="showProtectOwnerPwd = !showProtectOwnerPwd"
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      :title="showProtectOwnerPwd ? t('pwd_hide', 'Hide Password') : t('pwd_show', 'Show Password')"
                    >
                      <Eye v-if="!showProtectOwnerPwd" class="w-3.5 h-3.5" />
                      <EyeOff v-else class="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <!-- Smallpdf Password Strength Meter for Management Password -->
                  <div v-if="editingStepDraft.ownerPassword" class="animate-in fade-in duration-200 pt-0.5">
                    <div class="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div :class="['h-full transition-all duration-300 rounded-full', calcPasswordStrength(editingStepDraft.ownerPassword).widthClass]"></div>
                    </div>
                    <div class="flex justify-between items-center text-[10px] mt-1 text-slate-500">
                      <span>{{ t('protect_pwd_strength_label') }}: <strong :class="calcPasswordStrength(editingStepDraft.ownerPassword).color">{{ calcPasswordStrength(editingStepDraft.ownerPassword).label }}</strong></span>
                    </div>
                  </div>

                  <!-- Confirm Management Password -->
                  <div v-if="editingStepDraft.ownerPassword" class="space-y-1 animate-in fade-in duration-150">
                    <div class="relative">
                      <input 
                        v-model="editingStepDraft.confirmOwnerPassword"
                        :type="showProtectOwnerPwd ? 'text' : 'password'"
                        :placeholder="t('protect_confirm_owner_pwd_placeholder')"
                        :class="[
                          'w-full text-xs bg-white border rounded-xl px-3 py-2 pr-10 outline-none font-medium text-slate-800 shadow-2xs transition-colors',
                          editingStepDraft.confirmOwnerPassword 
                            ? (editingStepDraft.confirmOwnerPassword === editingStepDraft.ownerPassword ? 'border-emerald-400 focus:ring-2 focus:ring-emerald-500' : 'border-rose-400 focus:ring-2 focus:ring-rose-500')
                            : 'border-slate-300 focus:ring-2 focus:ring-indigo-500'
                        ]"
                      >
                      <span v-if="editingStepDraft.confirmOwnerPassword && editingStepDraft.ownerPassword === editingStepDraft.confirmOwnerPassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 text-xs font-bold">
                        ✓
                      </span>
                      <span v-else-if="editingStepDraft.confirmOwnerPassword && editingStepDraft.ownerPassword !== editingStepDraft.confirmOwnerPassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-rose-500 text-xs font-bold">
                        ✕
                      </span>
                    </div>

                    <!-- Real-time Matching Feedback -->
                    <div v-if="editingStepDraft.confirmOwnerPassword" class="flex items-center space-x-1 text-[11px] font-medium pt-0.5 animate-in fade-in duration-150">
                      <span v-if="editingStepDraft.ownerPassword === editingStepDraft.confirmOwnerPassword" class="text-emerald-600 flex items-center space-x-1">
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

            <!-- 3. Granular Permissions -->
            <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5">
              <span class="text-xs font-bold text-slate-800 block">
                {{ t('protect_mode_owner') }}
              </span>

              <div class="space-y-2">
                <label class="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    v-model="editingStepDraft.allowPrinting"
                    @change="editingStepDraft.preset = 'custom'"
                    class="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  >
                  <Printer class="w-3.5 h-3.5 text-slate-500" />
                  <span :class="editingStepDraft.allowPrinting ? 'font-bold text-slate-900' : 'text-slate-600'">{{ t('protect_perm_printing') }}</span>
                </label>

                <label class="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    v-model="editingStepDraft.allowCopying"
                    @change="editingStepDraft.preset = 'custom'"
                    class="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  >
                  <Copy class="w-3.5 h-3.5 text-slate-500" />
                  <span :class="editingStepDraft.allowCopying ? 'font-bold text-slate-900' : 'text-slate-600'">{{ t('protect_perm_copying') }}</span>
                </label>

                <label class="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    v-model="editingStepDraft.allowModifying"
                    @change="editingStepDraft.preset = 'custom'"
                    class="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  >
                  <FileEdit class="w-3.5 h-3.5 text-slate-500" />
                  <span :class="editingStepDraft.allowModifying ? 'font-bold text-slate-900' : 'text-slate-600'">{{ t('protect_perm_modifying') }}</span>
                </label>

                <label class="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    v-model="editingStepDraft.allowAnnotating"
                    @change="editingStepDraft.preset = 'custom'"
                    class="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  >
                  <PenLine class="w-3.5 h-3.5 text-slate-500" />
                  <span :class="editingStepDraft.allowAnnotating ? 'font-bold text-slate-900' : 'text-slate-600'">{{ t('protect_perm_annotating') }}</span>
                </label>
              </div>
            </div>

            <!-- 4. Progressive Disclosure: Collapsible Algorithm -->
            <div class="p-3 rounded-xl border border-slate-200 bg-slate-50/40 space-y-2">
              <button 
                type="button" 
                @click="isProtectAdvancedOpen = !isProtectAdvancedOpen"
                class="w-full flex items-center justify-between text-[11px] font-bold text-slate-600 hover:text-slate-900 cursor-pointer select-none py-0.5"
              >
                <span class="flex items-center space-x-1.5">
                  <span>⚙️</span>
                  <span>{{ t('protect_advanced_toggle') }}</span>
                </span>
                <ChevronDown :class="['w-3.5 h-3.5 transition-transform duration-200', isProtectAdvancedOpen ? 'rotate-180' : '']" />
              </button>

              <div v-show="isProtectAdvancedOpen" class="space-y-1.5 pt-1.5 animate-in fade-in duration-150">
                <label class="text-[10px] font-semibold text-slate-500 block">
                  {{ t('protect_algorithm_label') }}
                </label>
                <div class="grid grid-cols-2 gap-2">
                  <button 
                    type="button"
                    @click="editingStepDraft.algorithm = 'AES-256'; editingStepDraft.preset = 'custom'"
                    :class="[
                      'py-1.5 px-2 rounded-lg border text-[11px] font-bold transition cursor-pointer text-center',
                      editingStepDraft.algorithm === 'AES-256' ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    ]"
                  >
                    {{ t('protect_algo_aes_btn') }}
                  </button>
                  <button 
                    type="button"
                    @click="editingStepDraft.algorithm = 'RC4'; editingStepDraft.preset = 'custom'"
                    :class="[
                      'py-1.5 px-2 rounded-lg border text-[11px] font-bold transition cursor-pointer text-center',
                      editingStepDraft.algorithm === 'RC4' ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    ]"
                  >
                    RC4 128-bit
                  </button>
                </div>
              </div>
            </div>

            <!-- 5. Live Effective Protection Preview -->
            <div class="p-3 rounded-xl bg-amber-50/60 border border-amber-200/70 flex items-start space-x-2 text-xs text-slate-700">
              <span class="text-sm shrink-0">💡</span>
              <div class="leading-relaxed">
                <span class="font-bold text-slate-800">{{ t('protect_summary_prefix') }}: </span>
                <span class="text-slate-600">{{ getEffectiveProtectSummary(editingStepDraft) }}</span>
              </div>
            </div>

            <!-- 6. Validation Error in Drawer -->
            <div v-if="protectConfigError" class="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center space-x-2 animate-in fade-in duration-150">
              <AlertCircle class="w-4 h-4 text-rose-600 shrink-0" />
              <span class="font-medium">{{ protectConfigError }}</span>
            </div>
          </div>

          <!-- Fallback Generic Params -->
          <div v-else class="text-slate-500 text-xs p-4 bg-slate-50 rounded-xl font-mono">
            {{ formatStepParams({ params: editingStepDraft }) }}
          </div>
        </div>

        <!-- Drawer Footer Actions -->
        <div class="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <button 
            type="button" 
            @click="resetStepToDefault"
            class="text-slate-500 hover:text-slate-700 text-[11px] font-semibold hover:underline cursor-pointer"
          >
            {{ t('pipeline_btn_reset_step_default') }}
          </button>

          <div class="flex items-center space-x-2.5">
            <button 
              type="button" 
              @click="isConfigStepModalOpen = false"
              class="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
            >
              {{ t('btn_cancel') || 'Cancel' }}
            </button>
            <button 
              type="button" 
              @click="saveStepConfig"
              class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition cursor-pointer shadow-md shadow-indigo-500/20 active:scale-95"
            >
              {{ t('pipeline_btn_save_config') }}
            </button>
          </div>
        </div>
      </div>
    </div>
    </div>

    <!-- Save Custom Flow Modal -->
    <div 
      v-if="isSaveFlowModalOpen"
      class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      @click.self="isSaveFlowModalOpen = false"
      @keydown.esc="isSaveFlowModalOpen = false"
    >
      <div class="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <!-- Header -->
        <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <h3 class="text-base font-semibold text-slate-800 flex items-center space-x-2">
            <Pencil v-if="saveFlowMode === 'rename'" class="w-5 h-5 text-indigo-600" />
            <BookmarkPlus v-else class="w-5 h-5 text-indigo-600" />
            <span>{{ saveFlowMode === 'rename' ? t('pipeline_modal_rename_title') : t('pipeline_save_flow_btn') }}</span>
          </h3>
          <button @click="isSaveFlowModalOpen = false" class="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Body -->
        <div class="p-5 overflow-y-auto space-y-4">
          <!-- Name Input -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">
              {{ t('pipeline_flow_name') }} <span class="text-red-500">*</span>
            </label>
            <input
              v-model="customFlowNameInput"
              type="text"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              :placeholder="t('pipeline_flow_name_placeholder')"
              @keyup.enter="confirmSaveFlow"
            />
          </div>

          <!-- Desc Input -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">
              {{ t('pipeline_flow_desc') }} <span class="text-slate-400 text-xs font-normal">({{ t('optional') }})</span>
            </label>
            <textarea
              v-model="customFlowDescInput"
              rows="3"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm resize-none"
              :placeholder="t('pipeline_flow_desc_placeholder')"
              @keyup.ctrl.enter="confirmSaveFlow"
              @keyup.meta.enter="confirmSaveFlow"
            ></textarea>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-5 py-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3 shrink-0">
          <button
            type="button"
            @click="isSaveFlowModalOpen = false"
            class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 cursor-pointer"
          >
            {{ t('btn_cancel') || 'Cancel' }}
          </button>
          <button
            type="button"
            @click="confirmSaveFlow"
            :disabled="!customFlowNameInput.trim()"
            class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 cursor-pointer"
          >
            <Save class="w-4 h-4" />
            <span>{{ t('btn_save') || 'Fallback' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Custom Flow Quota Modal (Triggered when Free user tries to save > 1 flow) -->
    <div 
      v-if="isFlowQuotaModalOpen"
      class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      @click.self="isFlowQuotaModalOpen = false"
      @keydown.esc="isFlowQuotaModalOpen = false"
    >
      <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200">
        <!-- Header -->
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <div class="flex items-center space-x-2">
            <div class="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <BookmarkPlus class="w-4 h-4" />
            </div>
            <h3 class="font-extrabold text-slate-800 text-base">
              {{ t('pipeline_quota_modal_title') }}
            </h3>
          </div>
          <button @click="isFlowQuotaModalOpen = false" class="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition cursor-pointer">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Body -->
        <div class="space-y-3 text-xs text-slate-600">
          <p class="leading-relaxed">
            {{ t('pipeline_quota_modal_desc') }}
          </p>

          <div v-if="savedUserFlows.length > 0" class="space-y-1.5">
            <div class="text-[11px] text-slate-500 font-semibold">{{ t('pipeline_select_overwrite_label') }}:</div>
            <div class="space-y-1 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
              <label 
                v-for="flow in savedUserFlows" 
                :key="flow.id"
                class="flex items-center justify-between p-2 rounded-xl border cursor-pointer transition text-xs select-none"
                :class="selectedOverwriteFlowId === flow.id ? 'border-indigo-500 bg-indigo-50/60 font-bold text-indigo-900 shadow-2xs' : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700'"
              >
                <div class="flex items-center space-x-2 min-w-0 flex-1">
                  <input 
                    type="radio" 
                    :value="flow.id" 
                    v-model="selectedOverwriteFlowId" 
                    class="text-indigo-600 focus:ring-indigo-500" 
                  />
                  <span class="truncate">⭐ {{ flow.name }}</span>
                </div>
                <span class="text-[10px] text-slate-400 font-mono shrink-0">({{ flow.steps.length }} {{ t('pipeline_steps_count_unit') }})</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-2">
          <button 
            type="button" 
            @click="handleOverwriteExistingFlow"
            class="w-full sm:w-auto px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition cursor-pointer"
          >
            {{ t('pipeline_btn_overwrite_flow') }}
          </button>
          <button 
            type="button" 
            @click="isFlowQuotaModalOpen = false; emit('open-enterprise')"
            class="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs transition cursor-pointer shadow-sm flex items-center justify-center space-x-1"
          >
            <Crown class="w-3.5 h-3.5 text-white" />
            <span>{{ t('pipeline_btn_upgrade_unlimited') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Add Step Modal -->
    <div 
      v-if="addStepModal"
      class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
      @click.self="addStepModal = false"
      @keydown.esc="addStepModal = false"
    >
      <div class="bg-white rounded-3xl max-w-xl w-full max-h-[85vh] p-5 sm:p-6 shadow-2xl border border-slate-100 flex flex-col relative animate-in zoom-in-95 duration-200">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div>
            <h3 class="font-extrabold text-slate-900 text-sm sm:text-base">
              {{ t('pipeline_modal_add_step_title') }}
            </h3>
            <p class="text-xs text-slate-400">
              {{ t('pipeline_modal_add_step_desc') }}
            </p>
          </div>
          <button 
            @click="addStepModal = false" 
            class="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Node List -->
        <div class="py-3 space-y-2 overflow-y-auto max-h-[55vh] pr-1 custom-scrollbar">
          <div 
            v-for="(node, nId) in AVAILABLE_NODES" 
            :key="nId"
            @click="addNodeToFlow(nId)"
            class="group p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 transition cursor-pointer flex items-center justify-between gap-3"
          >
            <div class="flex items-center space-x-3 min-w-0">
              <div class="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-indigo-100 text-slate-700 group-hover:text-indigo-600 flex items-center justify-center shrink-0 transition shadow-2xs">
                <Plus class="w-4 h-4" />
              </div>
              <div class="min-w-0">
                <div class="font-bold text-slate-800 text-xs sm:text-sm group-hover:text-indigo-900">
                  {{ t(node.nameKey, node.defaultName) }}
                </div>
                <div class="text-[11px] text-slate-400 truncate">
                  {{ t(node.descKey, node.defaultDesc) }}
                </div>
              </div>
            </div>

            <span class="text-xs font-bold text-indigo-600 bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white px-2.5 py-1 rounded-lg transition shrink-0">
              {{ t('pipeline_btn_add_step_short') }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Vault File Picker Modal -->
    <VaultFilePickerModal 
      :is-open="isVaultPickerOpen" 
      :multiple="true"
      @close="isVaultPickerOpen = false" 
      @select-files="handleVaultFilesSelected" 
    />

    <!-- PDF Quick Preview Modal -->
    <VaultPreviewModal 
      :is-open="isPreviewOpen" 
      :file="previewTargetFile" 
      @close="isPreviewOpen = false" 
      @download="downloadSingle" 
    />
  </section>
</template>

<script setup>
import { ref, computed, watch, inject, onMounted, onActivated, onBeforeUnmount } from 'vue';

import { 
  Zap, 
  Sparkles, 
  Sliders, 
  Crown, 
  Play, 
  Loader2, 
  UploadCloud, 
  FileText, 
  X, 
  Download, 
  FolderLock, 
  CheckCircle2, 
  FileCheck, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  ShieldCheck, 
  Images, 
  Stamp, 
  Lock, 
  Minimize2, 
  Scissors, 
  RotateCcw,
  Bookmark,
  BookmarkPlus,
  ChevronDown,
  Settings2,
  Copy,
  Save,
  AlertCircle,
  Info
,
  Pencil,
  GripVertical,
  Wand2,
  RotateCw,
  RefreshCw,
  Key,
  ShieldAlert,
  Eye,
  EyeOff,
  Printer,
  FileEdit,
  PenLine,
  Star,
  Calendar,
  Pipette,
  Archive,
  Files
} from 'lucide-vue-next';
import { PRESET_PIPELINES } from '../utils/pipeline/presetPipelines';
import { AVAILABLE_NODES } from '../utils/pipeline/pipelineTypes';
import { getLocalizedPiiPresets } from '../utils/redaction/ruleMatcher';
import { runPipeline } from '../utils/pipeline/pipelineRunner';
import { validateStepParameters } from '../utils/pipeline/pipelinePolicy';
import { loadUserPipelines, saveUserPipeline, deleteUserPipeline } from '../utils/pipeline/userPipelines';
import { loadSavedStamps } from '../utils/imageProcess';
import confetti from 'canvas-confetti';
import { saveFile } from '../utils/vaultDb';
import { createAndDownloadZip } from '../utils/zipUtils';
import { siteConfig } from '../config/siteConfig';
import { isProSupporter } from '../utils/security/certificateStore';
import { t, currentLang } from '../i18n';
import VaultFilePickerModal from '../components/VaultFilePickerModal.vue';
import VaultPreviewModal from '../components/VaultPreviewModal.vue';
import { consumePendingFile } from '../utils/toolBridge';

const emit = defineEmits(['open-enterprise', 'send-to-tool']);

const fileInput = ref(null);
const isVaultPickerOpen = ref(false);
const isPreviewOpen = ref(false);
const previewTargetFile = ref(null);
const isZipping = ref(false);
const zipProgress = ref(0);
const addStepModal = ref(false);
const isSaveFlowModalOpen = ref(false);
const saveFlowMode = ref('new'); // 'new' | 'update'
const isFlowQuotaModalOpen = ref(false);
const selectedOverwriteFlowId = ref('');
const customFlowNameInput = ref('');
const customFlowDescInput = ref('');

// Step Configuration Modal State
const isConfigStepModalOpen = ref(false);
const editingStepIndex = ref(-1);
const editingStepDraft = ref(null);
const showProtectUserPwd = ref(false);
const showProtectOwnerPwd = ref(false);
const isProtectAdvancedOpen = ref(false);
const protectConfigError = ref('');
const signPreviewOrientation = ref('portrait'); // 'portrait' | 'landscape' (pure preview toggle)
const pipelineMaskColorInputRef = ref(null);

// Flow persistence & selection
const savedUserFlows = ref(loadUserPipelines());
const savedStampsForPipeline = computed(() => {
  try {
    return loadSavedStamps();
  } catch (e) {
    return [];
  }
});
const activeFlowSelectionKey = ref('preset_' + PRESET_PIPELINES[0].id);

// Active Step List State
const activeWorkflowSteps = ref(
  JSON.parse(JSON.stringify(PRESET_PIPELINES[0].steps))
);

// Native Drag and Drop State
const draggedStepIndex = ref(-1);

function onDragStart(evt, idx) {
  draggedStepIndex.value = idx;
  evt.dataTransfer.effectAllowed = 'move';
}

function onDragOver(evt, targetIdx) {
  if (draggedStepIndex.value === -1) return;
  evt.preventDefault(); // Necessary to allow dropping
  
  // Real-time swapping while dragging
  if (draggedStepIndex.value !== targetIdx) {
    const item = activeWorkflowSteps.value.splice(draggedStepIndex.value, 1)[0];
    activeWorkflowSteps.value.splice(targetIdx, 0, item);
    draggedStepIndex.value = targetIdx; // Update active index
  }
}

function onDrop(evt, targetIdx) {
  draggedStepIndex.value = -1;
}

function onDragEnd() {
  draggedStepIndex.value = -1;
}

// File & Execution State
const workspaceState = inject('workspaceActiveState', null);
const inputFiles = ref([]);

watch(() => inputFiles.value.length > 0, (active) => {
  workspaceState?.setActiveFile(active);
}, { immediate: true });

function checkIncomingFile() {
  const incoming = consumePendingFile('pipeline');
  if (incoming) {
    const blob = new Blob([incoming.arrayBuffer], { type: 'application/pdf' });
    appendFiles([{
      name: incoming.name,
      size: incoming.size || incoming.arrayBuffer?.byteLength || 0,
      blob,
      arrayBuffer: incoming.arrayBuffer,
      data: incoming.arrayBuffer,
      password: incoming.password || ''
    }]);
  }
}

onMounted(() => {
  checkIncomingFile();
});

onActivated(() => {
  workspaceState?.setActiveFile(inputFiles.value.length > 0);
  checkIncomingFile();
});

const isDragging = ref(false);
const isRunning = ref(false);
const outputResults = ref([]);
let abortController = null;

const progressState = ref({
  overallPercent: 0,
  stepName: '',
  stepMessage: ''
});

// Current active flow record
const currentCustomFlowRecord = computed(() => {
  if (!activeFlowSelectionKey.value.startsWith('user_')) return null;
  const flowId = activeFlowSelectionKey.value.replace('user_', '');
  return savedUserFlows.value.find(f => f.id === flowId) || null;
});

const currentPresetRecord = computed(() => {
  if (!activeFlowSelectionKey.value.startsWith('preset_')) return null;
  const pId = activeFlowSelectionKey.value.replace('preset_', '');
  return PRESET_PIPELINES.find(p => p.id === pId) || PRESET_PIPELINES[0];
});

const currentPipelineDesc = computed(() => {
  if (currentPresetRecord.value) {
    return t(currentPresetRecord.value.descKey, currentPresetRecord.value.defaultDesc);
  }
  if (currentCustomFlowRecord.value) {
    return currentCustomFlowRecord.value.desc || currentCustomFlowRecord.value.name;
  }
  return t('pipeline_new_blank_flow');
});

// Detects if steps/params have diverged from selected original
const isCurrentFlowModified = computed(() => {
  if (currentPresetRecord.value) {
    return JSON.stringify(activeWorkflowSteps.value) !== JSON.stringify(currentPresetRecord.value.steps);
  }
  if (currentCustomFlowRecord.value) {
    return JSON.stringify(activeWorkflowSteps.value) !== JSON.stringify(currentCustomFlowRecord.value.steps);
  }
  return activeWorkflowSteps.value.length > 0;
});

const currentPipeline = computed(() => {
  if (currentPresetRecord.value) {
    return {
      ...currentPresetRecord.value,
      name: t(currentPresetRecord.value.nameKey, currentPresetRecord.value.defaultName),
      steps: activeWorkflowSteps.value
    };
  }
  if (currentCustomFlowRecord.value) {
    return {
      ...currentCustomFlowRecord.value,
      steps: activeWorkflowSteps.value
    };
  }
  return {
    id: 'blank_flow',
    name: t('pipeline_custom_default_name'),
    steps: activeWorkflowSteps.value,
    exportConfig: { destination: 'download_files' }
  };
});

// Active Editing Step Computed
const currentEditingStepNodeId = computed(() => {
  if (editingStepIndex.value < 0 || editingStepIndex.value >= activeWorkflowSteps.value.length) return '';
  return activeWorkflowSteps.value[editingStepIndex.value].nodeId;
});

const currentEditingStepName = computed(() => {
  return getNodeName(currentEditingStepNodeId.value);
});

// Dynamic Password Strength Meter for Node Protect
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
      label: t('protect_pwd_strength_weak') || 'Weak',
      color: 'text-rose-600',
      widthClass: 'w-1/3 bg-rose-500'
    };
  } else if (score <= 2) {
    return {
      level: 2,
      score: 2,
      label: t('protect_pwd_strength_medium') || 'Medium',
      color: 'text-amber-600',
      widthClass: 'w-2/3 bg-amber-500'
    };
  } else {
    return {
      level: 3,
      score: 3,
      label: t('protect_pwd_strength_strong') || 'Strong',
      color: 'text-emerald-600',
      widthClass: 'w-full bg-emerald-500'
    };
  }
}

function applyProtectPresetInPipeline(presetType) {
  if (!editingStepDraft.value) return;
  editingStepDraft.value.preset = presetType;
  protectConfigError.value = '';

  if (presetType === 'confidential') {
    editingStepDraft.value.algorithm = 'AES-256';
    editingStepDraft.value.useSamePassword = true;
    editingStepDraft.value.confirmOwnerPassword = '';
    editingStepDraft.value.allowPrinting = false;
    editingStepDraft.value.allowCopying = false;
    editingStepDraft.value.allowModifying = false;
    editingStepDraft.value.allowAnnotating = false;
  } else if (presetType === 'readonly') {
    editingStepDraft.value.algorithm = 'AES-256';
    editingStepDraft.value.userPassword = '';
    editingStepDraft.value.confirmUserPassword = '';
    editingStepDraft.value.confirmOwnerPassword = '';
    editingStepDraft.value.allowPrinting = false;
    editingStepDraft.value.allowCopying = false;
    editingStepDraft.value.allowModifying = false;
    editingStepDraft.value.allowAnnotating = false;
  } else if (presetType === 'forms') {
    editingStepDraft.value.algorithm = 'AES-256';
    editingStepDraft.value.userPassword = '';
    editingStepDraft.value.confirmUserPassword = '';
    editingStepDraft.value.confirmOwnerPassword = '';
    editingStepDraft.value.allowPrinting = true;
    editingStepDraft.value.allowCopying = false;
    editingStepDraft.value.allowModifying = false;
    editingStepDraft.value.allowAnnotating = true;
  }
}

function getEffectiveProtectSummary(draft) {
  if (!draft) return '';
  if (draft.preset === 'confidential') {
    return t('protect_summary_confidential');
  } else if (draft.preset === 'readonly') {
    return t('protect_summary_readonly');
  } else if (draft.preset === 'forms') {
    return t('protect_summary_forms');
  } else {
    return t('protect_summary_custom');
  }
}

// --- Node Redact: rule list editing helpers ---
function addRedactRule() {
  if (!editingStepDraft.value) return;
  if (!Array.isArray(editingStepDraft.value.rules)) {
    editingStepDraft.value.rules = [];
  }
  editingStepDraft.value.rules.push({ type: 'keyword', value: '', caseSensitive: false });
}

function removeRedactRule(ri) {
  if (!editingStepDraft.value || !Array.isArray(editingStepDraft.value.rules)) return;
  editingStepDraft.value.rules.splice(ri, 1);
}

function addRedactPreset(preset) {
  if (!editingStepDraft.value) return;
  if (!Array.isArray(editingStepDraft.value.rules)) {
    editingStepDraft.value.rules = [];
  }
  editingStepDraft.value.rules.push({
    type: preset.type,
    value: preset.value,
    caseSensitive: Boolean(preset.caseSensitive)
  });
}

const localizedRedactPresets = computed(() => getLocalizedPiiPresets(currentLang.value));

function isLightPipelineColor(hex) {
  if (!hex || typeof hex !== 'string') return false;
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) clean = clean.split('').map((c) => c + c).join('');
  if (clean.length !== 6) return false;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return (r * 0.299 + g * 0.587 + b * 0.114) > 0.65;
}

function setPipelineRedactMode(mode) {
  if (!editingStepDraft.value) return;
  if (mode === 'stamp') {
    editingStepDraft.value.style = 'stamp';
  } else {
    const c = (editingStepDraft.value.customColor || '#000000').toLowerCase();
    if (c === '#000000') editingStepDraft.value.style = 'black';
    else if (c === '#ffffff') editingStepDraft.value.style = 'white';
    else if (c === '#334155') editingStepDraft.value.style = 'gray';
    else editingStepDraft.value.style = 'custom';
  }
}

function setPipelineRedactColor(color) {
  if (!editingStepDraft.value) return;
  editingStepDraft.value.customColor = color;
  if (editingStepDraft.value.style !== 'stamp') {
    const c = color.toLowerCase();
    if (c === '#000000') editingStepDraft.value.style = 'black';
    else if (c === '#ffffff') editingStepDraft.value.style = 'white';
    else if (c === '#334155') editingStepDraft.value.style = 'gray';
    else editingStepDraft.value.style = 'custom';
  }
}

function handlePipelineRedactColorInput(e) {
  if (!editingStepDraft.value) return;
  let val = e.target.value.replace(/[^0-9a-fA-F]/g, '');
  if (val.length <= 6) {
    setPipelineRedactColor('#' + val);
  }
}

function openStepConfigModal(idx) {
  editingStepIndex.value = idx;
  const step = activeWorkflowSteps.value[idx];
  editingStepDraft.value = JSON.parse(JSON.stringify(step.params || {}));
  signPreviewOrientation.value = 'portrait';

  if (step.nodeId === 'node_redact') {
    if (!Array.isArray(editingStepDraft.value.rules)) {
      editingStepDraft.value.rules = [];
    }
    if (!editingStepDraft.value.style) {
      editingStepDraft.value.style = 'black';
    }
  }

  if (step.nodeId === 'node_sign') {
    if (!editingStepDraft.value.position) {
      editingStepDraft.value.position = editingStepDraft.value.placement === 'except_last' ? 'mid_right' : 'bottom_right';
    }
  }

  if (step.nodeId === 'node_protect') {
    showProtectUserPwd.value = false;
    showProtectOwnerPwd.value = false;
    isProtectAdvancedOpen.value = false;
    protectConfigError.value = '';

    // Ensure preset and password confirmation fields exist
    if (!editingStepDraft.value.preset) {
      if (editingStepDraft.value.userPassword) {
        editingStepDraft.value.preset = 'confidential';
      } else if (editingStepDraft.value.allowAnnotating) {
        editingStepDraft.value.preset = 'forms';
      } else {
        editingStepDraft.value.preset = 'readonly';
      }
    }
    if (editingStepDraft.value.useSamePassword === undefined) {
      editingStepDraft.value.useSamePassword = true;
    }
    editingStepDraft.value.confirmUserPassword = editingStepDraft.value.userPassword || '';
    editingStepDraft.value.confirmOwnerPassword = editingStepDraft.value.ownerPassword || '';
  }

  isConfigStepModalOpen.value = true;
}

function saveStepConfig() {
  if (editingStepIndex.value >= 0 && editingStepIndex.value < activeWorkflowSteps.value.length) {
    if (currentEditingStepNodeId.value === 'node_protect') {
      const draft = editingStepDraft.value;
      protectConfigError.value = '';

      if (draft.preset === 'confidential') {
        if (!draft.userPassword) {
          protectConfigError.value = t('protect_err_need_open_pwd') || 'Open password is required for Confidential preset.';
          return;
        }
        if (draft.confirmUserPassword !== draft.userPassword) {
          protectConfigError.value = t('protect_err_pwd_mismatch') || 'Open passwords do not match';
          return;
        }
        if (draft.useSamePassword) {
          draft.ownerPassword = draft.userPassword;
        } else {
          if (!draft.ownerPassword) {
            protectConfigError.value = t('protect_err_need_owner_pwd') || 'Please set an owner password to allow lifting restrictions later.';
            return;
          }
          if (draft.confirmOwnerPassword !== draft.ownerPassword) {
            protectConfigError.value = t('protect_err_owner_pwd_mismatch') || 'Management passwords do not match';
            return;
          }
        }
      } else {
        if (!draft.ownerPassword) {
          protectConfigError.value = t('protect_err_need_owner_pwd') || 'Please set an owner password to allow lifting restrictions later.';
          return;
        }
        if (draft.confirmOwnerPassword !== draft.ownerPassword) {
          protectConfigError.value = t('protect_err_owner_pwd_mismatch') || 'Management passwords do not match';
          return;
        }
      }
    }

    activeWorkflowSteps.value[editingStepIndex.value].params = JSON.parse(JSON.stringify(editingStepDraft.value));
  }
  isConfigStepModalOpen.value = false;
}

function resetStepToDefault() {
  if (editingStepIndex.value >= 0 && editingStepIndex.value < activeWorkflowSteps.value.length) {
    const step = activeWorkflowSteps.value[editingStepIndex.value];
    const node = AVAILABLE_NODES[step.nodeId];
    if (node && node.defaultParams) {
      editingStepDraft.value = JSON.parse(JSON.stringify(node.defaultParams));
      if (step.nodeId === 'node_protect') {
        showProtectUserPwd.value = false;
        showProtectOwnerPwd.value = false;
        isProtectAdvancedOpen.value = false;
        protectConfigError.value = '';
      }
    }
  }
}

function getStepSummary(step) {
  if (!step || !step.params) return '';
  switch (step.nodeId) {
    case 'node_watermark': {
      const txt = step.params.text || t('pipe_wm_empty', 'No Text');
      const size = step.params.size || 48;
      const color = step.params.color || '#dc2626';
      return `"${txt}" · ${size}px · ${color.toUpperCase()}`;
    }
    case 'node_page_number': {
      const fmt = step.params.format || 'Page {n} of {total}';
      const posMap = {
        bottom_center: t('pn_pos_bottom_center') || 'Bottom Center',
        bottom_right: t('pn_pos_bottom_right') || 'Bottom Right',
        bottom_left: t('pn_pos_bottom_left') || 'Bottom Left',
        top_center: t('pn_pos_top_center') || 'Top Center',
        top_right: t('pn_pos_top_right') || 'Top Right',
        top_left: t('pn_pos_top_left') || 'Top Left'
      };
      const pos = posMap[step.params.position] || step.params.position || 'Bottom Center';
      const cover = step.params.skipCover ? ` · ${t('pn_skip_cover_badge') || 'Skip Cover'}` : '';
      const maskColorTxt = step.params.maskMode !== 'none'
        ? (step.params.maskColor === 'auto' || !step.params.maskColor ? ` · ${t('pn_mask_color_auto') || 'Auto Mask'}` : ` · ${step.params.maskColor}`)
        : '';
      return `${fmt} · ${pos}${cover}${maskColorTxt}`;
    }
    case 'node_organize': {
      const parts = [];
      if (step.params.standardizeSize === 'a4') parts.push('A4');
      if (step.params.forceOrientation === 'portrait') parts.push(t('param_org_or_port'));
      if (step.params.forceOrientation === 'landscape') parts.push(t('param_org_or_land'));
      if (step.params.rotateAll && step.params.rotateAll !== 'none') parts.push(`↻ ${step.params.rotateAll}°`);
      return parts.length > 0 ? parts.join(' · ') : t('param_org_sz_none');
    }
    case 'node_compress': {
      if (step.params.level === 'target') {
        return `🎯 ≤ ${step.params.targetSizeMb || 2} MB`;
      }
      const map = {
        balanced: t('compress_level_balanced', 'Balanced'),
        extreme: t('compress_level_extreme', 'Extreme'),
        lossless: t('compress_level_lossless', 'Lossless')
      };
      return map[step.params.level] || t('compress_level_balanced', 'Balanced');
    }
    case 'node_sanitize': {
      if (step.params.stripDocInfo && step.params.stripPieceInfo && step.params.stripAnnots) {
        return t('pipe_san_all', 'Erase all metadata');
      }
      const parts = [];
      if (step.params.stripDocInfo) parts.push(t('pipe_san_info', 'Clear doc info'));
      if (step.params.stripAnnots) parts.push(t('pipe_san_annots', 'Remove annots'));
      return parts.length > 0 ? parts.join(' + ') : t('pipe_san_basic', 'Sanitize');
    }
    case 'node_redact': {
      const rules = Array.isArray(step.params?.rules) ? step.params.rules.filter((r) => r?.value?.trim()) : [];
      if (!rules.length) {
        return `⚠️ ${t('node_redact_rules_add')}`;
      }
      const styleMap = {
        black: t('redact_style_black'),
        white: t('redact_style_white'),
        stamp: t('redact_style_stamp')
      };
      const styleTxt = styleMap[step.params.style] || styleMap.black;
      return `${t('node_redact_rules_count', '{count} rule(s)', { count: rules.length })} · ${styleTxt}`;
    }
    case 'node_img2pdf': {
      const merge = step.params.mergeIntoOne ? t('pipe_merge_one', 'Merged') : t('pipe_merge_split', '1 Page/Img');
      const sz = step.params.pageSize === 'a4' ? 'A4' : t('pipe_sz_fit', 'Original');
      return `${merge} · ${sz}`;
    }
    case 'node_pdf2img': {
      const fmt = (step.params.format || 'png').toUpperCase();
      const dpi = Number(step.params.dpi) === 300 ? 300 : 150;
      return `${fmt} · ${dpi} DPI`;
    }
    case 'node_sign': {
      let txt = step.params?.stampDataUrl ? t('pipe_sign_set', 'Signature Configured') : '⚠️ ' + t('pipe_sign_unset', 'Signature Required');
      if (step.params?.placement === 'last_page_bottom_right') txt += ' · ' + (t('param_sign_place_last') || 'Last Page');
      else if (step.params?.placement === 'except_last') txt += ' · ' + (t('param_sign_place_except_last') || 'Initials');
      else if (step.params?.placement === 'first_page') txt += ' · ' + (t('param_sign_place_first') || 'First Page');
      else if (step.params?.placement === 'all_pages') txt += ' · ' + (t('param_sign_place_all') || 'All Pages');
      return txt;
    }
    case 'node_unlock': {
      return step.params?.password ? t('pipe_pwd_set', 'Password Set') : t('pipe_pwd_unset', 'No Password');
    }
    case 'node_split': {
      if (step.params?.mode === 'burst') return t('param_split_burst').split('(')[0].trim();
      if (step.params?.rangeType === 'first') return t('param_split_range_first');
      if (step.params?.rangeType === 'last') return t('param_split_range_last');
      return step.params?.rangeExpr || '1-3';
    }
    case 'node_merge': {
      const sortMap = {
        order: t('pipe_merge_sort_order'),
        name_asc: t('pipe_merge_sort_name'),
        date: t('pipe_merge_sort_date')
      };
      const sortBy = sortMap[step.params?.sortBy] || t('pipe_merge_sort_order');
      const pad = step.params?.padBlankPageIfOdd ? t('pipe_merge_pad_odd') : '';
      return `${sortBy}${pad}`;
    }
    case 'node_protect': {
      if (step.params?.userPassword) {
        return `🛡️ ${t('protect_preset_confidential')} (${step.params.algorithm || 'AES-256'})`;
      } else if (step.params?.allowAnnotating) {
        return `✍️ ${t('protect_preset_forms')} (${t('protect_badge_sign_only')})`;
      } else if (step.params?.ownerPassword) {
        return `📄 ${t('protect_preset_readonly')} (${t('protect_badge_readonly')})`;
      }
      return `⚠️ ${t('pipe_pwd_unset', 'No Password')}`;
    }
    default:
      return formatStepParams(step);
  }
}

function getStepTagClass(nodeId, step) {
  switch (nodeId) {
    case 'node_sign':
      return !step?.params?.stampDataUrl 
        ? 'bg-amber-50 text-amber-700 border-amber-300 font-semibold' 
        : 'bg-indigo-50 text-indigo-700 border-indigo-200/80';
    case 'node_protect':
      return (!step?.params?.userPassword && !step?.params?.ownerPassword)
        ? 'bg-amber-50 text-amber-700 border-amber-300 font-semibold'
        : 'bg-rose-50 text-rose-700 border-rose-200/80';
    case 'node_watermark':
      return !step?.params?.text?.trim()
        ? 'bg-amber-50 text-amber-700 border-amber-300 font-semibold'
        : 'bg-amber-50 text-amber-700 border-amber-200/80';
    case 'node_page_number':
      return 'bg-violet-50 text-violet-700 border-violet-200/80';
    case 'node_compress':
      return 'bg-blue-50 text-blue-700 border-blue-200/80';
    case 'node_sanitize':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
    case 'node_redact':
      return !step?.params?.rules?.some((r) => r?.value?.trim())
        ? 'bg-amber-50 text-amber-700 border-amber-300 font-semibold'
        : 'bg-slate-50 text-slate-700 border-slate-200/80';
    case 'node_img2pdf':
      return 'bg-purple-50 text-purple-700 border-purple-200/80';
    case 'node_pdf2img':
      return 'bg-teal-50 text-teal-700 border-teal-200/80';
    case 'node_unlock':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200/80';
    case 'node_organize':
      return 'bg-cyan-50 text-cyan-700 border-cyan-200/80';
    case 'node_protect':
      return 'bg-rose-50 text-rose-700 border-rose-200/80';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200';
  }
}

function handlePlacementChange() {
  if (!editingStepDraft.value) return;
  if (editingStepDraft.value.placement === 'except_last' && (!editingStepDraft.value.position || editingStepDraft.value.position === 'bottom_right')) {
    editingStepDraft.value.position = 'mid_right';
  } else if (editingStepDraft.value.placement === 'last_page_bottom_right' && editingStepDraft.value.position === 'mid_right') {
    editingStepDraft.value.position = 'bottom_right';
  }
}

function handleFlowChange() {
  if (currentPresetRecord.value) {
    activeWorkflowSteps.value = JSON.parse(JSON.stringify(currentPresetRecord.value.steps));
  } else if (currentCustomFlowRecord.value) {
    activeWorkflowSteps.value = JSON.parse(JSON.stringify(currentCustomFlowRecord.value.steps));
  } else if (activeFlowSelectionKey.value === 'new_blank') {
    activeWorkflowSteps.value = [];
  }
}

function handleStampUpload(e, draft) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    draft.stampDataUrl = event.target.result;
  };
  reader.readAsDataURL(file);
}

function getSignPositionDescription(position, orientation) {
  if (position === 'mid_right') {
    return orientation === 'landscape'
      ? t('param_sign_desc_mid_right_land')
      : t('param_sign_desc_mid_right');
  }
  if (position === 'bottom_center') {
    return orientation === 'landscape'
      ? t('param_sign_desc_bottom_center_land')
      : t('param_sign_desc_bottom_center');
  }
  return t('param_sign_desc_bottom_right');
}

function getSignEstimateSizeText(scale, orientation) {
  const s = scale || 0.5;
  const w = Math.round(140 * (s / 0.5));
  const h = Math.round(60 * (s / 0.5));
  const pct = Math.round(s * (orientation === 'landscape' ? 34 : 48));
  const typeText = orientation === 'landscape' 
    ? t('param_sign_est_pct_landscape') 
    : t('param_sign_est_pct_portrait');
  const label = t('param_sign_est_size_label');
  return `${label}: ${w} × ${h} pt (${typeText} ${pct}%)`;
}

function resetCurrentFlow() {
  handleFlowChange();
}

function setSaveFlowMode(mode) {
  saveFlowMode.value = mode;
  if (mode === 'new') {
    if (currentCustomFlowRecord.value && customFlowNameInput.value === currentCustomFlowRecord.value.name) {
      const copySuffix = ' (' + (t('pipeline_flow_copy_suffix') || 'Copy') + ')';
      customFlowNameInput.value = currentCustomFlowRecord.value.name + copySuffix;
    }
  } else if (mode === 'update') {
    if (currentCustomFlowRecord.value) {
      const copySuffix = ' (' + (t('pipeline_flow_copy_suffix') || 'Copy') + ')';
      if (customFlowNameInput.value === currentCustomFlowRecord.value.name + copySuffix) {
        customFlowNameInput.value = currentCustomFlowRecord.value.name;
      }
    }
  }
}

function openSaveFlowModal() {
  // If user is editing an already saved custom flow
  if (currentCustomFlowRecord.value) {
    if (isCurrentFlowModified.value) {
      saveFlowMode.value = 'update';
      customFlowNameInput.value = currentCustomFlowRecord.value.name;
    } else {
      saveFlowMode.value = 'new';
      const copySuffix = ' (' + (t('pipeline_flow_copy_suffix') || 'Copy') + ')';
      customFlowNameInput.value = currentCustomFlowRecord.value.name + copySuffix;
    }
    customFlowDescInput.value = currentCustomFlowRecord.value.desc || '';
    isSaveFlowModalOpen.value = true;
    return;
  }

  // If user is Free tier and already has 3 saved custom workflows, trigger quota modal
  if (!isProSupporter.value && savedUserFlows.value.length >= 3) {
    selectedOverwriteFlowId.value = savedUserFlows.value[0]?.id || '';
    isFlowQuotaModalOpen.value = true;
    return;
  }

  // Otherwise, allow saving a new flow
  saveFlowMode.value = 'new';
  if (currentPresetRecord.value) {
    const customSuffix = ' (' + (t('pipeline_flow_custom_suffix') || 'Custom') + ')';
    customFlowNameInput.value = t(currentPresetRecord.value.nameKey, currentPresetRecord.value.defaultName) + customSuffix;
    customFlowDescInput.value = currentPipelineDesc.value;
  } else {
    customFlowNameInput.value = t('pipeline_default_custom_flow_name') || 'My Custom Flow';
    customFlowDescInput.value = '';
  }
  isSaveFlowModalOpen.value = true;
}

function handleOverwriteExistingFlow() {
  isFlowQuotaModalOpen.value = false;
  const targetId = selectedOverwriteFlowId.value || savedUserFlows.value[0]?.id;
  const existing = savedUserFlows.value.find(f => f.id === targetId) || savedUserFlows.value[0];
  if (existing) {
    activeFlowSelectionKey.value = 'user_' + existing.id;
    saveFlowMode.value = 'update';
    if (!customFlowNameInput.value.trim()) {
      customFlowNameInput.value = existing.name;
    }
    if (!customFlowDescInput.value.trim()) {
      customFlowDescInput.value = existing.desc || '';
    }
    isSaveFlowModalOpen.value = true;
  }
}

function confirmSaveFlow(explicitMode) {
  const mode = typeof explicitMode === 'string' ? explicitMode : saveFlowMode.value;
  const name = customFlowNameInput.value.trim();
  if (!name) return;

  if (mode === 'new' || !currentCustomFlowRecord.value) {
    // If user is Free tier and already has 3 saved custom workflows, trigger quota modal
    if (!isProSupporter.value && savedUserFlows.value.length >= 3) {
      isSaveFlowModalOpen.value = false;
      selectedOverwriteFlowId.value = currentCustomFlowRecord.value?.id || savedUserFlows.value[0]?.id || '';
      isFlowQuotaModalOpen.value = true;
      return;
    }

    const saved = saveUserPipeline({
      name,
      desc: customFlowDescInput.value.trim(),
      steps: activeWorkflowSteps.value
    });

    if (saved) {
      savedUserFlows.value = loadUserPipelines();
      activeFlowSelectionKey.value = 'user_' + saved.id;
      isSaveFlowModalOpen.value = false;
    }
    return;
  }

  // mode === 'update'
  const saved = saveUserPipeline({
    id: currentCustomFlowRecord.value?.id,
    name,
    desc: customFlowDescInput.value.trim(),
    steps: activeWorkflowSteps.value
  });

  if (saved) {
    savedUserFlows.value = loadUserPipelines();
    activeFlowSelectionKey.value = 'user_' + saved.id;
    isSaveFlowModalOpen.value = false;
  }
}

function deleteCurrentCustomFlow() {
  if (!currentCustomFlowRecord.value) return;
  if (confirm(t('pipeline_delete_flow_confirm'))) {
    deleteUserPipeline(currentCustomFlowRecord.value.id);
    savedUserFlows.value = loadUserPipelines();
    activeFlowSelectionKey.value = 'preset_' + PRESET_PIPELINES[0].id;
    handleFlowChange();
  }
}

function getNodeName(nodeId) {
  const n = AVAILABLE_NODES[nodeId];
  return n ? t(n.nameKey, n.defaultName) : nodeId;
}

function formatStepParams(step) {
  if (!step.params) return t('pipeline_step_default_params');
  return Object.entries(step.params)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');
}

function moveStep(idx, direction) {
  const target = idx + direction;
  if (target < 0 || target >= activeWorkflowSteps.value.length) return;
  const item = activeWorkflowSteps.value.splice(idx, 1)[0];
  activeWorkflowSteps.value.splice(target, 0, item);
}

function removeStep(idx) {
  if (activeWorkflowSteps.value.length <= 1) return;
  activeWorkflowSteps.value.splice(idx, 1);
}

function addNodeToFlow(nodeId) {
  const node = AVAILABLE_NODES[nodeId];
  if (!node) return;
  const newStep = {
    id: `step_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    nodeId: node.id,
    params: JSON.parse(JSON.stringify(node.defaultParams || {}))
  };
  activeWorkflowSteps.value.push(newStep);
  addStepModal.value = false;
  openStepConfigModal(activeWorkflowSteps.value.length - 1);
}

function handleFileInput(e) {
  const files = Array.from(e.target.files || []);
  appendFiles(files);
  e.target.value = '';
}

function handleFileDrop(e) {
  isDragging.value = false;
  const files = Array.from(e.dataTransfer.files || []);
  appendFiles(files);
}

const totalInputSize = computed(() => {
  return inputFiles.value.reduce((acc, f) => acc + (f.size || 0), 0);
});

const totalOutputSize = computed(() => {
  return outputResults.value.reduce((acc, item) => acc + (item.data?.byteLength || 0), 0);
});

const compressionSavings = computed(() => {
  if (totalInputSize.value <= 0 || totalOutputSize.value <= 0) return null;
  const diff = totalInputSize.value - totalOutputSize.value;
  if (diff <= 0) return null;
  const pct = Math.round((diff / totalInputSize.value) * 100);
  return pct > 0 ? pct : null;
});

function isImageFile(file) {
  return Boolean(file.type?.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name));
}

function appendFiles(files) {
  for (const f of files) {
    const isDup = inputFiles.value.some(existing => existing.name === f.name && existing.size === f.size);
    if (!isDup) {
      inputFiles.value.push(f);
    }
  }
}

function handleVaultFilesSelected(vaultFiles) {
  isVaultPickerOpen.value = false;
  if (vaultFiles && vaultFiles.length > 0) {
    appendFiles(vaultFiles);
  }
}

function removeFile(index) {
  inputFiles.value.splice(index, 1);
}

function formatSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function startExecution() {
  if (inputFiles.value.length === 0 || activeWorkflowSteps.value.length === 0) return;

  // Validate step required parameters before running (e.g. node_sign needs signature, node_protect needs password, etc.)
  const stepValidation = validateStepParameters(activeWorkflowSteps.value);
  if (!stepValidation.valid) {
    const errorMsg = stepValidation.reasonKey 
      ? t(stepValidation.reasonKey, stepValidation.reason, { step: (stepValidation.stepIndex || 0) + 1 })
      : stepValidation.reason;
    alert(errorMsg);
    if (typeof stepValidation.stepIndex === 'number' && stepValidation.stepIndex >= 0) {
      openStepConfigModal(stepValidation.stepIndex);
    }
    return;
  }

  outputResults.value = [];
  isRunning.value = true;
  progressState.value = {
    overallPercent: 0,
    stepName: t('pipeline_preparing_step'),
    stepMessage: t('pipeline_preparing_msg')
  };

  abortController = new AbortController();

  try {
    const result = await runPipeline(
      currentPipeline.value,
      inputFiles.value,
      {
        userTier: isProSupporter.value ? 'pro' : 'free',
        onProgress: (p) => {
          progressState.value = p;
        },
        abortSignal: abortController.signal,
        resolveNodeName: (id) => getNodeName(id),
        completedStepName: t('pipeline_completed_step', 'Completed'),
        formatCompletedMessage: (count) => t('pipeline_completed_msg', { count }, `Pipeline execution completed, produced ${count} deliverable file(s).`)
      }
    );

    if (result.success) {
      outputResults.value = result.deliverables || result.items || [];
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
    } else {
      if (result.code === 'ABORTED') {
        // User aborted
      } else if (result.code === 'BATCH_LIMIT_EXCEEDED') {
        emit('open-enterprise');
      } else {
        const errorMsg = result.reasonKey
          ? t(result.reasonKey, result.reason, result.params || {})
          : result.reason;
        alert(errorMsg || t('pipe_err', 'Pipeline execution failed.'));
      }
    }
  } catch (err) {
    alert(t('pipeline_execution_error') + err.message);
  } finally {
    isRunning.value = false;
  }
}

function cancelExecution() {
  if (abortController) {
    abortController.abort();
    isRunning.value = false;
  }
}

function downloadSingle(item) {
  if (!item) return;
  let blob = item.blob;
  if (!blob && item.data) {
    const mime = item.mimeType || (/\.pdf$/i.test(item.name) ? 'application/pdf' : 'application/octet-stream');
    blob = new Blob([item.data], { type: mime });
  }
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = item.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function previewSingle(item) {
  if (!item) return;
  const mime = item.mimeType || (/\.pdf$/i.test(item.name) ? 'application/pdf' : 'application/octet-stream');
  let blob = item.blob;
  if (!blob && item.data) {
    blob = new Blob([item.data], { type: mime });
  }
  if (!blob) return;
  previewTargetFile.value = {
    name: item.name,
    size: item.data?.byteLength || blob.size,
    blob,
    data: item.data,
    mimeType: mime,
    isEncrypted: false
  };
  isPreviewOpen.value = true;
}

function resetBatchAndResults() {
  inputFiles.value = [];
  outputResults.value = [];
}

const zipProgressText = computed(() => {
  return t('pipeline_status_zipping', { percent: zipProgress.value });
});

async function downloadAllZip() {
  if (outputResults.value.length === 0 || isZipping.value) return;
  if (outputResults.value.length === 1) {
    downloadSingle(outputResults.value[0]);
    return;
  }

  isZipping.value = true;
  zipProgress.value = 0;

  try {
    const rawFlowName = (currentPipeline.value?.name || currentPipeline.value?.defaultName || 'Pipeline').trim();
    const cleanFlowName = rawFlowName.replace(/[\\/:*?"<>|]/g, '_') || 'Pipeline';
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dateStamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
    const zipName = `${cleanFlowName}_Batch_${dateStamp}.zip`;

    const nameCountMap = new Map();
    const zipFiles = outputResults.value.map((item, idx) => {
      let baseName = item.name || `file_${idx + 1}.pdf`;
      if (nameCountMap.has(baseName)) {
        const count = nameCountMap.get(baseName) + 1;
        nameCountMap.set(baseName, count);
        const dotIdx = baseName.lastIndexOf('.');
        if (dotIdx > 0) {
          baseName = `${baseName.slice(0, dotIdx)}_${count}${baseName.slice(dotIdx)}`;
        } else {
          baseName = `${baseName}_${count}`;
        }
      } else {
        nameCountMap.set(baseName, 1);
      }
      return {
        name: baseName,
        data: item.data || item.blob
      };
    });

    await createAndDownloadZip(zipFiles, zipName, (pct) => {
      zipProgress.value = pct;
    });
  } catch (err) {
    console.error('ZIP packaging failed:', err);
    alert(t('pipeline_zip_fallback_err', 'ZIP packaging failed, falling back to individual downloads: ') + err.message);
    downloadAllSequential();
  } finally {
    isZipping.value = false;
    zipProgress.value = 0;
  }
}

function downloadAllSequential() {
  outputResults.value.forEach((item, i) => {
    setTimeout(() => {
      downloadSingle(item);
    }, i * 350);
  });
}

async function saveAllToVault() {
  for (const item of outputResults.value) {
    await saveFile({
      name: item.name,
      arrayBuffer: item.data,
      category: 'export',
      pageCount: item.pageCount || 1
    });
  }
  alert(t('pipeline_save_vault_success').replace('{count}', outputResults.value.length));
}
</script>

<style scoped>
.list-move {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
