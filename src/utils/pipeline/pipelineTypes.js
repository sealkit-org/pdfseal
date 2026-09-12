/**
 * Pipeline Types, Port Definitions, and Compatibility Engine
 */

export const DATA_TYPES = {
  PDF_DOCS: 'pdf_docs',       // Array of PDF binary items (1 or more)
  IMAGE_DOCS: 'image_docs'    // Array of Image binary items (PNG/JPG/WebP)
};

export const TOPOLOGY_MODES = {
  MAP: 'map',                 // N items in -> N items out
  REDUCE: 'reduce',           // N items in -> 1 item out (e.g. Merge)
  EXPLODE: 'explode',         // 1 item in -> M items out (e.g. Split)
  SINK: 'sink'                // End of pipeline, produces file delivery / archive
};

export const AVAILABLE_NODES = {
  node_img2pdf: {
    id: 'node_img2pdf',
    nameKey: 'tab_image_to_pdf',
    defaultName: '图片转PDF',
    descKey: 'node_img2pdf_desc',
    defaultDesc: '将导入的图片批量转换为 PDF，或合并为单一文档',
    category: 'input_convert',
    inputs: [DATA_TYPES.IMAGE_DOCS],
    outputs: [DATA_TYPES.PDF_DOCS],
    topology: TOPOLOGY_MODES.REDUCE,
    defaultParams: {
      mergeIntoOne: true,
      pageSize: 'fit_image', // 'fit_image' | 'a4'
      quality: 0.85
    }
  },

  node_pdf2img: {
    id: 'node_pdf2img',
    nameKey: 'tab_pdf_to_image',
    defaultName: 'PDF 转图片',
    descKey: 'node_pdf2img_desc',
    defaultDesc: '将 PDF 每页渲染导出为 PNG / JPG 图片，支持 150 / 300 DPI',
    category: 'output_convert',
    inputs: [DATA_TYPES.PDF_DOCS],
    outputs: [DATA_TYPES.IMAGE_DOCS],
    topology: TOPOLOGY_MODES.EXPLODE,
    defaultParams: {
      format: 'png', // 'png' | 'jpg'
      dpi: 150        // 150 (Standard) | 300 (Print)
    }
  },

  node_unlock: {
    id: 'node_unlock',
    nameKey: 'tab_unlock',
    defaultName: '去除密码',
    descKey: 'node_unlock_desc',
    defaultDesc: '批量解除密码保护或清除所有者权限限制',
    category: 'preprocess',
    inputs: [DATA_TYPES.PDF_DOCS],
    outputs: [DATA_TYPES.PDF_DOCS],
    topology: TOPOLOGY_MODES.MAP,
    defaultParams: {
      password: '',
      skipIfUnencrypted: true
    }
  },

  node_merge: {
    id: 'node_merge',
    nameKey: 'tab_merge',
    defaultName: 'PDF 合并',
    descKey: 'node_merge_desc',
    defaultDesc: '将多个 PDF 按照顺序合并为一个总文档',
    category: 'structure',
    inputs: [DATA_TYPES.PDF_DOCS],
    outputs: [DATA_TYPES.PDF_DOCS],
    topology: TOPOLOGY_MODES.REDUCE,
    defaultParams: {
      sortBy: 'order', // 'order' | 'name_asc' | 'date'
      padBlankPageIfOdd: false
    }
  },

  node_split: {
    id: 'node_split',
    nameKey: 'tab_split',
    defaultName: '页面拆分',
    descKey: 'node_split_desc',
    defaultDesc: '提取指定页面区间或将每页拆分为独立文件',
    category: 'structure',
    inputs: [DATA_TYPES.PDF_DOCS],
    outputs: [DATA_TYPES.PDF_DOCS],
    topology: TOPOLOGY_MODES.EXPLODE,
    defaultParams: {
      mode: 'extract_range', // 'extract_range' | 'burst'
      rangeType: 'custom', // 'first' | 'last' | 'custom'
      rangeExpr: '1-3'
    }
  },

  node_compress: {
    id: 'node_compress',
    nameKey: 'tab_compress',
    defaultName: 'PDF 压缩',
    descKey: 'node_compress_desc',
    defaultDesc: '体积减小最高 90%，支持均衡、极致与无损压缩',
    category: 'transform',
    inputs: [DATA_TYPES.PDF_DOCS],
    outputs: [DATA_TYPES.PDF_DOCS],
    topology: TOPOLOGY_MODES.MAP,
    defaultParams: {
      level: 'balanced', // 'balanced' | 'extreme' | 'lossless'
      universalSizeGuard: true
    }
  },

  node_watermark: {
    id: 'node_watermark',
    nameKey: 'tab_watermark',
    defaultName: '添加水印',
    descKey: 'node_watermark_desc',
    defaultDesc: '批量添加防盗斜向平铺水印，支持自定义文本、字号、颜色与旋转',
    category: 'security',
    inputs: [DATA_TYPES.PDF_DOCS],
    outputs: [DATA_TYPES.PDF_DOCS],
    topology: TOPOLOGY_MODES.MAP,
    defaultParams: {
      text: 'CONFIDENTIAL',
      size: 48,
      opacity: 0.15,
      rotation: -45,
      color: '#dc2626'
    }
  },

  node_sign: {
    id: 'node_sign',
    nameKey: 'tab_sign',
    defaultName: '电子签名',
    descKey: 'node_sign_desc',
    defaultDesc: '批量在文档指定位置（如最后一页右下角）盖章或签名',
    category: 'transform',
    inputs: [DATA_TYPES.PDF_DOCS],
    outputs: [DATA_TYPES.PDF_DOCS],
    topology: TOPOLOGY_MODES.MAP,
    defaultParams: {
      stampDataUrl: '',
      placement: 'last_page_bottom_right', // 'last_page_bottom_right' | 'first_page' | 'all_pages' | 'except_last'
      position: 'bottom_right',
      scale: 0.5,
      addDateStamp: false
    }
  },

  node_sanitize: {
    id: 'node_sanitize',
    nameKey: 'tab_sanitize',
    defaultName: '隐私清理',
    descKey: 'node_sanitize_desc',
    defaultDesc: '物理抹除作者、修改历史、创建软件、GPS 经纬度等追踪信息',
    category: 'security',
    inputs: [DATA_TYPES.PDF_DOCS],
    outputs: [DATA_TYPES.PDF_DOCS],
    topology: TOPOLOGY_MODES.MAP,
    defaultParams: {
      stripDocInfo: true,
      stripGpsAndThumb: true,
      stripPieceInfo: true,
      stripAnnots: true
    }
  },

  node_organize: {
    id: 'node_organize',
    nameKey: 'tab_organize',
    defaultName: '页面整理',
    descKey: 'node_organize_desc',
    defaultDesc: '文档智能规范化：将所有页面统一缩放至 A4 尺寸，并智能纠正横纵方向。',
    category: 'structure',
    inputs: [DATA_TYPES.PDF_DOCS],
    outputs: [DATA_TYPES.PDF_DOCS],
    topology: TOPOLOGY_MODES.MAP,
    defaultParams: {
      standardizeSize: 'none', // 'none' | 'a4'
      forceOrientation: 'none', // 'none' | 'portrait' | 'landscape'
      rotateAll: 'none' // 'none' | '90' | '-90' | '180'
    }
  },

  node_protect: {
    id: 'node_protect',
    nameKey: 'tab_protect',
    defaultName: '加密保护',
    descKey: 'node_protect_desc',
    defaultDesc: '批量设置打开密码，或全局限制复制、修改、打印防篡改',
    category: 'security',
    inputs: [DATA_TYPES.PDF_DOCS],
    outputs: [DATA_TYPES.PDF_DOCS],
    topology: TOPOLOGY_MODES.MAP,
    defaultParams: {
      preset: 'confidential',
      userPassword: '',
      confirmUserPassword: '',
      ownerPassword: '',
      confirmOwnerPassword: '',
      useSamePassword: true,
      algorithm: 'AES-256',
      allowPrinting: false,
      allowCopying: false,
      allowModifying: false,
      allowAnnotating: false
    }
  }
};

/**
 * Checks whether two consecutive nodes are compatible with each other.
 * Returns { compatible: boolean, reason?: string, suggestion?: string }
 */
export function checkNodeCompatibility(upstreamNodeId, downstreamNodeId) {
  const up = AVAILABLE_NODES[upstreamNodeId];
  const down = AVAILABLE_NODES[downstreamNodeId];
  if (!up || !down) return { compatible: false, reason: '未知的节点类型' };

  // Check if any output of upstream matches any input of downstream
  const hasCommonType = up.outputs.some(outType => down.inputs.includes(outType));
  if (!hasCommonType) {
    if (up.outputs.includes(DATA_TYPES.IMAGE_DOCS) && down.inputs.includes(DATA_TYPES.PDF_DOCS)) {
      return {
        compatible: false,
        reason: `上游节点【${up.defaultName}】产出的是图片，而下游节点【${down.defaultName}】需要 PDF 文档作为输入。`,
        suggestion: '请在中间插入【图片转 PDF】节点'
      };
    }
    if (up.outputs.includes(DATA_TYPES.PDF_DOCS) && down.inputs.includes(DATA_TYPES.IMAGE_DOCS)) {
      return {
        compatible: false,
        reason: `上游节点【${up.defaultName}】产出的是 PDF 文档，而下游节点【${down.defaultName}】需要图片作为输入。`,
        suggestion: '请在中间插入【PDF 转图片】节点'
      };
    }
    return {
      compatible: false,
      reason: `节点【${up.defaultName}】与【${down.defaultName}】类型不兼容。`
    };
  }

  return { compatible: true };
}
