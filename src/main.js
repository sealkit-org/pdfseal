import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { initAnalytics } from './utils/analytics';
import './style.css';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Bundle the PDF.js worker locally — never load executable code from a CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// Initialize zero-cookie privacy analytics
initAnalytics();

createApp(App).use(router).mount('#app');

