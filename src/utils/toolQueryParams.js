/**
 * Universal Tool Deep-Linking Query Parameter Parser
 * 
 * Extracts and validates standard, generic URL query parameters for PDFSeal tools
 * without coupling any marketing or third-party agency terms into the core codebase.
 */

/**
 * Parses query parameters for CompressTool
 * @param {Object} query - vue-router route.query object
 * @returns {{ targetSizeMb?: number, selectedLevel?: string }}
 */
export function parseCompressQueryParams(query) {
  const result = {};
  if (!query) return result;

  // 1. Target Size (e.g. ?target=2.0 or ?mb=2.0)
  const targetParam = query.target || query.mb;
  if (targetParam !== undefined && targetParam !== null && targetParam !== '') {
    const parsedMb = parseFloat(targetParam);
    if (!isNaN(parsedMb) && parsedMb > 0 && parsedMb <= 100) {
      result.targetSizeMb = Number(parsedMb.toFixed(2));
      result.selectedLevel = 'target';
    }
  }

  // 2. Explicit Level (e.g. ?level=extreme|balanced|target|lossless)
  const levelParam = query.level;
  if (levelParam && ['extreme', 'balanced', 'target', 'lossless'].includes(levelParam)) {
    result.selectedLevel = levelParam;
  }

  return result;
}

/**
 * Parses query parameters for WatermarkTool
 * @param {Object} query
 * @returns {{ wmText?: string, wmOpacity?: number, wmColor?: string, wmAngle?: number }}
 */
export function parseWatermarkQueryParams(query) {
  const result = {};
  if (!query) return result;

  // 1. Watermark Text (?text=CONFIDENTIAL or ?wm=SAMPLE)
  const textParam = query.text || query.wm;
  if (typeof textParam === 'string' && textParam.trim()) {
    result.wmText = textParam.trim();
  }

  // 2. Opacity (?opacity=0.3 or ?opacity=30)
  const opacityParam = query.opacity;
  if (opacityParam !== undefined && opacityParam !== null && opacityParam !== '') {
    const parsed = parseFloat(opacityParam);
    if (!isNaN(parsed)) {
      if (parsed > 0 && parsed <= 1) {
        result.wmOpacity = Math.round(parsed * 100);
      } else if (parsed > 1 && parsed <= 100) {
        result.wmOpacity = Math.round(parsed);
      }
    }
  }

  // 3. Color (?color=2563eb or ?color=%232563eb)
  const colorParam = query.color;
  if (typeof colorParam === 'string' && colorParam.trim()) {
    const cleanHex = colorParam.trim().replace(/^#/, '');
    if (/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
      result.wmColor = '#' + cleanHex;
    }
  }

  // 4. Angle (?angle=-45 or ?angle=0)
  const angleParam = query.angle;
  if (angleParam !== undefined && angleParam !== null && angleParam !== '') {
    const parsedAngle = parseFloat(angleParam);
    if (!isNaN(parsedAngle) && parsedAngle >= -90 && parsedAngle <= 90) {
      result.wmAngle = parsedAngle;
    }
  }

  return result;
}

/**
 * Parses query parameters for ProtectTool
 * @param {Object} query
 * @returns {{ activePreset?: string, algorithm?: string }}
 */
export function parseProtectQueryParams(query) {
  const result = {};
  if (!query) return result;

  // 1. Preset or Mode (?preset=readonly or ?mode=permission)
  const presetParam = query.preset || query.mode;
  if (presetParam) {
    if (['readonly', 'permission', 'permissions'].includes(presetParam)) {
      result.activePreset = 'readonly';
    } else if (['confidential', 'encrypt', 'open'].includes(presetParam)) {
      result.activePreset = 'confidential';
    } else if (['printonly', 'print'].includes(presetParam)) {
      result.activePreset = 'printonly';
    }
  }

  // 2. Algorithm (?algo=AES-256 or ?algo=RC4)
  if (query.algo === 'RC4' || query.algo === 'AES-256') {
    result.algorithm = query.algo;
  }

  return result;
}

/**
 * Parses query parameters for PageNumberTool
 * @param {Object} query
 * @returns {{ pnPosition?: string, pnStartNumber?: number, pnSkipCover?: boolean }}
 */
export function parsePageNumberQueryParams(query) {
  const result = {};
  if (!query) return result;

  // 1. Position (?pos=bottom_center)
  const posParam = query.pos || query.position;
  const validPositions = ['top_left', 'top_center', 'top_right', 'bottom_left', 'bottom_center', 'bottom_right'];
  if (posParam && validPositions.includes(posParam)) {
    result.pnPosition = posParam;
  }

  // 2. Start number (?start=1)
  const startParam = query.start;
  if (startParam !== undefined && startParam !== null && startParam !== '') {
    const parsedStart = parseInt(startParam, 10);
    if (!isNaN(parsedStart) && parsedStart >= 1) {
      result.pnStartNumber = parsedStart;
    }
  }

  // 3. Skip cover (?skip_cover=1 or ?skip_cover=true)
  if (query.skip_cover === '1' || query.skip_cover === 'true') {
    result.pnSkipCover = true;
  }

  return result;
}

/**
 * Parses query parameters for SplitTool
 * @param {Object} query
 * @returns {{ activeMode?: string, rangeInput?: string, intervalCount?: number }}
 */
export function parseSplitQueryParams(query) {
  const result = {};
  if (!query) return result;

  // 1. Split Mode (?mode=extract|burst|interval|multi_range)
  const modeParam = query.mode;
  const validModes = ['extract', 'burst', 'interval', 'multi_range'];
  if (modeParam && validModes.includes(modeParam)) {
    result.activeMode = modeParam;
  }

  // 2. Page Range (?range=1-3,5)
  const rangeParam = query.range;
  if (typeof rangeParam === 'string' && rangeParam.trim()) {
    result.rangeInput = rangeParam.trim();
    result.activeMode = 'extract';
  }

  // 3. Interval (?interval=2)
  const intervalParam = query.interval;
  if (intervalParam !== undefined && intervalParam !== null && intervalParam !== '') {
    const parsedInterval = parseInt(intervalParam, 10);
    if (!isNaN(parsedInterval) && parsedInterval >= 1) {
      result.intervalCount = parsedInterval;
      result.activeMode = 'interval';
    }
  }

  return result;
}
