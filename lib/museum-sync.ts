import { getAllTransactions } from "@/lib/old/idb";
import {
    AnyTrackedTransaction,
    calculateInventoryFromTransactions,
} from "@/lib/old/interfaces/transactions";
import { FLOWER_SET_ITEMS, PLUSHIE_SET_ITEMS } from "@/lib/old/parser";
import { getApiKey as extGetApiKey, getUserId as extGetUserId } from "@/lib/old/api-keys";

const defaultThresholds = {
    threshold1: 500,
    threshold2: 1000,
    threshold3: 2000,
    offer1: 101,
    offer2: 100,
    offer3: 98,
    offerElse: 95,
};

function calculateOfferPercentage(
    stock: number,
    thresholds: typeof defaultThresholds
): number {
    if (stock <= thresholds.threshold1) return thresholds.offer1;
    if (stock <= thresholds.threshold2) return thresholds.offer2;
    if (stock <= thresholds.threshold3) return thresholds.offer3;
    return thresholds.offerElse;
}

export async function runMuseumPricelistSyncCheck() {
    try {
        const apiKey = extGetApiKey();
        const userId = extGetUserId();

        if (!apiKey || !userId) {
            return;
        }

        // 1. Fetch backend APIs
        const [marketRes, priceRes] = await Promise.all([
            fetch("https://weav3r.dev/api/marketplace").catch(() => null),
            fetch(`https://weav3r.dev/api/pricelist/${userId}?apiKey=${apiKey}`).catch(() => null),
        ]);

        if (!marketRes?.ok || !priceRes?.ok) {
            return;
        }

        const marketData = await marketRes.json();
        const priceData = await priceRes.json();

        const marketPrices: Record<number, number> = marketData.data || {};
        const userPricelist: Record<string, number> = {};
        
        if (priceData.items && Array.isArray(priceData.items)) {
            priceData.items.forEach((item: any) => {
                if (item.pricingType === "market_percentage") {
                    userPricelist[item.name.toLowerCase()] = item.details?.currentPrice || 0;
                }
            });
        }

        // 2. Fetch User Stock
        const pref = localStorage.getItem("bml_storage_pref");
        const activeDB = pref === "drive" ? "GoogleCacheLogsDB" : "LogsDB";
        const transactions = await getAllTransactions<AnyTrackedTransaction>(activeDB);
        
        const inventory = calculateInventoryFromTransactions(transactions);

        // 3. Load Threshold Settings
        const savedThresholds = localStorage.getItem("museum-pricelist-thresholds");
        const thresholdSettings = savedThresholds
            ? { ...defaultThresholds, ...JSON.parse(savedThresholds) }
            : defaultThresholds;

        let flowersDrifted = false;
        let plushiesDrifted = false;

        // Check Flowers Drift
        for (const item of FLOWER_SET_ITEMS) {
            const stock = inventory.get(item.name)?.stock || 0;
            const autoPercentage = calculateOfferPercentage(stock, thresholdSettings);
            
            const marketPrice = marketPrices[item.id] || item.marketValue || 0;
            const currentPrice = userPricelist[item.name.toLowerCase()] || 0;
            const currentPercentage = marketPrice > 0 ? Number(((currentPrice / marketPrice) * 100).toFixed(1)) : 0;
            
            if (autoPercentage !== currentPercentage) {
                flowersDrifted = true;
                break;
            }
        }

        // Check Plushies Drift
        for (const item of PLUSHIE_SET_ITEMS) {
            const stock = inventory.get(item.name)?.stock || 0;
            const autoPercentage = calculateOfferPercentage(stock, thresholdSettings);
            
            const marketPrice = marketPrices[item.id] || item.marketValue || 0;
            const currentPrice = userPricelist[item.name.toLowerCase()] || 0;
            const currentPercentage = marketPrice > 0 ? Number(((currentPrice / marketPrice) * 100).toFixed(1)) : 0;
            
            if (autoPercentage !== currentPercentage) {
                plushiesDrifted = true;
                break;
            }
        }

        // 4. Dispatch Flags
        const driftStatus = { flowers: flowersDrifted, plushies: plushiesDrifted };
        localStorage.setItem("museum-drift-status", JSON.stringify(driftStatus));
        window.dispatchEvent(new CustomEvent("museum-sync-updated", { detail: driftStatus }));

    } catch (e) {
        console.error("Museum pricelist sync check failed:", e);
    }
}
