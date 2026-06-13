/**
 * app/logger.js — structured console logger for Prompt Architect.
 *
 * Browser-only module: all output goes to the DevTools console as JSON lines.
 * No filesystem writes, no network calls, no telemetry. See docs/OBSERVABILITY.md
 * for the full field schema and event catalogue.
 *
 * Usage:
 *   import { logger } from './logger.js';
 *   logger.info('plugin_loaded', { plugin: 'midjourney', version: '1.0.0',
 *                                   fieldCount: 12, msg: 'Plugin loaded successfully' });
 *
 * Level control (in DevTools console):
 *   localStorage.setItem('promptArchitect.logLevel', 'DEBUG');
 *   location.reload();
 */

const LEVELS = { DEBUG: 10, INFO: 20, WARN: 30, ERROR: 40 };

/**
 * Read the effective log level from localStorage, defaulting to INFO.
 * This is read once at module load so it is cheap to call logger methods.
 */
function resolveLevel() {
  try {
    const stored = localStorage.getItem('promptArchitect.logLevel');
    if (stored && LEVELS[stored.toUpperCase()] !== undefined) {
      return LEVELS[stored.toUpperCase()];
    }
  } catch {
    // localStorage may be unavailable (private browsing, file://, etc.).
  }
  return LEVELS.INFO;
}

const effectiveLevel = resolveLevel();

/**
 * Write a structured log entry to the console.
 *
 * @param {'DEBUG'|'INFO'|'WARN'|'ERROR'} level
 * @param {string} event  - snake_case event name (see OBSERVABILITY.md)
 * @param {object} [fields] - additional structured fields; must NOT include
 *                            raw user-authored string content (subject, lyrics)
 */
function write(level, event, fields = {}) {
  if (LEVELS[level] < effectiveLevel) return;

  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    msg: fields.msg ?? event,
    ...fields,
  };

  // Remove the duplicate msg key from fields to keep the entry clean.
  const { msg: _msg, ...rest } = fields;
  const serialised = JSON.stringify({ ...entry, ...rest });

  switch (level) {
    case 'DEBUG':
    case 'INFO':
      console.log(serialised);
      break;
    case 'WARN':
      console.warn(serialised);
      break;
    case 'ERROR':
      console.error(serialised);
      break;
  }
}

export const logger = {
  debug: (event, fields) => write('DEBUG', event, fields),
  info:  (event, fields) => write('INFO',  event, fields),
  warn:  (event, fields) => write('WARN',  event, fields),
  error: (event, fields) => write('ERROR', event, fields),
};

// Log app initialisation immediately on module load.
// fieldCount will be updated by the caller once plugins are known.
logger.info('app_init', { msg: 'Prompt Architect logger initialised', pluginCount: 0 });
