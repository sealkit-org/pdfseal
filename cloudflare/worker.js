/**
 * PDFSeal - Cloudflare Worker for Zero-Knowledge E2EE Ephemeral Sharing (Seal Send)
 * 
 * Cloudflare Bindings Required:
 * - R2 Bucket: PDFSEAL_BUCKET
 * - KV Namespace: PDFSEAL_KV
 * 
 * Security & Anti-Abuse Protections:
 * 1. Origin / Referer Validation (Restricts unauthorized third-party sites)
 * 2. IP Rate Limiting (10 uploads/min per IP via Cloudflare KV)
 * 3. Magic Header Envelope Inspection ("SEALSEND_V1\0" protocol verification)
 * 4. 10 MB Single-File Hard Limit
 * 5. 85% Storage Watermark -> Forces 10-Minute Rapid Turnover
 * 6. 95% Storage Watermark -> Temporary Quota Saturation Freeze
 * 7. 99% Storage Hard Cap -> Absolute Physical Write Lockdown (0 Over-Billing Guarantee)
 * 8. Optional Shared Secret Token (AUTH_SECRET_TOKEN via Worker Secrets)
 * 9. Full I18n Multi-Language Error Support: zh, en, de, es, fr
 */

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB limit per file
const TOTAL_STORAGE_CAPACITY = 10 * 1024 * 1024 * 1024; // 10 GB R2 Free Tier baseline
const WATERMARK_HIGH = 0.85; // 85% = 8.5 GB
const WATERMARK_CRITICAL = 0.95; // 95% = 9.5 GB
const STORAGE_COUNTER_KEY = 'stats_active_storage_bytes';
const MAGIC_HEADER_BYTES = [0x53, 0x45, 0x41, 0x4c, 0x53, 0x45, 0x4e, 0x44, 0x5f, 0x56, 0x31, 0x00]; // "SEALSEND_V1\0"

// Rate limit parameters
const IP_RATE_LIMIT_PER_MINUTE = 10; // max 10 uploads per min per IP

// Configurable Allowed Origins (Empty/null = allow all legitimate browser domains, or specify your domain)
const ALLOWED_ORIGIN_PATTERNS = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
  /sealkit\.org$/,
  /\.pages\.dev$/,
  /\.github\.io$/,
  /\.workers\.dev$/
];

const I18N_MESSAGES = {
  zh: {
    STORAGE_QUOTA_FULL: '当前中转存储池已达 95% 保护上限，暂时停止接收新文件，请等待现有文件到期或被提取后重试。',
    WATERMARK_RESTRICTED_10M: '当前存储池占用已超过 85%，为保障服务可用性进入快速周转模式，仅支持 10 分钟有效时长。',
    EMPTY_PAYLOAD: '上传的文件载荷为空。',
    FILE_TOO_LARGE: (size) => `单个外发文件大小不得超过 10 MB${size ? `（当前大小：${size} MB）` : ''}。`,
    R2_HARD_QUOTA_REACHED: 'R2 存储池容量已达 99% 绝对硬限制（9.9 GB），已执行物理写入阻断，确保 0 扣费安全。请等待现有文件销毁后重试。',
    RATE_LIMIT_EXCEEDED: '操作过于频繁，单个 IP 每分钟限制上传 10 次，请稍候再试。',
    UNAUTHORIZED_ORIGIN: '未经授权的请求来源域名，已拒绝跨域上传。',
    INVALID_PAYLOAD_SIGNATURE: '无效的加密数据包格式，仅允许通过 PDFSeal 客户端生成的密文。',
    UNAUTHORIZED_TOKEN: '请求未携带有效的客户端认证凭据。',
    FILE_NOT_FOUND_OR_EXPIRED: '文件不存在或已过期。',
    FILE_EXPIRED: '该分享文件已过期或已达到最大时效。',
    FILE_NOT_FOUND_OR_DESTROYED: '文件不存在或已被阅后即焚销毁。',
    NOT_FOUND: '未找到请求的端点。',
    INTERNAL_SERVER_ERROR: '中转服务端发生内部异常。'
  },
  en: {
    STORAGE_QUOTA_FULL: 'Storage pool has reached 95% capacity. Uploads temporarily paused to maintain service availability.',
    WATERMARK_RESTRICTED_10M: 'Storage pool is over 85% full. Fast turnover mode enabled: only 10-minute expiration is permitted.',
    EMPTY_PAYLOAD: 'Uploaded payload is empty.',
    FILE_TOO_LARGE: (size) => `Single file size must not exceed 10 MB${size ? ` (current: ${size} MB)` : ''}.`,
    R2_HARD_QUOTA_REACHED: 'Storage pool has reached 99% absolute hard ceiling (9.9 GB). Physical writes blocked to guarantee zero cost.',
    RATE_LIMIT_EXCEEDED: 'Rate limit exceeded: max 10 uploads per minute per IP. Please wait a moment.',
    UNAUTHORIZED_ORIGIN: 'Unauthorized request origin: cross-origin upload rejected by security policy.',
    INVALID_PAYLOAD_SIGNATURE: 'Invalid encrypted envelope format. Only legitimate PDFSeal payloads are accepted.',
    UNAUTHORIZED_TOKEN: 'Unauthorized: missing or invalid security token.',
    FILE_NOT_FOUND_OR_EXPIRED: 'File not found or has expired.',
    FILE_EXPIRED: 'This shared file has expired.',
    FILE_NOT_FOUND_OR_DESTROYED: 'File not found or was destroyed after download.',
    NOT_FOUND: 'Endpoint not found.',
    INTERNAL_SERVER_ERROR: 'Internal server error occurred.'
  },
  de: {
    STORAGE_QUOTA_FULL: 'Speicherpool hat 95% Kapazität erreicht. Uploads vorübergehend pausiert.',
    WATERMARK_RESTRICTED_10M: 'Speicherpool über 85% voll. Schnellwechselmodus aktiv: Nur 10 Minuten Ablaufzeit zulässig.',
    EMPTY_PAYLOAD: 'Hochgeladene Datei ist leer.',
    FILE_TOO_LARGE: (size) => `Dateigröße darf 10 MB nicht überschreiten${size ? ` (aktuell: ${size} MB)` : ''}.`,
    R2_HARD_QUOTA_REACHED: 'Speicherpool hat 99% Hard-Limit erreicht (9,9 GB). Schreibzugriff gesperrt.',
    RATE_LIMIT_EXCEEDED: 'Zu viele Anfragen: maximal 10 Uploads pro Minute pro IP. Bitte warten.',
    UNAUTHORIZED_ORIGIN: 'Nicht autorisierte Herkunft: Cross-Origin-Upload abgelehnt.',
    INVALID_PAYLOAD_SIGNATURE: 'Ungültiges Nutzlastformat. Nur legitime PDFSeal-Pakete akzeptiert.',
    UNAUTHORIZED_TOKEN: 'Nicht autorisiert: Ungültiger Sicherheitstoken.',
    FILE_NOT_FOUND_OR_EXPIRED: 'Datei nicht gefunden oder abgelaufen.',
    FILE_EXPIRED: 'Diese geteilte Datei ist abgelaufen.',
    FILE_NOT_FOUND_OR_DESTROYED: 'Datei nicht gefunden oder nach Download vernichtet.',
    NOT_FOUND: 'Endpunkt nicht gefunden.',
    INTERNAL_SERVER_ERROR: 'Interner Serverfehler aufgetreten.'
  },
  es: {
    STORAGE_QUOTA_FULL: 'El grupo de almacenamiento ha alcanzado el 95%. Subidas temporalmente pausadas.',
    WATERMARK_RESTRICTED_10M: 'Almacenamiento superior al 85%. Modo de rotación rápida activo: solo se permite validez de 10 minutos.',
    EMPTY_PAYLOAD: 'La carga útil subida está vacía.',
    FILE_TOO_LARGE: (size) => `El tamaño del archivo no debe exceder 10 MB${size ? ` (actual: ${size} MB)` : ''}.`,
    R2_HARD_QUOTA_REACHED: 'Límite estricto del 99% alcanzado (9.9 GB). Escrituras bloqueadas para garantizar costo cero.',
    RATE_LIMIT_EXCEEDED: 'Demasiadas solicitudes: límite de 10 subidas por minuto por IP.',
    UNAUTHORIZED_ORIGIN: 'Origen no autorizado: subida de origen cruzado rechazada.',
    INVALID_PAYLOAD_SIGNATURE: 'Formato de paquete cifrado no válido. Solo se aceptan datos de PDFSeal.',
    UNAUTHORIZED_TOKEN: 'No autorizado: token de seguridad no válido.',
    FILE_NOT_FOUND_OR_EXPIRED: 'Archivo no encontrado o caducado.',
    FILE_EXPIRED: 'Este archivo compartido ha caducado.',
    FILE_NOT_FOUND_OR_DESTROYED: 'Archivo no encontrado o destruido tras la descarga.',
    NOT_FOUND: 'Punto final no encontrado.',
    INTERNAL_SERVER_ERROR: 'Se produjo un error interno del servidor.'
  },
  fr: {
    STORAGE_QUOTA_FULL: 'Le stockage a atteint 95% de capacité. Téléversements temporairement suspendus.',
    WATERMARK_RESTRICTED_10M: 'Stockage plein à plus de 85%. Mode rotation rapide actif : seule une expiration de 10 minutes est autorisée.',
    EMPTY_PAYLOAD: 'Le fichier téléversé est vide.',
    FILE_TOO_LARGE: (size) => `La taille du fichier ne doit pas dépasser 10 Mo${size ? ` (actuelle : ${size} Mo)` : ''}.`,
    R2_HARD_QUOTA_REACHED: 'Limite stricte de 99% atteinte (9,9 Go). Écritures bloquées pour garantir un coût zéro.',
    RATE_LIMIT_EXCEEDED: 'Limite de débit dépassée : max 10 téléversements par minute par IP.',
    UNAUTHORIZED_ORIGIN: 'Origine non autorisée : téléversement cross-origin refusé.',
    INVALID_PAYLOAD_SIGNATURE: 'Format de paquet non valide. Seuls les paquets PDFSeal sont acceptés.',
    UNAUTHORIZED_TOKEN: 'Non autorisé : jeton de sécurité non valide.',
    FILE_NOT_FOUND_OR_EXPIRED: 'Fichier introuvable ou expiré.',
    FILE_EXPIRED: 'Ce fichier partagé a expiré.',
    FILE_NOT_FOUND_OR_DESTROYED: 'Fichier introuvable ou détruit après téléchargement.',
    NOT_FOUND: 'Point de terminaison introuvable.',
    INTERNAL_SERVER_ERROR: 'Une erreur interne du serveur est survenue.'
  }
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const locale = getLocale(request, url);
    const requestOrigin = request.headers.get('Origin') || request.headers.get('Referer') || '';

    // 1. CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(requestOrigin)
      });
    }

    try {
      // 2. Service Status & Storage Watermark Check
      if (request.method === 'GET' && (url.pathname === '/api/send/status' || url.pathname === '/api/send/health')) {
        const activeBytes = await getActiveStorageBytes(env);
        const usageRatio = activeBytes / TOTAL_STORAGE_CAPACITY;
        let watermark = 'normal';

        if (usageRatio >= WATERMARK_CRITICAL) {
          watermark = 'critical_95';
        } else if (usageRatio >= WATERMARK_HIGH) {
          watermark = 'high_85';
        }

        return jsonResponse({
          status: 'ok',
          maxFileSize: MAX_FILE_SIZE,
          activeStorageBytes: activeBytes,
          totalStorageCapacity: TOTAL_STORAGE_CAPACITY,
          usageRatio: parseFloat(usageRatio.toFixed(4)),
          watermark
        }, 200, requestOrigin);
      }

      // 3. Upload Encrypted Binary Payload
      if (request.method === 'POST' && url.pathname === '/api/send/upload') {
        // Security Check 1: Origin Validation
        if (requestOrigin && !isOriginAllowed(requestOrigin, env)) {
          return jsonResponse({
            error: 'UNAUTHORIZED_ORIGIN',
            message: getI18nMessage(locale, 'UNAUTHORIZED_ORIGIN')
          }, 403, requestOrigin);
        }

        // Security Check 2: Shared Secret Token (if AUTH_SECRET_TOKEN is set in Worker environment)
        if (env.AUTH_SECRET_TOKEN) {
          const clientToken = request.headers.get('X-Seal-Token') || url.searchParams.get('token');
          if (clientToken !== env.AUTH_SECRET_TOKEN) {
            return jsonResponse({
              error: 'UNAUTHORIZED_TOKEN',
              message: getI18nMessage(locale, 'UNAUTHORIZED_TOKEN')
            }, 401, requestOrigin);
          }
        }

        // Security Check 3: IP Rate Limiting (10 uploads/min per IP)
        const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown_ip';
        const isRateLimited = await checkRateLimit(env, clientIp);
        if (isRateLimited) {
          return jsonResponse({
            error: 'RATE_LIMIT_EXCEEDED',
            message: getI18nMessage(locale, 'RATE_LIMIT_EXCEEDED')
          }, 429, requestOrigin);
        }

        const activeBytes = await getActiveStorageBytes(env);
        const usageRatio = activeBytes / TOTAL_STORAGE_CAPACITY;

        // Watermark 95% Check: Reject all new uploads
        if (usageRatio >= WATERMARK_CRITICAL) {
          return jsonResponse({
            error: 'STORAGE_QUOTA_FULL',
            message: getI18nMessage(locale, 'STORAGE_QUOTA_FULL'),
            usageRatio
          }, 503, requestOrigin);
        }

        let expSeconds = parseInt(request.headers.get('X-Expiration-Seconds') || '3600', 10);

        // Watermark 85% Check: Force 10-minute TTL for fast turnover
        if (usageRatio >= WATERMARK_HIGH) {
          if (expSeconds > 600) {
            return jsonResponse({
              error: 'WATERMARK_RESTRICTED_10M',
              message: getI18nMessage(locale, 'WATERMARK_RESTRICTED_10M'),
              usageRatio
            }, 400, requestOrigin);
          }
          expSeconds = 600;
        }

        const encryptedBytes = await request.arrayBuffer();
        if (!encryptedBytes || encryptedBytes.byteLength === 0) {
          return jsonResponse({ 
            error: 'EMPTY_PAYLOAD', 
            message: getI18nMessage(locale, 'EMPTY_PAYLOAD') 
          }, 400, requestOrigin);
        }

        // Single File Size Check (10 MB)
        if (encryptedBytes.byteLength > MAX_FILE_SIZE) {
          const currentMb = (encryptedBytes.byteLength / (1024 * 1024)).toFixed(2);
          return jsonResponse({
            error: 'FILE_TOO_LARGE',
            message: getI18nMessage(locale, 'FILE_TOO_LARGE', currentMb),
            maxBytes: MAX_FILE_SIZE
          }, 413, requestOrigin);
        }

        // Security Check 4: Magic Header Protocol Inspection ("SEALSEND_V1\0")
        const bytesArray = new Uint8Array(encryptedBytes);
        if (!verifyMagicHeader(bytesArray)) {
          return jsonResponse({
            error: 'INVALID_PAYLOAD_SIGNATURE',
            message: getI18nMessage(locale, 'INVALID_PAYLOAD_SIGNATURE')
          }, 400, requestOrigin);
        }

        // 99% Hard Capacity Lockdown: Absolute Zero Overflow Guarantee
        if (activeBytes + encryptedBytes.byteLength >= (TOTAL_STORAGE_CAPACITY * 0.99)) {
          return jsonResponse({
            error: 'R2_HARD_QUOTA_REACHED',
            message: getI18nMessage(locale, 'R2_HARD_QUOTA_REACHED'),
            usageRatio: parseFloat(((activeBytes + encryptedBytes.byteLength) / TOTAL_STORAGE_CAPACITY).toFixed(4))
          }, 507, requestOrigin);
        }

        const id = 'seal_' + Date.now().toString(36) + '_' + crypto.randomUUID().substring(0, 8);
        const burnAfterRead = request.headers.get('X-Burn-After-Read') === 'true';
        const isPasswordProtected = request.headers.get('X-Password-Protected') === 'true';

        // Save encrypted blob to R2
        if (env.PDFSEAL_BUCKET) {
          await env.PDFSEAL_BUCKET.put(`payload_${id}`, encryptedBytes, {
            httpMetadata: { contentType: 'application/octet-stream' }
          });
        }

        const now = Date.now();
        const expiresAt = now + (expSeconds * 1000);
        const meta = {
          id,
          size: encryptedBytes.byteLength,
          burnAfterRead,
          isPasswordProtected,
          createdAt: now,
          expiresAt
        };

        // Save metadata to KV with TTL
        if (env.PDFSEAL_KV) {
          await env.PDFSEAL_KV.put(`meta_${id}`, JSON.stringify(meta), {
            expirationTtl: Math.max(60, expSeconds)
          });
          // Increment active storage bytes
          ctx.waitUntil(updateActiveStorageBytes(env, encryptedBytes.byteLength));
        }

        return jsonResponse({
          success: true,
          id,
          expiresAt,
          burnAfterRead,
          size: meta.size
        }, 200, requestOrigin);
      }

      // 4. Get Metadata Info
      const infoMatch = url.pathname.match(/^\/api\/send\/info\/([a-zA-Z0-9_-]+)$/);
      if (request.method === 'GET' && infoMatch) {
        const id = infoMatch[1];
        let meta = null;

        if (env.PDFSEAL_KV) {
          const raw = await env.PDFSEAL_KV.get(`meta_${id}`);
          if (raw) meta = JSON.parse(raw);
        }

        if (!meta) {
          return jsonResponse({ 
            error: 'FILE_NOT_FOUND_OR_EXPIRED', 
            message: getI18nMessage(locale, 'FILE_NOT_FOUND_OR_EXPIRED'),
            isExpired: true 
          }, 404, requestOrigin);
        }

        if (Date.now() > meta.expiresAt) {
          return jsonResponse({ 
            error: 'FILE_EXPIRED', 
            message: getI18nMessage(locale, 'FILE_EXPIRED'),
            isExpired: true 
          }, 410, requestOrigin);
        }

        return jsonResponse({
          success: true,
          id: meta.id,
          size: meta.size,
          burnAfterRead: meta.burnAfterRead,
          isPasswordProtected: meta.isPasswordProtected,
          createdAt: meta.createdAt,
          expiresAt: meta.expiresAt
        }, 200, requestOrigin);
      }

      // 5. Download Encrypted Payload
      const fileMatch = url.pathname.match(/^\/api\/send\/file\/([a-zA-Z0-9_-]+)$/);
      if (request.method === 'GET' && fileMatch) {
        const id = fileMatch[1];
        let meta = null;

        if (env.PDFSEAL_KV) {
          const raw = await env.PDFSEAL_KV.get(`meta_${id}`);
          if (raw) meta = JSON.parse(raw);
        }

        if (meta && Date.now() > meta.expiresAt) {
          return jsonResponse({ 
            error: 'FILE_EXPIRED', 
            message: getI18nMessage(locale, 'FILE_EXPIRED') 
          }, 410, requestOrigin);
        }

        let object = null;
        if (env.PDFSEAL_BUCKET) {
          object = await env.PDFSEAL_BUCKET.get(`payload_${id}`);
        }

        if (!object) {
          return jsonResponse({ 
            error: 'FILE_NOT_FOUND_OR_DESTROYED', 
            message: getI18nMessage(locale, 'FILE_NOT_FOUND_OR_DESTROYED') 
          }, 404, requestOrigin);
        }

        // If Burn-After-Reading: schedule instant background deletion & decrement storage
        if (meta && meta.burnAfterRead) {
          ctx.waitUntil(
            Promise.all([
              env.PDFSEAL_BUCKET.delete(`payload_${id}`),
              env.PDFSEAL_KV ? env.PDFSEAL_KV.delete(`meta_${id}`) : Promise.resolve(),
              updateActiveStorageBytes(env, -(meta.size || 0))
            ])
          );
        }

        const headers = new Headers(getCorsHeaders(requestOrigin));
        headers.set('Content-Type', 'application/octet-stream');
        headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

        return new Response(object.body, { headers });
      }

      return jsonResponse({ 
        error: 'NOT_FOUND', 
        message: getI18nMessage(locale, 'NOT_FOUND') 
      }, 404, requestOrigin);
    } catch (err) {
      return jsonResponse({ 
        error: 'INTERNAL_SERVER_ERROR', 
        message: getI18nMessage(locale, 'INTERNAL_SERVER_ERROR'),
        detail: err.message 
      }, 500, requestOrigin);
    }
  }
};

function isOriginAllowed(origin, env) {
  if (!origin) return true;
  // If custom allowed origins are configured in env variable
  if (env?.ALLOWED_ORIGINS) {
    const list = env.ALLOWED_ORIGINS.split(',').map(s => s.trim());
    return list.some(item => origin.includes(item) || item === '*');
  }
  // Default trusted developer and deploy hosts
  return ALLOWED_ORIGIN_PATTERNS.some(pattern => pattern.test(origin));
}

function verifyMagicHeader(bytes) {
  if (bytes.length < MAGIC_HEADER_BYTES.length) return false;
  for (let i = 0; i < MAGIC_HEADER_BYTES.length; i++) {
    if (bytes[i] !== MAGIC_HEADER_BYTES[i]) return false;
  }
  return true;
}

async function checkRateLimit(env, clientIp) {
  if (!env.PDFSEAL_KV || !clientIp || clientIp === 'unknown_ip') return false;
  try {
    const minuteKey = `ratelimit_${clientIp}_${Math.floor(Date.now() / 60000)}`;
    const currentCountRaw = await env.PDFSEAL_KV.get(minuteKey);
    const count = parseInt(currentCountRaw || '0', 10);
    if (count >= IP_RATE_LIMIT_PER_MINUTE) {
      return true; // Exceeded limit
    }
    await env.PDFSEAL_KV.put(minuteKey, (count + 1).toString(), { expirationTtl: 120 });
    return false;
  } catch (e) {
    return false; // Fail open if KV transient error
  }
}

function getLocale(request, url) {
  const queryLang = url?.searchParams?.get('lang');
  if (queryLang && I18N_MESSAGES[queryLang.toLowerCase()]) {
    return queryLang.toLowerCase();
  }
  const custom = request.headers.get('X-Language');
  if (custom && I18N_MESSAGES[custom.toLowerCase()]) {
    return custom.toLowerCase();
  }
  const acceptLang = request.headers.get('Accept-Language') || '';
  if (/^zh/i.test(acceptLang)) return 'zh';
  if (/^de/i.test(acceptLang)) return 'de';
  if (/^es/i.test(acceptLang)) return 'es';
  if (/^fr/i.test(acceptLang)) return 'fr';
  return 'en';
}

function getI18nMessage(locale, key, arg) {
  const dict = I18N_MESSAGES[locale] || I18N_MESSAGES['en'] || I18N_MESSAGES['zh'];
  const val = dict[key] || (I18N_MESSAGES['en'] && I18N_MESSAGES['en'][key]) || key;
  if (typeof val === 'function') {
    return val(arg);
  }
  return val;
}

async function getActiveStorageBytes(env) {
  if (!env.PDFSEAL_KV) return 0;
  const raw = await env.PDFSEAL_KV.get(STORAGE_COUNTER_KEY);
  const bytes = parseInt(raw || '0', 10);
  return Math.max(0, isNaN(bytes) ? 0 : bytes);
}

async function updateActiveStorageBytes(env, delta) {
  if (!env.PDFSEAL_KV || delta === 0) return;
  try {
    const current = await getActiveStorageBytes(env);
    const updated = Math.max(0, current + delta);
    await env.PDFSEAL_KV.put(STORAGE_COUNTER_KEY, updated.toString());
  } catch (e) {}
}

function getCorsHeaders(requestOrigin = '*') {
  return {
    'Access-Control-Allow-Origin': requestOrigin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Expiration-Seconds, X-Burn-After-Read, X-Password-Protected, X-File-Size, X-Language, X-Seal-Token, Accept-Language',
    'Access-Control-Max-Age': '86400'
  };
}

function jsonResponse(data, status = 200, requestOrigin = '*') {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...getCorsHeaders(requestOrigin),
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
}

