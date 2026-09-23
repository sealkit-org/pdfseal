<template>
  <div class="w-full max-w-7xl mx-auto space-y-6 sm:space-y-8 py-2 sm:py-4 animate-in fade-in duration-200 select-none">
    
    <!-- 1. Hero Banner Section -->
    <section class="text-center max-w-5xl mx-auto pt-1 sm:pt-3 pb-2 sm:pb-3 px-2">
      <!-- Trust Guarantee Pill -->
      <div class="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-300/80 text-emerald-800 text-xs font-bold mb-3 sm:mb-4 shadow-2xs">
        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
        <span class="tracking-tight">{{ t('home_pill_guarantee') }}</span>
      </div>

      <!-- Main Headline -->
      <h1 class="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight whitespace-normal md:whitespace-nowrap">
        {{ t('home_hero_title') }}
      </h1>

      <!-- Subtitle -->
      <p class="text-xs sm:text-sm text-slate-600 font-medium mt-2.5 max-w-5xl mx-auto leading-relaxed text-balance lg:whitespace-nowrap">
        {{ t('home_hero_subtitle') }}
      </p>

      <!-- 3 Key Value Props -->
      <div class="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-4 text-[11px] sm:text-xs font-bold text-slate-700">
        <div class="flex items-center space-x-1.5 bg-white/80 border border-slate-200/80 px-2.5 py-1 rounded-xl shadow-2xs">
          <ShieldCheck class="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>{{ t('home_benefit_zero_leak') }}</span>
        </div>
        <div class="flex items-center space-x-1.5 bg-white/80 border border-slate-200/80 px-2.5 py-1 rounded-xl shadow-2xs">
          <Zap class="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{{ t('home_benefit_offline') }}</span>
        </div>
        <div class="flex items-center space-x-1.5 bg-white/80 border border-slate-200/80 px-2.5 py-1 rounded-xl shadow-2xs">
          <CheckCircle2 class="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>{{ t('home_benefit_free') }}</span>
        </div>
      </div>
    </section>

    <!-- 2. Category 1: Popular Essentials (🔥 高频常用工具) -->
    <section>
      <div class="flex items-center justify-between mb-3 border-b border-slate-200/90 pb-2.5 px-1">
        <div class="flex items-baseline space-x-2">
          <h2 class="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-1.5">
            <span>🔥 {{ t('home_cat_essential') }}</span>
          </h2>
          <span class="text-xs text-slate-500 hidden sm:inline">{{ t('home_cat_essential_desc') }}</span>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        <div 
          v-for="tool in essentialTools" 
          :key="tool.id"
          @click="openTool(tool)"
          :class="[
            'p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group flex flex-col justify-between',
            tool.hoverBorder
          ]"
        >
          <div>
            <!-- Header: Icon + Title + Badge -->
            <div class="flex items-center justify-between gap-2 mb-2.5">
              <div class="flex items-center space-x-2.5 min-w-0">
                <div 
                  :class="[
                    'w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shadow-2xs shrink-0',
                    tool.bgIcon
                  ]"
                >
                  <component :is="tool.icon" class="w-5 h-5 shrink-0" :class="tool.iconColor" />
                </div>
                <h3 class="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                  {{ t(tool.titleKey) }}
                </h3>
              </div>
              <span 
                v-if="tool.badgeKey || tool.badgeText"
                :class="[
                  'text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs shrink-0 whitespace-nowrap',
                  tool.badgeStyle
                ]"
              >
                {{ tool.badgeKey ? t(tool.badgeKey) : tool.badgeText }}
              </span>
            </div>

            <!-- Description -->
            <p class="text-xs text-slate-500 leading-relaxed line-clamp-2">
              {{ t(tool.descKey) }}
            </p>

            <!-- Feature Tags -->
            <div class="flex flex-wrap items-center gap-1.5 mt-2.5">
              <span 
                v-for="tag in tool.tags" 
                :key="tag" 
                class="text-[10px] font-medium bg-slate-50 group-hover:bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200/60 transition-colors"
              >
                {{ t(tag) }}
              </span>
            </div>
          </div>

          <!-- Bottom Action -->
          <div class="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold" :class="tool.actionColor">
            <span>{{ t('home_action_use') }}</span>
            <ArrowRight class="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-200" />
          </div>
        </div>
      </div>
    </section>

    <!-- 3. Category 2: Privacy & Security Suite (🛡️ 隐私脱敏与机密防护) -->
    <section>
      <div class="flex items-center justify-between mb-3 border-b border-slate-200/90 pb-2.5 px-1">
        <div class="flex items-baseline space-x-2">
          <h2 class="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-1.5">
            <span>🛡️ {{ t('home_cat_security') }}</span>
          </h2>
          <span class="text-xs text-slate-500 hidden sm:inline">{{ t('home_cat_security_desc') }}</span>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div 
          v-for="tool in securityTools" 
          :key="tool.id"
          @click="openTool(tool)"
          :class="[
            'p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group flex flex-col justify-between',
            tool.hoverBorder
          ]"
        >
          <div>
            <!-- Header: Icon + Title + Badge -->
            <div class="flex items-center justify-between gap-2 mb-2.5">
              <div class="flex items-center space-x-2.5 min-w-0">
                <div 
                  :class="[
                    'w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shadow-2xs shrink-0',
                    tool.bgIcon
                  ]"
                >
                  <component :is="tool.icon" class="w-4 h-4 sm:w-5 sm:h-5 shrink-0" :class="tool.iconColor" />
                </div>
                <h3 class="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                  {{ t(tool.titleKey) }}
                </h3>
              </div>
              <span 
                v-if="tool.badgeKey || tool.badgeText"
                :class="[
                  'text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs shrink-0 whitespace-nowrap',
                  tool.badgeStyle
                ]"
              >
                {{ tool.badgeKey ? t(tool.badgeKey) : tool.badgeText }}
              </span>
            </div>

            <!-- Description -->
            <p class="text-xs text-slate-500 leading-relaxed line-clamp-2">
              {{ t(tool.descKey) }}
            </p>

            <!-- Feature Tags -->
            <div class="flex flex-wrap items-center gap-1.5 mt-2.5">
              <span 
                v-for="tag in tool.tags" 
                :key="tag" 
                class="text-[10px] font-medium bg-slate-50 group-hover:bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200/60 transition-colors"
              >
                {{ t(tag) }}
              </span>
            </div>
          </div>

          <!-- Bottom Action -->
          <div class="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold" :class="tool.actionColor">
            <span>{{ t('home_action_use') }}</span>
            <ArrowRight class="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-200" />
          </div>
        </div>
      </div>
    </section>

    <!-- 4. Category 3: Format Conversion & Automation (⚡ 格式转换与排版流水线) -->
    <section>
      <div class="flex items-center justify-between mb-3 border-b border-slate-200/90 pb-2.5 px-1">
        <div class="flex items-baseline space-x-2">
          <h2 class="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-1.5">
            <span>⚡ {{ t('home_cat_transform') }}</span>
          </h2>
          <span class="text-xs text-slate-500 hidden sm:inline">{{ t('home_cat_transform_desc') }}</span>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div 
          v-for="tool in transformTools" 
          :key="tool.id"
          @click="openTool(tool)"
          :class="[
            'p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group flex flex-col justify-between',
            tool.hoverBorder
          ]"
        >
          <div>
            <!-- Header: Icon + Title + Badge -->
            <div class="flex items-center justify-between gap-2 mb-2.5">
              <div class="flex items-center space-x-2.5 min-w-0">
                <div 
                  :class="[
                    'w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shadow-2xs shrink-0',
                    tool.bgIcon
                  ]"
                >
                  <component :is="tool.icon" class="w-4 h-4 sm:w-5 sm:h-5 shrink-0" :class="tool.iconColor" />
                </div>
                <h3 class="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                  {{ t(tool.titleKey) }}
                </h3>
              </div>
              <span 
                v-if="tool.badgeKey || tool.badgeText"
                :class="[
                  'text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs shrink-0 whitespace-nowrap',
                  tool.badgeStyle
                ]"
              >
                {{ tool.badgeKey ? t(tool.badgeKey) : tool.badgeText }}
              </span>
            </div>

            <!-- Description -->
            <p class="text-xs text-slate-500 leading-relaxed line-clamp-2">
              {{ t(tool.descKey) }}
            </p>

            <!-- Feature Tags -->
            <div class="flex flex-wrap items-center gap-1.5 mt-2.5">
              <span 
                v-for="tag in tool.tags" 
                :key="tag" 
                class="text-[10px] font-medium bg-slate-50 group-hover:bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200/60 transition-colors"
              >
                {{ t(tag) }}
              </span>
            </div>
          </div>

          <!-- Bottom Action -->
          <div class="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold" :class="tool.actionColor">
            <span>{{ t('home_action_use') }}</span>
            <ArrowRight class="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-200" />
          </div>
        </div>
      </div>
    </section>

    <!-- 5. Bonus Highlight: Encrypted Local Storage Vault -->
    <section class="mt-2 pt-2">
      <div 
        @click="router.push('/vault')"
        class="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50/70 via-slate-50 to-indigo-50/60 border border-blue-200/70 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
      >
        <div class="flex items-center space-x-3.5">
          <div class="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
            <FolderLock class="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 class="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-blue-700 transition-colors">
              {{ t('home_vault_title') }}
            </h3>
            <p class="text-xs text-slate-500 mt-0.5">
              {{ t('home_vault_desc') }}
            </p>
          </div>
        </div>
        <div class="flex items-center space-x-1 text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform shrink-0">
          <span>{{ t('tab_vault') }}</span>
          <ArrowRight class="w-3.5 h-3.5" />
        </div>
      </div>
    </section>

  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { 
  Layers, 
  Minimize2, 
  PenTool, 
  LayoutGrid, 
  Scissors, 
  ImageDown, 
  EyeOff, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Images, 
  Stamp, 
  ListOrdered, 
  Zap, 
  FolderLock, 
  ArrowRight, 
  CheckCircle2 
} from 'lucide-vue-next';
import { t } from '../i18n';
import { recordToolUsage } from '../utils/usageTracker';
import { TOOL_ROUTES } from '../router/toolRoutes';

const router = useRouter();

// 1. Popular Essentials (6 tools)
const essentialTools = [
  {
    id: 'merge',
    path: TOOL_ROUTES.merge,
    titleKey: 'tab_merge',
    descKey: 'merge_desc',
    icon: Layers,
    bgIcon: 'bg-blue-50',
    iconColor: 'text-blue-600',
    hoverBorder: 'hover:border-blue-400',
    actionColor: 'text-blue-600',
    badgeKey: 'home_badge_popular',
    badgeStyle: 'bg-blue-50 text-blue-700 border-blue-200',
    tags: ['tool_tag_merge_1', 'tool_tag_merge_2']
  },
  {
    id: 'compress',
    path: TOOL_ROUTES.compress,
    titleKey: 'tab_compress',
    descKey: 'compress_desc',
    icon: Minimize2,
    bgIcon: 'bg-amber-50',
    iconColor: 'text-amber-600',
    hoverBorder: 'hover:border-amber-400',
    actionColor: 'text-amber-600',
    badgeKey: 'home_badge_save_size',
    badgeStyle: 'bg-amber-50 text-amber-700 border-amber-200',
    tags: ['tool_tag_compress_1', 'tool_tag_compress_2']
  },
  {
    id: 'sign',
    path: TOOL_ROUTES.sign,
    titleKey: 'tab_sign',
    descKey: 'sign_desc',
    icon: PenTool,
    bgIcon: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    hoverBorder: 'hover:border-indigo-400',
    actionColor: 'text-indigo-600',
    badgeKey: 'home_badge_stamp',
    badgeStyle: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    tags: ['tool_tag_sign_1', 'tool_tag_sign_2']
  },
  {
    id: 'organize',
    path: TOOL_ROUTES.organize,
    titleKey: 'tab_organize',
    descKey: 'organize_desc',
    icon: LayoutGrid,
    bgIcon: 'bg-purple-50',
    iconColor: 'text-purple-600',
    hoverBorder: 'hover:border-purple-400',
    actionColor: 'text-purple-600',
    badgeKey: 'home_badge_organize',
    badgeStyle: 'bg-purple-50 text-purple-700 border-purple-200',
    tags: ['tool_tag_organize_1', 'tool_tag_organize_2']
  },
  {
    id: 'split',
    path: TOOL_ROUTES.split,
    titleKey: 'tab_split',
    descKey: 'split_desc',
    icon: Scissors,
    bgIcon: 'bg-teal-50',
    iconColor: 'text-teal-600',
    hoverBorder: 'hover:border-teal-400',
    actionColor: 'text-teal-600',
    badgeKey: 'home_badge_split',
    badgeStyle: 'bg-teal-50 text-teal-700 border-teal-200',
    tags: ['tool_tag_split_1', 'tool_tag_split_2']
  },
  {
    id: 'pdf_to_image',
    path: TOOL_ROUTES.pdf_to_image,
    titleKey: 'tab_pdf_to_image',
    descKey: 'p2i_desc',
    icon: ImageDown,
    bgIcon: 'bg-sky-50',
    iconColor: 'text-sky-600',
    hoverBorder: 'hover:border-sky-400',
    actionColor: 'text-sky-600',
    badgeKey: 'home_badge_print_quality',
    badgeStyle: 'bg-sky-50 text-sky-700 border-sky-200',
    tags: ['tool_tag_p2i_1', 'tool_tag_p2i_2']
  }
];

// 2. Privacy & Security Suite (4 tools)
const securityTools = [
  {
    id: 'redact',
    path: TOOL_ROUTES.redact,
    titleKey: 'tab_redact',
    descKey: 'redact_desc',
    icon: EyeOff,
    bgIcon: 'bg-slate-900',
    iconColor: 'text-white',
    hoverBorder: 'hover:border-slate-800',
    actionColor: 'text-slate-800',
    badgeKey: 'home_badge_true_erase',
    badgeStyle: 'bg-slate-100 text-slate-800 border-slate-300',
    tags: ['tool_tag_redact_1', 'tool_tag_redact_2']
  },
  {
    id: 'sanitize',
    path: TOOL_ROUTES.sanitize,
    titleKey: 'tab_sanitize',
    descKey: 'sanitize_desc',
    icon: ShieldCheck,
    bgIcon: 'bg-cyan-50',
    iconColor: 'text-cyan-600',
    hoverBorder: 'hover:border-cyan-400',
    actionColor: 'text-cyan-600',
    badgeKey: 'home_badge_sanitize',
    badgeStyle: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    tags: ['tool_tag_sanitize_1', 'tool_tag_sanitize_2']
  },
  {
    id: 'protect',
    path: TOOL_ROUTES.protect,
    titleKey: 'tab_protect',
    descKey: 'protect_desc',
    icon: Lock,
    bgIcon: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    hoverBorder: 'hover:border-emerald-400',
    actionColor: 'text-emerald-600',
    badgeText: 'AES-256',
    badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-mono',
    tags: ['tool_tag_protect_1', 'tool_tag_protect_2']
  },
  {
    id: 'unlock',
    path: TOOL_ROUTES.unlock,
    titleKey: 'tab_unlock',
    descKey: 'unlock_desc',
    icon: Unlock,
    bgIcon: 'bg-amber-50',
    iconColor: 'text-amber-600',
    hoverBorder: 'hover:border-amber-400',
    actionColor: 'text-amber-600',
    badgeKey: 'home_badge_unlock',
    badgeStyle: 'bg-amber-50 text-amber-700 border-amber-200',
    tags: ['tool_tag_unlock_1', 'tool_tag_unlock_2']
  }
];

// 3. Format Conversion & Automation (4 tools)
const transformTools = [
  {
    id: 'image_to_pdf',
    path: TOOL_ROUTES.image_to_pdf,
    titleKey: 'tab_image_to_pdf',
    descKey: 'img2pdf_desc',
    icon: Images,
    bgIcon: 'bg-violet-50',
    iconColor: 'text-violet-600',
    hoverBorder: 'hover:border-violet-400',
    actionColor: 'text-violet-600',
    badgeKey: 'home_badge_image_to_pdf',
    badgeStyle: 'bg-violet-50 text-violet-700 border-violet-200',
    tags: ['tool_tag_i2p_1', 'tool_tag_i2p_2']
  },
  {
    id: 'watermark',
    path: TOOL_ROUTES.watermark,
    titleKey: 'tab_watermark',
    descKey: 'watermark_desc',
    icon: Stamp,
    bgIcon: 'bg-amber-50',
    iconColor: 'text-amber-600',
    hoverBorder: 'hover:border-amber-400',
    actionColor: 'text-amber-600',
    badgeKey: 'home_badge_watermark',
    badgeStyle: 'bg-amber-50 text-amber-700 border-amber-200',
    tags: ['tool_tag_watermark_1', 'tool_tag_watermark_2']
  },
  {
    id: 'page_number',
    path: TOOL_ROUTES.page_number,
    titleKey: 'tab_page_number',
    descKey: 'page_number_desc',
    icon: ListOrdered,
    bgIcon: 'bg-violet-50',
    iconColor: 'text-violet-600',
    hoverBorder: 'hover:border-violet-400',
    actionColor: 'text-violet-600',
    badgeKey: 'home_badge_page_number',
    badgeStyle: 'bg-violet-50 text-violet-700 border-violet-200',
    tags: ['tool_tag_page_number_1', 'tool_tag_page_number_2']
  },
  {
    id: 'pipeline',
    path: TOOL_ROUTES.pipeline,
    titleKey: 'tab_pipeline',
    descKey: 'pipeline_subtitle',
    icon: Zap,
    bgIcon: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    hoverBorder: 'hover:border-indigo-400',
    actionColor: 'text-indigo-600',
    badgeKey: 'home_badge_batch',
    badgeStyle: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    tags: ['tool_tag_pipeline_1', 'tool_tag_pipeline_2']
  }
];

function openTool(tool) {
  recordToolUsage(tool.id);
  router.push(tool.path);
}
</script>
