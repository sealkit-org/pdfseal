import { executeUnlockNode } from './unlockNode';
import { executeMergeNode } from './mergeNode';
import { executeSplitNode } from './splitNode';
import { executeCompressNode } from './compressNode';
import { executeWatermarkNode } from './watermarkNode';
import { executeSanitizeNode } from './sanitizeNode';
import { executeSignNode } from './signNode';
import { executeImg2PdfNode } from './img2pdfNode';
import { executePdf2ImgNode } from './pdf2imgNode';
import { executeOrganizeNode } from './organizeNode';
import { executeProtectNode } from './protectNode';
import { executePageNumberNode } from './pageNumberNode';

export const NODE_EXECUTORS = {
  node_unlock: executeUnlockNode,
  node_merge: executeMergeNode,
  node_split: executeSplitNode,
  node_compress: executeCompressNode,
  node_watermark: executeWatermarkNode,
  node_page_number: executePageNumberNode,
  node_sanitize: executeSanitizeNode,
  node_sign: executeSignNode,
  node_img2pdf: executeImg2PdfNode,
  node_pdf2img: executePdf2ImgNode,
  node_organize: executeOrganizeNode,
  node_protect: executeProtectNode
};

export async function executePipelineNode(nodeId, items, params = {}, onProgress = () => {}) {
  const executor = NODE_EXECUTORS[nodeId];
  if (!executor) {
    throw new Error(`Unknown pipeline node executor: ${nodeId}`);
  }
  return await executor(items, params, onProgress);
}
