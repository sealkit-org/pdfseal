/**
 * Pipeline Automation Policy & Quota Engine (Config-Driven)
 * Governs Free vs Pro limits for the pipeline automation feature.
 */

export const PIPELINE_POLICY = {
  free: {
    name: 'Community Free',
    maxSavedPipelines: 3,           // Maximum custom pipelines saved in local IndexedDB/localStorage (3 slots for Free)
    maxStepsPerPipeline: 3,         // Maximum steps allowed in a single pipeline definition
    maxBatchFiles: 3,               // Maximum files allowed in a single batch execution
    allowedExportDestinations: ['download_files'], // Sequential download only (ZIP is Pro)
    allowCustomNamingTemplates: false, // Pro only: dynamic tokens like {date}_{index}
    
    // Node-specific fine-grained limits (null inherits maxBatchFiles)
    nodeLimits: {
      node_sign: {
        maxFiles: 1,                // Batch stamping restricted to 1 file for trial
        allowedPlacements: ['last_page_bottom_right', 'except_last']
      },
      node_compress: {
        allowedLevels: ['balanced'] // Balanced (300 DPI) only; Extreme and Lossless are Pro
      },
      node_split: {
        maxPagesPerFile: 10         // Max 10 pages per file extraction in free tier
      },
      node_watermark: {
        allowOwnerPasswordLock: false // Pro only: locking permissions with owner password
      }
    }
  },

  pro: {
    name: 'Professional Pro',
    maxSavedPipelines: Infinity,    // Unlimited saved workflows
    maxStepsPerPipeline: Infinity,  // Unlimited chain of steps
    maxBatchFiles: 100,             // Up to 100 files in a single batch
    allowedExportDestinations: ['download_files', 'download_zip', 'save_to_vault'],
    allowCustomNamingTemplates: true,
    
    nodeLimits: {
      node_sign: {
        maxFiles: Infinity,
        allowedPlacements: ['last_page_bottom_right', 'first_page', 'all_pages', 'except_last', 'custom']
      },
      node_compress: {
        allowedLevels: ['balanced', 'extreme', 'lossless']
      },
      node_split: {
        maxPagesPerFile: Infinity
      },
      node_watermark: {
        allowOwnerPasswordLock: true
      }
    }
  },

  enterprise: {
    name: 'Enterprise Commercial',
    maxSavedPipelines: Infinity,
    maxStepsPerPipeline: Infinity,
    maxBatchFiles: Infinity,
    allowedExportDestinations: ['download_files', 'download_zip', 'save_to_vault'],
    allowCustomNamingTemplates: true,
    allowWorkflowExportImport: true, // Export/import JSON configs for team sharing
    nodeLimits: {
      node_sign: { maxFiles: Infinity, allowedPlacements: ['last_page_bottom_right', 'first_page', 'all_pages', 'except_last', 'custom'] },
      node_compress: { allowedLevels: ['balanced', 'extreme', 'lossless'] },
      node_split: { maxPagesPerFile: Infinity },
      node_watermark: { allowOwnerPasswordLock: true }
    }
  }
};

/**
 * Validates a pipeline configuration and input payload before execution.
 * Returns { pass: boolean, reason?: string, triggerPro?: boolean, code?: string }
 */
export function validatePipelinePreflight(pipelineDef, inputFiles, userTier = 'free') {
  const policy = PIPELINE_POLICY[userTier] || PIPELINE_POLICY.free;

  // 1. Validate Input File Count
  if (inputFiles.length > policy.maxBatchFiles) {
    return {
      pass: false,
      code: 'ERR_MAX_BATCH_FILES',
      triggerPro: true,
      reason: `免费版单次最多支持 ${policy.maxBatchFiles} 个文件批量处理，当前导入了 ${inputFiles.length} 个文件。升级 Pro 解锁 100+ 文件批量批处理！`
    };
  }

  // 2. Validate Step Count
  if (pipelineDef.steps && pipelineDef.steps.length > policy.maxStepsPerPipeline) {
    return {
      pass: false,
      code: 'ERR_MAX_STEPS',
      triggerPro: true,
      reason: `免费版单条流水线最多支持 ${policy.maxStepsPerPipeline} 个处理步骤，当前流水线包含 ${pipelineDef.steps.length} 个步骤。升级 Pro 解锁无限自由编排！`
    };
  }

  // 3. Validate Node-Specific Restrictions
  if (pipelineDef.steps) {
    for (let i = 0; i < pipelineDef.steps.length; i++) {
      const step = pipelineDef.steps[i];
      const limit = policy.nodeLimits[step.nodeId];
      if (!limit) continue;

      // Check node_sign
      if (step.nodeId === 'node_sign') {
        if (inputFiles.length > limit.maxFiles) {
          return {
            pass: false,
            code: 'ERR_NODE_SIGN_LIMIT',
            triggerPro: true,
            reason: `批量盖章/签名节点在免费版中单次限处理 ${limit.maxFiles} 份文件体验。升级 Pro 解锁多份文件批量同位置自动盖章！`
          };
        }
      }

      // Check node_compress
      if (step.nodeId === 'node_compress' && step.params?.level) {
        if (!limit.allowedLevels.includes(step.params.level)) {
          return {
            pass: false,
            code: 'ERR_NODE_COMPRESS_LEVEL',
            triggerPro: true,
            reason: `流水线中的压缩节点选择了高级档位（${step.params.level}），免费版仅开放均衡档。升级 Pro 即可使用极致压缩与无损压缩！`
          };
        }
      }

      // Check node_watermark owner password
      if (step.nodeId === 'node_watermark' && step.params?.ownerPassword) {
        if (!limit.allowOwnerPasswordLock) {
          return {
            pass: false,
            code: 'ERR_NODE_WATERMARK_OWNER_LOCK',
            triggerPro: true,
            reason: `水印防篡改（所有者只读权限锁）为 Pro 专业版专属特性。`
          };
        }
      }
    }
  }

  // 4. Validate Export Destination
  if (pipelineDef.exportConfig) {
    const dest = pipelineDef.exportConfig.destination;
    if (dest && !policy.allowedExportDestinations.includes(dest)) {
      return {
        pass: false,
        code: 'ERR_EXPORT_DESTINATION',
        triggerPro: true,
        reason: `一键打包 ZIP 导出与收纳箱自动归档属于 Pro 专业版专属交付能力。`
      };
    }
    if (pipelineDef.exportConfig.namingTemplate && !policy.allowCustomNamingTemplates) {
      const isPreset = Boolean(pipelineDef.id?.startsWith('preset_'));
      if (!isPreset && /\{date\}|\{index\}|\{time\}/.test(pipelineDef.exportConfig.namingTemplate)) {
        return {
          pass: false,
          code: 'ERR_CUSTOM_NAMING',
          triggerPro: true,
          reason: `自定义动态命名模板（支持 {date}、{index} 等变量）属于 Pro 专业版特权。`
        };
      }
    }
  }

  return { pass: true };
}

/**
 * Validates whether user can save a new pipeline in local IndexedDB.
 */
export function canSaveNewPipeline(currentSavedCount, userTier = 'free') {
  const policy = PIPELINE_POLICY[userTier] || PIPELINE_POLICY.free;
  if (currentSavedCount >= policy.maxSavedPipelines) {
    return {
      allowed: false,
      reason: `免费版最多保存 ${policy.maxSavedPipelines} 条常用自定义工作流。升级 Pro 即可无限制保存并管理您的工作流库！`
    };
  }
  return { allowed: true };
}
