export class Logger {
  private isDebug: boolean;

  constructor(isDebug: boolean) {
    this.isDebug = isDebug;
  }

  debug(message: string, data?: any) {
    if (this.isDebug) {
      console.log(`[DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
  }

  info(message: string, data?: any) {
    console.log(`[INFO] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }

  error(message: string, error?: any) {
    console.error(`[ERROR] ${message}`, error);
  }
}
