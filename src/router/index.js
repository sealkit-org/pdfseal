import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router';
import MergeTool from '../tools/MergeTool.vue';
import CompressTool from '../tools/CompressTool.vue';
import OrganizeTool from '../tools/OrganizeTool.vue';
import SplitTool from '../tools/SplitTool.vue';
import SignTool from '../tools/SignTool.vue';
import ImageToPdfTool from '../tools/ImageToPdfTool.vue';
import PdfToImageTool from '../tools/PdfToImageTool.vue';
import UnlockTool from '../tools/UnlockTool.vue';
import ProtectTool from '../tools/ProtectTool.vue';
import WatermarkTool from '../tools/WatermarkTool.vue';
import PageNumberTool from '../tools/PageNumberTool.vue';
import SanitizeTool from '../tools/SanitizeTool.vue';
import PipelineTool from '../tools/PipelineTool.vue';
import VaultTool from '../tools/VaultTool.vue';
import ShareReceiveTool from '../tools/ShareReceiveTool.vue';
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
    component: MergeTool,
    meta: { toolId: 'merge' }
  },
  {
    path: '/compress-pdf',
    name: 'compress',
    component: CompressTool,
    meta: { toolId: 'compress' }
  },
  {
    path: '/organize-pdf',
    name: 'organize',
    component: OrganizeTool,
    meta: { toolId: 'organize' }
  },
  {
    path: '/split-pdf',
    name: 'split',
    component: SplitTool,
    meta: { toolId: 'split' }
  },
  {
    path: '/sign-pdf',
    name: 'sign',
    component: SignTool,
    meta: { toolId: 'sign' }
  },
  {
    path: '/protect-pdf',
    name: 'protect',
    component: ProtectTool,
    meta: { toolId: 'protect' }
  },
  {
    path: '/unlock-pdf',
    name: 'unlock',
    component: UnlockTool,
    meta: { toolId: 'unlock' }
  },
  {
    path: '/image-to-pdf',
    alias: ['/jpg-to-pdf', '/png-to-pdf', '/images-to-pdf'],
    name: 'image_to_pdf',
    component: ImageToPdfTool,
    meta: { toolId: 'image_to_pdf' }
  },
  {
    path: '/pdf-to-image',
    alias: ['/pdf-to-png', '/pdf-to-jpg', '/pdf-to-images'],
    name: 'pdf_to_image',
    component: PdfToImageTool,
    meta: { toolId: 'pdf_to_image' }
  },
  {
    path: '/watermark-pdf',
    name: 'watermark',
    component: WatermarkTool,
    meta: { toolId: 'watermark' }
  },
  {
    path: '/page-number',
    alias: ['/page-numbers', '/add-page-numbers'],
    name: 'page_number',
    component: PageNumberTool,
    meta: { toolId: 'page_number' }
  },
  {
    path: '/sanitize-pdf',
    name: 'sanitize',
    component: SanitizeTool,
    meta: { toolId: 'sanitize' }
  },
  {
    path: '/pipeline',
    name: 'pipeline',
    component: PipelineTool,
    meta: { toolId: 'pipeline' }
  },
  {
    path: '/vault',
    name: 'vault',
    component: VaultTool,
    meta: { toolId: 'vault' }
  },
  {
    path: '/receive',
    name: 'receive',
    component: ShareReceiveTool,
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
