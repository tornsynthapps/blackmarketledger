import { getTEApiKey, getTERateLimit } from "./old/api-keys";
import { NewRateLimiter } from "./api";

export interface TornExchangeReceiptSummary {
    created_at: string;
    seller: string;
    total: number;
    profit: number;
    url: string;
}

export interface TornExchangeReceiptItem {
    name: string;
    price: number;
    quantity: number;
    subtotal: number;
}

export interface TornExchangeReceiptMeta {
    receipt_id: string;
    created_at: string;
    seller: string;
    total: number;
    profit: number;
}

export interface TornExchangeReceipt {
    data: Record<string, TornExchangeReceiptItem>;
    meta: TornExchangeReceiptMeta;
}

export interface TornExchangePricelistItem {
    item_id: number;
    name: string;
    price: number;
}

export interface TornExchangePricelistMeta {
    description: string;
    trader: string;
    vote_score: number;
    last_updated: string;
    time_since_last_trade: string;
}

export interface TornExchangePricelist {
    items: TornExchangePricelistItem[];
    meta: TornExchangePricelistMeta;
}

export interface TornExchangeMarketPrice {
    item_id: number;
    item_name: string;
    te_price: number;
    torn_price: number;
}

export class TornExchange {
    private static instance: TornExchange;
    private limiter: NewRateLimiter;
    private baseUrl = "https://www.tornexchange.com/api";

    private constructor() {
        const limit = getTERateLimit() || 5;
        this.limiter = new NewRateLimiter(limit);
    }

    public static getInstance(): TornExchange {
        if (!TornExchange.instance) {
            TornExchange.instance = new TornExchange();
        }
        return TornExchange.instance;
    }

    /**
     * Updates the rate limiter with new configuration.
     * @param requestsPerMinute (number): New rate limit (1-8 req/min)
     */
    public updateRateLimit(requestsPerMinute: number): void {
        this.limiter = new NewRateLimiter(requestsPerMinute);
    }

    private async fetchWithAuth<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        await this.limiter.acquire();
        const apiKey = getTEApiKey();
        if (!apiKey) {
            throw new Error("TornExchange API key not found");
        }

        const url = new URL(`${this.baseUrl}${endpoint}`);
        // Only append key if it's not already in the body (for POST)
        if (options.method !== "POST") {
            url.searchParams.append("key", apiKey);
        }

        const response = await fetch(url.toString(), {
            ...options,
            headers: {
                ...options.headers,
                "Accept": "application/json",
                ...(options.body ? { "Content-Type": "application/json" } : {}),
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `API error: ${response.status}`);
        }

        const json = await response.json();
        if (json.status !== "success") {
            throw new Error(json.message || "API returned error status");
        }

        return json;
    }

    private async fetchNoAuth<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        await this.limiter.acquire();
        const url = new URL(`${this.baseUrl}${endpoint}`);

        const response = await fetch(url.toString(), {
            ...options,
            headers: {
                ...options.headers,
                "Accept": "application/json",
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `API error: ${response.status}`);
        }

        const json = await response.json();
        if (json.status !== "success") {
            throw new Error(json.message || "API returned error status");
        }

        return json;
    }

    // Receipt Methods

    /**
     * Fetches a single receipt with full line items.
     * @param receiptId (string): The receipt ID (from URL field of summary)
     */
    async getReceipt(receiptId: string): Promise<TornExchangeReceipt> {
        // Extract ID from full URL if provided
        const id = receiptId.includes("/") ? receiptId.split("/").pop()! : receiptId;
        const response = await this.fetchNoAuth<any>(`/receipt/${id}`);
        return {
            data: response.data,
            meta: response.meta
        };
    }

    /**
     * Fetches all receipts with pagination, handling filtering and loops.
     * @param from (string?): Start date (YYYY-MM-DD)
     * @param to (string?): End date (YYYY-MM-DD)
     */
    async getReceipts(from?: string, to?: string): Promise<TornExchangeReceiptSummary[]> {
        let allReceipts: TornExchangeReceiptSummary[] = [];
        let page = 1;
        let totalPages = 1;

        do {
            const url = new URL(`${this.baseUrl}/receipts`);
            url.searchParams.append("page", page.toString());
            url.searchParams.append("per_page", "100");
            // TODO: Check if TE supports date filtering, else use pagination until
            // we find receipt with timestamp < from.
            if (from) url.searchParams.append("from", from);
            if (to) url.searchParams.append("to", to);

            const endpoint = `/receipts?${url.searchParams.toString()}`;
            // fetchWithAuth appends key, but I already have a full URL here... 
            // Better to pass just the search params or modify fetchWithAuth
            
            // Refactored call to avoid double baseUrl/key appending
            const response = await this.fetchWithAuth<any>(`/receipts?${url.searchParams.toString()}`);
            
            allReceipts = allReceipts.concat(response.data);
            totalPages = response.meta.total_pages;
            page++;
        } while (page <= totalPages);

        return allReceipts;
    }

    // Pricelist Methods

    /**
     * Fetches a trader's full pricelist.
     * @param identifier (string): Torn ID or username
     */
    async getPricelist(identifier: string): Promise<TornExchangePricelist> {
        const response = await this.fetchWithAuth<any>(`/prices/${identifier}`);
        return {
            items: response.data.items,
            meta: response.meta
        };
    }

    /**
     * Convenience method to get authenticated user's pricelist.
     */
    async getMyPricelist(): Promise<TornExchangePricelist> {
        const apiKey = getTEApiKey();
        return this.getPricelist(apiKey);
    }

    /**
     * Deletes multiple listings in a batch call.
     * @param itemIds (number[]): Array of item IDs to remove
     */
    async delistItems(itemIds: number[]): Promise<any> {
        const apiKey = getTEApiKey();
        const body = {
            key: apiKey,
            action: "delete",
            listings: itemIds.map(id => ({ item_id: id }))
        };

        return this.fetchWithAuth<any>("/modify_listing", {
            method: "POST",
            body: JSON.stringify(body)
        });
    }

    /**
     * Updates multiple prices using discount percentage.
     * @param updates ({itemId, percentage}[]): 95 -> 5% discount, 105 -> 5% premium
     */
    async updateItemPricesByPercentage(updates: { itemId: number, percentage: number }[]): Promise<any> {
        const apiKey = getTEApiKey();
        const body = {
            key: apiKey,
            action: "update",
            listings: updates.map(u => ({
                item_id: u.itemId,
                discount: 100 - u.percentage // TE API takes 'discount' off TE value
            }))
        };

        return this.fetchWithAuth<any>("/modify_listing", {
            method: "POST",
            body: JSON.stringify(body)
        });
    }

    /**
     * Updates multiple prices using fixed Torn currency amounts.
     * @param updates ({itemId, price}[]): Fixed price per item
     */
    async updateItemPricesByFixed(updates: { itemId: number, price: number }[]): Promise<any> {
        const apiKey = getTEApiKey();
        const body = {
            key: apiKey,
            action: "update",
            listings: updates.map(u => ({
                item_id: u.itemId,
                fixed_price: u.price
            }))
        };

        return this.fetchWithAuth<any>("/modify_listing", {
            method: "POST",
            body: JSON.stringify(body)
        });
    }

    /**
     * Fetches TE and Torn market prices for all items.
     */
    async getAllPrices(): Promise<TornExchangeMarketPrice[]> {
        const response = await this.fetchWithAuth<any>("/all_prices");
        return response.data;
    }
}