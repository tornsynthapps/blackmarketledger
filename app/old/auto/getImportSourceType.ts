import { NormalizedLog } from "@/lib/old/torn-api";
import { TransactionSourceType } from "@/lib/old/parser";

export function getImportSourceType(log: NormalizedLog): TransactionSourceType | undefined {
    const { typeId, title, category } = log;
    const haystack = `${title || ""} ${category || ""}`.toLowerCase();

    if ([1112, 1113].includes(typeId) || haystack.includes("item market")) return "item-market";
    if ([1225, 1226].includes(typeId) || haystack.includes("bazaar")) return "bazaar";
    if ([5010, 5011].includes(typeId) || haystack.includes("points")) return "points-market";
    if (typeId === 7000 || haystack.includes("museum")) return "museum";
    if (typeId === 4201 || haystack.includes("travel") || haystack.includes("abroad"))
        return "travel";
    if (haystack.includes("trade")) return "trade";

    return undefined;
}
