/**
 * ─── Production Logger ──────────────────────────────────────────────────────
 * Writes all logs to daily files in `api/server-logs/` folder.
 * Also prints to console.error / console.log for terminal visibility.
 *
 * Usage:
 *   const logger = require('../utils/logger');
 *   logger.info('Server started');
 *   logger.warn('Deprecated API called');
 *   logger.error('[addToolIssue]', err);
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ── Log directory ──────────────────────────────────────────────────────────
const LOG_DIR = path.join(__dirname, '..', 'server-logs');

// Ensure the directory exists (sync — runs once at startup)
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Returns today's date as YYYY-MM-DD */
const getDateString = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/** Returns current timestamp as YYYY-MM-DD HH:mm:ss */
const getTimestamp = () => {
  const now = new Date();
  return now.toISOString().replace('T', ' ').substring(0, 19);
};

/** Get or create the daily log file path */
const getLogFilePath = () => {
  return path.join(LOG_DIR, `server-${getDateString()}.log`);
};

/**
 * Formats arguments into a loggable string.
 * Handles Error objects, plain objects, and primitives.
 */
const formatArgs = (args) => {
  return args
    .map((arg) => {
      if (arg instanceof Error) {
        return `${arg.message}\n${arg.stack || ''}`;
      }
      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    })
    .join(' ');
};

/**
 * Core write function — appends to daily log file.
 * Non-blocking (uses appendFile with callback).
 */
const writeLog = (level, args) => {
  const timestamp = getTimestamp();
  const message = formatArgs(args);
  const logLine = `[${timestamp}] [${level}] ${message}\n`;

  const filePath = getLogFilePath();

  fs.appendFile(filePath, logLine, (err) => {
    if (err) {
      // Last-resort fallback — don't throw, just print
      console.error('[LOGGER WRITE ERROR]', err.message);
    }
  });
};

// ── Public API ──────────────────────────────────────────────────────────────

const logger = {
  /** INFO — general operational messages (✅ in console + file). */
  info(...args) {
    writeLog('INFO ✅', args);
  },

  /** WARN — potential issues that don't stop execution (⚠️ in console + file). */
  warn(...args) {
    writeLog('WARN ⚠️', args);
  },

  /** ERROR — errors that need attention (❌ in console + file). */
  error(...args) {
    console.error(`❌ [ERROR]`, ...args);
    writeLog('ERROR ❌', args);
  },
};

module.exports = logger;
