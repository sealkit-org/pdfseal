import { executeUnlockNode } from './unlockNode';
import { executeMergeNode } from './mergeNode';
import { executeSplitNode } from './splitNode';
import { executeCompressNode } from './compressNode';
import { executeWatermarkNode } from './watermarkNode';
import { executeSanitizeNode } from './sanitizeNode';
import { executeSignNode } from './signNode';
import { executeImg2PdfNode } from './img2pdfNode';
import { executeOrganizeNode } from './organizeNode';

export const NODE_EXECUTORS = {
  node_unlock: executeUnlockNode,
  node_merge: executeMergeNode,
  node_split: executeSplitNode,
  node_compress: executeCompressNode,
  node_watermark: executeWatermarkNode,
  node_sanitize: executeSanitizeNode,
  node_sign: executeSignNode,
  node_img2pdf: executeImg2PdfNode,
  node_organize: executeOrganizeNode
};

export async function executePipelineNode(nodeId, items, params = {}, onProgress = () => {}) {
  const executor = NODE_EXECUTORS[nodeId];
  if (!executor) {
    throw new Error(`未知的节点执行器: ${nodeId}`);
  }
  return await executor(items, params, onProgress);
}
