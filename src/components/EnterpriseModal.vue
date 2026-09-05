<template>
  <div 
    v-if="isOpen" 
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in"
    @click.self="$emit('close')"
  >
    <div class="bg-white rounded-3xl max-w-5xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 max-h-[92vh] overflow-y-auto">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-slate-100 pb-4">
        <div class="flex items-center space-x-3">
          <div class="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Building2 class="w-6 h-6" />
          </div>
          <div>
            <h2 class="text-lg sm:text-xl font-black text-slate-800">
              {{ t('enterprise_modal_title') }}
            </h2>
            <p class="text-xs text-slate-500 mt-0.5">
              {{ t('enterprise_modal_desc') }}
            </p>
          </div>
        </div>

        <button 
          @click="$emit('close')" 
          class="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Active Supporter Status Banner if already activated -->
      <div v-if="isProSupporter" class="bg-gradient-to-r from-amber-50 via-emerald-50 to-indigo-50 border border-amber-300/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
            <Crown class="w-5 h-5" />
          </div>
          <div>
            <div class="flex items-center space-x-2">
              <span class="font-extrabold text-slate-900 text-sm">{{ activeTierLabel }}</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white">{{ t('enterprise_active_title') }}</span>
            </div>
            <p class="text-xs text-slate-500 mt-0.5">
              {{ t('enterprise_active_owner') }} <b class="text-slate-700">{{ activeCert?.name || 'Authorized Supporter' }}</b>
              <span v-if="activeCert?.email"> ({{ activeCert.email }})</span>
              · {{ t('enterprise_active_benefits') }}
            </p>
          </div>
        </div>
      </div>

      <!-- Three Tier Ladder Grid: Annual vs Lifetime vs Enterprise -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5 items-stretch">
        <!-- 1. Pro Annual Card -->
        <div class="rounded-2xl p-5 border border-slate-200 bg-white flex flex-col justify-between space-y-4 hover:border-slate-300 transition">
          <div class="space-y-2.5">
            <div class="flex items-center space-x-2 text-slate-700 font-extrabold text-base">
              <Calendar class="w-5 h-5 text-emerald-600" />
              <span>{{ t('plan_annual_title') }}</span>
            </div>
            <div class="text-2xl font-black text-slate-900">
              {{ t('plan_annual_price') }} <span class="text-xs font-normal text-slate-500">{{ t('plan_annual_period') }}</span>
            </div>
            <p class="text-xs text-slate-500 leading-relaxed min-h-[32px]">
              {{ t('plan_annual_desc') }}
            </p>

            <div class="space-y-2 pt-2 text-xs text-slate-700">
              <div class="flex items-start space-x-2">
                <Check class="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{{ t('plan_annual_feature_1') }}</span>
              </div>
              <div class="flex items-start space-x-2">
                <Check class="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{{ t('plan_annual_feature_2') }}</span>
              </div>
              <div class="flex items-start space-x-2">
                <Check class="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{{ t('plan_annual_feature_3') }}</span>
              </div>
              <div class="flex items-start space-x-2">
                <Check class="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{{ t('plan_annual_feature_4') }}</span>
              </div>
            </div>
          </div>

          <a 
            :href="siteConfig.plans.annual.checkoutUrl" 
            target="_blank"
            class="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs text-center transition block"
          >
            {{ t('plan_annual_btn') }}
          </a>
        </div>

        <!-- 2. Pro Lifetime Card (Highlighted Anchor) -->
        <div class="rounded-2xl p-5 border-2 border-indigo-600 bg-gradient-to-b from-indigo-50/60 via-white to-white flex flex-col justify-between space-y-4 relative shadow-lg shadow-indigo-100/50">
          <span class="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white shadow-xs">
            {{ t('plan_lifetime_badge') }}
          </span>

          <div class="space-y-2.5">
            <div class="flex items-center space-x-2 text-indigo-700 font-black text-base">
              <Crown class="w-5 h-5" />
              <span>{{ t('plan_lifetime_title') }}</span>
            </div>
            <div class="text-2xl font-black text-slate-900">
              {{ t('plan_lifetime_price') }} <span class="text-xs font-normal text-slate-500">{{ t('plan_lifetime_period') }}</span>
            </div>
            <p class="text-xs text-slate-500 leading-relaxed min-h-[32px]">
              {{ t('plan_lifetime_desc') }}
            </p>

            <div class="space-y-2 pt-2 text-xs text-slate-700">
              <div class="flex items-start space-x-2 font-medium text-slate-900">
                <Check class="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>{{ t('plan_lifetime_feature_1') }}</span>
              </div>
              <div class="flex items-start space-x-2">
                <Check class="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>{{ t('plan_lifetime_feature_2') }}</span>
              </div>
              <div class="flex items-start space-x-2">
                <Check class="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>{{ t('plan_lifetime_feature_3') }}</span>
              </div>
              <div class="flex items-start space-x-2">
                <Check class="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>{{ t('plan_lifetime_feature_4') }}</span>
              </div>
            </div>
          </div>

          <a 
            :href="siteConfig.plans.lifetime.checkoutUrl" 
            target="_blank"
            class="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs text-center transition shadow-md block"
          >
            {{ t('plan_lifetime_btn') }}
          </a>
        </div>

        <!-- 3. Enterprise Card -->
        <div class="rounded-2xl p-5 border border-slate-200 bg-white flex flex-col justify-between space-y-4 hover:border-slate-300 transition">
          <div class="space-y-2.5">
            <div class="flex items-center space-x-2 text-slate-800 font-extrabold text-base">
              <ShieldCheck class="w-5 h-5 text-blue-600" />
              <span>{{ t('plan_enterprise_title') }}</span>
            </div>
            <div class="text-2xl font-black text-slate-900">
              {{ t('plan_enterprise_price') }} <span class="text-xs font-normal text-slate-500">{{ t('plan_enterprise_period') }}</span>
            </div>
            <p class="text-xs text-slate-500 leading-relaxed min-h-[32px]">
              {{ t('plan_enterprise_desc') }}
            </p>

            <div class="space-y-2 pt-2 text-xs text-slate-700">
              <div class="flex items-start space-x-2 font-medium text-slate-900">
                <Check class="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>{{ t('plan_enterprise_feature_1') }}</span>
              </div>
              <div class="flex items-start space-x-2">
                <Check class="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>{{ t('plan_enterprise_feature_2') }}</span>
              </div>
              <div class="flex items-start space-x-2">
                <Check class="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>{{ t('plan_enterprise_feature_3') }}</span>
              </div>
              <div class="flex items-start space-x-2">
                <Check class="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>{{ t('plan_enterprise_feature_4') }}</span>
              </div>
            </div>
          </div>

          <a 
            :href="`mailto:${siteConfig.enterpriseContactEmail}?subject=PDFSeal%20Enterprise%20License%20Inquiry`"
            class="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs text-center transition block"
          >
            {{ t('plan_enterprise_btn') }}
          </a>
        </div>
      </div>

      <!-- Trust Footer Banner -->
      <div class="bg-slate-50 rounded-2xl p-4 text-xs text-slate-500 flex items-center space-x-3 border border-slate-100">
        <Lock class="w-5 h-5 text-emerald-600 shrink-0" />
        <p class="leading-relaxed">
          {{ t('enterprise_modal_privacy_guarantee') }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Building2, X, Crown, ShieldCheck, Check, Lock, Calendar } from 'lucide-vue-next';
import { siteConfig } from '../config/siteConfig';
import { t } from '../i18n';
import { isProSupporter, activeTierLabel, activeCert } from '../utils/security/certificateStore';

defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
});

defineEmits(['close']);
</script>
