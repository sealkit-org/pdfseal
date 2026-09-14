import { validatePipelinePreflight, validateStepParameters } from './pipelinePolicy';
import { checkNodeCompatibility, AVAILABLE_NODES } from './pipelineTypes';
import { executePipelineNode } from './nodes';
import { logger } from '../logger';

/**
 * Executes a full automation pipeline against an array of input files.
 * 
 * @param {Object} pipelineDef - Pipeline definition with { id, name, steps, exportConfig }
 * @param {Array<File|Object>} inputFiles - Array of File or { name, data, mimeType }
 * @param {Object} options - { userTier: 'free'|'pro'|'enterprise', abortSignal?: AbortSignal, onProgress?: Function }
 * @returns {Promise<{ success: boolean, items: Array<Object>, summary: Object }>}
 */
export async function runPipeline(pipelineDef, inputFiles, options = {}, maybeOnProgress, maybeSignal) {
  let userTier = 'free';
  let onProgress = () => {};
  let signal = undefined;
  let resolveNodeName = (nodeId) => {
    const nodeMeta = AVAILABLE_NODES[nodeId];
    return nodeMeta ? nodeMeta.defaultName : nodeId;
  };

  if (typeof options === 'string') {
    userTier = options;
    if (typeof maybeOnProgress === 'function') onProgress = maybeOnProgress;
    if (maybeSignal && maybeSignal.aborted !== undefined) signal = maybeSignal;
  } else if (typeof options === 'object' && options !== null) {
    userTier = options.userTier || 'free';
    onProgress = options.onProgress || (() => {});
    signal = options.abortSignal;
    if (typeof options.resolveNodeName === 'function') {
      resolveNodeName = options.resolveNodeName;
    }
  }

  const pipeName = pipelineDef.name || pipelineDef.defaultName || pipelineDef.id || 'Pipeline';
  logger.info('PIPELINE_RUNNER', `Starting pipeline execution: "${pipeName}" (${pipelineDef.steps?.length || 0} steps) on ${inputFiles.length} files`);

  // 1. Preflight Policy Validation
  const preflight = validatePipelinePreflight(pipelineDef, inputFiles, userTier);
  if (!preflight.pass) {
    logger.warn('PIPELINE_RUNNER', `Preflight check blocked: ${preflight.reason}`);
    return {
      success: false,
      code: preflight.code,
      reasonKey: preflight.reasonKey,
      params: preflight.params,
      reason: preflight.reason,
      triggerPro: preflight.triggerPro
    };
  }

  // 2. Step Parameter Completeness Validation
  const paramValidation = validateStepParameters(pipelineDef.steps);
  if (!paramValidation.valid) {
    logger.warn('PIPELINE_RUNNER', `Parameter validation blocked: ${paramValidation.reason}`);
    return {
      success: false,
      code: paramValidation.code || 'ERR_MISSING_PARAM',
      reason: paramValidation.reason,
      stepIndex: paramValidation.stepIndex,
      nodeId: paramValidation.nodeId
    };
  }

  // 3. Preflight Type Compatibility Validation
  for (let i = 0; i < pipelineDef.steps.length - 1; i++) {
    const currentStep = pipelineDef.steps[i];
    const nextStep = pipelineDef.steps[i + 1];
    const check = checkNodeCompatibility(currentStep.nodeId, nextStep.nodeId);
    if (!check.compatible) {
      return {
        success: false,
        code: 'ERR_INCOMPATIBLE_NODES',
        reason: check.reason,
        suggestion: check.suggestion
      };
    }
  }

  // 3. Normalize Input Files into PipelineItems
  let currentItems = [];
  for (let i = 0; i < inputFiles.length; i++) {
    const f = inputFiles[i];
    let data;
    if (f.arrayBuffer) {
      const buffer = await f.arrayBuffer();
      data = new Uint8Array(buffer);
    } else if (f.data) {
      data = f.data instanceof Uint8Array ? f.data : new Uint8Array(f.data);
    } else {
      throw new Error(`Unable to read input file data: ${f.name}`);
    }

    const mime = f.type || f.mimeType || (/\.pdf$/i.test(f.name) ? 'application/pdf' : 'image/png');
    currentItems.push({
      id: `item_${i}_${Date.now()}`,
      originalName: f.name,
      name: f.name,
      data,
      mimeType: mime
    });
  }

  const totalSteps = pipelineDef.steps.length;

  // 4. Sequential Step Execution
  for (let stepIdx = 0; stepIdx < totalSteps; stepIdx++) {
    if (signal && signal.aborted) {
      return {
        success: false,
        code: 'ABORTED',
        reasonKey: 'pipeline_aborted_by_user',
        reason: 'Operation aborted by user'
      };
    }

    const step = pipelineDef.steps[stepIdx];
    const nodeTitle = resolveNodeName(step.nodeId);

    logger.info('PIPELINE_RUNNER', `Step ${stepIdx + 1}/${totalSteps}: Executing [${nodeTitle}] with ${currentItems.length} items`);

    const stepProgressCb = (stepPct, stepMsg) => {
      const overallPct = Math.round(((stepIdx + (stepPct / 100)) / totalSteps) * 100);
      onProgress({
        overallPercent: Math.min(99, overallPct),
        currentStepIndex: stepIdx,
        totalSteps,
        stepName: nodeTitle,
        stepMessage: stepMsg
      });
    };

    try {
      currentItems = await executePipelineNode(step.nodeId, currentItems, step.params || {}, stepProgressCb);
    } catch (stepErr) {
      logger.error('PIPELINE_RUNNER', `Error in step ${stepIdx + 1} [${nodeTitle}]: ${stepErr.message}`);
      return {
        success: false,
        code: 'STEP_FAILED',
        failedStepIndex: stepIdx,
        failedStepName: nodeTitle,
        reason: stepErr.message
      };
    }
  }

  // 5. Final Naming and Output Packaging
  const exportConfig = pipelineDef.exportConfig || {};
  const namingTemplate = exportConfig.namingTemplate || '';
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');

  if (namingTemplate) {
    currentItems = currentItems.map((item, idx) => {
      const origBase = (item.originalName || item.name).replace(/\.[^/.]+$/, '');
      let finalName = namingTemplate
        .replace(/\{original\}/g, origBase)
        .replace(/\{date\}/g, dateStr)
        .replace(/\{index\}/g, String(idx + 1).padStart(2, '0'));

      // Respect the item's real type: image outputs keep .png/.jpg, PDFs get .pdf
      const itemExt = item.mimeType === 'image/png'
        ? '.png'
        : (item.mimeType === 'image/jpeg' || item.mimeType === 'image/jpg') ? '.jpg' : '.pdf';
      if (!finalName.toLowerCase().endsWith(itemExt)) {
        finalName = finalName.replace(/\.[^/.]+$/, '') + itemExt;
      }
      return {
        ...item,
        name: finalName
      };
    });
  }

  const completedStepTitle = (typeof options === 'object' && options?.completedStepName) || 'Completed';
  const completedStepMsg = (typeof options === 'object' && typeof options?.formatCompletedMessage === 'function')
    ? options.formatCompletedMessage(currentItems.length)
    : `Pipeline execution completed, produced ${currentItems.length} deliverable file(s).`;

  onProgress({
    overallPercent: 100,
    currentStepIndex: totalSteps - 1,
    totalSteps,
    stepName: completedStepTitle,
    stepMessage: completedStepMsg
  });

  logger.info('PIPELINE_RUNNER', `Pipeline completed successfully. Produced ${currentItems.length} items.`);

  return {
    success: true,
    items: currentItems,
    deliverables: currentItems,
    summary: {
      totalInputFiles: inputFiles.length,
      totalOutputFiles: currentItems.length,
      stepsExecuted: totalSteps
    }
  };
}
