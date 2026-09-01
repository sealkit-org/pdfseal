import { reactive } from 'vue';

const MAX_LOG_ENTRIES = 500;
const SESSION_KEY = 'pdfseal_diagnostic_logs';

function getInitialLogs() {
  try {
    if (typeof sessionStorage !== 'undefined') {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch (e) {}
  return [];
}

export const logEntries = reactive(getInitialLogs());

function addEntry(level, tag, message, details = null) {
  const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false }) + '.' + String(Date.now() % 1000).padStart(3, '0');
  const entry = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    time: timestamp,
    level, // 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'
    tag: tag ? tag.toUpperCase() : 'SYSTEM',
    message: typeof message === 'string' ? message : JSON.stringify(message),
    details: details ? (typeof details === 'object' ? JSON.parse(JSON.stringify(details)) : details) : null
  };

  logEntries.unshift(entry);
  if (logEntries.length > MAX_LOG_ENTRIES) {
    logEntries.pop();
  }

  // Persist latest slice to sessionStorage
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(logEntries.slice(0, 100)));
    }
  } catch (e) {}

  // Also mirror to native browser console
  const consolePrefix = `[PDFSeal:${entry.tag}]`;
  if (level === 'ERROR') {
    console.error(consolePrefix, entry.message, details || '');
  } else if (level === 'WARN') {
    console.warn(consolePrefix, entry.message, details || '');
  } else if (level === 'DEBUG') {
    console.debug(consolePrefix, entry.message, details || '');
  } else {
    console.log(consolePrefix, entry.message, details || '');
  }
}

export const logger = {
  info: (tag, msg, details) => addEntry('INFO', tag, msg, details),
  warn: (tag, msg, details) => addEntry('WARN', tag, msg, details),
  error: (tag, msg, details) => addEntry('ERROR', tag, msg, details),
  debug: (tag, msg, details) => addEntry('DEBUG', tag, msg, details),
  clear: () => {
    logEntries.length = 0;
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(SESSION_KEY);
      }
    } catch (e) {}
  },
  getPlainText: () => {
    return logEntries
      .map(e => `[${e.time}] [${e.level}] [${e.tag}] ${e.message}${e.details ? ' -> ' + JSON.stringify(e.details) : ''}`)
      .join('\n');
  }
};
