import { SystemLog, SystemLogRegistry, type SystemLogLevel } from "../objects/SystemLog";

/**
 * Utility for standardized logging across the application.
 * Automatically persists logs into IndexedDB for auditing and debugging.
 */
export class Logger {
    private readonly context: string;
    private static registry: SystemLogRegistry | null = null;

    /**
     * Creates a new Logger instance.
     * @param context (string): The service or component name to prefix logs with.
     */
    constructor(context: string) {
        this.context = context;
        if (typeof window !== "undefined" && !Logger.registry) {
            Logger.registry = new SystemLogRegistry();
        }
    }

    /**
     * Internal method to persist logs to IndexedDB.
     * @param level (SystemLogLevel): The severity level of the log
     * @param message (string): The message to log
     * @sideEffects Writes to IndexedDB via SystemLogRegistry
     */
    private async persist(level: SystemLogLevel, message: string): Promise<void> {
        if (!Logger.registry) return;
        try {
            await Logger.registry.put(
                SystemLog.create({
                    timestamp: Date.now(),
                    level,
                    context: this.context,
                    message,
                })
            );
        } catch (e) {
            // Silently fail to avoid blocking the application or causing infinite log loops
        }
    }

    /**
     * Logs an informational message.
     * @param message (string): The message to log
     * @param args (any[]): Additional arguments to log to console
     */
    public info(message: string, ...args: any[]): void {
        console.log(`[${this.context}] ${message}`, ...args);
        this.persist("info", message);
    }

    /**
     * Logs a warning message.
     * @param message (string): The message to log
     * @param args (any[]): Additional arguments to log to console
     */
    public warn(message: string, ...args: any[]): void {
        console.warn(`[${this.context}] ${message}`, ...args);
        this.persist("warn", message);
    }

    /**
     * Logs an error message.
     * @param message (string): The message to log
     * @param args (any[]): Additional arguments to log to console
     */
    public error(message: string, ...args: any[]): void {
        console.error(`[${this.context}] ${message}`, ...args);
        this.persist("error", message);
    }

    /**
     * Logs a debug message.
     * @param message (string): The message to log
     * @param args (any[]): Additional arguments to log to console
     */
    public debug(message: string, ...args: any[]): void {
        console.debug(`[${this.context}] ${message}`, ...args);
        this.persist("debug", message);
    }
}
