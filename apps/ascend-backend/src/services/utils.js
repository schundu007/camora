/**
 * Shared Utility Functions
 *
 * Common utilities used across backend services.
 */

/**
 * Safe console logging that prevents EPIPE errors
 * when Electron pipes close during shutdown.
 */
export function safeLog(...args) {
  try {
    console.log(...args);
  } catch (err) {
    // Ignore EPIPE errors when pipe is closed
    if (err.code !== 'EPIPE') {
      // Try to write to stderr as fallback
      try {
        process.stderr.write(`[safeLog] ${args.join(' ')}\n`);
      } catch {
        // Give up silently
      }
    }
  }
}

/**
 * Safe console error that prevents EPIPE errors
 */
export function safeError(...args) {
  try {
    console.error(...args);
  } catch (err) {
    if (err.code !== 'EPIPE') {
      try {
        process.stderr.write(`[safeError] ${args.join(' ')}\n`);
      } catch {
        // Give up silently
      }
    }
  }
}

/**
 * Format duration in ms to human-readable string
 */
export function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str, maxLen = 50) {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
