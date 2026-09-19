import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router';
import { updateSeoMeta } from '../utils/seo';
import { recordToolUsage } from '../utils/usageTracker';
import { TOOL_ROUTES, ROUTE_TO_TOOL } from './toolRoutes';

// 保持既有导入路径（../router）兼容，规范数据源见 ./toolRoutes.js
export { TOOL_ROUTES, ROUTE_TO_TOOL };

const routes = [
  {
    path: '/',
    name: 'root',
    redirect: () => {
      try {
        const last = localStorage.getItem('pdfseal_last_tab');
        if (last && TOOL_ROUTES[last] && last !== 'receive') {
          return TOOL_ROUTES[last];
        }
      } catch (e) {}
      return '/merge-pdf';
    }
  },
  {
    path: '/merge-pdf',
    name: 'merge',
    component: () => import('../tools/MergeTool.vue'),
    meta: { toolId: 'merge' }
  },
  {
    path: '/compress-pdf',
    name: 'compress',
    component: () => import('../tools/CompressTool.vue'),
    meta: { toolId: 'compress' }
  },
  {
    path: '/organize-pdf',
    name: 'organize',
    component: () => import('../tools/OrganizeTool.vue'),
    meta: { toolId: 'organize' }
  },
  {
    path: '/split-pdf',
    name: 'split',
    component: () => import('../tools/SplitTool.vue'),
    meta: { toolId: 'split' }
  },
  {
    path: '/sign-pdf',
    name: 'sign',
    component: () => import('../tools/SignTool.vue'),
    meta: { toolId: 'sign' }
  },
  {
    path: '/protect-pdf',
    name: 'protect',
    component: () => import('../tools/ProtectTool.vue'),
    meta: { toolId: 'protect' }
  },
  {
    path: '/unlock-pdf',
    name: 'unlock',
    component: () => import('../tools/UnlockTool.vue'),
    meta: { toolId: 'unlock' }
  },
  {
    path: '/image-to-pdf',
    alias: ['/jpg-to-pdf', '/png-to-pdf', '/images-to-pdf'],
    name: 'image_to_pdf',
    component: () => import('../tools/ImageToPdfTool.vue'),
    meta: { toolId: 'image_to_pdf' }
  },
  {
    path: '/pdf-to-image',
    alias: ['/pdf-to-png', '/pdf-to-jpg', '/pdf-to-images'],
    name: 'pdf_to_image',
    component: () => import('../tools/PdfToImageTool.vue'),
    meta: { toolId: 'pdf_to_image' }
  },
  {
    path: '/watermark-pdf',
    name: 'watermark',
    component: () => import('../tools/WatermarkTool.vue'),
    meta: { toolId: 'watermark' }
  },
  {
    path: '/page-number',
    alias: ['/page-numbers', '/add-page-numbers'],
    name: 'page_number',
    component: () => import('../tools/PageNumberTool.vue'),
    meta: { toolId: 'page_number' }
  },
  {
    path: '/sanitize-pdf',
    name: 'sanitize',
    component: () => import('../tools/SanitizeTool.vue'),
    meta: { toolId: 'sanitize' }
  },
  {
    path: '/redact-pdf',
    name: 'redact',
    component: () => import('../tools/RedactTool.vue'),
    meta: { toolId: 'redact' }
  },
  {
    path: '/pipeline',
    name: 'pipeline',
    component: () => import('../tools/PipelineTool.vue'),
    meta: { toolId: 'pipeline' }
  },
  {
    path: '/vault',
    name: 'vault',
    component: () => import('../tools/VaultTool.vue'),
    meta: { toolId: 'vault' }
  },
  {
    path: '/receive',
    name: 'receive',
    component: () => import('../tools/ShareReceiveTool.vue'),
    meta: { toolId: 'receive' }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/merge-pdf'
  }
];

export const router = createRouter({
  history: typeof window !== 'undefined' ? createWebHistory() : createMemoryHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  }
});

// Backward compatibility & Hash URL migration guard (e.g. /#compress or /#share=xxx&key=yyy)
router.beforeEach((to, from, next) => {
  if (typeof window !== 'undefined' && window.location.hash) {
    const rawHash = window.location.hash.replace(/^#\/?/, '');
    
    // 1. Check if hash has share credentials
    if (rawHash.includes('share=')) {
      const params = new URLSearchParams(rawHash);
      const sid = params.get('share') || '';
      const key = params.get('key') || '';
      try {
        history.replaceState(null, '', window.location.pathname);
      } catch (e) {}
      return next({ path: '/receive', query: { share: sid, key } });
    }

    // 2. Check if hash matches a known tool name (e.g., #compress -> /compress-pdf)
    const cleanHash = rawHash.toLowerCase().trim();
    if (cleanHash) {
      for (const [toolId, routePath] of Object.entries(TOOL_ROUTES)) {
        if (cleanHash === toolId || cleanHash === routePath.replace('/', '') || cleanHash === routePath.replace('/', '').replace('-pdf', '')) {
          try {
            history.replaceState(null, '', window.location.pathname);
          } catch (e) {}
          return next({ path: routePath });
        }
      }
    }
  }

  next();
});

router.afterEach((to) => {
  const toolId = to.meta?.toolId || to.name || 'merge';
  updateSeoMeta(to);
  recordToolUsage(toolId);

  if (toolId !== 'receive' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('pdfseal_last_tab', toolId);
    } catch (e) {}
  }
});

export default router;
