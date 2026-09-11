<template>
  <section class="w-full flex-1 flex flex-col">
    <!-- Main Assembly Container -->
    <div class="bg-white rounded-3xl p-5 sm:p-7 shadow-xl border border-slate-100 flex flex-col flex-1">
      <!-- Top Title Header -->
      <div class="flex items-center justify-between pb-2.5 border-b border-slate-100 shrink-0">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0 shadow-2xs">
            <PenTool class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
              {{ t('sign_title') }}
            </h2>
            <p class="text-xs text-slate-400 font-medium hidden sm:block mt-0.5">
              {{ t('sign_desc') }}
            </p>
          </div>
        </div>

      </div>

      <!-- 1. EMPTY STATE DROPZONE (Spacious with Dual-Source Import) -->
      <div 
        v-if="!docBytes"
        @dragover.prevent="isDragOver = true"
        @dragleave.prevent="isDragOver = false"
        @drop.prevent="onDrop"
        :class="[
          'flex-1 border-2 border-dashed rounded-3xl p-8 sm:p-14 text-center transition flex flex-col items-center justify-center my-4',
          isDragOver ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]' : 'border-slate-200 hover:border-indigo-400 bg-slate-50/50'
        ]"
      >
        <input 
          ref="fileInputRef" 
          type="file" 
          accept="application/pdf" 
          class="hidden" 
          @change="onFileSelected" 
        >

        <div class="w-16 h-16 bg-indigo-100/60 text-indigo-600 rounded-3xl flex items-center justify-center mb-4 shadow-sm">
          <PenTool class="w-8 h-8" />
        </div>
        <h3 class="text-base sm:text-lg font-bold text-slate-800">
          {{ t('sign_drop_title') }}
        </h3>
        <p class="text-xs text-slate-400 mt-1 max-w-sm">
          {{ t('sign_drop_subtitle') }}
        </p>

        <!-- Dual-Source Import Action Buttons -->
        <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
          <!-- From Local Computer -->
          <button 
            type="button" 
            @click="fileInputRef.click()"
            class="bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition flex items-center space-x-2 shadow-md hover:shadow-indigo-600/25 cursor-pointer"
          >
            <Plus class="w-4 h-4" />
            <span>{{ t('merge_btn_from_local') || 'Add from Computer' }}</span>
          </button>

          <!-- From Local Vault -->
          <button 
            type="button" 
            @click="isVaultPickerOpen = true"
            class="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-slate-400 text-xs font-bold px-5 py-2.5 rounded-xl transition flex items-center space-x-2 shadow-2xs cursor-pointer"
          >
            <FolderLock class="w-4 h-4 text-indigo-600" />
            <span>{{ t('merge_btn_from_vault') || 'Pick from Vault' }}</span>
          </button>
        </div>
      </div>

      <!-- 2. ACTIVE SIGNING WORKSPACE -->
      <div v-else class="flex-1 flex flex-col justify-between pt-2">
        <!-- Top File Summary Bar & Page Switcher -->
        <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 shrink-0">
          <div class="flex items-center space-x-3 min-w-0">
            <div class="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
              PDF
            </div>
            <div class="min-w-0">
              <p class="text-xs font-bold text-slate-800 truncate max-w-[200px] sm:max-w-xs" :title="filename">
                {{ filename }}
              </p>
              <div class="text-[11px] text-slate-400 font-mono">
                <span>{{ (docBytes.byteLength / 1024 / 1024).toFixed(2) }} MB</span>
                <span> • </span>
                <span>{{ totalPages }} {{ t('pages_label') || 'pages' }}</span>
              </div>
            </div>
          </div>

          <!-- Page Switcher -->
          <div class="flex items-center space-x-2">
            <button 
              @click="prevPage" 
              :disabled="currentPage <= 1"
              class="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
            >
              <ChevronLeft class="w-4 h-4 text-slate-600" />
            </button>
            <span class="text-xs font-mono font-bold text-slate-700 px-2.5 py-1 bg-slate-100 rounded-lg">
              {{ currentPage }} / {{ totalPages }}
            </span>
            <button 
              @click="nextPage" 
              :disabled="currentPage >= totalPages"
              class="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
            >
              <ChevronRight class="w-4 h-4 text-slate-600" />
            </button>

            <button 
              @click="reset" 
              class="text-xs text-slate-500 hover:text-slate-800 font-semibold px-2 py-1 rounded-lg hover:bg-slate-100 transition cursor-pointer ml-2"
            >
              {{ t('btn_reset_file') || 'Reset / Change File' }}
            </button>
          </div>
        </div>

        <!-- Signing Workspace Grid (Left: Sign Studio, Right: Document Viewer) -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-3 py-2 flex-1 min-h-[320px]">
          <!-- Left: Signature Studio Panel (4 cols) -->
          <div class="lg:col-span-4 bg-slate-50/80 rounded-2xl p-3 border border-slate-200/80 flex flex-col justify-between space-y-2.5">
            <div>
              <!-- Tab Selector -->
              <div class="grid grid-cols-5 gap-1 p-1 bg-slate-200/60 rounded-xl mb-3 text-[11px] font-semibold text-slate-600">
                <button 
                  @click="activeSignTab = 'draw'"
                  :class="['py-1.5 rounded-lg transition text-center cursor-pointer', activeSignTab === 'draw' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'hover:text-slate-900']"
                >
                  {{ t('sign_tab_draw') }}
                </button>
                <button 
                  @click="activeSignTab = 'type'"
                  :class="['py-1.5 rounded-lg transition text-center cursor-pointer', activeSignTab === 'type' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'hover:text-slate-900']"
                >
                  {{ t('sign_tab_type') }}
                </button>
                <button 
                  @click="activeSignTab = 'upload'"
                  :class="['py-1.5 rounded-lg transition text-center cursor-pointer', activeSignTab === 'upload' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'hover:text-slate-900']"
                >
                  {{ t('sign_tab_upload') }}
                </button>
                <button 
                  @click="activeSignTab = 'date'"
                  :class="['py-1.5 rounded-lg transition text-center cursor-pointer', activeSignTab === 'date' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'hover:text-slate-900']"
                >
                  {{ t('sign_tab_date') }}
                </button>
                <button 
                  @click="activeSignTab = 'library'"
                  :class="['py-1.5 rounded-lg transition text-center cursor-pointer relative', activeSignTab === 'library' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'hover:text-slate-900']"
                >
                  <span>{{ t('sign_tab_library') }}</span>
                  <span v-if="savedStamps.length > 0" class="ml-0.5 inline-flex items-center px-1 py-0.2 rounded-full text-[9px] font-bold bg-indigo-600 text-white">
                    {{ savedStamps.length }}
                  </span>
                </button>
              </div>

              <!-- Color Presets (For Draw & Type) -->
              <div v-if="activeSignTab === 'draw' || activeSignTab === 'type'" class="flex items-center justify-between mb-2.5">
                <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{{ t('sign_ink_color', 'Ink Color:') }}</span>
                <div class="flex items-center space-x-2">
                  <button 
                    v-for="c in colorOptions" 
                    :key="c.value"
                    @click="activeColor = c.value"
                    :style="{ backgroundColor: c.value }"
                    :class="[
                      'w-5 h-5 rounded-full border-2 transition cursor-pointer shadow-2xs',
                      activeColor === c.value ? 'border-indigo-600 scale-110 ring-2 ring-indigo-200' : 'border-white hover:scale-105'
                    ]"
                    :title="c.label"
                  ></button>
                </div>
              </div>

              <!-- Content 1: Draw Canvas -->
              <div v-show="activeSignTab === 'draw'" class="space-y-2">
                <div class="relative bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <canvas 
                    ref="drawCanvasRef"
                    width="320" 
                    height="115"
                    class="w-full h-[115px] cursor-crosshair touch-none bg-white"
                    @pointerdown="startDrawing"
                    @pointermove="drawStroke"
                    @pointerup="stopDrawing"
                    @pointerleave="stopDrawing"
                  ></canvas>
                  <button 
                    @click="clearDrawCanvas" 
                    class="absolute top-2 right-2 text-[10px] text-slate-400 hover:text-rose-600 bg-white/90 hover:bg-rose-50 px-2 py-0.5 rounded-md border border-slate-200 font-semibold transition cursor-pointer"
                  >
                    {{ t('sign_btn_clear') }}
                  </button>
                </div>
                <div class="flex items-center gap-2">
                  <button 
                    @click="addDrawnSignature"
                    :disabled="!hasDrawn"
                    class="flex-1 bg-indigo-600 hover:bg-indigo-700 active:scale-98 disabled:opacity-40 text-white text-xs font-bold py-2 rounded-xl transition flex items-center justify-center space-x-1.5 shadow-2xs cursor-pointer"
                  >
                    <Plus class="w-3.5 h-3.5" />
                    <span>{{ t('sign_add_draw', 'Add drawn signature to page') }}</span>
                  </button>
                  <button
                    @click="saveDrawnToLibrary"
                    :disabled="!hasDrawn"
                    class="px-2.5 py-2 bg-amber-50 hover:bg-amber-100 active:scale-98 disabled:opacity-40 text-amber-700 border border-amber-200 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1 shadow-2xs cursor-pointer"
                    :title="t('sign_btn_save_library')"
                  >
                    <Star class="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span class="hidden sm:inline">{{ t('sign_btn_save_library') }}</span>
                  </button>
                </div>
              </div>

              <!-- Content 2: Type Cursive Signature -->
              <div v-show="activeSignTab === 'type'" class="space-y-2">
                <input 
                  v-model="typedName" 
                  type="text"
                  :placeholder="t('sign_type_placeholder')"
                  class="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
                >

                <!-- Signature Style Selector Tabs -->
                <div class="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl">
                  <button 
                    v-for="st in signatureStyles" 
                    :key="st.id"
                    type="button"
                    @click="selectedSignatureStyle = st.id"
                    :class="[
                      'py-1 text-[11px] font-bold rounded-lg transition text-center cursor-pointer',
                      selectedSignatureStyle === st.id 
                        ? 'bg-white text-indigo-600 shadow-2xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    ]"
                  >
                    {{ st.label }}
                  </button>
                </div>

                <!-- Cursive Font Preview Box -->
                <div 
                  class="h-[85px] sm:h-[95px] bg-white border border-slate-200 rounded-xl flex items-center justify-center p-2.5 overflow-hidden shadow-2xs select-none"
                  :style="{ color: activeColor }"
                >
                  <span 
                    class="text-3xl sm:text-4xl text-center truncate" 
                    :class="{ 'italic': currentSignatureStyle.slant }"
                    :style="{ fontFamily: currentSignatureStyle.fontFamily }"
                  >
                    {{ typedName || t('sign_typed_preview', 'Your artistic signature') }}
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <button 
                    @click="addTypedSignature"
                    :disabled="!typedName.trim()"
                    class="flex-1 bg-indigo-600 hover:bg-indigo-700 active:scale-98 disabled:opacity-40 text-white text-xs font-bold py-2 rounded-xl transition flex items-center justify-center space-x-1.5 shadow-2xs cursor-pointer"
                  >
                    <Plus class="w-3.5 h-3.5" />
                    <span>{{ t('sign_add_type', 'Add typed signature to page') }}</span>
                  </button>
                  <button
                    @click="saveTypedToLibrary"
                    :disabled="!typedName.trim()"
                    class="px-2.5 py-2 bg-amber-50 hover:bg-amber-100 active:scale-98 disabled:opacity-40 text-amber-700 border border-amber-200 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1 shadow-2xs cursor-pointer"
                    :title="t('sign_btn_save_library')"
                  >
                    <Star class="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span class="hidden sm:inline">{{ t('sign_btn_save_library') }}</span>
                  </button>
                </div>
              </div>

              <!-- Content 3: Upload Signature Stamp Image -->
              <div v-show="activeSignTab === 'upload'" class="space-y-2">
                <input 
                  ref="stampImageInputRef" 
                  type="file" 
                  accept="image/png,image/jpeg,image/webp,image/jpg" 
                  class="hidden" 
                  @change="onStampFileSelected"
                >
                <div 
                  @click="stampImageInputRef.click()"
                  class="h-[90px] relative bg-white border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl flex flex-col items-center justify-center p-2 text-center cursor-pointer transition overflow-hidden"
                  :style="uploadedStampDataUrl ? { backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '8px 8px' } : {}"
                >
                  <div v-if="uploadedStampDataUrl" class="h-full w-full flex items-center justify-center overflow-hidden relative">
                    <img :src="uploadedStampDataUrl" class="max-h-full max-w-full object-contain" />
                    <div v-if="isProcessingStamp" class="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center">
                      <Loader2 class="w-5 h-5 animate-spin text-indigo-600" />
                    </div>
                  </div>
                  <div v-else class="text-slate-400 text-xs flex flex-col items-center">
                    <Upload class="w-5 h-5 mb-1 text-slate-400" />
                    <span>{{ t('sign_upload_hint', 'Click to upload transparent PNG signature or stamp') }}</span>
                  </div>
                </div>

                <!-- Anti-shadow & Transparency Controls -->
                <div v-if="rawStampDataUrl" class="space-y-2 bg-white p-2 rounded-xl border border-slate-200/80">
                  <!-- Auto Remove Background Toggle -->
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-1.5">
                      <Wand2 class="w-3.5 h-3.5 text-indigo-600" />
                      <span class="text-[11px] font-bold text-slate-700">{{ t('sign_bg_remove') }}</span>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" v-model="autoRemoveBg" class="sr-only peer" />
                      <div class="w-7 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  <div v-if="autoRemoveBg" class="space-y-2 pt-1 border-t border-slate-100">
                    <!-- Shadow Removal Option Pills -->
                    <div class="space-y-1">
                      <div class="flex items-center justify-between text-[10.5px]">
                        <span class="font-bold text-slate-500 uppercase tracking-wider">{{ t('sign_shadow_removal') }}</span>
                      </div>
                      <div class="grid grid-cols-4 gap-1 p-0.5 bg-slate-100 rounded-lg text-[10px] font-semibold">
                        <button 
                          type="button" 
                          v-for="opt in shadowOptions" 
                          :key="opt.id"
                          @click="uploadShadowRemoval = opt.id"
                          :class="['py-0.5 rounded-md transition text-center cursor-pointer', uploadShadowRemoval === opt.id ? 'bg-white text-indigo-600 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800']"
                        >
                          {{ opt.label }}
                        </button>
                      </div>
                    </div>

                    <!-- Ink Color Override -->
                    <div class="space-y-1">
                      <div class="flex items-center justify-between text-[10.5px]">
                        <span class="font-bold text-slate-500 uppercase tracking-wider">{{ t('sign_ink_override') }}</span>
                      </div>
                      <div class="grid grid-cols-4 gap-1 p-0.5 bg-slate-100 rounded-lg text-[10px] font-semibold">
                        <button 
                          type="button" 
                          v-for="ink in inkColorOptions" 
                          :key="ink.id"
                          @click="uploadInkColor = ink.id"
                          :class="['py-0.5 rounded-md transition text-center flex items-center justify-center space-x-1 cursor-pointer', uploadInkColor === ink.id ? 'bg-white text-indigo-600 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800']"
                        >
                          <span class="w-2 h-2 rounded-full border border-slate-300 shrink-0" :style="{ backgroundColor: ink.color }"></span>
                          <span class="truncate">{{ ink.label }}</span>
                        </button>
                      </div>
                    </div>

                    <!-- Sensitivity Slider -->
                    <div class="space-y-0.5">
                      <div class="flex items-center justify-between text-[10.5px] text-slate-500">
                        <span class="font-bold uppercase tracking-wider">{{ t('sign_threshold_label') }}</span>
                        <span class="font-mono text-slate-700 font-bold">{{ uploadSensitivity }}%</span>
                      </div>
                      <input 
                        type="range" 
                        v-model.number="uploadSensitivity" 
                        min="50" 
                        max="98" 
                        step="1"
                        class="w-full accent-indigo-600 h-1 bg-slate-200 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <button 
                    @click="addUploadedSignature"
                    :disabled="!uploadedStampDataUrl || isProcessingStamp"
                    class="flex-1 bg-indigo-600 hover:bg-indigo-700 active:scale-98 disabled:opacity-40 text-white text-xs font-bold py-2 rounded-xl transition flex items-center justify-center space-x-1.5 shadow-2xs cursor-pointer"
                  >
                    <Plus class="w-3.5 h-3.5" />
                    <span>{{ t('sign_add_upload', 'Add uploaded image to page') }}</span>
                  </button>
                  <button
                    @click="saveUploadedToLibrary"
                    :disabled="!uploadedStampDataUrl || isProcessingStamp"
                    class="px-2.5 py-2 bg-amber-50 hover:bg-amber-100 active:scale-98 disabled:opacity-40 text-amber-700 border border-amber-200 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1 shadow-2xs cursor-pointer"
                    :title="t('sign_btn_save_library')"
                  >
                    <Star class="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span class="hidden sm:inline">{{ t('sign_btn_save_library') }}</span>
                  </button>
                </div>
              </div>

              <!-- Content 4: Date Stamp -->
              <div v-show="activeSignTab === 'date'" class="space-y-2">
                <div class="space-y-1.5">
                  <label 
                    v-for="df in dateFormats" 
                    :key="df.id"
                    @click="selectedDateFormat = df.id"
                    :class="[
                      'w-full flex items-center justify-between p-2 rounded-xl border text-xs font-mono transition cursor-pointer',
                      selectedDateFormat === df.id ? 'bg-indigo-50 border-indigo-400 text-indigo-900 font-bold' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    ]"
                  >
                    <span>{{ df.sample }}</span>
                    <span class="text-[10px] text-slate-400 font-sans">{{ df.label }}</span>
                  </label>
                </div>
                <button 
                  @click="addDateStamp"
                  class="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-bold py-2 rounded-xl transition flex items-center justify-center space-x-1.5 shadow-2xs cursor-pointer"
                >
                  <Plus class="w-3.5 h-3.5" />
                  <span>{{ t('sign_add_date', 'Add date stamp to page') }}</span>
                </button>
              </div>

              <!-- Content 5: Saved Stamp Library -->
              <div v-show="activeSignTab === 'library'" class="space-y-2">
                <div v-if="savedStamps.length === 0" class="h-[140px] flex flex-col items-center justify-center text-center p-3 bg-white border border-slate-200 rounded-xl text-slate-400">
                  <Star class="w-6 h-6 mb-1.5 text-amber-400/80 stroke-1" />
                  <p class="text-xs text-slate-500 font-medium leading-relaxed max-w-[220px]">
                    {{ t('sign_library_empty') }}
                  </p>
                </div>
                <div v-else class="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                  <div 
                    v-for="stamp in savedStamps" 
                    :key="stamp.id"
                    class="group relative bg-white border border-slate-200 hover:border-indigo-400 rounded-xl p-2 flex items-center justify-between transition shadow-2xs"
                  >
                    <div 
                      @click="placeSavedStamp(stamp)" 
                      class="flex items-center space-x-2.5 flex-1 min-w-0 cursor-pointer"
                      :title="stamp.title"
                    >
                      <div 
                        class="w-12 h-8 shrink-0 rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center bg-slate-50"
                        :style="{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '6px 6px' }"
                      >
                        <img :src="stamp.dataUrl" class="max-w-full max-h-full object-contain" />
                      </div>
                      <div class="min-w-0 flex-1">
                        <p class="text-xs font-bold text-slate-800 truncate">{{ stamp.title }}</p>
                        <p class="text-[10px] text-slate-400 font-mono">{{ formatDate(stamp.createdAt) }}</p>
                      </div>
                    </div>
                    <div class="flex items-center space-x-1 shrink-0 ml-1.5">
                      <button 
                        @click="placeSavedStamp(stamp)"
                        class="p-1 text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                        :title="t('sign_add_draw')"
                      >
                        <Plus class="w-4 h-4" />
                      </button>
                      <button 
                        @click="deleteStamp(stamp.id)"
                        class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        :title="t('sign_library_delete')"
                      >
                        <Trash2 class="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Hint: Drag and Resize -->
            <div class="p-2 rounded-xl bg-indigo-50/60 border border-indigo-100 text-[10.5px] text-indigo-900 flex items-start space-x-1.5">
              <CheckCircle2 class="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
              <span>{{ t('sign_drag_hint', 'Signatures can be dragged to move and resized from the bottom-right corner.') }}</span>
            </div>
          </div>

          <!-- Right: Interactive PDF Page Viewer & Stamping Board (8 cols) -->
          <div class="lg:col-span-8 bg-slate-100/70 rounded-2xl p-2 sm:p-3 border border-slate-200/80 flex flex-col items-center justify-center overflow-auto relative select-none min-h-[320px] max-h-[460px]">
            <!-- Interactive Stamping Canvas Board -->
            <div 
              ref="boardContainerRef"
              class="relative bg-white shadow-md border border-slate-300 rounded-lg overflow-hidden"
              :style="{ width: `${boardWidth}px`, height: `${boardHeight}px` }"
            >
              <!-- PDF Page Render Base Canvas -->
              <canvas ref="pdfCanvasRef" class="w-full h-full block"></canvas>

              <!-- Placed Signatures on Current Page -->
              <div 
                v-for="sig in currentPageSignatures" 
                :key="sig.id"
                :style="{
                  left: `${sig.x}px`,
                  top: `${sig.y}px`,
                  width: `${sig.width}px`,
                  height: `${sig.height}px`
                }"
                class="absolute cursor-move border-2 border-dashed border-indigo-500 bg-indigo-50/15 group hover:border-indigo-600 transition-colors select-none"
                @pointerdown="startDragSig(sig, $event)"
              >
                <!-- Render Stamp Image -->
                <img :src="sig.dataUrl" class="w-full h-full object-contain pointer-events-none select-none" />

                <!-- Multi-Page Batch Apply Badge (Top Left, when totalPages > 1) -->
                <button 
                  v-if="totalPages > 1"
                  @click.stop="openBatchModal(sig)"
                  class="absolute -top-2.5 -left-2.5 w-5 h-5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-md transition cursor-pointer z-10"
                  :title="t('sign_batch_action')"
                >
                  <Layers class="w-3 h-3" />
                </button>

                <!-- Delete Badge -->
                <button 
                  @click.stop="removeSignature(sig.id)"
                  class="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md hover:bg-rose-600 transition cursor-pointer z-10"
                  :title="t('sign_action_delete', 'Delete')"
                >
                  <X class="w-3 h-3" />
                </button>

                <!-- Resize Handle (Bottom Right) -->
                <div 
                  @pointerdown.stop="startResizeSig(sig, $event)"
                  class="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-indigo-600 border border-white rounded-full cursor-nwse-resize shadow-xs z-10"
                  :title="t('sign_action_resize', 'Resize')"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Next Action Relay Banner -->
        <NextActionBanner 
          v-if="showNextActions && lastExportedFile"
          :current-tool="'sign'"
          :file="lastExportedFile"
          @send-to-tool="(tId) => emit('send-to-tool', tId)"
          @close="showNextActions = false"
          class="mb-3"
        />

        <!-- Bottom Execution & Output Settings Bar (Matching PDFSeal Standard) -->
        <div class="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <!-- Left: Output Filename & Vault Auto-Save Setting -->
          <div class="flex flex-wrap items-center gap-3">
            <div class="flex items-center space-x-1.5">
              <label class="text-xs text-slate-500 font-semibold shrink-0">
                {{ t('vault_field_name') }}:
              </label>
              <input 
                v-model="customOutputBaseName"
                type="text" 
                :placeholder="defaultFileNamePlaceholder"
                class="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden font-medium text-slate-700 w-44 sm:w-56"
              >
            </div>

            <!-- Auto-save to Vault Checkbox -->
            <label class="flex items-center space-x-1.5 text-xs text-slate-600 cursor-pointer select-none">
              <input 
                type="checkbox" 
                v-model="autoSaveToVault"
                class="w-3.5 h-3.5 rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              >
              <FolderLock class="w-3.5 h-3.5 text-indigo-600" />
              <span>{{ t('vault_autosave_checkbox') }}</span>
            </label>
          </div>

          <!-- Main Sign & Export Action Button -->
          <button 
            @click="executeSign" 
            :disabled="isProcessing || placedSignatures.length === 0"
            class="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold px-6 py-2.5 rounded-xl transition flex items-center justify-center space-x-2 shadow-md hover:shadow-indigo-600/25 cursor-pointer"
          >
            <Loader2 v-if="isProcessing" class="w-4 h-4 animate-spin" />
            <PenTool v-else class="w-4 h-4" />
            <span>{{ t('sign_btn_action') }} ({{ placedSignatures.length }})</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <PasswordModal 
      :is-open="isPasswordOpen"
      :filename="pendingFileName"
      :error-message="passwordError"
      :is-unlocking="isUnlocking"
      @submit="handlePasswordSubmit"
      @cancel="handlePasswordCancel"
    />

    <VaultFilePickerModal 
      :is-open="isVaultPickerOpen"
      :multiple="false"
      @select-files="handleVaultFilesSelected"
      @close="isVaultPickerOpen = false"
    />

    <!-- Batch Apply Modal -->
    <div 
      v-if="isBatchModalOpen && batchTargetSig"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
      @click.self="isBatchModalOpen = false"
    >
      <div class="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <!-- Header -->
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <div class="flex items-center space-x-2.5">
            <div class="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0 shadow-2xs">
              <Layers class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-sm sm:text-base font-bold text-slate-800">{{ t('sign_batch_modal_title') }}</h3>
              <p class="text-[11px] text-slate-400 font-medium">{{ t('sign_batch_modal_desc') }}</p>
            </div>
          </div>
          <button 
            @click="isBatchModalOpen = false"
            class="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Target Stamp Preview -->
        <div class="p-2.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center space-x-3">
          <div 
            class="w-16 h-10 bg-white rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center shrink-0"
            :style="{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '6px 6px' }"
          >
            <img :src="batchTargetSig.dataUrl" class="max-w-full max-h-full object-contain" />
          </div>
          <div class="text-xs text-slate-600 min-w-0">
            <p class="font-bold text-slate-800">Page {{ currentPage }} Signature / Initial</p>
            <p class="text-[11px] text-slate-400 font-mono">X: {{ batchTargetSig.x }}px, Y: {{ batchTargetSig.y }}px ({{ batchTargetSig.width }}x{{ batchTargetSig.height }}px)</p>
          </div>
        </div>

        <!-- Preset Options -->
        <div class="space-y-1.5">
          <label 
            v-for="mode in batchModes" 
            :key="mode.id"
            @click="selectedBatchPreset = mode.id"
            :class="[
              'w-full flex items-center justify-between p-2.5 rounded-xl border text-xs transition cursor-pointer',
              selectedBatchPreset === mode.id ? 'bg-indigo-50 border-indigo-400 text-indigo-950 font-bold shadow-2xs' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            ]"
          >
            <div class="flex items-center space-x-2.5 min-w-0">
              <input 
                type="radio" 
                :value="mode.id" 
                v-model="selectedBatchPreset" 
                class="w-3.5 h-3.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
              />
              <span class="truncate">{{ mode.label }}</span>
            </div>
            <span v-if="mode.badge" class="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 shrink-0">
              {{ mode.badge }}
            </span>
          </label>
        </div>

        <!-- Custom Range Input if 'custom' -->
        <div v-if="selectedBatchPreset === 'custom'" class="pt-0.5">
          <input 
            v-model="customBatchRange" 
            type="text" 
            :placeholder="t('sign_batch_custom_placeholder')" 
            class="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500 font-mono"
          />
        </div>

        <!-- Target Pages Preview Tags -->
        <div class="p-2.5 bg-slate-100/70 rounded-xl text-xs flex flex-col space-y-1.5">
          <div class="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
            <span>{{ t('pages_label', 'Pages') }} ({{ computedBatchTargetPages.length }}):</span>
          </div>
          <div class="flex flex-wrap gap-1 max-h-18 overflow-y-auto">
            <span 
              v-for="p in computedBatchTargetPages" 
              :key="p"
              :class="['px-2 py-0.5 rounded-md font-mono text-[11px]', p === currentPage ? 'bg-indigo-600 text-white font-bold' : 'bg-white text-slate-700 border border-slate-200']"
            >
              P.{{ p }}
            </span>
            <span v-if="computedBatchTargetPages.length === 0" class="text-slate-400 italic text-[11px]">
              No pages selected
            </span>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
          <button 
            type="button" 
            @click="isBatchModalOpen = false"
            class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            {{ t('sign_batch_btn_cancel') }}
          </button>
          <button 
            type="button" 
            @click="executeBatchApply"
            :disabled="computedBatchTargetPages.length === 0"
            class="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 transition shadow-md hover:shadow-indigo-600/25 cursor-pointer flex items-center space-x-1.5"
          >
            <Layers class="w-3.5 h-3.5" />
            <span>{{ t('sign_batch_btn_apply', { count: computedBatchTargetPages.length }) }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Floating Toast Notification -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div 
        v-if="statusToast" 
        class="fixed bottom-6 right-6 z-50 bg-slate-900/90 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg backdrop-blur-xs flex items-center space-x-2 pointer-events-none"
      >
        <CheckCircle2 class="w-4 h-4 text-emerald-400 shrink-0" />
        <span>{{ statusToast }}</span>
      </div>
    </Transition>
  </section>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, onActivated, nextTick } from 'vue';
import { 
  PenTool, 
  Plus, 
  Lock, 
  FolderLock, 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Upload, 
  CheckCircle2,
  Star,
  Trash2,
  Layers,
  Wand2
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
import { 
  processImageToTransparentDataUrl,
  loadSavedStamps,
  saveStampToLibrary,
  deleteSavedStamp,
  calculateBatchTargetPages
} from '../utils/imageProcess';
import PasswordModal from '../components/PasswordModal.vue';
import VaultFilePickerModal from '../components/VaultFilePickerModal.vue';
import NextActionBanner from '../components/NextActionBanner.vue';

const emit = defineEmits(['send-to-tool']);

const lastExportedFile = ref(null);
const showNextActions = ref(false);

const fileInputRef = ref(null);
const stampImageInputRef = ref(null);
const pdfCanvasRef = ref(null);
const drawCanvasRef = ref(null);
const boardContainerRef = ref(null);

const docBytes = ref(null);
const filename = ref('');
const totalPages = ref(0);
const currentPage = ref(1);
const isDragOver = ref(false);
const isProcessing = ref(false);
const isVaultPickerOpen = ref(false);

const activeSignTab = ref('draw'); // 'draw' | 'type' | 'upload' | 'date' | 'library'
const activeColor = ref('#0f172a');
const colorOptions = [
  { value: '#0f172a', label: t('sign_color_black', 'Black') },
  { value: '#1e3a8a', label: t('sign_color_blue', 'Blue') },
  { value: '#dc2626', label: t('sign_color_red', 'Red') }
];

// Draw Tab State
const hasDrawn = ref(false);
let isDrawing = false;
let lastX = 0;
let lastY = 0;

// Type Tab State
const typedName = ref('');
const signatureStyles = [
  {
    id: 'xingkai',
    label: t('sign_font_business', 'Business'),
    fontFamily: '"Zhi Mang Xing", "STXingkai", "华文行楷", "Xingkai SC", "FZXingKai-S04S", "KaiTi", "楷体", cursive',
    slant: true,
  },
  {
    id: 'mashan',
    label: t('sign_font_brush', 'Brush'),
    fontFamily: '"Ma Shan Zheng", "FZShuTi", "方正舒体", "STKaiti", "华文楷体", "KaiTi", "楷体", cursive',
    slant: false,
  },
  {
    id: 'kaiti',
    label: t('sign_font_regular', 'Regular'),
    fontFamily: '"STKaiti", "华文楷体", "KaiTi", "楷体", "Kaiti SC", serif',
    slant: false,
  },
  {
    id: 'cursive',
    label: t('sign_font_cursive', 'Cursive'),
    fontFamily: '"Great Vibes", "Dancing Script", "Brush Script MT", "Segoe Script", "Zhi Mang Xing", "STXingkai", cursive',
    slant: true,
  }
];
const selectedSignatureStyle = ref('xingkai');
const currentSignatureStyle = computed(() => signatureStyles.find(s => s.id === selectedSignatureStyle.value) || signatureStyles[0]);

// Upload Tab State
const rawStampDataUrl = ref('');
const uploadedStampDataUrl = ref('');
const autoRemoveBg = ref(true);
const uploadShadowRemoval = ref('medium'); // 'none' | 'low' | 'medium' | 'high'
const uploadInkColor = ref('original'); // 'original' | 'black' | 'blue' | 'red'
const uploadSensitivity = ref(80); // 50 - 98
const isProcessingStamp = ref(false);

const shadowOptions = computed(() => [
  { id: 'none', label: t('sign_shadow_none') },
  { id: 'low', label: t('sign_shadow_low') },
  { id: 'medium', label: t('sign_shadow_med') },
  { id: 'high', label: t('sign_shadow_high') }
]);

const inkColorOptions = computed(() => [
  { id: 'original', label: t('sign_ink_original'), color: '#94a3b8' },
  { id: 'black', label: t('sign_ink_black'), color: '#0f172a' },
  { id: 'blue', label: t('sign_ink_blue'), color: '#1e3a8a' },
  { id: 'red', label: t('sign_ink_red'), color: '#dc2626' }
]);

// Saved Stamps Library State
const savedStamps = ref([]);

// Multi-Page Batch Apply State
const isBatchModalOpen = ref(false);
const batchTargetSig = ref(null);
const selectedBatchPreset = ref('except_last');
const customBatchRange = ref('');

const batchModes = computed(() => [
  {
    id: 'all',
    label: t('sign_batch_preset_all', { total: totalPages.value }),
    badge: null
  },
  {
    id: 'except_last',
    label: t('sign_batch_preset_except_last', { prev: Math.max(1, totalPages.value - 1) }),
    badge: 'Initials'
  },
  {
    id: 'even',
    label: t('sign_batch_preset_even'),
    badge: null
  },
  {
    id: 'odd',
    label: t('sign_batch_preset_odd'),
    badge: null
  },
  {
    id: 'custom',
    label: t('sign_batch_preset_custom'),
    badge: null
  }
]);

const computedBatchTargetPages = computed(() => {
  return calculateBatchTargetPages(
    selectedBatchPreset.value,
    totalPages.value,
    currentPage.value,
    customBatchRange.value
  );
});

// Toast State
const statusToast = ref('');
let toastTimer = null;
function showToast(msg) {
  statusToast.value = msg;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    statusToast.value = '';
  }, 2500);
}

// Date Tab State
const selectedDateFormat = ref('us');
const dateFormats = computed(() => {
  const d = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthStr = months[d.getMonth()];
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return [
    { id: 'us', sample: `${monthStr} ${day}, ${year}`, label: t('sign_date_us', 'US Format') },
    { id: 'iso', sample: `${year}-${String(d.getMonth() + 1).padStart(2, '0')}-${day}`, label: t('sign_date_iso', 'ISO Standard') },
    { id: 'eu', sample: `${day}/${String(d.getMonth() + 1).padStart(2, '0')}/${year}`, label: t('sign_date_eu', 'EU Format') }
  ];
});

// Board View Dimensions
const boardWidth = ref(450);
const boardHeight = ref(600);
let currentPdfPageObj = null;

// Placed Signatures Array
// Item: { id, pageIndex, x, y, width, height, dataUrl, origWidth, origHeight }
const placedSignatures = ref([]);

const currentPageSignatures = computed(() => {
  return placedSignatures.value.filter(s => s.pageIndex === currentPage.value);
});

// Output settings
const customOutputBaseName = ref('');
const autoSaveToVault = ref(userSettings.autoSaveToVault);

watch(() => userSettings.autoSaveToVault, (newVal) => {
  autoSaveToVault.value = Boolean(newVal);
}, { immediate: true });

// Password State
const isPasswordOpen = ref(false);
const passwordError = ref('');
const isUnlocking = ref(false);
let pendingFileObj = null;
const pendingFileName = ref('');
let unlockedPassword = '';

const defaultFileNamePlaceholder = computed(() => {
  const prefix = userSettings.defaultExportPrefix || 'PDFSeal';
  const base = filename.value ? filename.value.replace(/\.[^/.]+$/, '') : 'Document';
  return `${prefix}_Signed_${base}`;
});

function onFileSelected(e) {
  const file = e.target.files?.[0];
  if (file) loadFile(file);
  e.target.value = '';
}

function onDrop(e) {
  const file = e.dataTransfer.files?.[0];
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
  pendingFileName.value = file.name;
  pendingFileObj = file;

  const rawBuffer = await file.arrayBuffer();

  // Security check
  const security = await verifyPdfSecurity(rawBuffer, password);
  if (security.isEncrypted && !security.isValid) {
    isPasswordOpen.value = true;
    if (password) {
      passwordError.value = t('pwd_error_wrong');
    }
    return;
  }

  unlockedPassword = password;
  isPasswordOpen.value = false;
  passwordError.value = '';

  docBytes.value = new Uint8Array(rawBuffer);
  filename.value = file.name;

  const prefix = userSettings.defaultExportPrefix || 'PDFSeal';
  const cleanBase = file.name.replace(/\.[^/.]+$/, '');
  customOutputBaseName.value = `${prefix}_Signed_${cleanBase}`;
  showNextActions.value = false;
  lastExportedFile.value = null;

  currentPage.value = 1;
  placedSignatures.value = [];

  // Read page count via pdf.js
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
    await renderCurrentPage(pdf);
  } catch (e) {
    totalPages.value = 1;
  }
}

async function renderCurrentPage(pdfDocObj = null) {
  if (!docBytes.value) return;
  await nextTick();

  try {
    let pdf = pdfDocObj;
    if (!pdf) {
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(docBytes.value.slice(0)),
        password: unlockedPassword || undefined,
        cMapUrl: '/cmaps/',
        cMapPacked: true,
        standardFontDataUrl: '/standard_fonts/'
      });
      pdf = await loadingTask.promise;
    }

    const page = await pdf.getPage(currentPage.value);
    currentPdfPageObj = page;

    // Scale to fit nicely on screen without overflowing viewport and hiding footer
    const baseViewport = page.getViewport({ scale: 1.0 });
    const availableH = typeof window !== 'undefined'
      ? Math.max(280, Math.min(380, window.innerHeight - 440))
      : 360;
    const targetHeight = availableH;
    const scale = targetHeight / baseViewport.height;
    const viewport = page.getViewport({ scale });

    boardWidth.value = Math.round(viewport.width);
    boardHeight.value = Math.round(viewport.height);

    await nextTick();
    const canvas = pdfCanvasRef.value;
    if (!canvas) return;

    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext('2d');

    await page.render({
      canvasContext: ctx,
      viewport
    }).promise;
  } catch (err) {
    logger.warn('SIGN', `Failed to render page: ${err.message}`);
  }
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--;
    renderCurrentPage();
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    renderCurrentPage();
  }
}

// ----------------- DRAWING CANVAS ENGINE -----------------
function startDrawing(e) {
  isDrawing = true;
  const canvas = drawCanvasRef.value;
  const rect = canvas.getBoundingClientRect();
  lastX = (e.clientX - rect.left) * (canvas.width / rect.width);
  lastY = (e.clientY - rect.top) * (canvas.height / rect.height);
}

function drawStroke(e) {
  if (!isDrawing) return;
  const canvas = drawCanvasRef.value;
  const rect = canvas.getBoundingClientRect();
  const currentX = (e.clientX - rect.left) * (canvas.width / rect.width);
  const currentY = (e.clientY - rect.top) * (canvas.height / rect.height);

  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = activeColor.value;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(currentX, currentY);
  ctx.stroke();

  lastX = currentX;
  lastY = currentY;
  hasDrawn.value = true;
}

function stopDrawing() {
  isDrawing = false;
}

function clearDrawCanvas() {
  const canvas = drawCanvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  hasDrawn.value = false;
}

function addDrawnSignature() {
  const canvas = drawCanvasRef.value;
  if (!canvas || !hasDrawn.value) return;
  const dataUrl = canvas.toDataURL('image/png');
  placeNewSignature(dataUrl, 140, 60);
}

function saveDrawnToLibrary() {
  const canvas = drawCanvasRef.value;
  if (!canvas || !hasDrawn.value) return;
  const dataUrl = canvas.toDataURL('image/png');
  saveCurrentStamp(dataUrl, 'Handwritten Signature', 'draw');
}

// ----------------- TYPE SIGNATURE ENGINE -----------------
function addTypedSignature() {
  if (!typedName.value.trim()) return;

  // Render cursive text into an offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = 500;
  canvas.height = 180;
  const ctx = canvas.getContext('2d');

  const st = currentSignatureStyle.value;
  const isItalic = st.slant ? 'italic' : 'normal';
  ctx.font = `${isItalic} 54px ${st.fontFamily}`;
  ctx.fillStyle = activeColor.value;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Apply subtle organic pen shear if slanted style
  if (st.slant) {
    ctx.transform(1, 0, -0.08, 1, 0, 0);
  }

  ctx.fillText(typedName.value.trim(), 250, 90);

  const dataUrl = canvas.toDataURL('image/png');
  placeNewSignature(dataUrl, 160, 60);
}

function saveTypedToLibrary() {
  if (!typedName.value.trim()) return;

  const canvas = document.createElement('canvas');
  canvas.width = 500;
  canvas.height = 180;
  const ctx = canvas.getContext('2d');

  const st = currentSignatureStyle.value;
  const isItalic = st.slant ? 'italic' : 'normal';
  ctx.font = `${isItalic} 54px ${st.fontFamily}`;
  ctx.fillStyle = activeColor.value;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (st.slant) {
    ctx.transform(1, 0, -0.08, 1, 0, 0);
  }

  ctx.fillText(typedName.value.trim(), 250, 90);

  const dataUrl = canvas.toDataURL('image/png');
  saveCurrentStamp(dataUrl, typedName.value.trim(), 'type');
}

// ----------------- UPLOAD STAMP ENGINE -----------------
async function updateProcessedStamp() {
  if (!rawStampDataUrl.value) return;
  if (!autoRemoveBg.value) {
    uploadedStampDataUrl.value = rawStampDataUrl.value;
    return;
  }
  isProcessingStamp.value = true;
  try {
    uploadedStampDataUrl.value = await processImageToTransparentDataUrl(rawStampDataUrl.value, {
      threshold: uploadSensitivity.value,
      shadowRemoval: uploadShadowRemoval.value,
      inkColor: uploadInkColor.value
    });
  } catch (err) {
    logger.warn('SIGN', `Failed to process stamp image: ${err.message}`);
    uploadedStampDataUrl.value = rawStampDataUrl.value;
  } finally {
    isProcessingStamp.value = false;
  }
}

watch([autoRemoveBg, uploadShadowRemoval, uploadInkColor, uploadSensitivity], () => {
  if (rawStampDataUrl.value) {
    updateProcessedStamp();
  }
});

function onStampFileSelected(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (evt) => {
    rawStampDataUrl.value = evt.target.result;
    await updateProcessedStamp();
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function addUploadedSignature() {
  if (!uploadedStampDataUrl.value) return;
  placeNewSignature(uploadedStampDataUrl.value, 140, 65);
}

function saveUploadedToLibrary() {
  if (!uploadedStampDataUrl.value) return;
  saveCurrentStamp(uploadedStampDataUrl.value, 'Uploaded Stamp', 'upload');
}

// ----------------- STAMP LIBRARY ENGINE -----------------
function refreshSavedStamps() {
  savedStamps.value = loadSavedStamps();
}

function saveCurrentStamp(dataUrl, title = 'Signature Stamp', type = 'custom') {
  if (!dataUrl) return;
  saveStampToLibrary({
    title,
    type,
    dataUrl,
    defaultWidth: 140,
    defaultHeight: 60
  });
  refreshSavedStamps();
  showToast(t('sign_library_saved_toast'));
}

function placeSavedStamp(stamp) {
  if (!stamp || !stamp.dataUrl) return;
  placeNewSignature(stamp.dataUrl, stamp.defaultWidth || 140, stamp.defaultHeight || 60);
}

function deleteStamp(stampId) {
  savedStamps.value = deleteSavedStamp(stampId);
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch (e) {
    return '';
  }
}

// ----------------- DATE STAMP ENGINE -----------------
function addDateStamp() {
  const format = dateFormats.value.find(d => d.id === selectedDateFormat.value) || dateFormats.value[0];
  const dateStr = format.sample;

  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');

  ctx.font = 'bold 24px monospace';
  ctx.fillStyle = activeColor.value;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(dateStr, 150, 40);

  const dataUrl = canvas.toDataURL('image/png');
  placeNewSignature(dataUrl, 130, 35);
}

// ----------------- PLACEMENT & DRAGGING ENGINE -----------------
function placeNewSignature(dataUrl, defaultW = 140, defaultH = 60) {
  const id = `sig_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  // Place centrally on current board
  const x = Math.max(10, Math.round((boardWidth.value - defaultW) / 2));
  const y = Math.max(10, Math.round((boardHeight.value - defaultH) / 2));

  placedSignatures.value.push({
    id,
    pageIndex: currentPage.value,
    x,
    y,
    width: defaultW,
    height: defaultH,
    dataUrl
  });
}

function removeSignature(id) {
  placedSignatures.value = placedSignatures.value.filter(s => s.id !== id);
}

// ----------------- BATCH APPLY ENGINE -----------------
function openBatchModal(sig) {
  batchTargetSig.value = sig;
  if (totalPages.value > 1) {
    selectedBatchPreset.value = 'except_last';
  } else {
    selectedBatchPreset.value = 'all';
  }
  isBatchModalOpen.value = true;
}

function executeBatchApply() {
  if (!batchTargetSig.value) return;
  const targetPages = computedBatchTargetPages.value;
  if (!targetPages || targetPages.length === 0) return;

  const baseSig = batchTargetSig.value;

  for (const pageNum of targetPages) {
    if (pageNum === baseSig.pageIndex) {
      continue;
    }

    const existingIndex = placedSignatures.value.findIndex(
      s => s.pageIndex === pageNum && Math.abs(s.x - baseSig.x) < 5 && Math.abs(s.y - baseSig.y) < 5
    );

    if (existingIndex >= 0) {
      placedSignatures.value[existingIndex].dataUrl = baseSig.dataUrl;
      placedSignatures.value[existingIndex].width = baseSig.width;
      placedSignatures.value[existingIndex].height = baseSig.height;
    } else {
      placedSignatures.value.push({
        id: `sig_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        pageIndex: pageNum,
        x: baseSig.x,
        y: baseSig.y,
        width: baseSig.width,
        height: baseSig.height,
        dataUrl: baseSig.dataUrl
      });
    }
  }

  isBatchModalOpen.value = false;
  showToast(t('sign_batch_badge_applied', { count: targetPages.length }));
}

// Drag Signature
let draggingSig = null;
let dragStartX = 0;
let dragStartY = 0;
let sigInitialX = 0;
let sigInitialY = 0;

function startDragSig(sig, e) {
  draggingSig = sig;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  sigInitialX = sig.x;
  sigInitialY = sig.y;

  window.addEventListener('pointermove', onDragSigMove);
  window.addEventListener('pointerup', onDragSigEnd);
}

function onDragSigMove(e) {
  if (!draggingSig) return;
  const dx = e.clientX - dragStartX;
  const dy = e.clientY - dragStartY;

  const newX = Math.max(0, Math.min(boardWidth.value - draggingSig.width, sigInitialX + dx));
  const newY = Math.max(0, Math.min(boardHeight.value - draggingSig.height, sigInitialY + dy));

  draggingSig.x = Math.round(newX);
  draggingSig.y = Math.round(newY);
}

function onDragSigEnd() {
  draggingSig = null;
  window.removeEventListener('pointermove', onDragSigMove);
  window.removeEventListener('pointerup', onDragSigEnd);
}

// Resize Signature
let resizingSig = null;
let resizeStartX = 0;
let resizeStartY = 0;
let sigInitialW = 0;
let sigInitialH = 0;

function startResizeSig(sig, e) {
  resizingSig = sig;
  resizeStartX = e.clientX;
  resizeStartY = e.clientY;
  sigInitialW = sig.width;
  sigInitialH = sig.height;

  window.addEventListener('pointermove', onResizeSigMove);
  window.addEventListener('pointerup', onResizeSigEnd);
}

function onResizeSigMove(e) {
  if (!resizingSig) return;
  const dx = e.clientX - resizeStartX;
  const dy = e.clientY - resizeStartY;

  const newW = Math.max(50, Math.min(boardWidth.value - resizingSig.x, sigInitialW + dx));
  const newH = Math.max(20, Math.min(boardHeight.value - resizingSig.y, sigInitialH + dy));

  resizingSig.width = Math.round(newW);
  resizingSig.height = Math.round(newH);
}

function onResizeSigEnd() {
  resizingSig = null;
  window.removeEventListener('pointermove', onResizeSigMove);
  window.removeEventListener('pointerup', onResizeSigEnd);
}

// ----------------- FINAL PDF EXPORT ENGINE -----------------
async function executeSign() {
  if (!docBytes.value || placedSignatures.value.length === 0) return;
  isProcessing.value = true;

  try {
    const cleanDoc = await loadCleanPdfDocument(docBytes.value, unlockedPassword);
    const pages = cleanDoc.getPages();

    // Cache embedded PNGs so multi-page reused stamps are embedded only once
    const pngCache = new Map();

    // Group signatures by pageIndex
    for (const sig of placedSignatures.value) {
      const targetPageIndex = sig.pageIndex - 1;
      if (targetPageIndex < 0 || targetPageIndex >= pages.length) continue;
      const targetPage = pages[targetPageIndex];
      const { width: pdfPageWidth, height: pdfPageHeight } = targetPage.getSize();

      // Convert board coordinates to PDF point coordinates
      const scaleX = pdfPageWidth / boardWidth.value;
      const scaleY = pdfPageHeight / boardHeight.value;

      const pdfX = sig.x * scaleX;
      const pdfW = sig.width * scaleX;
      const pdfH = sig.height * scaleY;
      // In PDF, (0, 0) is bottom-left, so pdfY = pdfPageHeight - (domY + domH)
      const pdfY = pdfPageHeight - ((sig.y + sig.height) * scaleY);

      let embeddedPng = pngCache.get(sig.dataUrl);
      if (!embeddedPng) {
        // Convert dataUrl to binary PNG
        const base64Data = sig.dataUrl.split(',')[1];
        const binaryStr = atob(base64Data);
        const pngBytes = new Uint8Array(binaryStr.length);
        for (let k = 0; k < binaryStr.length; k++) {
          pngBytes[k] = binaryStr.charCodeAt(k);
        }
        embeddedPng = await cleanDoc.embedPng(pngBytes);
        pngCache.set(sig.dataUrl, embeddedPng);
      }

      targetPage.drawImage(embeddedPng, {
        x: pdfX,
        y: pdfY,
        width: pdfW,
        height: pdfH
      });
    }

    const outBytes = await cleanDoc.save({ useObjectStreams: true });
    let outName = (customOutputBaseName.value.trim() || `PDFSeal_Signed_${Date.now()}`);
    if (!outName.toLowerCase().endsWith('.pdf')) {
      outName += '.pdf';
    }

    triggerDownload(new Blob([outBytes], { type: 'application/pdf' }), outName);
    logger.info('SIGN', `PDF signed successfully with ${placedSignatures.value.length} signature(s): ${outName}`);

    lastExportedFile.value = {
      name: outName,
      arrayBuffer: outBytes.buffer ? outBytes.buffer.slice(outBytes.byteOffset, outBytes.byteOffset + outBytes.byteLength) : outBytes
    };
    showNextActions.value = true;

    // Auto-save to Vault if checked
    if (autoSaveToVault.value) {
      await saveFile({
        name: outName,
        arrayBuffer: outBytes,
        folderId: 'default',
        category: 'export',
        pageCount: pages.length
      });
      logger.info('VAULT', `Signed document auto-saved to Vault: ${outName}`);
    }
  } catch (err) {
    logger.error('SIGN', `Failed to stamp signatures onto PDF: ${err.message}`);
    alert('Failed to stamp signatures: ' + err.message);
  } finally {
    isProcessing.value = false;
  }
}

async function handlePasswordSubmit(pwd) {
  if (!pendingFileObj) return;
  isUnlocking.value = true;
  await loadFile(pendingFileObj, pwd);
  isUnlocking.value = false;
}

function handlePasswordCancel() {
  isPasswordOpen.value = false;
  passwordError.value = '';
  pendingFileObj = null;
  reset();
}

function reset() {
  docBytes.value = null;
  filename.value = '';
  totalPages.value = 0;
  currentPage.value = 1;
  unlockedPassword = '';
  customOutputBaseName.value = '';
  placedSignatures.value = [];
  rawStampDataUrl.value = '';
  uploadedStampDataUrl.value = '';
  isBatchModalOpen.value = false;
  batchTargetSig.value = null;
  clearDrawCanvas();
  showNextActions.value = false;
  lastExportedFile.value = null;
}

function checkIncomingFile() {
  const incoming = consumePendingFile('sign');
  if (incoming) {
    const file = new File([incoming.arrayBuffer], incoming.name, { type: 'application/pdf' });
    loadFile(file, incoming.password || '');
  }
}

function handleWindowResize() {
  if (docBytes.value && currentPdfPageObj) {
    renderCurrentPage();
  }
}

onMounted(() => {
  checkIncomingFile();
  refreshSavedStamps();
  window.addEventListener('resize', handleWindowResize);
});
onUnmounted(() => {
  window.removeEventListener('resize', handleWindowResize);
});
onActivated(checkIncomingFile);
</script>
