import { NewRateLimiter } from "./api";
import { getTornApiRateLimit, getTornApiKeyFull } from "@/lib/old/api-keys";

/**
 * Interface representing a complex data structure for Torn inventory items.
 * Maps natively to Torn API's v1/v2 user/inventory payload.
 */
export interface TornInventoryItem {
    ID?: number;
    id?: number;
    name: string;
    amount?: number;
    quantity?: number;
    market_price?: number;
    market_value?: number;
    type?: string;
    equipped?: number;
}

/**
 * Interface representing the response wrapper from Torn API.
 */
export interface TornInventoryResponse {
    inventory?: TornInventoryItem[] | Record<string, TornInventoryItem[]>;
    error?: { error: string };
}

/**
 * List of valid inventory categories extracted from Torn API v2 schema.
 */
export const TORN_INVENTORY_CATEGORIES = [
    'Alcohol', 'Armor', 'Artifact', 'Book', 'Booster', 'Candy', 'Car', 
    'Clothing', 'Collectible', 'Defensive', 'Drug', 'Energy Drink', 'Enhancer', 
    'Flower', 'Jewelry', 'Material', 'Medical', 'Melee', 'Other', 'Plushie', 
    'Primary', 'Secondary', 'Special', 'Supply Pack', 'Temporary', 'Tool', 'Weapon'
];

/**
 * Specialized object-oriented client for interacting with Torn API.
 */
export class TornAPIClient {
    private static rateLimiter = new NewRateLimiter(getTornApiRateLimit());

    /**
     * Purpose: Private function that securely calls a specific endpoint at Torn's V2 API.
     * 
     * @param endpoint (string): The V2 endpoint path (e.g., 'user/inventory')
     * @param queryParams (Record<string, string>): Additional URL search parameters
     * @returns (Promise<any>): Raw JSON response from Torn API
     * @throws Error if network request fails
     * 
     * Side Effects: Executes network call to `api.torn.com/v2/`, consumes a rate limiter token.
     */
    private static async sendV2Request(
        endpoint: string,
        queryParams: Record<string, string> = {}
    ): Promise<any> {
        await this.rateLimiter.acquire();
        
        const apiKey = getTornApiKeyFull();
        if (!apiKey) {
            throw new Error("Missing full-access API key in persistent storage.");
        }

        const url = new URL(`https://api.torn.com/v2/${endpoint}`);
        const searchParams = new URLSearchParams(queryParams);
        searchParams.set("key", apiKey);
        url.search = searchParams.toString();
        
        const response = await fetch(url.toString(), {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });
        return await response.json();
    }

    private static catalogCache: any[] | null = null;

    private static async getCatalog(): Promise<any[]> {
        if (this.catalogCache) return this.catalogCache;
        const catalogData = await this.sendV2Request("torn/items", { cat: "All" });
        if (catalogData && Array.isArray(catalogData.items)) {
            this.catalogCache = catalogData.items;
            return this.catalogCache!;
        }
        return [];
    }

    /**
     * Purpose: Fetch the current global catalog for Torn, extracting market prices exclusively.
     * 
     * @returns (Promise<Record<number, number>>): A dictionary mapping item ID to its market price.
     */
    public static async getMarketPrices(): Promise<Record<number, number>> {
        const items = await this.getCatalog();
        const priceMap: Record<number, number> = {};

        for (const item of items) {
            if (item.id && item.value && typeof item.value.market_price === "number") {
                priceMap[item.id] = item.value.market_price;
            }
        }

        return priceMap;
    }

    /**
     * Purpose: Fetch the names of all items in Torn's global catalog.
     * 
     * @returns (Promise<Record<number, string>>): A dictionary mapping item ID to its canonical name.
     */
    public static async getItemNames(): Promise<Record<number, string>> {
        const items = await this.getCatalog();
        const nameMap: Record<number, string> = {};

        for (const item of items) {
            if (item.id && item.name) {
                nameMap[item.id] = item.name;
            }
        }

        return nameMap;
    }
    /**
     * Purpose: Fetch the current user's inventory securely through Torn's API.
     * 
     * @returns (Promise<Record<number, number>>): Dictionary mapping item ID to current inventory quantity.
     * @throws Error if Torn API request critically fails.
     */
    public static async fetchInventory(): Promise<Record<number, number>> {
        const fetchPromises = TORN_INVENTORY_CATEGORIES.map(async (category) => {
            try {
                const data: TornInventoryResponse = await this.sendV2Request("user/inventory", { cat: category });
                
                if (data.error) {
                    if (data.error.error === "Incorrect category") {
                        return [];
                    }
                    throw new Error(data.error.error || `Failed to fetch inventory category ${category} from Server`);
                }
                
                let parsedItems: any[] = [];
                if (data.inventory && Array.isArray((data.inventory as any).items)) {
                    parsedItems = (data.inventory as any).items;
                }
                return parsedItems;
            } catch (error) {
                console.error(`Error fetching category ${category}:`, error);
                throw error;
            }
        });

        const results = await Promise.all(fetchPromises);
        const mappedInventory: Record<number, number> = {};
        
        for (const item of results.flat()) {
            const rawId = item.ID ?? item.id;
            const qty = item.amount || item.quantity || 0;
            if (rawId && qty > 0) {
                mappedInventory[rawId] = (mappedInventory[rawId] || 0) + qty;
            }
        }
        
        return mappedInventory;
    }
}
