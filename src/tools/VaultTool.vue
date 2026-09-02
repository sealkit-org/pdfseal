<template>
  <section class="max-w-6xl mx-auto w-full flex-1 flex flex-col">
    <!-- Main Container (Compact Desktop Viewport Fitting) -->
    <div class="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-lg sm:shadow-xl border border-slate-100 flex flex-col flex-1">
      <!-- Unified Compact Header & Toolbar -->
      <div class="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
        <!-- Title & Subtitle Badge -->
        <div class="flex items-center space-x-2.5">
          <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0 shadow-2xs">
            <FolderLock class="w-4 h-4" />
          </div>
          <div>
            <h2 class="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
              {{ t('tab_vault') }}
            </h2>
            <p class="text-[11px] text-slate-400 font-medium hidden sm:block">
              {{ t('vault_offline_guarantee') }}
            </p>
          </div>
        </div>

        <!-- Center Search Input -->
        <div class="relative flex-1 min-w-[200px] max-w-sm">
          <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input 
            v-model="searchQuery" 
            type="text" 
            :placeholder="t('vault_search_placeholder')"
            class="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-hidden font-medium transition placeholder:text-slate-400"
          >
          <button 
            v-if="searchQuery" 
            @click="searchQuery = ''" 
            class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full cursor-pointer"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- Right Controls: View Toggle, Sort & Import -->
        <div class="flex items-center space-x-2">
          <!-- View Mode Toggle (Grid ⊞ vs List ☰) -->
          <div class="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
            <button 
              @click="setViewMode('grid')" 
              :class="[
                'p-1.5 rounded-lg transition cursor-pointer',
                viewMode === 'grid' ? 'bg-white text-blue-600 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'
              ]"
              :title="t('vault_view_grid')"
            >
              <LayoutGrid class="w-4 h-4" />
            </button>
            <button 
              @click="setViewMode('list')" 
              :class="[
                'p-1.5 rounded-lg transition cursor-pointer',
                viewMode === 'list' ? 'bg-white text-blue-600 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'
              ]"
              :title="t('vault_view_list')"
            >
              <List class="w-4 h-4" />
            </button>
          </div>

          <!-- Sort Dropdown -->
          <div class="relative">
            <select 
              v-model="sortBy" 
              class="appearance-none bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 pl-2.5 pr-6 py-2 focus:outline-hidden hover:bg-slate-100 transition cursor-pointer"
            >
              <option value="createdAt">{{ t('vault_sort_date') }}</option>
              <option value="size">{{ t('vault_sort_size') }}</option>
              <option value="name">{{ t('vault_sort_name') }}</option>
            </select>
            <ChevronDown class="w-3.5 h-3.5 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <!-- Sort Order Toggle -->
          <button 
            @click="sortOrder = sortOrder === 'desc' ? 'asc' : 'desc'" 
            class="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl transition cursor-pointer"
            :title="sortOrder === 'desc' ? 'Descending' : 'Ascending'"
          >
            <ArrowDownNarrowWide v-if="sortOrder === 'desc'" class="w-4 h-4" />
            <ArrowUpNarrowWide v-else class="w-4 h-4" />
          </button>

          <!-- Import File Button -->
          <label class="bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center space-x-1.5 shadow-md hover:shadow-blue-600/25 cursor-pointer">
            <Plus class="w-4 h-4" />
            <span>{{ t('vault_btn_import') }}</span>
            <input 
              type="file" 
              accept="application/pdf" 
              multiple 
              class="hidden" 
              @change="onFileImport" 
            >
          </label>
        </div>
      </div>

      <!-- Layout: Sidebar + File List -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-5 pt-3.5 flex-1">
        <!-- Left Folder Navigation -->
        <div class="md:col-span-1 border-r border-slate-100 pr-0 md:pr-4 flex flex-col justify-between">
          <div class="space-y-1">
            <div class="flex items-center justify-between mb-2 px-2">
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{{ t('vault_folders_title') }}</span>
              <button 
                @click="openNewFolderPrompt" 
                class="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center space-x-0.5 hover:underline cursor-pointer"
              >
                <Plus class="w-3 h-3" />
                <span>{{ t('vault_btn_new_folder') }}</span>
              </button>
            </div>

            <!-- Default Filter Categories -->
            <button 
              @click="activeFolderId = 'all'" 
              :class="[
                'w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer',
                activeFolderId === 'all' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
              ]"
            >
              <span class="flex items-center space-x-2">
                <Folder class="w-4 h-4" />
                <span>{{ t('vault_all_files') }}</span>
              </span>
              <span class="text-[10px] bg-white px-1.5 py-0.5 rounded-full border border-slate-200 text-slate-500 font-mono">
                {{ files.length }}
              </span>
            </button>

            <button 
              @click="activeFolderId = 'default'" 
              :class="[
                'w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer',
                activeFolderId === 'default' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
              ]"
            >
              <span class="flex items-center space-x-2">
                <Inbox class="w-4 h-4" />
                <span>{{ t('vault_default_folder') }}</span>
              </span>
              <span class="text-[10px] bg-white px-1.5 py-0.5 rounded-full border border-slate-200 text-slate-500 font-mono">
                {{ files.filter(f => f.folderId === 'default').length }}
              </span>
            </button>

            <button 
              @click="activeFolderId = 'export'" 
              :class="[
                'w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition cursor-pointer',
                activeFolderId === 'export' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
              ]"
            >
              <span class="flex items-center space-x-2">
                <FileCheck class="w-4 h-4 text-emerald-600" />
                <span>{{ t('vault_exports_folder') }}</span>
              </span>
              <span class="text-[10px] bg-white px-1.5 py-0.5 rounded-full border border-emerald-200 text-emerald-700 font-mono">
                {{ files.filter(f => f.category === 'export').length }}
              </span>
            </button>

            <!-- Custom User Folders -->
            <div v-if="folders.length > 0" class="pt-2 mt-2 border-t border-slate-100 space-y-1">
              <div 
                v-for="folder in folders" 
                :key="folder.id"
                class="group flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition cursor-pointer"
                :class="activeFolderId === folder.id ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'"
                @click="activeFolderId = folder.id"
              >
                <div class="flex items-center space-x-2 truncate">
                  <FolderOpen v-if="activeFolderId === folder.id" class="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <Folder v-else class="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span class="truncate">{{ folder.name }}</span>
                </div>
                
                <div class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition">
                  <button 
                    @click.stop="promptRenameFolder(folder)" 
                    class="p-1 hover:text-blue-600 rounded-md"
                    :title="t('vault_prompt_rename_folder')"
                  >
                    <Pencil class="w-3 h-3" />
                  </button>
                  <button 
                    @click.stop="confirmDeleteFolder(folder)" 
                    class="p-1 hover:text-rose-600 rounded-md"
                    :title="t('vault_confirm_delete_folder')"
                  >
                    <Trash2 class="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Storage Stats Card -->
          <div class="mt-3 pt-2 border-t border-slate-100">
            <div class="p-2.5 bg-slate-50 rounded-2xl border border-slate-200/60 text-xs">
              <div class="flex items-center justify-between text-slate-500 font-medium mb-1">
                <span>{{ t('vault_storage_label') }}</span>
                <span class="font-bold text-blue-600 font-mono">{{ storageStats.totalMb }} MB</span>
              </div>
              <div class="flex items-center text-[10px] text-slate-400 mb-1.5">
                <Lock class="w-3 h-3 text-emerald-600 mr-1 shrink-0" />
                <span class="truncate">{{ t('vault_offline_guarantee') }}</span>
              </div>
              <button 
                @click="confirmClearVault" 
                class="w-full text-center text-[11px] font-bold text-rose-500 hover:text-rose-700 py-0.5 hover:bg-rose-50 rounded-lg transition cursor-pointer"
              >
                {{ t('vault_btn_clear_all') }}
              </button>
            </div>
          </div>
        </div>

        <!-- Right File List Area -->
        <div class="md:col-span-3 flex flex-col justify-between">
          <!-- Empty State -->
          <div v-if="filteredFiles.length === 0" class="flex-1 flex flex-col items-center justify-center py-12 text-center">
            <div class="w-14 h-14 rounded-3xl bg-slate-50 border border-slate-200 flex items-center justify-center text-xl mb-2.5 shadow-2xs">
              🦭
            </div>
            <h4 class="text-sm font-bold text-slate-800 mb-1">
              {{ searchQuery ? t('vault_no_search_results') : t('vault_empty_title') }}
            </h4>
            <p class="text-xs text-slate-400 max-w-xs mb-3">
              {{ searchQuery ? t('vault_no_search_desc') : t('vault_empty_desc') }}
            </p>
            <label v-if="!searchQuery" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer shadow-md shadow-blue-600/20">
              <span>{{ t('vault_btn_import') }}</span>
              <input type="file" accept="application/pdf" multiple class="hidden" @change="onFileImport">
            </label>
          </div>

          <!-- Active File Presentation (Grid vs List) -->
          <div v-else class="flex-1 flex flex-col">
            <!-- 1. GRID VIEW -->
            <div v-if="viewMode === 'grid'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
              <div 
                v-for="file in paginatedFiles" 
                :key="file.id"
                class="p-2.5 sm:p-3 bg-slate-50/70 hover:bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:shadow-md transition flex flex-col justify-between group"
              >
                <!-- Card Header -->
                <div>
                  <div class="flex items-start justify-between mb-1.5">
                    <div class="relative">
                      <div class="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-bold text-[11px] shrink-0">
                        PDF
                      </div>
                      <span 
                        v-if="file.isEncrypted && unlockedSessionPasswords.has(file.id)" 
                        class="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-2xs"
                        :title="t('badge_unlocked')"
                      >
                        <Unlock class="w-2 h-2" />
                      </span>
                      <span 
                        v-else-if="file.isEncrypted" 
                        class="absolute -bottom-1 -right-1 bg-amber-500 text-white rounded-full p-0.5 shadow-2xs"
                        :title="t('badge_pwd_required')"
                      >
                        <Lock class="w-2 h-2" />
                      </span>
                    </div>

                    <div class="flex items-center space-x-0.5">
                      <button 
                        v-if="file.isEncrypted && !unlockedSessionPasswords.has(file.id)"
                        @click.stop="promptUnlock(file)"
                        class="p-1 text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition cursor-pointer"
                        :title="t('btn_unlock_pdf') || '输入密码解锁'"
                      >
                        <Key class="w-3.5 h-3.5" />
                      </button>
                      <button 
                        @click="previewFile(file)" 
                        class="p-1 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                        :title="t('vault_action_preview')"
                      >
                        <Eye class="w-3.5 h-3.5" />
                      </button>
                      <button 
                        @click="downloadVaultFile(file)" 
                        class="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                        :title="t('vault_action_download')"
                      >
                        <Download class="w-3.5 h-3.5" />
                      </button>
                      <button 
                        @click="confirmDeleteFile(file)" 
                        class="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                        :title="t('btn_delete')"
                      >
                        <Trash2 class="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <!-- File Title & Details -->
                  <div class="flex items-center space-x-1 mb-0.5">
                    <h4 
                      class="font-bold text-xs text-slate-900 truncate" 
                      :title="file.name"
                      v-html="highlightKeyword(file.name)"
                    ></h4>
                    <span 
                      v-if="file.isEncrypted && unlockedSessionPasswords.has(file.id)" 
                      class="inline-flex items-center px-1 py-0.2 text-[8px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded shrink-0 cursor-default"
                    >
                      <Unlock class="w-2 h-2 mr-0.5" />
                      {{ t('badge_unlocked') }}
                    </span>
                    <button 
                      v-else-if="file.isEncrypted" 
                      @click.stop="promptUnlock(file)"
                      class="inline-flex items-center px-1 py-0.2 text-[8px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 hover:border-amber-300 rounded shrink-0 cursor-pointer transition active:scale-95"
                      :title="t('btn_unlock_pdf') || '点击输入密码解锁'"
                    >
                      <Lock class="w-2 h-2 mr-0.5" />
                      {{ t('badge_pwd_required') }}
                    </button>
                  </div>

                  <div class="flex items-center space-x-2 text-[10px] text-slate-400 font-mono">
                    <span>{{ (file.size / 1024 / 1024).toFixed(2) }} MB</span>
                    <span>•</span>
                    <span>{{ formatDate(file.createdAt) }}</span>
                  </div>
                </div>

                <!-- Quick Dispatch / Send To Tool -->
                <div class="mt-2 pt-1.5 border-t border-slate-200/60 flex items-center justify-between">
                  <span class="text-[10px] text-slate-400 font-medium truncate max-w-[90px]">
                    {{ file.folderId === 'default' ? t('vault_default_folder') : getFolderName(file.folderId) }}
                  </span>

                  <!-- Send to Tool Trigger Menu -->
                  <div class="relative tool-dispatch-dropdown" @click.stop>
                    <button 
                      @click="activeToolMenuId = activeToolMenuId === file.id ? null : file.id"
                      class="bg-white hover:bg-blue-50 text-blue-600 border border-blue-200 text-[11px] font-bold px-2.5 py-0.5 rounded-lg transition flex items-center space-x-1 cursor-pointer shadow-2xs"
                    >
                      <span>🚀 {{ t('vault_action_send_to') }}</span>
                      <ChevronDown class="w-3 h-3" />
                    </button>

                    <!-- Tool Dispatch Menu -->
                    <div 
                      v-if="activeToolMenuId === file.id" 
                      class="absolute right-0 bottom-8 z-50 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 text-xs font-semibold text-slate-700 animate-in fade-in zoom-in-95 duration-150"
                    >
                      <button 
                        @click="sendToTool('organize', file)"
                        class="w-full text-left px-3 py-2 rounded-xl hover:bg-blue-50 hover:text-blue-700 transition flex items-center space-x-2 cursor-pointer"
                      >
                        <Layers class="w-4 h-4 text-indigo-600" />
                        <span>{{ t('tab_organize') }}</span>
                      </button>
                      <button 
                        @click="sendToTool('split', file)"
                        class="w-full text-left px-3 py-2 rounded-xl hover:bg-blue-50 hover:text-blue-700 transition flex items-center space-x-2 cursor-pointer"
                      >
                        <Scissors class="w-4 h-4 text-emerald-600" />
                        <span>{{ t('tab_split') }}</span>
                      </button>
                      <button 
                        @click="sendToTool('watermark', file)"
                        class="w-full text-left px-3 py-2 rounded-xl hover:bg-blue-50 hover:text-blue-700 transition flex items-center space-x-2 cursor-pointer"
                      >
                        <Stamp class="w-4 h-4 text-amber-600" />
                        <span>{{ t('tab_watermark') }}</span>
                      </button>
                      <button 
                        @click="sendToTool('sanitize', file)"
                        class="w-full text-left px-3 py-2 rounded-xl hover:bg-blue-50 hover:text-blue-700 transition flex items-center space-x-2 cursor-pointer"
                      >
                        <ShieldCheck class="w-4 h-4 text-cyan-600" />
                        <span>{{ t('tab_sanitize') }}</span>
                      </button>
                      <button 
                        @click="sendToTool('merge', file)"
                        class="w-full text-left px-3 py-2 rounded-xl hover:bg-blue-50 hover:text-blue-700 transition flex items-center space-x-2 cursor-pointer"
                      >
                        <Files class="w-4 h-4 text-blue-600" />
                        <span>{{ t('tab_merge') }}</span>
                      </button>

                      <button 
                        @click="openSendModalForFile(file)"
                        class="w-full text-left px-3 py-2 rounded-xl hover:bg-blue-50 hover:text-blue-700 transition flex items-center space-x-2 cursor-pointer font-bold text-blue-600 border-t border-slate-100 mt-1 pt-2"
                      >
                        <Send class="w-4 h-4 text-blue-600" />
                        <span>{{ t('vault_action_send_e2ee') || '🚀 加密外发 / 阅后即焚' }}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 2. LIST VIEW (Desktop High-Density Table) -->
            <div v-else class="border border-slate-200/80 rounded-2xl bg-white shadow-2xs relative">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold">
                    <th class="py-2 px-3.5 rounded-tl-2xl">{{ t('dup_field_name') }}</th>
                    <th class="py-2 px-3 hidden sm:table-cell">{{ t('dup_field_folder') }}</th>
                    <th class="py-2 px-3 hidden md:table-cell">{{ t('dup_field_size') }}</th>
                    <th class="py-2 px-3 hidden lg:table-cell">{{ t('vault_sort_date') }}</th>
                    <th class="py-2 px-3 text-right rounded-tr-2xl">{{ t('vault_action_send_to') }} / {{ t('btn_delete') }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr 
                    v-for="(file, fileIndex) in paginatedFiles" 
                    :key="file.id"
                    class="hover:bg-slate-50/80 transition group"
                  >
                    <!-- Name Column: Only this column auto-adapts with max-w-0 w-full -->
                    <td class="py-1.5 sm:py-2 px-3.5 max-w-0 w-full">
                      <div class="flex items-center space-x-2.5">
                        <div class="relative shrink-0">
                          <div class="w-6 h-6 rounded-md bg-red-50 text-red-600 flex items-center justify-center font-bold text-[9px] border border-red-100">
                            PDF
                          </div>
                          <span 
                            v-if="file.isEncrypted && unlockedSessionPasswords.has(file.id)" 
                            class="absolute -bottom-0.5 -right-0.5 bg-emerald-500 text-white rounded-full p-0.5 shadow-2xs"
                            :title="t('badge_unlocked')"
                          >
                            <Unlock class="w-2 h-2" />
                          </span>
                          <span 
                            v-else-if="file.isEncrypted" 
                            class="absolute -bottom-0.5 -right-0.5 bg-amber-500 text-white rounded-full p-0.5 shadow-2xs"
                            :title="t('badge_pwd_required')"
                          >
                            <Lock class="w-2 h-2" />
                          </span>
                        </div>
                        <div class="flex items-center space-x-1.5 min-w-0 overflow-hidden">
                          <span 
                            class="font-semibold text-slate-800 hover:text-blue-600 cursor-pointer truncate" 
                            :title="file.name"
                            @click="previewFile(file)"
                            v-html="highlightKeyword(file.name)"
                          ></span>
                          <span 
                            v-if="file.isEncrypted && unlockedSessionPasswords.has(file.id)" 
                            class="inline-flex items-center px-1.5 py-0.2 text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md shrink-0 cursor-default"
                            :title="t('badge_unlocked')"
                          >
                            <Unlock class="w-2.5 h-2.5 mr-0.5" />
                            {{ t('badge_unlocked') }}
                          </span>
                          <button 
                            v-else-if="file.isEncrypted" 
                            @click.stop="promptUnlock(file)"
                            class="inline-flex items-center px-1.5 py-0.2 text-[9px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 hover:border-amber-300 rounded-md shrink-0 cursor-pointer transition active:scale-95"
                            :title="t('btn_unlock_pdf') || '点击输入密码解锁'"
                          >
                            <Lock class="w-2.5 h-2.5 mr-0.5" />
                            {{ t('badge_pwd_required') }}
                          </button>
                        </div>
                      </div>
                    </td>

                    <!-- Folder Column -->
                    <td class="py-1.5 sm:py-2 px-3 hidden sm:table-cell text-slate-500 font-medium whitespace-nowrap">
                      <span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px]">
                        {{ file.folderId === 'default' ? t('vault_default_folder') : getFolderName(file.folderId) }}
                      </span>
                    </td>

                    <!-- Size Column -->
                    <td class="py-1.5 sm:py-2 px-3 hidden md:table-cell font-mono text-slate-500 whitespace-nowrap">
                      {{ (file.size / 1024 / 1024).toFixed(2) }} MB
                    </td>

                    <!-- Date Column -->
                    <td class="py-1.5 sm:py-2 px-3 hidden lg:table-cell text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {{ formatDate(file.createdAt) }}
                    </td>

                    <!-- Actions Column -->
                    <td class="py-1.5 sm:py-2 px-3 text-right whitespace-nowrap">
                        <div class="inline-flex items-center space-x-1">
                          <button 
                            v-if="file.isEncrypted && !unlockedSessionPasswords.has(file.id)"
                            @click.stop="promptUnlock(file)" 
                            class="p-1.5 text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-lg transition cursor-pointer"
                            :title="t('btn_unlock_pdf') || '输入密码解锁'"
                          >
                            <Key class="w-3.5 h-3.5" />
                          </button>
                          <button 
                            @click="previewFile(file)" 
                            class="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                            :title="t('vault_action_preview')"
                          >
                            <Eye class="w-3.5 h-3.5" />
                          </button>
                          <button 
                            @click="downloadVaultFile(file)" 
                            class="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                            :title="t('vault_action_download')"
                          >
                            <Download class="w-3.5 h-3.5" />
                          </button>

                          <!-- Send To Dropdown -->
                          <div class="relative inline-block tool-dispatch-dropdown" @click.stop>
                            <button 
                              @click="activeToolMenuId = activeToolMenuId === file.id ? null : file.id"
                              class="bg-white hover:bg-blue-50 text-blue-600 border border-blue-200 text-[11px] font-bold px-2 py-1 rounded-lg transition flex items-center space-x-1 cursor-pointer shadow-2xs"
                            >
                              <span>🚀</span>
                              <ChevronDown class="w-3 h-3" />
                            </button>
                            <!-- Tool Dispatch Menu -->
                            <div 
                              v-if="activeToolMenuId === file.id" 
                              :class="[
                                'absolute right-0 z-50 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 text-xs font-semibold text-slate-700 animate-in fade-in zoom-in-95 duration-150 text-left',
                                fileIndex >= Math.max(1, paginatedFiles.length - 2) ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                              ]"
                            >
                              <button 
                                @click="sendToTool('organize', file)"
                                class="w-full text-left px-3 py-2 rounded-xl hover:bg-blue-50 hover:text-blue-700 transition flex items-center space-x-2 cursor-pointer"
                              >
                                <Layers class="w-4 h-4 text-indigo-600" />
                                <span>{{ t('tab_organize') }}</span>
                              </button>
                              <button 
                                @click="sendToTool('split', file)"
                                class="w-full text-left px-3 py-2 rounded-xl hover:bg-blue-50 hover:text-blue-700 transition flex items-center space-x-2 cursor-pointer"
                              >
                                <Scissors class="w-4 h-4 text-emerald-600" />
                                <span>{{ t('tab_split') }}</span>
                              </button>
                              <button 
                                @click="sendToTool('watermark', file)"
                                class="w-full text-left px-3 py-2 rounded-xl hover:bg-blue-50 hover:text-blue-700 transition flex items-center space-x-2 cursor-pointer"
                              >
                                <Stamp class="w-4 h-4 text-amber-600" />
                                <span>{{ t('tab_watermark') }}</span>
                              </button>
                              <button 
                                @click="sendToTool('sanitize', file)"
                                class="w-full text-left px-3 py-2 rounded-xl hover:bg-blue-50 hover:text-blue-700 transition flex items-center space-x-2 cursor-pointer"
                              >
                                <ShieldCheck class="w-4 h-4 text-cyan-600" />
                                <span>{{ t('tab_sanitize') }}</span>
                              </button>
                              <button 
                                @click="sendToTool('merge', file)"
                                class="w-full text-left px-3 py-2 rounded-xl hover:bg-blue-50 hover:text-blue-700 transition flex items-center space-x-2 cursor-pointer"
                              >
                                <Files class="w-4 h-4 text-blue-600" />
                                <span>{{ t('tab_merge') }}</span>
                              </button>

                              <button 
                                @click="openSendModalForFile(file)"
                                class="w-full text-left px-3 py-2 rounded-xl hover:bg-blue-50 hover:text-blue-700 transition flex items-center space-x-2 cursor-pointer font-bold text-blue-600 border-t border-slate-100 mt-1 pt-2"
                              >
                                <Send class="w-4 h-4 text-blue-600" />
                                <span>{{ t('vault_action_send_e2ee') || '🚀 加密外发 / 阅后即焚' }}</span>
                              </button>
                            </div>
                          </div>

                          <button 
                            @click="confirmDeleteFile(file)" 
                            class="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                            :title="t('btn_delete')"
                          >
                            <Trash2 class="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
            </div>

            <!-- Dynamic Pagination Bar (Compact Spacing) -->
            <div 
              v-if="filteredFiles.length > pageSize" 
              class="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"
            >
              <span>
                {{ t('page_showing') }} 
                <strong class="text-slate-800">{{ (currentPage - 1) * pageSize + 1 }}</strong> - 
                <strong class="text-slate-800">{{ Math.min(currentPage * pageSize, filteredFiles.length) }}</strong> 
                {{ t('page_of') }} 
                <strong class="text-slate-800">{{ filteredFiles.length }}</strong> 
                {{ t('page_items') }}
              </span>

              <div class="flex items-center space-x-1.5">
                <button 
                  @click="currentPage--" 
                  :disabled="currentPage === 1"
                  class="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium cursor-pointer shadow-2xs"
                >
                  {{ t('vault_page_prev') }}
                </button>
                <span class="px-3 py-1 font-mono font-bold text-slate-700 bg-slate-100 rounded-lg">
                  {{ currentPage }} / {{ totalPages }}
                </span>
                <button 
                  @click="currentPage++" 
                  :disabled="currentPage >= totalPages"
                  class="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium cursor-pointer shadow-2xs"
                >
                  {{ t('vault_page_next') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Duplicate Warning Modal -->
    <DuplicateModal 
      :is-open="isDuplicateModalOpen"
      :existing-file="duplicateTargetFile"
      :folder-name="duplicateTargetFile ? getFolderName(duplicateTargetFile.folderId) : ''"
      @locate-existing="handleLocateExisting"
      @save-copy="handleSaveCopy"
      @cancel="isDuplicateModalOpen = false"
    />

    <!-- PDF Quick Preview Modal -->
    <VaultPreviewModal 
      :is-open="isPreviewOpen"
      :file="previewTargetFile"
      :password="previewPassword"
      @close="isPreviewOpen = false"
      @download="downloadVaultFile"
    />

    <!-- Password Unlock Modal for Encrypted Preview -->
    <PasswordModal 
      :is-open="isPasswordOpen"
      :filename="pendingEncryptedFile ? pendingEncryptedFile.name : ''"
      :error-message="passwordError"
      :is-unlocking="isUnlocking"
      @submit="handlePasswordSubmit"
      @cancel="handlePasswordCancel"
    />

    <!-- Seal Send E2EE Sharing Modal -->
    <SealSendModal 
      :is-open="isSendModalOpen"
      :file-data="sendTargetFile"
      @close="isSendModalOpen = false"
    />
  </section>
</template>

<script setup>
import { ref, computed, watch, onMounted, onActivated, onUnmounted } from 'vue';
import { 
  FolderLock, Search, Plus, Folder, FolderOpen, Inbox, FileCheck, 
  ChevronDown, ArrowDownNarrowWide, ArrowUpNarrowWide, Eye, Download, 
  Trash2, Pencil, Lock, Unlock, Key, X, Layers, Scissors, Stamp, ShieldCheck, Files,
  LayoutGrid, List, Send
} from 'lucide-vue-next';
import { t } from '../i18n';
import { triggerDownload } from '../utils/download';
import { verifyPdfSecurity } from '../utils/pdfSecurity';
import { dispatchToTool } from '../utils/toolBridge';
import { 
  getFiles, saveFile, deleteFile, clearVault, 
  getFolders, createFolder, renameFolder, deleteFolder, 
  getVaultStorageStats, checkDuplicateHash, computeSha256,
  updateFileEncryption
} from '../utils/vaultDb';
import DuplicateModal from '../components/DuplicateModal.vue';
import VaultPreviewModal from '../components/VaultPreviewModal.vue';
import PasswordModal from '../components/PasswordModal.vue';
import SealSendModal from '../components/SealSendModal.vue';

import { userSettings } from '../utils/userSettings';

const emit = defineEmits(['send-to-tool']);

// State
const files = ref([]);
const folders = ref([]);
const activeFolderId = ref('all');
const searchQuery = ref('');
const sortBy = ref('createdAt');
const sortOrder = ref('desc');
const storageStats = ref({ totalMb: '0.00', fileCount: 0 });

const activeToolMenuId = ref(null);

// Session memory for unlocked encrypted files (fileId -> password)
const unlockedSessionPasswords = ref(new Map());

// View Mode (Grid vs List) synced with global userSettings
const viewMode = ref(userSettings.defaultVaultView || 'grid');

function setViewMode(mode) {
  viewMode.value = mode;
  userSettings.defaultVaultView = mode;
}

// Adaptive Page Size: 9 for Grid (clean 3x3 layout), 10 for List (standard 10-row table)
const pageSize = computed(() => (viewMode.value === 'grid' ? 9 : 10));
const currentPage = ref(1);

// Duplicate modal state
const isDuplicateModalOpen = ref(false);
const duplicateTargetFile = ref(null);
let pendingImportBuffer = null;
let pendingImportName = '';

// Preview Modal state
const isPreviewOpen = ref(false);
const previewTargetFile = ref(null);
const previewPassword = ref('');

// Password Unlock State for Encrypted Files Preview
const isPasswordOpen = ref(false);
const passwordError = ref('');
const isUnlocking = ref(false);
let pendingEncryptedFile = null;

// Seal Send E2EE Sharing Modal State
const isSendModalOpen = ref(false);
const sendTargetFile = ref(null);

async function openSendModalForFile(file) {
  activeToolMenuId.value = null;
  let arrayBuffer = file.arrayBuffer;
  if (!arrayBuffer && file.blob) {
    try {
      arrayBuffer = await file.blob.arrayBuffer();
    } catch (e) {}
  }
  sendTargetFile.value = {
    name: file.name,
    arrayBuffer,
    size: file.size,
    pageCount: file.pageCount || 1
  };
  isSendModalOpen.value = true;
}

function closeToolMenuOnClickOutside(e) {
  if (activeToolMenuId.value && !e.target.closest('.tool-dispatch-dropdown')) {
    activeToolMenuId.value = null;
  }
}

onMounted(async () => {
  window.addEventListener('click', closeToolMenuOnClickOutside);
  await refreshVault();
});

onUnmounted(() => {
  window.removeEventListener('click', closeToolMenuOnClickOutside);
});

onActivated(async () => {
  await refreshVault();
});

async function refreshVault() {
  const loadedFiles = await getFiles({ folderId: 'all' });
  files.value = loadedFiles;
  folders.value = await getFolders();
  storageStats.value = await getVaultStorageStats();

  // Background Self-Healing Encryption Scanner for Legacy or Unverified Files
  scanAndHealEncryption(loadedFiles);
}

// Background Self-Healing Encryption Scanner
async function scanAndHealEncryption(fileList) {
  for (const file of fileList) {
    if (!file.blob) continue;
    // Check files that are unverified or not yet flagged as encrypted
    if (file.isEncrypted === undefined || !file.isEncrypted) {
      try {
        const buffer = await file.blob.arrayBuffer();
        const sec = await verifyPdfSecurity(buffer, '');
        if (sec.isEncrypted) {
          file.isEncrypted = true;
          await updateFileEncryption(file.id, true);
        } else if (file.isEncrypted === undefined) {
          file.isEncrypted = false;
          await updateFileEncryption(file.id, false);
        }
      } catch (e) {}
    }
  }
}

const filteredFiles = computed(() => {
  let list = files.value;

  // Filter folder
  if (activeFolderId.value !== 'all') {
    if (activeFolderId.value === 'export') {
      list = list.filter(f => f.category === 'export');
    } else {
      list = list.filter(f => f.folderId === activeFolderId.value);
    }
  }

  // Filter search query
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter(f => f.name.toLowerCase().includes(q));
  }

  // Sorting
  return [...list].sort((a, b) => {
    let valA = a[sortBy.value];
    let valB = b[sortBy.value];
    if (typeof valA === 'string') {
      return sortOrder.value === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return sortOrder.value === 'asc' ? valA - valB : valB - valA;
  });
});

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(filteredFiles.value.length / pageSize.value));
});

const paginatedFiles = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredFiles.value.slice(start, start + pageSize.value);
});

// Reset pagination to page 1 on filter or search changes
watch([activeFolderId, searchQuery, sortBy, sortOrder], () => {
  currentPage.value = 1;
});

// Ensure currentPage remains within valid bounds when switching viewMode
watch(viewMode, () => {
  if (currentPage.value > totalPages.value) {
    currentPage.value = totalPages.value;
  }
});

function getFolderName(folderId) {
  if (folderId === 'default') return t('vault_default_folder');
  const found = folders.value.find(f => f.id === folderId);
  return found ? found.name : t('vault_default_folder');
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function highlightKeyword(filename) {
  if (!searchQuery.value.trim()) return filename;
  const q = searchQuery.value.trim();
  const reg = new RegExp(`(${q})`, 'gi');
  return filename.replace(reg, '<mark class="bg-amber-200 text-amber-900 rounded-sm px-0.5">$1</mark>');
}

// File Import & Hash Duplicate Check & Encryption Detection
async function onFileImport(e) {
  const selectedFiles = e.target.files;
  if (!selectedFiles || selectedFiles.length === 0) return;

  for (const file of selectedFiles) {
    const buffer = await file.arrayBuffer();
    const hash = await computeSha256(buffer);
    const existing = await checkDuplicateHash(hash);

    if (existing) {
      // Trigger duplicate prompt
      duplicateTargetFile.value = existing;
      pendingImportBuffer = buffer;
      pendingImportName = file.name;
      isDuplicateModalOpen.value = true;
      e.target.value = '';
      return;
    }

    // Detect encryption silently
    const security = await verifyPdfSecurity(buffer, '');
    const isEncrypted = Boolean(security.isEncrypted);

    // Save directly with encryption flag
    await saveFile({
      name: file.name,
      arrayBuffer: buffer,
      folderId: activeFolderId.value === 'all' || activeFolderId.value === 'export' ? 'default' : activeFolderId.value,
      category: 'upload',
      hash,
      isEncrypted
    });
  }

  e.target.value = '';
  await refreshVault();
}

function handleLocateExisting(file) {
  isDuplicateModalOpen.value = false;
  activeFolderId.value = file.folderId || 'default';
  searchQuery.value = file.name;
}

async function handleSaveCopy() {
  if (pendingImportBuffer && pendingImportName) {
    const security = await verifyPdfSecurity(pendingImportBuffer, '');
    await saveFile({
      name: pendingImportName,
      arrayBuffer: pendingImportBuffer,
      folderId: activeFolderId.value === 'all' || activeFolderId.value === 'export' ? 'default' : activeFolderId.value,
      category: 'upload',
      isEncrypted: Boolean(security.isEncrypted)
    });
    pendingImportBuffer = null;
    pendingImportName = '';
    isDuplicateModalOpen.value = false;
    await refreshVault();
  }
}

// Actions
let unlockContext = 'preview'; // 'preview' | 'direct'

function promptUnlock(file) {
  if (!file.isEncrypted) return;
  if (unlockedSessionPasswords.value.has(file.id)) return;

  unlockContext = 'direct';
  pendingEncryptedFile = file;
  passwordError.value = '';
  isPasswordOpen.value = true;
}

async function previewFile(file) {
  if (file.isEncrypted) {
    unlockContext = 'preview';
    // 1. If already unlocked in this session, open directly
    if (unlockedSessionPasswords.value.has(file.id)) {
      previewTargetFile.value = file;
      previewPassword.value = unlockedSessionPasswords.value.get(file.id);
      isPreviewOpen.value = true;
      return;
    }

    // 2. Smart Probe: Check if it actually requires an open password to read
    try {
      const arrayBuffer = await file.blob.arrayBuffer();
      const security = await verifyPdfSecurity(arrayBuffer, '');
      if (security.isOpenPasswordRequired) {
        pendingEncryptedFile = file;
        passwordError.value = '';
        isPasswordOpen.value = true;
        return;
      }
    } catch (err) {
      pendingEncryptedFile = file;
      passwordError.value = '';
      isPasswordOpen.value = true;
      return;
    }
  }

  // Open directly for unencrypted or owner-restricted readable files
  previewTargetFile.value = file;
  previewPassword.value = '';
  isPreviewOpen.value = true;
}

async function handlePasswordSubmit(pwd) {
  if (!pendingEncryptedFile) return;
  isUnlocking.value = true;
  try {
    const arrayBuffer = await pendingEncryptedFile.blob.arrayBuffer();
    const security = await verifyPdfSecurity(arrayBuffer, pwd);
    if (!security.isValid) {
      passwordError.value = t('pwd_error_wrong');
      return;
    }
    // Remember password in session cache
    unlockedSessionPasswords.value.set(pendingEncryptedFile.id, pwd);

    isPasswordOpen.value = false;
    passwordError.value = '';

    if (unlockContext === 'preview') {
      previewTargetFile.value = pendingEncryptedFile;
      previewPassword.value = pwd;
      isPreviewOpen.value = true;
    }
  } catch (err) {
    passwordError.value = err.message;
  } finally {
    isUnlocking.value = false;
  }
}

function handlePasswordCancel() {
  isPasswordOpen.value = false;
  passwordError.value = '';
  pendingEncryptedFile = null;
}

function downloadVaultFile(file) {
  if (!file || !file.blob) return;
  triggerDownload(file.blob, file.name);
}

async function confirmDeleteFile(file) {
  if (confirm(t('vault_confirm_delete_file') || 'Are you sure you want to delete this file?')) {
    await deleteFile(file.id);
    await refreshVault();
  }
}

async function confirmClearVault() {
  if (confirm(t('vault_confirm_clear_all') || 'Are you sure you want to clear all files in the vault?')) {
    await clearVault();
    await refreshVault();
  }
}

// Folder Actions
async function openNewFolderPrompt() {
  const name = prompt(t('vault_prompt_folder_name') || 'Enter folder name:');
  if (name && name.trim()) {
    const created = await createFolder(name.trim());
    await refreshVault();
    activeFolderId.value = created.id;
  }
}

async function promptRenameFolder(folder) {
  const newName = prompt(t('vault_prompt_rename_folder') || 'Rename folder:', folder.name);
  if (newName && newName.trim() && newName !== folder.name) {
    await renameFolder(folder.id, newName.trim());
    await refreshVault();
  }
}

async function confirmDeleteFolder(folder) {
  if (confirm(t('vault_confirm_delete_folder') || 'Delete this folder? Files will be moved to Default.')) {
    await deleteFolder(folder.id);
    activeFolderId.value = 'all';
    await refreshVault();
  }
}

// Tool Pipeline Bridge
async function sendToTool(toolId, file) {
  activeToolMenuId.value = null;
  const arrayBuffer = await file.blob.arrayBuffer();
  const sessionPassword = unlockedSessionPasswords.value.get(file.id) || '';
  dispatchToTool(toolId, {
    name: file.name,
    arrayBuffer,
    size: file.size,
    password: sessionPassword
  });
  emit('send-to-tool', toolId);
}
</script>
