import { InventoryItemStats } from "@/lib/old/interfaces/transactions";
import { formatItemName } from "@/lib/old/parser";
import React from "react";

export function ItemGridCard({
    name,
    stats,
    buyInfo,
    priceInfo,
    mode,
    itemId,
    maxStock,
}: {
    name: string;
    stats: InventoryItemStats;
    buyInfo?: { current: number; buy: number };
    priceInfo?: {
        marketPrice: number;
        currentPercentage: number;
        newPercentage: number | string;
        onPercentageChange: (val: number | string) => void;
    };
    mode?: "buy" | "price" | "view";
    itemId?: number;
    maxStock?: number;
}) {
    const avgCost = stats.stock > 0 ? stats.totalCost / stats.stock : 0;
    const needsBuy = buyInfo && buyInfo.buy > 0;
    const isBuyMode = mode === "buy";
    const isPriceMode = mode === "price";

    let bgClass = "bg-background/40";
    let borderClass = "border-border/40 hover:border-border/70";
    let stockClass = "text-foreground/70";
    let glowClass = "";

    // Helper to get variable opacity background based on stock level relative to maxStock
    const getStockBgClass = (
        stock: number,
        baseColor: "primary" | "success" | "blue" = "primary"
    ) => {
        if (stock === 0) return "bg-background/30 hover:bg-background/50";

        let ratio = 0;
        if (mode === "buy" && buyInfo && buyInfo.buy > 0) {
            ratio = stock > 0 ? Math.max(1, buyInfo.buy / stock) : 1;
        } else if (mode === "view" || mode === "price") {
            ratio = maxStock && maxStock > 0 ? stock / maxStock : 0;
        }

        if (baseColor === "primary") {
            if (ratio >= 0.8) return "bg-primary/30 dark:bg-primary/40";
            if (ratio >= 0.5) return "bg-primary/20 dark:bg-primary/30";
            if (ratio >= 0.2) return "bg-primary/15 dark:bg-primary/20";
            if (ratio > 0) return "bg-primary/10 dark:bg-primary/15";
            return "bg-background/60";
        }
        if (baseColor === "success") {
            if (ratio >= 0.8) return "bg-success/30 dark:bg-success/40";
            if (ratio >= 0.5) return "bg-success/20 dark:bg-success/30";
            if (ratio >= 0.2) return "bg-success/15 dark:bg-success/20";
            if (ratio > 0) return "bg-success/10 dark:bg-success/15";
            return "bg-background/60";
        }
        if (baseColor === "blue") {
            if (ratio >= 0.8) return "bg-blue-500/20 dark:bg-blue-500/30";
            if (ratio >= 0.5) return "bg-blue-500/15 dark:bg-blue-500/25";
            if (ratio >= 0.2) return "bg-blue-500/10 dark:bg-blue-500/20";
            if (ratio > 0) return "bg-blue-500/10";
            return "bg-background/60";
        }
        return "bg-background/30 hover:bg-background/50";
    };

    if (isBuyMode) {
        if (needsBuy) {
            bgClass = "bg-success/10 dark:bg-success/20";
            borderClass = "border-success/40 hover:border-success/60";
            stockClass = "text-success font-bold";
            glowClass = "shadow-[0_0_10px_rgba(34,197,94,0.1)]";
        } else {
            bgClass = getStockBgClass(stats.stock, "success");
            borderClass = "border-success/20";
        }
    } else if (isPriceMode) {
        let isChanged = false;
        let diffPct = 0;

        if (priceInfo) {
            const newPct =
                typeof priceInfo.newPercentage === "number"
                    ? priceInfo.newPercentage
                    : parseFloat(priceInfo.newPercentage as string);

            if (!isNaN(newPct) && Math.abs(newPct - priceInfo.currentPercentage) > 0.01) {
                isChanged = true;
                diffPct = Math.abs(newPct - priceInfo.currentPercentage);
            }
        }

        if (isChanged) {
            if (diffPct >= 10) bgClass = "bg-blue-500/30 dark:bg-blue-500/40";
            else if (diffPct >= 5) bgClass = "bg-blue-500/20 dark:bg-blue-500/30";
            else if (diffPct >= 2) bgClass = "bg-blue-500/15 dark:bg-blue-500/20";
            else bgClass = "bg-blue-500/10 dark:bg-blue-500/10";
            borderClass = "border-blue-500/50 shadow-[0_0_8px_rgba(59,130,246,0.2)]";
        } else {
            bgClass = "bg-background/40 hover:bg-background/60";
            borderClass = "border-border/40 hover:border-border/50";
        }

        stockClass = "text-blue-500 font-semibold";
    } else {
        if (needsBuy) {
            bgClass = "bg-success/5";
            borderClass = "border-success/30";
        } else if (stats.stock > 0) {
            bgClass = getStockBgClass(stats.stock, "primary");
            borderClass = "border-primary/30 hover:border-primary/50";
            stockClass = "text-primary font-semibold";
        } else {
            bgClass = "bg-background/30 hover:bg-background/50";
        }
    }

    return (
        <div
            className={`group flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 cursor-default ${bgClass} ${borderClass} ${glowClass} ${
                isPriceMode ? "min-h-[90px]" : "items-center"
            }`}
        >
            {/* Image Container */}
            <div className={`shrink-0 flex items-center justify-center rounded-lg bg-background/60 shadow-sm border border-border/30 group-hover:scale-105 transition-transform duration-200 ${isPriceMode ? "w-12 h-12 mt-1" : "w-10 h-10"}`}>
                {itemId && itemId > 0 ? (
                    <img
                        src={`https://www.torn.com/images/items/${itemId}/large.png`}
                        alt={formatItemName(name)}
                        className={`${isPriceMode ? "w-14 h-14" : "w-12 h-12"} object-contain drop-shadow-sm`}
                        loading="lazy"
                    />
                ) : (
                    <div className="w-6 h-6 bg-foreground/10 rounded-full animate-pulse" />
                )}
            </div>

            {/* Content Area */}
            <div className="flex flex-col flex-1 min-w-0 justify-center">
                <div className="flex items-start justify-between gap-1">
                    <h4
                        className={`font-bold leading-tight tracking-wide uppercase truncate text-foreground/80 group-hover:text-foreground transition-colors ${
                            isPriceMode ? "text-[14px]" : "text-[13px]"
                        }`}
                        title={formatItemName(name)}
                    >
                        {formatItemName(name)}
                    </h4>
                    {isPriceMode && (
                        <span className={`text-[15px] font-mono leading-none ${stockClass}`}>
                            {stats.stock}
                        </span>
                    )}
                </div>

                {isPriceMode && priceInfo ? (
                    <div className="flex flex-col gap-1 w-full mt-2">
                        <div className="flex items-center justify-between text-[11px]">
                            <span className="text-foreground/60 font-mono">${priceInfo.marketPrice.toLocaleString()}</span>
                            <span className={priceInfo.currentPercentage > 0 ? "text-success font-bold" : "text-foreground/40"}>
                                {priceInfo.currentPercentage > 0 ? `${priceInfo.currentPercentage}%` : "—"}
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">New %</span>
                            <div className="flex items-center gap-1">
                                <input
                                    type="number"
                                    step="any"
                                    min={0}
                                    max={200}
                                    value={priceInfo.newPercentage}
                                    onChange={(e) => priceInfo.onPercentageChange(e.target.value)}
                                    className="w-16 px-1.5 py-0.5 text-[13px] font-bold text-center bg-background border border-blue-500/30 rounded focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50"
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-end justify-between mt-0.5 gap-2">
                        <div className="flex items-baseline gap-1.5">
                            <span className={`text-[15px] leading-none ${stockClass}`}>
                                {buyInfo ? `+${buyInfo.buy}` : stats.stock}
                            </span>
                            {buyInfo && needsBuy && (
                                <span className="text-[10px] font-bold text-success">
                                    {buyInfo.current}
                                </span>
                            )}
                        </div>

                        {!buyInfo && stats.stock > 0 && (
                            <div className="text-[10px] font-medium text-foreground/40 whitespace-nowrap">
                                ${Math.round(avgCost).toLocaleString()}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
