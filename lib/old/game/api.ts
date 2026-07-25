import { mydebug } from "../debug";
import { LocalStorageInterface } from "../interfaces/localstorage";
import { MetadataInterface } from "../interfaces/metadata";
import { buildUrl, TornTradeDetailItem, TornTradeListItem } from "../torn-api";
import { TornTrade, Weav3rReceipt } from "./trade";
import { tornRateLimiter, weav3rRateLimiter } from "../rate-limiter";
import { getTornApiRateLimit, getWeav3rApiRateLimit, refreshApiKeysFromStorage } from "../api-keys";

export function refreshApiRateLimiters() {
    refreshApiKeysFromStorage();
    // These are singletons, so we just reset them if needed, or update their internal limits
    tornRateLimiter.reset();
    weav3rRateLimiter.reset();
}

export class TornAPI {
    private static BASE_URL = "https://api.torn.com/v2/";

    /**
     * Sends a request to the Torn API with 1 retry on rate limit.
     */
    static async sendRequest(
        endpoint: string,
        method: string = "GET",
        queries: Record<string, string> = {},
        retryCount = 0
    ): Promise<any> {
        await tornRateLimiter.acquire();

        queries.comment = queries.comment ?? "Torn Ledger";
        const url = new URL(this.BASE_URL + endpoint);
        url.search = new URLSearchParams(queries).toString();

        const response = await fetch(url.toString(), {
            method: method,
            headers: {
                "Content-Type": "application/json",
                Authorization: `ApiKey ${LocalStorageInterface.getAnyAPIKey()}`,
            },
        });

        // Handle Torn's specific rate limit response (200 with code 5)
        const data = await response.clone().json().catch(() => ({}));
        if (data?.error?.code === 5 || response.status === 429) {
            if (retryCount === 0) {
                console.warn(`Torn API rate limit hit. Pausing 10s and retrying...`);
                tornRateLimiter.pauseGlobal(10000);
                await new Promise(r => setTimeout(r, 10000));
                return this.sendRequest(endpoint, method, queries, 1);
            }
            throw new Error("Torn API rate limit exceeded after retry.");
        }

        return response;
    }

    /**
     * Gets the basic user details from the Torn API.
     */
    static async getBasicUserDetails(): Promise<any> {
        const response = await this.sendRequest("user", "GET");
        const responseJSON = await response.json();
        return responseJSON.profile;
    }

    /**
     * Gets a Torn trade from the Torn API.
     */
    static async getTornTrade(id: string): Promise<TornTrade> {
        const response = await this.sendRequest(`user/${id}/trade`, "GET");
        const responseJson = await response.json();
        const tradeDetails = responseJson.trade;

        return new TornTrade(
            tradeDetails.id,
            tradeDetails.id,
            tradeDetails.timestamp,
            tradeDetails.description,
            tradeDetails.user.id,
            tradeDetails.trader.id,
            tradeDetails.items
        );
    }

    static async getTornTrades(from: number, to: number): Promise<TornTrade[]> {
        const queryParams: Record<string, string> = {
            cat: "finished",
            from: String(from),
            limit: "100",
            sort: "DESC",
            key: LocalStorageInterface.getTornFullAPIKey(),
        };
        if (to !== undefined) {
            queryParams.to = String(to);
        }
        let currentUrl = buildUrl(this.BASE_URL, "/user/trades", queryParams);

        let allTrades: any[] = [];
        while (true) {
            await tornRateLimiter.acquire();
            const response = await fetch(currentUrl, { cache: "no-store" });
            const data = await response.json().catch(() => ({}));

            if (data?.error?.code === 5) {
                tornRateLimiter.pauseGlobal(10000);
                await new Promise(r => setTimeout(r, 10000));
                continue; // Retry this page
            }

            if (data?.error?.code === 17) return [];
            if (data?.error) throw new Error(data.error.error || "Torn API error during trades fetch");

            const page: TornTradeListItem[] = Array.isArray(data?.trades) ? data.trades : [];
            if (page.length > 0) allTrades = allTrades.concat(page);

            const prevLink = data?._metadata?.links?.prev;
            if (!prevLink || page.length < 100) break;

            currentUrl = prevLink;
            const urlWithKey = new URL(currentUrl);
            urlWithKey.searchParams.set("key", LocalStorageInterface.getTornFullAPIKey());
            urlWithKey.searchParams.set("limit", "100");
            currentUrl = urlWithKey.toString();
        }

        // Sequential detail fetching
        const results: TornTrade[] = [];
        for (const trade of allTrades) {
            try {
                results.push(await this.getTornTrade(trade.id));
            } catch (e) {
                console.error(`Failed to fetch trade ${trade.id}, skipping.`, e);
            }
        }
        return results;
    }
}

export class T3BAPI {
    static BASE_URL = "https://weav3r.dev/api/";

    static async getReceipt(receiptId: string, retryCount = 0): Promise<Weav3rReceipt> {
        await weav3rRateLimiter.acquire();
        const apiKey = LocalStorageInterface.getWeav3rAPIKey();
        const userID = await MetadataInterface.getUserID();
        const response: Response = await fetch(
            `${T3BAPI.BASE_URL}trades/${userID}/${receiptId}?apiKey=${apiKey}`,
            { cache: "no-store" }
        );

        if (response.status === 429) {
            if (retryCount === 0) {
                console.warn(`Weav3r rate limit hit. Pausing 10s and retrying...`);
                weav3rRateLimiter.pauseGlobal(10000);
                await new Promise(r => setTimeout(r, 10000));
                return this.getReceipt(receiptId, 1);
            }
            throw new Error(`Weav3r rate limit exceeded for receipt ${receiptId}`);
        }

        const responseJSON = await response.json();
        if (!responseJSON || !responseJSON.id) {
            throw new Error(`Failed to fetch receipt ${receiptId}`);
        }

        return new Weav3rReceipt(
            responseJSON.id,
            responseJSON.id,
            responseJSON.total_value,
            responseJSON.created_at,
            responseJSON.updated_at,
            responseJSON.items
        );
    }

    static async getReceipts(from: number, to?: number): Promise<Weav3rReceipt[]> {
        const apiKey = LocalStorageInterface.getWeav3rAPIKey();
        const userID = await MetadataInterface.getUserID();
        let currentURL: string | null =
            `${T3BAPI.BASE_URL}trades/${userID}?from=${from}${to ? `&to=${to}` : ""}&apiKey=${apiKey}`;

        const collected: string[] = [];
        while (currentURL) {
            await weav3rRateLimiter.acquire();
            const response: Response = await fetch(currentURL, { cache: "no-store" });
            
            if (response.status === 429) {
                weav3rRateLimiter.pauseGlobal(10000);
                await new Promise(r => setTimeout(r, 10000));
                continue;
            }

            const data = await response.json();
            if (!data || !data.trades || !Array.isArray(data.trades)) break;

            const trades = data.trades;
            collected.push(...trades.map((t: any) => t.id).filter((id: string) => id));
            currentURL = data.metadata?.next || null;
        }

        // Sequential detail fetching
        const results: Weav3rReceipt[] = [];
        for (const rid of collected) {
            try {
                results.push(await this.getReceipt(rid));
            } catch (e) {
                console.error(`Failed to fetch receipt ${rid}, skipping.`, e);
            }
        }
        return results;
    }
}
