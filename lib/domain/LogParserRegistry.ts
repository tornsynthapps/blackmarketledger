import { 
    NormalizedLog, 
} from "../objects/TornLog";
import { ItemLogService } from "./ItemLogService";
import { MuseumService } from "./MuseumService";

export type TornItemNameMap = Map<number, string>;

export interface HandlerDependencies {
    itemLogService: ItemLogService;
    museumService: MuseumService;
    nameToIdMap: Record<string, number>;
}

export interface LogHandlerMetadata {
    uidSupported: boolean;
    description?: string;
}

export type LogHandlerFn = (log: NormalizedLog, deps: HandlerDependencies) => Promise<void>;

export class LogHandlerRegistry {
    private handlers: Map<number, LogHandlerFn> = new Map();
    private metadata: Map<number, LogHandlerMetadata> = new Map();

    /**
     * Registers one or more log type IDs with a handler function and optional metadata.
     * @param typeIds (number | number[]): The Torn log type ID(s)
     * @param handler (LogHandlerFn): The function to parse the log
     * @param meta (LogHandlerMetadata): Metadata about the log type
     */
    register(typeIds: number | number[], handler: LogHandlerFn, meta?: LogHandlerMetadata) {
        const ids = Array.isArray(typeIds) ? typeIds : [typeIds];
        ids.forEach((id) => {
            this.handlers.set(id, handler);
            if (meta) {
                this.metadata.set(id, meta);
            }
        });
    }

    /**
     * Retrieves the handler for a given log type ID.
     */
    getHandler(typeId: number): LogHandlerFn | undefined {
        return this.handlers.get(typeId);
    }

    /**
     * Retrieves the metadata for a given log type ID.
     */
    getMetadata(typeId: number): LogHandlerMetadata | undefined {
        return this.metadata.get(typeId);
    }

    /**
     * Returns all registered log type IDs.
     */
    getRegisteredTypes(): number[] {
        return Array.from(this.handlers.keys());
    }

    /**
     * Processes a normalized log using the registered handlers.
     */
    async process(log: NormalizedLog, deps: HandlerDependencies): Promise<void> {
        const handler = this.handlers.get(log.typeId);
        if (handler) {
            await handler(log, deps);
        }
    }
}

export const defaultLogRegistry = new LogHandlerRegistry();

// --- Utility Extractors (Shared by handlers) ---

export function pickString(source: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
        const value = source[key];
        if (typeof value === "string" && value.trim()) {
            return value.trim();
        }
    }
    return "";
}

export function pickNumber(source: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
        const value = source[key];
        if (typeof value === "number" && Number.isFinite(value)) {
            return value;
        }
        if (typeof value === "string") {
            const normalized = Number(value.replace(/[$,]/g, ""));
            if (Number.isFinite(normalized)) {
                return normalized;
            }
        }
    }
    return undefined;
}
