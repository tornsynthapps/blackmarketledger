/**
 * Utility for standardized logging across the application.
 */
export class Logger {
    private readonly context: string;

    /**
     * Creates a new Logger instance.
     * @param context (string): The service or component name to prefix logs with.
     */
    constructor(context: string) {
        this.context = `[${context}]`;
    }

    /**
     * Logs an informational message.
     */
    public info(message: string, ...args: any[]): void {
        console.log(`${this.context} ${message}`, ...args);
    }

    /**
     * Logs a warning message.
     */
    public warn(message: string, ...args: any[]): void {
        console.warn(`${this.context} ${message}`, ...args);
    }

    /**
     * Logs an error message.
     */
    public error(message: string, ...args: any[]): void {
        console.error(`${this.context} ${message}`, ...args);
    }

    /**
     * Logs a debug message.
     */
    public debug(message: string, ...args: any[]): void {
        console.debug(`${this.context} ${message}`, ...args);
    }
}
