import { createApp } from 'vue';
import App from './App.vue';
import './style.css';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Bundle the PDF.js worker locally — never load executable code from a CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

createApp(App).mount('#app');
