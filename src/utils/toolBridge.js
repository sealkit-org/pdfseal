import { ref } from 'vue';

// Holds a file dispatched from Vault to be loaded into a tool
export const pendingToolFile = ref(null);

export function dispatchToTool(toolId, fileObj) {
  pendingToolFile.value = {
    targetTool: toolId,
    name: fileObj.name,
    arrayBuffer: fileObj.arrayBuffer,
    size: fileObj.size,
    timestamp: Date.now()
  };
}

export function consumePendingFile(toolId) {
  if (pendingToolFile.value && pendingToolFile.value.targetTool === toolId) {
    const file = pendingToolFile.value;
    pendingToolFile.value = null;
    return file;
  }
  return null;
}
