<template>
  <section class="mt-14 pt-10 border-t border-slate-200/80">
    <!-- Section Header -->
    <div class="text-center mb-8">
      <div class="inline-flex items-center space-x-2 bg-blue-50 border border-blue-200/80 px-3.5 py-1.5 rounded-full text-xs font-bold text-blue-700 mb-2.5 shadow-2xs">
        <span>🦭 Why Choose PDFSeal?</span>
        <span class="w-1 h-1 rounded-full bg-blue-400"></span>
        <span class="text-blue-600 font-semibold">{{ t('trust_badge_offline') }}</span>
      </div>
      <h3 class="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
        Engineered for Absolute Privacy & Instant Speed
      </h3>
    </div>

    <!-- 3 Advantage Cards Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-6xl mx-auto">
      
      <!-- Card 1: Absolute Privacy -->
      <div class="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition duration-200 flex flex-col justify-between group">
        <div>
          <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <ShieldCheck class="w-6 h-6" />
          </div>
          <h4 class="font-extrabold text-slate-900 text-sm sm:text-base mb-1.5 flex items-center space-x-1.5">
            <span>{{ t('trust_title_privacy') }}</span>
          </h4>
          <p class="text-xs text-slate-600 leading-relaxed">
            {{ t('trust_desc_privacy') }}
          </p>
        </div>
        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center text-[11px] text-emerald-700 font-bold space-x-1">
          <Lock class="w-3.5 h-3.5" />
          <span>0 Bytes Ever Sent to Cloud</span>
        </div>
      </div>

      <!-- Card 2: Instant Speed -->
      <div class="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition duration-200 flex flex-col justify-between group">
        <div>
          <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Zap class="w-6 h-6" />
          </div>
          <h4 class="font-extrabold text-slate-900 text-sm sm:text-base mb-1.5 flex items-center space-x-1.5">
            <span>{{ t('trust_title_speed') }}</span>
          </h4>
          <p class="text-xs text-slate-600 leading-relaxed">
            {{ t('trust_desc_speed') }}
          </p>
        </div>
        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center text-[11px] text-blue-700 font-bold space-x-1">
          <Cpu class="w-3.5 h-3.5" />
          <span>Pure WebAssembly & RAM Speed</span>
        </div>
      </div>

      <!-- Card 3: No Paywalls or Limits -->
      <div class="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition duration-200 flex flex-col justify-between group">
        <div>
          <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <HeartHandshake class="w-6 h-6" />
          </div>
          <h4 class="font-extrabold text-slate-900 text-sm sm:text-base mb-1.5 flex items-center space-x-1.5">
            <span>{{ t('trust_title_honest') }}</span>
          </h4>
          <p class="text-xs text-slate-600 leading-relaxed">
            {{ t('trust_desc_honest') }}
          </p>
        </div>
        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center text-[11px] text-amber-700 font-bold space-x-1">
          <CheckCircle class="w-3.5 h-3.5" />
          <span>100% Free & Open-Source</span>
        </div>
      </div>

    </div>
  </section>
</template>

<script setup>
import { ShieldCheck, Lock, Zap, Cpu, HeartHandshake, CheckCircle } from 'lucide-vue-next';
import { t } from '../i18n';
</script>
