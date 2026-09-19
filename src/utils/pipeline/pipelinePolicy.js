import { AVAILABLE_NODES } from './pipelineTypes';

export const PIPELINE_POLICY = {
  free: {
    name: 'Community Free',
    maxSavedPipelines: 3,           // Maximum custom pipelines saved in local IndexedDB/localStorage (3 slots for Free)
    maxStepsPerPipeline: Infinity,  // Unlimited steps allowed in a single pipeline definition (zero restrictions on chain length)
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
        allowedLevels: ['balanced', 'extreme', 'target', 'lossless']
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
      node_compress: { allowedLevels: ['balanced', 'extreme', 'target', 'lossless'] },
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
      reasonKey: 'pipeline_preflight_err_max_files',
      params: { max: policy.maxBatchFiles, count: inputFiles.length },
      reason: `Free tier supports up to ${policy.maxBatchFiles} batch files per run (currently imported ${inputFiles.length}). Upgrade to Pro to process 100+ files simultaneously!`
    };
  }

  const isPreset = Boolean(pipelineDef.id?.startsWith('preset_') || pipelineDef.isPreset);

  // 2. Validate Step Count (Zero artificial restrictions on step count)
  if (pipelineDef.steps && Number.isFinite(policy.maxStepsPerPipeline) && pipelineDef.steps.length > policy.maxStepsPerPipeline) {
    return {
      pass: false,
      code: 'ERR_MAX_STEPS',
      triggerPro: true,
      reasonKey: 'pipeline_preflight_err_max_steps',
      params: { max: policy.maxStepsPerPipeline, count: pipelineDef.steps.length },
      reason: `Single pipeline supports up to ${policy.maxStepsPerPipeline} processing steps (current pipeline has ${pipelineDef.steps.length} steps).`
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
        if (!isPreset && inputFiles.length > limit.maxFiles) {
          return {
            pass: false,
            code: 'ERR_NODE_SIGN_LIMIT',
            triggerPro: true,
            reasonKey: 'pipeline_preflight_err_sign_limit',
            params: { max: limit.maxFiles },
            reason: `Batch signature/stamp node in Free tier is limited to ${limit.maxFiles} files per batch. Upgrade to Pro to process unlimited files!`
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
            reasonKey: 'pipeline_preflight_err_compress_level',
            params: { level: step.params.level },
            reason: `The compression node selected an advanced mode (${step.params.level}). Free tier supports Balanced mode. Upgrade to Pro for Extreme, Target Size, and Lossless compression!`
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
            reasonKey: 'pipeline_preflight_err_watermark_lock',
            reason: `Tamper-proof watermark (read-only owner password lock) is a Pro exclusive feature.`
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
        reasonKey: 'pipeline_preflight_err_export_dest',
        reason: `One-click ZIP bundle packaging and vault auto-archiving are Pro exclusive features.`
      };
    }
    if (pipelineDef.exportConfig.namingTemplate && !policy.allowCustomNamingTemplates) {
      if (!isPreset && /\{date\}|\{index\}|\{time\}/.test(pipelineDef.exportConfig.namingTemplate)) {
        return {
          pass: false,
          code: 'ERR_CUSTOM_NAMING',
          triggerPro: true,
          reasonKey: 'pipeline_preflight_err_custom_naming',
          reason: `Custom dynamic naming templates (with {date}, {index}, etc.) are a Pro exclusive feature.`
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
      reasonKey: 'pipeline_preflight_err_max_saved',
      params: { max: policy.maxSavedPipelines },
      reason: `Free tier allows saving up to ${policy.maxSavedPipelines} custom workflows. Upgrade to Pro to save unlimited workflows!`
    };
  }
  return { allowed: true };
}

/**
 * Validates that all steps in a pipeline have required parameters properly filled.
 * Returns { valid: boolean, stepIndex?: number, stepId?: string, nodeId?: string, reason?: string, reasonKey?: string }
 */
export function validateStepParameters(steps) {
  const stepList = Array.isArray(steps) ? steps : (steps?.steps || []);
  if (!stepList || !Array.isArray(stepList)) {
    return { valid: true };
  }

  for (let i = 0; i < stepList.length; i++) {
    const step = stepList[i];
    const nodeDef = AVAILABLE_NODES[step.nodeId];
    const nodeName = nodeDef?.defaultName || step.nodeId;

    if (step.nodeId === 'node_sign') {
      if (!step.params?.stampDataUrl) {
        return {
          valid: false,
          stepIndex: i,
          stepId: step.id,
          nodeId: step.nodeId,
          code: 'ERR_MISSING_STAMP',
          reasonKey: 'pipeline_param_err_sign',
          reason: `Step ${i + 1} [${nodeName}]: Missing stamp or signature image. Please upload or select a signature first.`
        };
      }
    }

    if (step.nodeId === 'node_protect') {
      const preset = step.params?.preset || 'confidential';
      if (preset === 'confidential') {
        if (!step.params?.userPassword || !step.params.userPassword.trim()) {
          return {
            valid: false,
            stepIndex: i,
            stepId: step.id,
            nodeId: step.nodeId,
            code: 'ERR_MISSING_PASSWORD',
            reasonKey: 'pipeline_param_err_protect_open',
            reason: `Step ${i + 1} [${nodeName}]: Missing open password. Please enter a password first.`
          };
        }
      } else {
        if (!step.params?.ownerPassword || !step.params.ownerPassword.trim()) {
          return {
            valid: false,
            stepIndex: i,
            stepId: step.id,
            nodeId: step.nodeId,
            code: 'ERR_MISSING_PASSWORD',
            reasonKey: 'pipeline_param_err_protect_owner',
            reason: `Step ${i + 1} [${nodeName}]: Missing owner password. Please enter a management password first.`
          };
        }
      }
    }

    if (step.nodeId === 'node_watermark') {
      if (!step.params?.text || !step.params.text.trim()) {
        return {
          valid: false,
          stepIndex: i,
          stepId: step.id,
          nodeId: step.nodeId,
          code: 'ERR_MISSING_WATERMARK_TEXT',
          reasonKey: 'pipeline_param_err_watermark',
          reason: `Step ${i + 1} [${nodeName}]: Watermark text cannot be empty. Please enter watermark text first.`
        };
      }
    }

    if (step.nodeId === 'node_split') {
      if (step.params?.mode === 'extract_range' && step.params?.rangeType === 'custom') {
        if (!step.params?.rangeExpr || !step.params.rangeExpr.trim()) {
          return {
            valid: false,
            stepIndex: i,
            stepId: step.id,
            nodeId: step.nodeId,
            code: 'ERR_MISSING_SPLIT_RANGE',
            reasonKey: 'pipeline_param_err_split',
            reason: `Step ${i + 1} [${nodeName}]: Custom page range cannot be empty. Please enter a page range first.`
          };
        }
      }
    }

    if (step.nodeId === 'node_redact') {
      const rules = Array.isArray(step.params?.rules) ? step.params.rules : [];
      const hasValidRule = rules.some((r) => r && typeof r.value === 'string' && r.value.trim());
      if (!hasValidRule) {
        return {
          valid: false,
          stepIndex: i,
          stepId: step.id,
          nodeId: step.nodeId,
          code: 'ERR_MISSING_REDACT_RULES',
          reasonKey: 'pipeline_param_err_redact',
          reason: `Step ${i + 1} [${nodeName}]: At least one keyword or pattern rule is required. Please add a redaction rule first.`
        };
      }
    }
  }

  return { valid: true };
}

