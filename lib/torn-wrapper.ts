import { xAxisDefaultProps } from 'recharts/types/cartesian/XAxis';
import { getTornLogs as fetchTornLogs, TornLogsParams, TornLogEntry, SyncCursor, NormalizedLog, normalizeTornLog, compareLogIds, ParsedLog, parseNormalizedLog, getTornItems, TornItemNameMap, TornTradeListItem, buildUrl, TORN_V2_API_BASE } from './torn-api';

export class TronWrapper {
  private apiKey: string;
  private itemNameMap: TornItemNameMap | undefined;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Fetches logs from Torn API, handling pagination automatically.
   * @param params Initial parameters for the logs request.
   * @returns A combined array of all log entries found across all pages.
   */
  async getTornLogs(params: TornLogsParams): Promise<TornLogEntry[]> {
    let allLogs: TornLogEntry[] = [];
    let currentParams: TornLogsParams = { ...params };

    while (true) {
      const response = await fetchTornLogs(this.apiKey, currentParams);
      
      if (Array.isArray(response.log) && response.log.length > 0) {
        allLogs = allLogs.concat(response.log);
      }

      const prevLink = response._metadata?.links?.prev;
      if (!prevLink || response.log.length < 100) {
        break;
      }

      // Get args from the prev link.
      const prevUrl = new URL(prevLink);
      const prevParams = Object.fromEntries(prevUrl.searchParams.entries());
      
      // Only update limit param to 100.
      prevParams.limit = "100";

      currentParams = prevParams;
    }

    return allLogs;
  }

  /**
   * Fetches new logs for specific categories since the cursor position.
   * @param cursor The sync cursor (timestamp and last log ID).
   * @returns An object containing the new logs and the updated cursor.
   */
  async getNewLogs(cursor: SyncCursor, toTimeStamp?: number): Promise<{ logs: NormalizedLog[]; parsedLogs: ParsedLog[]; nextCursor: SyncCursor }> {
    const categories: TornLogsParams[] = [
      { cat: 11 }, // item-market
      { cat: 18 }, // bazaar
      { cat: 6 },  // points market
      { cat: 162 } // museum
    ];

    const logTypesNeeded = new Set([
      1112, // item market buy
      1113, // item market sell
      1225, // bazaar buy
      1226, // bazaar sell
      5010, // points market buy
      5011, // points market sell
      7000, // museum exchange
    ]);

    if (!this.itemNameMap) {
      this.itemNameMap = await getTornItems(this.apiKey);
    }

    const allPages = await Promise.all(
      categories.map(async (params) => {
        try {
          return await this.getTornLogs({
            ...params,
            from: cursor.lastTimestamp,
            sort: "desc",
            limit: 100,
            to: toTimeStamp
          });
        } catch (err) {
          console.error(`Failed to fetch logs for category ${params.cat}:`, err);
          return [] as TornLogEntry[];
        }
      })
    );

    const seenLogIds = new Set<string>();
    const logs = allPages
      .flat()
      .map(normalizeTornLog)
      .filter((log) => {
        if (seenLogIds.has(log.id)) return false;
        seenLogIds.add(log.id);
        return true;
      })
      .filter(
        (log) =>
          log.timestamp > cursor.lastTimestamp ||
          (log.timestamp === cursor.lastTimestamp &&
            compareLogIds(log.id, cursor.lastLogId) > 0),
      )
      .sort((a, b) => a.timestamp - b.timestamp || compareLogIds(a.id, b.id));

    const last = logs[logs.length - 1];
    const nextCursor = toTimeStamp ?
     { lastTimestamp: toTimeStamp, lastLogId: cursor.lastLogId }
     : last
      ? { lastTimestamp: last.timestamp, lastLogId: last.id }
      : { ...cursor }

    // Clean up logs that are not relevant to the current sync.
    const relevantLogs = logs.filter((log) => logTypesNeeded.has(log.typeId));
    
    // Convert logs into our format (ParsedLog)
    const parsedLogs: ParsedLog[] = [];
    relevantLogs.forEach(log => {
      const result = parseNormalizedLog(log, this.itemNameMap);
      if (result.kind === 'parsed') {
        parsedLogs.push(...result.logs);
      }
    });

    console.log(`Found ${relevantLogs.length} relevant logs, ${parsedLogs.length} parsed.`);
    
    return { logs: relevantLogs, parsedLogs, nextCursor };
  }

  /**
   * Fetches completed trades from Torn API, handling pagination via metadata links.
   * @param startTimestamp The timestamp to fetch trades from.
   * @returns A combined array of all trades found.
   */
  async getTornTrades(startTimestamp: number): Promise<TornTradeListItem[]> {
    let allTrades: TornTradeListItem[] = [];
    let currentUrl = buildUrl(TORN_V2_API_BASE, "/user/trades", {
      cat: "finished",
      from: startTimestamp,
      limit: "100",
      sort: "DESC",
      key: this.apiKey,
    });

    while (true) {
      const response = await fetch(currentUrl, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));

      if (data?.error?.code === 17) {
        return [];
      }
      
      if (data?.error) {
        throw new Error(data.error.error || "Torn API error during trades fetch");
      }

      const page: TornTradeListItem[] = Array.isArray(data?.trades)
        ? (data.trades as TornTradeListItem[])
        : [];
      
      if (page.length > 0) {
        allTrades = allTrades.concat(page);
      }

      const prevLink = data?._metadata?.links?.prev;
      // If we got exactly 100 results, try to fetch next page.
      if (!prevLink || page.length < 100) {
        break;
      }

      // Update currentUrl to become the next (prev) metadata link.
      currentUrl = prevLink;
      // Force limit to 100 for subsequent pages even if metadata gives lower.
      const urlWithKey = new URL(currentUrl);
      urlWithKey.searchParams.set("key", this.apiKey);
      urlWithKey.searchParams.set("limit", "100");
      currentUrl = urlWithKey.toString();
    }

    return allTrades.filter(t => Number(t.timestamp) >= startTimestamp);
  }
}
