import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { TOOL_ROUTES } from './src/router/toolRoutes.js';

// OG 社交分享图由 public/og-image.png 提供（进 Git，Vite 自动拷贝到 dist 根目录），
// index.html 的 og:image 引用 %SITE_URL%/og-image.png
const OG_IMAGE_PUBLIC_PATH = resolve(import.meta.dirname, 'public/og-image.png');

/**
 * SEO 静态资源插件：域名唯一来源是 VITE_OFFICIAL_URL（.env.local / CI 环境变量）
 * 1. index.html 的 %SITE_URL% 占位符替换（dev 与 build 均生效）
 * 2. 构建时从 TOOL_ROUTES 生成 robots.txt 与 sitemap.xml（路由增删自动同步）
 * 3. dev server 中间件实时提供这两个文件，便于本地验证
 * 未配置时（开源自建模式）：不生成任何文件，并移除 HTML 中携带域名的标签——
 * canonical / og:url 由运行时 seo.js 按实际访问域名动态生成，自建部署无损失
 */
function seoStaticFilesPlugin(siteUrl) {
  const enabled = Boolean(siteUrl);
  // 缺失时仅告警不阻断构建：自建用户可放置自有 1200x630 的 og-image.png 到 public/
  if (enabled && !existsSync(OG_IMAGE_PUBLIC_PATH)) {
    console.warn('[pdfseal-seo] VITE_OFFICIAL_URL is set but public/og-image.png not found. Social share image will 404 unless you provide one.');
  }
  const today = new Date().toISOString().slice(0, 10);
  const robotsTxt = `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
  const sitemapXml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    Array.from(new Set(['/', ...Object.values(TOOL_ROUTES)]))
      .map((p) => `  <url>\n    <loc>${siteUrl}${p}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`)
      .join('\n') +
    `\n</urlset>\n`;

  return {
    name: 'pdfseal-seo-static-files',
    transformIndexHtml(html) {
      if (enabled) return html.replaceAll('%SITE_URL%', siteUrl);
      return html
        .split('\n')
        .filter((line) => !line.includes('%SITE_URL%') && !line.includes('og:image:'))
        .join('\n');
    },
    generateBundle() {
      if (!enabled) return;
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robotsTxt });
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemapXml });
    },
    configureServer(server) {
      if (!enabled) return;
      server.middlewares.use((req, res, next) => {
        if (req.url === '/robots.txt' || req.url === '/sitemap.xml') {
          res.setHeader('Content-Type', req.url.endsWith('.xml') ? 'application/xml' : 'text/plain');
          res.end(req.url === '/robots.txt' ? robotsTxt : sitemapXml);
          return;
        }
        next();
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  // 站点公开 URL：唯一来源是 VITE_OFFICIAL_URL（.env.local / CI 环境变量），无默认值。
  // 不配置 = 干净的开源自建模式：不生成 sitemap/robots，HTML 不携带任何域名。
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const siteUrl = (env.VITE_OFFICIAL_URL || '').trim().replace(/\/+$/, '');

  return {
    plugins: [
      vue(),
      seoStaticFilesPlugin(siteUrl),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: [
          'favicon.svg',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'cmaps/*.bcmap',
          'standard_fonts/*.ttf'
        ],
        manifest: {
          name: 'PDFSeal - 100% 纯本地隐私 PDF 工具箱',
          short_name: 'PDFSeal',
          description: '100% In-Browser, Zero-Upload, Offline-Ready Private PDF Utilities. Sealed in your browser.',
          theme_color: '#ffffff',
          background_color: '#f8fafc',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,mjs,css,html,ico,png,svg,woff,woff2,ttf,bcmap}'],
          // 自托管签名/手写字体共 193 个分片约 6MB，排除出预缓存，
          // 改为下方 runtimeCaching 按需缓存（首次使用签名工具后即离线可用）
          // og-image.png 仅供社交爬虫抓取，用户不会在应用内看到，无需预缓存
          globIgnores: ['fonts/**', 'og-image.png'],
          maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              urlPattern: /\/fonts\/[^/]+\.(woff2|css)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'local-fonts-cache',
                expiration: {
                  maxEntries: 250,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        }
      })
    ],
    server: {
      host: '0.0.0.0', // 监听所有地址（支持 127.0.0.1, localhost, 局域网 IP）
      port: 5173,
      strictPort: false
    },
    build: {
      target: 'esnext',
      outDir: 'dist',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('pdfjs-dist')) return 'vendor-pdfjs';
              if (id.includes('pdf-lib') || id.includes('@pdfsmaller/pdf-encrypt')) return 'vendor-pdflib';
              if (id.includes('jszip')) return 'vendor-jszip';
              if (id.includes('lucide-vue-next')) return 'vendor-lucide';
              if (id.includes('vue') || id.includes('vue-router')) return 'vendor-vue';
            }
          }
        }
      }
    }
  };
});
