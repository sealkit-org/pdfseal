/**
 * 工具路由映射（SEO 与导航的单一数据源）
 * 独立成模块，供 router 与 seo 工具共用，避免循环依赖
 */
export const TOOL_ROUTES = {
  merge: '/merge-pdf',
  compress: '/compress-pdf',
  organize: '/organize-pdf',
  split: '/split-pdf',
  sign: '/sign-pdf',
  protect: '/protect-pdf',
  unlock: '/unlock-pdf',
  image_to_pdf: '/image-to-pdf',
  watermark: '/watermark-pdf',
  sanitize: '/sanitize-pdf',
  pipeline: '/pipeline',
  vault: '/vault',
  receive: '/receive'
};

export const ROUTE_TO_TOOL = Object.fromEntries(
  Object.entries(TOOL_ROUTES).map(([toolId, path]) => [path, toolId])
);
