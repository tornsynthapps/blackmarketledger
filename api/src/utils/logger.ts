/**
 * Simple logger class for Cloudflare Workers.
 * Supports conditional debug logging based on an enabled flag.
 */
export class Logger {
  private isDebug: boolean;

  /**
   * @param isDebug (boolean): Whether debug logging should be enabled.
   */
  constructor(isDebug: boolean) {
    this.isDebug = isDebug;
  }

  /**
   * @returns (boolean): True if debug logging is enabled.
   */
  get enabled() {
    return this.isDebug;
  }

  /**
   * Logs a debug message with optional data.
   * @param message (string): The message to log.
   * @param data (any): Optional object to stringify and log.
   */
  debug(message: string, data?: any) {
    if (this.isDebug) {
      console.log(`[DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
  }

  /**
   * Logs an info message with optional data.
   * @param message (string): The message to log.
   * @param data (any): Optional object to stringify and log.
   */
  info(message: string, data?: any) {
    if (this.isDebug) {
      console.log(`[INFO] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
  }

  /**
   * Logs an error message and error object.
   * Errors are always logged regardless of debug mode.
   * @param message (string): The error message.
   * @param error (any): The error object or context.
   */
  error(message: string, error?: any) {
    console.error(`[ERROR] ${message}`, error);
  }
}
