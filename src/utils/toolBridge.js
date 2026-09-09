import { ref } from 'vue';

// Holds a file dispatched from Vault or another Tool to be loaded seamlessly
export const pendingToolFile = ref(null);

/**
 * Dispatches an in-memory PDF file directly to a target tool without disk I/O.
 * 
 * @param {string} toolId - Target tool ID ('compress' | 'sign' | 'watermark' | 'protect' | etc.)
 * @param {Object} fileObj
 * @param {string} fileObj.name - File name
 * @param {ArrayBuffer|Uint8Array} [fileObj.arrayBuffer] - Raw byte buffer
 * @param {ArrayBuffer|Uint8Array} [fileObj.data] - Alternative data buffer
 * @param {number} [fileObj.size] - File size in bytes
 * @param {string} [fileObj.password] - Optional unlocked session password
 */
export function dispatchToTool(toolId, fileObj) {
  if (!toolId || !fileObj) return;

  let raw = fileObj.arrayBuffer || fileObj.data;
  let normalizedBuffer = null;

  if (raw instanceof Uint8Array) {
    normalizedBuffer = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
  } else if (raw instanceof ArrayBuffer) {
    normalizedBuffer = raw;
  }

  const byteSize = fileObj.size || (normalizedBuffer ? normalizedBuffer.byteLength : 0);

  pendingToolFile.value = {
    targetTool: toolId,
    name: fileObj.name || `Document_${Date.now()}.pdf`,
    arrayBuffer: normalizedBuffer,
    size: byteSize,
    password: fileObj.password || '',
    timestamp: Date.now()
  };
}

/**
 * Consumes a pending file if targeted for the specified toolId.
 * Resets the pending file upon consumption to prevent stale ingestion.
 * 
 * @param {string} toolId
 * @returns {Object|null}
 */
export function consumePendingFile(toolId) {
  if (pendingToolFile.value && pendingToolFile.value.targetTool === toolId) {
    const file = pendingToolFile.value;
    pendingToolFile.value = null;
    return file;
  }
  return null;
}

/**
 * Clears any pending tool transfer manually
 */
export function clearPendingFile() {
  pendingToolFile.value = null;
}
