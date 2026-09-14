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
    defaultName: 'Images to PDF',
    descKey: 'node_img2pdf_desc',
    defaultDesc: 'Convert imported images into PDF or combine into a single document',
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
    defaultName: 'PDF to Images',
    descKey: 'node_pdf2img_desc',
    defaultDesc: 'Render each PDF page as PNG / JPG images at 150 / 300 DPI',
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
    defaultName: 'Remove Password',
    descKey: 'node_unlock_desc',
    defaultDesc: 'Batch remove password protection or strip owner restrictions',
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
    defaultName: 'Merge PDFs',
    descKey: 'node_merge_desc',
    defaultDesc: 'Merge multiple PDFs sequentially into a single document',
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
    defaultName: 'Split Pages',
    descKey: 'node_split_desc',
    defaultDesc: 'Extract page ranges or burst each page into standalone files',
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
    defaultName: 'Compress PDF',
    descKey: 'node_compress_desc',
    defaultDesc: 'Reduce file size up to 90% with balanced, extreme, and lossless modes',
    category: 'transform',
    inputs: [DATA_TYPES.PDF_DOCS],
    outputs: [DATA_TYPES.PDF_DOCS],
    topology: TOPOLOGY_MODES.MAP,
    defaultParams: {
      level: 'balanced', // 'balanced' | 'extreme' | 'target' | 'lossless'
      targetSizeMb: 2,
      universalSizeGuard: true
    }
  },

  node_watermark: {
    id: 'node_watermark',
    nameKey: 'tab_watermark',
    defaultName: 'Add Watermark',
    descKey: 'node_watermark_desc',
    defaultDesc: 'Batch apply diagonal tiled watermarks with customizable text, size, color and angle',
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

  node_page_number: {
    id: 'node_page_number',
    nameKey: 'tab_page_number',
    defaultName: 'Page Numbers',
    descKey: 'node_page_number_desc',
    defaultDesc: 'Batch add formal page numbers with flexible formatting, masking ribbons, and cover skipping',
    category: 'structure',
    inputs: [DATA_TYPES.PDF_DOCS],
    outputs: [DATA_TYPES.PDF_DOCS],
    topology: TOPOLOGY_MODES.MAP,
    defaultParams: {
      format: 'Page {n} of {total}',
      position: 'bottom_center',
      startNumber: 1,
      skipCover: false,
      fontSize: 10,
      textColor: '#334155',
      maskMode: 'full_ribbon',
      maskColor: 'auto',
      margin: 24
    }
  },

  node_sign: {
    id: 'node_sign',
    nameKey: 'tab_sign',
    defaultName: 'Stamp / Sign',
    descKey: 'node_sign_desc',
    defaultDesc: 'Batch stamp seals or signatures at target placement such as last page bottom right',
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
    defaultName: 'Sanitize Metadata',
    descKey: 'node_sanitize_desc',
    defaultDesc: 'Physically erase author, editing history, creation software, GPS and metadata',
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
    defaultName: 'Organize Pages',
    descKey: 'node_organize_desc',
    defaultDesc: 'Normalize document pages: resize to A4 and correct orientation',
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
    defaultName: 'Protect PDF',
    descKey: 'node_protect_desc',
    defaultDesc: 'Batch set open password or restrict copying, editing, and printing',
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
  if (!up || !down) return { compatible: false, code: 'ERR_UNKNOWN_NODE', reasonKey: 'pipeline_compat_err_unknown', reason: 'Unknown node type' };

  // Check if any output of upstream matches any input of downstream
  const hasCommonType = up.outputs.some(outType => down.inputs.includes(outType));
  if (!hasCommonType) {
    if (up.outputs.includes(DATA_TYPES.IMAGE_DOCS) && down.inputs.includes(DATA_TYPES.PDF_DOCS)) {
      return {
        compatible: false,
        code: 'ERR_INCOMPATIBLE_IMAGE_TO_PDF',
        reasonKey: 'pipeline_compat_err_image_to_pdf',
        reason: `Upstream node [${up.defaultName}] outputs images, but downstream node [${down.defaultName}] requires PDF documents.`,
        suggestionKey: 'pipeline_compat_suggest_img2pdf',
        suggestion: 'Please insert an [Images to PDF] node in between'
      };
    }
    if (up.outputs.includes(DATA_TYPES.PDF_DOCS) && down.inputs.includes(DATA_TYPES.IMAGE_DOCS)) {
      return {
        compatible: false,
        code: 'ERR_INCOMPATIBLE_PDF_TO_IMAGE',
        reasonKey: 'pipeline_compat_err_pdf_to_image',
        reason: `Upstream node [${up.defaultName}] outputs PDF documents, but downstream node [${down.defaultName}] requires images.`,
        suggestionKey: 'pipeline_compat_suggest_pdf2img',
        suggestion: 'Please insert a [PDF to Images] node in between'
      };
    }
    return {
      compatible: false,
      code: 'ERR_INCOMPATIBLE_NODES',
      reasonKey: 'pipeline_compat_err_general',
      reason: `Node [${up.defaultName}] is incompatible with [${down.defaultName}].`
    };
  }

  return { compatible: true };
}
