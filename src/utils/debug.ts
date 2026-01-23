/**
 * Debug logging utility
 *
 * Provides conditional logging that can be enabled/disabled at runtime.
 * In production builds, logs are completely stripped when DEBUG is false.
 */

// Enable debug mode via localStorage or build-time flag
const DEBUG = localStorage.getItem('DEBUG') === 'true' || import.meta.env.DEV;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  /** Module name for prefixing logs */
  module: string;
  /** Enable/disable this logger */
  enabled?: boolean;
}

/**
 * Create a logger instance for a specific module
 */
export function createLogger(options: LoggerOptions) {
  const { module, enabled = true } = options;
  const prefix = `[${module}]`;

  const shouldLog = (level: LogLevel): boolean => {
    if (!enabled) return false;
    if (level === 'error') return true; // Always log errors
    if (level === 'warn') return DEBUG; // Warnings in debug mode
    return DEBUG; // Debug/info only in debug mode
  };

  return {
    debug: (...args: unknown[]) => {
      if (shouldLog('debug')) {
        console.debug(prefix, ...args);
      }
    },
    info: (...args: unknown[]) => {
      if (shouldLog('info')) {
        console.info(prefix, ...args);
      }
    },
    warn: (...args: unknown[]) => {
      if (shouldLog('warn')) {
        console.warn(prefix, ...args);
      }
    },
    error: (...args: unknown[]) => {
      if (shouldLog('error')) {
        console.error(prefix, ...args);
      }
    },
    /** Log only once per key (useful for repeated warnings) */
    once: (key: string, level: LogLevel, ...args: unknown[]) => {
      if (!shouldLog(level)) return;
      if (loggedOnce.has(key)) return;
      loggedOnce.add(key);
      console[level](prefix, ...args);
    },
  };
}

// Track one-time logs
const loggedOnce = new Set<string>();

/**
 * Global debug flag check
 */
export function isDebugEnabled(): boolean {
  return DEBUG;
}

/**
 * Enable debug mode at runtime
 */
export function enableDebug(): void {
  localStorage.setItem('DEBUG', 'true');
  console.info('Debug mode enabled. Reload the page for full effect.');
}

/**
 * Disable debug mode at runtime
 */
export function disableDebug(): void {
  localStorage.removeItem('DEBUG');
  console.info('Debug mode disabled. Reload the page for full effect.');
}

// Expose to window for runtime debugging
if (typeof window !== 'undefined') {
  (window as unknown as { enableDebug: typeof enableDebug; disableDebug: typeof disableDebug }).enableDebug = enableDebug;
  (window as unknown as { enableDebug: typeof enableDebug; disableDebug: typeof disableDebug }).disableDebug = disableDebug;
}
