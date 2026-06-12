import { BaseService } from "./BaseService";
import { SyncCursor, TornLogEntry, normalizeTornLog, NormalizedLog } from "../objects/TornLog";
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
import { categories } from "@/constants/tempLogCategories";

// Ensure handlers are registered
initializeDefaultHandlers();

export const FUTURE_WORK : number[] = [
    // // Item Use ========================
    // 2020, // Item Use candy
    // 2030, // Item Use alcohol
    // 2060, // Item use morphine
    // 2070, // Item use first aid kit
    // 2080, // Item Use first aid kit
    // 2200, // Item use cannabis
    // 2210, // Item use ecstasy
    // 2230, // Item use LSD
    // 2240, // Item use opium
    // 2290, // Item use xanax
    // 2270,
    // 2350, // Item use box of grenades
    // 2360, // Item use box of medical supplies
    // 2405, // Item use wallet
    // 2410, // Item use box of tissues
    // 4000, // Parcel create
    // 4002, // Parcel wrap
    // 4102, // Item sending
    // 4103, // Item receive
    // 4900, // Points energy refill use
    // 4915, // Points stock ticker unlock
    // 4930, // Points racing license unlock
    // 4945, // Points bazaar unlock
    // 5460, // Cashiers check withdraw
    // 5511, // Stock sell
    // 5943, // Property rental market extension accept owner
    // 6736, // Faction give money receive
    // 6746, // Faction loan item receive
    // 6749, // Faction loan item retrieve receive
    // 7900, // Missions buy reward item
    // 8700, // Racing enlist car
    // 8701, // Racing unenlist car
    // 9163, // Crime critical fail item loss
    // // Equipping =======================
    // 4700,
    // 4710,
    // // Money ===========================
    // 4810, // Money receive
    // // Bank
    // 5451, // Bank Withdraw
    // // Crimes
    // 5720, // Crime money gain
    // 5937, // Property rental market rent owner
    // 8395, // Casino russian roulette win
    // // Attack
    // 8155, // Attack Mug
    // 8411, // Casino table leave
    // // Casino ==========================
    // 8314, 
    // // Crimes + money
    // 9015, // Crime success money gain
    // 9052, // Crime money gain bootlogging
    // 9300, // Crime item add blank DVDs
    // 9301, // Crime item add spray paint
    // // Faction =========================
    // 6728,
    // // Points ==========================
    // 4955,
    // // Loan
    // 6200,
    // // Company =========================
    // 6220, // Job Pay
    // 6221, // Company Employee Pay
    // 6404, // Job special money gain
    // // Missions ========================
    // 7815,
]
export const SKIPPED_LOGS: number[] = FUTURE_WORK.concat([
    1100, // Item market add (old)
    1200, // Bazaar name change
    1201, // Bazaar description change
    1210, // Bazaar add (legacy)
    1212, // Bazaar edit (legacy)
    5000, // Points Market Add
    5001, // Points Market Remove
]).concat(categories)

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
     * @returns (Promise<{ nextCursor: SyncCursor, earliestTimestamp: number | null }>): The updated cursor and the oldest log timestamp processed
     */
    public async fetchAndIngestNewLogs(
        cursor: SyncCursor,
        toTimestamp: number
    ): Promise<{ nextCursor: SyncCursor; earliestTimestamp: number | null; unsupportedLogs: NormalizedLog[] }> {
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

        let earliestTimestamp: number | null = null;
        const unsupportedLogs: NormalizedLog[] = [];

        for (const log of normalizedLogs) {
            const isSupported = registeredTypeIds.includes(log.typeId);
            const isSkipped = SKIPPED_LOGS.includes(log.typeId);

            // ALWAYS store raw log data for audit/debugging in SystemLog
            if (isSupported) {
                this.logger.info(`Processing Log [${log.typeId}]: ${log.title}`, log);
            } else if (!isSkipped) {
                this.logger.error(`Unsupported log type ID ${log.typeId} encountered.`, log);
                unsupportedLogs.push(log);
            }

            // Only process business logic if it's a type we care about
            if (isSupported) {
                try {
                    await this.registry.process(log, deps);
                    
                    // Track earliest timestamp successfully processed
                    if (earliestTimestamp === null || log.timestamp < earliestTimestamp) {
                        earliestTimestamp = log.timestamp;
                    }
                } catch (error) {
                    this.logger.error(`Error processing log ID ${log.id}`, error);
                }
            }
        }

        const last = normalizedLogs[normalizedLogs.length - 1];
        const nextCursor: SyncCursor = last 
            ? { lastTimestamp: last.timestamp, lastLogId: last.id }
            : { ...cursor, lastTimestamp: toTimestamp };

        this.logger.info(`Ingestion complete. Next cursor: ${nextCursor.lastTimestamp}`);

        return { nextCursor, earliestTimestamp, unsupportedLogs };
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
