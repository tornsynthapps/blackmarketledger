import { BaseService } from "./BaseService";
import { SyncCursor, TornLogEntry, normalizeTornLog } from "../objects/TornLog";
import { 
    defaultLogRegistry, 
    LogHandlerRegistry,
    HandlerDependencies 
} from "./LogParserRegistry";
import { initializeDefaultHandlers } from "./LogHandlers";
import { TornAPIClient } from "../tornAPI";
import { getTornApiKeyFull } from "../old/api-keys";
import { ItemLogService } from "./ItemLogService";
import { MuseumService } from "./MuseumService";

// Ensure handlers are registered
initializeDefaultHandlers();

const SKIPPED_LOGS: number[] = [
    // Temporary
    6221, // Company Employee Pay
]

export class TornLogService extends BaseService {
    protected get SERVICE_NAME() { return "TornLogService"; }

    private readonly registry: LogHandlerRegistry;
    private readonly itemLogService: ItemLogService;
    private readonly museumService: MuseumService;

    constructor(registry: LogHandlerRegistry = defaultLogRegistry) {
        super();
        this.registry = registry;
        this.itemLogService = new ItemLogService();
        this.museumService = new MuseumService();
    }

    /**
     * Fetches new logs from Torn API across registered categories and ingests them directly into the database.
     * @param cursor (SyncCursor): Starting point for the sync
     * @param toTimestamp (number): Ending point for the sync
     * @returns (Promise<SyncCursor>): The updated cursor after ingestion
     */
    public async fetchAndIngestNewLogs(
        cursor: SyncCursor,
        toTimestamp: number
    ): Promise<SyncCursor> {
        const apiKey = getTornApiKeyFull();
        if (!apiKey) throw new Error("Missing Torn API Key");

        const registeredTypeIds = this.registry.getRegisteredTypes();
        const categories = [11, 18, 6, 12, 17, 15]; // Standard categories to check

        this.logger.info(`Fetching logs from ${cursor.lastTimestamp} to ${toTimestamp}`);

        const itemNames = await TornAPIClient.getItemNames();
        const nameToIdMap: Record<string, number> = {};
        Object.entries(itemNames).forEach(([id, name]) => {
            nameToIdMap[name.toLowerCase()] = parseInt(id, 10);
        });

        const deps: HandlerDependencies = {
            itemLogService: this.itemLogService,
            museumService: this.museumService,
            nameToIdMap
        };

        const allLogs: TornLogEntry[] = [];

        // Fetch logs for each category
        for (const cat of categories) {
            try {
                const logs = await this.fetchCategoryLogs(apiKey, cat, cursor.lastTimestamp, toTimestamp);
                allLogs.push(...logs);
            } catch (error) {
                this.logger.error(`Failed to fetch logs for category ${cat}`, error);
            }
        }

        // De-duplicate and filter
        const seenLogIds = new Set<string>();
        const normalizedLogs = allLogs
            .map(normalizeTornLog)
            .filter((log) => {
                if (seenLogIds.has(log.id)) return false;
                seenLogIds.add(log.id);
                return true;
            })
            .filter((log) => {
                // Ensure we only process logs strictly after the cursor
                if (log.timestamp < cursor.lastTimestamp) return false;
                if (log.timestamp === cursor.lastTimestamp && this.compareLogIds(log.id, cursor.lastLogId) <= 0) return false;
                return true;
            })
            .sort((a, b) => a.timestamp - b.timestamp || this.compareLogIds(a.id, b.id));

        this.logger.info(`Ingesting ${normalizedLogs.length} logs...`);

        for (const log of normalizedLogs) {
            // Only process if it's a type we care about
            if (registeredTypeIds.includes(log.typeId)) {
                try {
                    await this.registry.process(log, deps);
                } catch (error) {
                    this.logger.error(`Error processing log ID ${log.id}`, error);
                }
            } else {
                // Log unsupported type to help with future implementation
                if (!SKIPPED_LOGS.includes(log.typeId)) {
                    this.logger.error(`Unsupported log type ID ${log.typeId} encountered.`, log);
                }
            }
        }

        const last = normalizedLogs[normalizedLogs.length - 1];
        const nextCursor: SyncCursor = last 
            ? { lastTimestamp: last.timestamp, lastLogId: last.id }
            : { ...cursor, lastTimestamp: toTimestamp };

        this.logger.info(`Ingestion complete. Next cursor: ${nextCursor.lastTimestamp}`);

        return nextCursor;
    }

    private async fetchCategoryLogs(
        apiKey: string,
        category: number,
        from: number,
        to: number
    ): Promise<TornLogEntry[]> {
        let allLogs: TornLogEntry[] = [];
        let currentTo = to;

        while (true) {
            const url = new URL("https://api.torn.com/v2/user/log");
            url.searchParams.set("cat", String(category));
            url.searchParams.set("from", String(from));
            url.searchParams.set("to", String(currentTo));
            url.searchParams.set("limit", "100");
            url.searchParams.set("sort", "desc");
            url.searchParams.set("key", apiKey);

            const response = await fetch(url.toString(), { cache: "no-store" });
            const data = await response.json();

            if (data.error) {
                if (data.error.code === 17) break; // No logs found
                throw new Error(data.error.error || "Torn API Error");
            }

            const page = Array.isArray(data.log) ? data.log : [];
            if (page.length === 0) break;

            allLogs.push(...page);

            if (page.length < 100) break;

            // Move currentTo back to the earliest log in this page
            const earliest = Math.min(...page.map((l: any) => Number(l.timestamp)));
            if (earliest <= from) break;
            currentTo = earliest - 1;
        }

        return allLogs;
    }

    private compareLogIds(left: string, right: string): number {
        if (left.length !== right.length) {
            return left.length - right.length;
        }
        return left.localeCompare(right);
    }
}
