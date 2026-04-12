import { FLOWER_SET_ITEMS, PLUSHIE_SET_ITEMS, SetItemInfo } from "./parser";

export function getSetItems(setType: "flower" | "plushie"): SetItemInfo[] {
    return setType === "flower" ? FLOWER_SET_ITEMS : PLUSHIE_SET_ITEMS;
}

export function calculateSetTotalMarketValue(setType: "flower" | "plushie"): number {
    const items = getSetItems(setType);
    return items.reduce((sum, item) => sum + item.marketValue, 0);
}

export function calculateItemProportions(
    setType: "flower" | "plushie",
    totalMarketValue: number
): Map<number, number> {
    const items = getSetItems(setType);
    const proportionMap = new Map<number, number>();

    for (const item of items) {
        const proportion = totalMarketValue > 0 ? item.marketValue / totalMarketValue : 0;
        proportionMap.set(item.id, proportion);
    }

    return proportionMap;
}

export function getItemNameById(setType: "flower" | "plushie", itemId: number): string | null {
    const items = getSetItems(setType);
    const item = items.find((i) => i.id === itemId);
    return item ? item.name : null;
}
