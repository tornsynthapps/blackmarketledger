"use client";

import { useState, useMemo, useEffect } from "react";
import { useJournal } from "@/store/useJournal";
import { formatItemName } from "@/lib/parser";
import { Plane, AlertCircle, ArrowRightLeft, Loader2, Check } from "lucide-react";
import StatsModal from "@/components/StatsModal";

export default function AbroadDashboard() {
    const { inventory, weav3rApiKey, weav3rUserId, isLoaded, addLogs, transactions } = useJournal();
    const [prices, setPrices] = useState<Record<string, number>>({});
    const [isFetching, setIsFetching] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [sellingItemId, setSellingItemId] = useState<string | null>(null);
    const [modalState, setModalState] = useState<{
        isOpen: boolean;
        title: string;
        statType: 'profit' | 'inventory' | 'mugLoss' | 'netProfit';
    }>({
        isOpen: false,
        title: '',
        statType: 'profit'
    });

    // Fetch Weav3r Pricelist
    useEffect(() => {
        if (!isLoaded || !weav3rUserId || !weav3rApiKey) return;

        setIsFetching(true);
        setError(null);

        fetch(`https://weav3r.dev/api/pricelist/${weav3rUserId}?apiKey=${weav3rApiKey}`)
            .then(res => res.json())
            .then(data => {
                if (data.error) throw new Error(data.error);

                if (Array.isArray(data)) {
                    const priceMap: Record<string, number> = {};
                    data.forEach((item: any) => {
                        const normalizedName = item.name.trim().toLowerCase();
                        priceMap[normalizedName] = item.buyPrice;
                    });
                    setPrices(priceMap);
                }
            })
            .catch(err => {
                console.error("Failed to fetch pricelist", err);
                setError(err.message || "Failed to load Weav3r pricelist.");
            })
            .finally(() => {
                setIsFetching(false);
            });

    }, [isLoaded, weav3rUserId, weav3rApiKey]);

    const abroadStats = useMemo(() => {
        const items: { name: string; stock: number; avgCost: number; totalCost: number; realizedProfit: number }[] = [];
        let totalValue = 0;
        let totalProfit = 0;

        inventory.forEach((stats, name) => {
            if (stats.abroadStock > 0 || stats.abroadRealizedProfit !== 0 || stats.abroadTotalCost > 0) {
                const avgCost = stats.abroadStock > 0 ? stats.abroadTotalCost / stats.abroadStock : 0;
                items.push({
                    name,
                    stock: stats.abroadStock,
                    avgCost,
                    totalCost: Math.max(0, stats.abroadTotalCost),
                    realizedProfit: stats.abroadRealizedProfit
                });

                totalValue += Math.max(0, stats.abroadTotalCost);
                totalProfit += stats.abroadRealizedProfit;
            }
        });

        // Sort by realized profit descending
        items.sort((a, b) => b.realizedProfit - a.realizedProfit);

        return { items, totalValue, totalProfit };
    }, [inventory]);

    const handleSelfSell = (itemGroup: { name: string; stock: number }) => {
        if (itemGroup.stock <= 0) return;

        const price = prices[itemGroup.name];
        if (!price || price <= 0) {
            alert(`No valid buy price found for ${formatItemName(itemGroup.name)} on Weav3r. Cannot self sell.`);
            return;
        }

        if (!confirm(`Are you sure you want to self-sell ${itemGroup.stock}x ${formatItemName(itemGroup.name)} for $${price.toLocaleString()} each?\n\nThis will record a sale in Abroad and a reinvested purchase in Normal stock.`)) {
            return;
        }

        setSellingItemId(itemGroup.name);

        // We use addLogs directly to inject the paired explicit transaction objects.
        // Even though standard parser splits them, directly feeding `addLogs` with parsed objects skips the string parser but still routes through store logic.
        const logs: any[] = [
            {
                type: 'SELL',
                item: itemGroup.name,
                amount: itemGroup.stock,
                price: price,
                tag: 'Abroad'
            },
            {
                type: 'BUY',
                item: itemGroup.name,
                amount: itemGroup.stock,
                price: price,
                tag: 'Normal'
            }
        ];

        // Slight delay to allow UI to render spinner
        setTimeout(() => {
            Promise.resolve(addLogs(logs))
                .catch((error) => {
                    console.error("Failed to save abroad self-sell logs", error);
                })
                .finally(() => {
                    setSellingItemId(null);
                });
        }, 500);
    };

    const openStatsModal = (title: string, statType: 'profit' | 'inventory' | 'mugLoss' | 'netProfit') => {
        setModalState({ isOpen: true, title, statType });
    };

    const closeStatsModal = () => {
        setModalState({ isOpen: false, title: '', statType: 'profit' });
    };

    if (!isLoaded) return null;

    return (
        <div
            className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500"
            style={{
                '--primary': '#0d9488', // Emerald/Teal
            } as React.CSSProperties}
        >
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Abroad Tracking</h1>
                <p className="text-foreground/60 mt-2">Manage items purchased internationally and track their separate cost basis.</p>
            </div>

            {/* Config warning */}
            {(!weav3rApiKey || !weav3rUserId) && (
                <div className="bg-warning/10 border border-warning/20 p-4 rounded-xl flex items-start gap-4">
                    <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-semibold text-warning">Weav3r Config Missing</h3>
                        <p className="text-sm text-foreground/70 mt-1">Configure your Weav3r API Key and User ID on the Terminal page to enable the "Self Sell" feature automatically using your pricelist.</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-danger/10 border border-danger/20 p-4 rounded-xl flex items-start gap-4">
                    <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-semibold text-danger">Pricelist Error</h3>
                        <p className="text-sm text-danger/80 mt-1">{error}</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-panel border border-border p-6 rounded-xl relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 bg-primary/10 w-32 h-32 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors" />
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Plane className="w-5 h-5 text-primary" />
                        </div>
                        <h2 className="text-sm font-semibold text-foreground/80">Abroad Inventory Value</h2>
                    </div>
                    <p className="text-3xl font-bold tracking-tight">${Math.round(abroadStats.totalValue).toLocaleString()}</p>
                </div>
                <div 
                    className="bg-panel border border-border p-6 rounded-xl relative overflow-hidden group hover:border-success/30 transition-all cursor-pointer hover:scale-[1.02]"
                    onClick={() => openStatsModal("Abroad Realized Profit", "profit")}
                >
                    <div className="absolute -right-6 -top-6 bg-success/10 w-32 h-32 rounded-full blur-2xl group-hover:bg-success/20 transition-colors" />
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-success/10 rounded-lg">
                            <Plane className="w-5 h-5 text-success" />
                        </div>
                        <h2 className="text-sm font-semibold text-foreground/80">Abroad Realized Profit</h2>
                    </div>
                    <p className={`text-3xl font-bold tracking-tight ${abroadStats.totalProfit > 0 ? 'text-success' : abroadStats.totalProfit < 0 ? 'text-danger' : ''}`}>
                        {abroadStats.totalProfit > 0 ? '+' : ''}${Math.round(abroadStats.totalProfit).toLocaleString()}
                    </p>
                    <p className="text-xs text-primary/70 mt-2 font-medium">Click to view trends</p>
                </div>
            </div>

            <div className="bg-panel border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase text-foreground/60 bg-foreground/5">
                            <tr>
                                <th className="px-6 py-4 whitespace-nowrap">Item</th>
                                <th className="px-6 py-4 text-right">Abroad Stock</th>
                                <th className="px-6 py-4 text-right">Avg Cost</th>
                                <th className="px-6 py-4 text-right">Total Cost</th>
                                <th className="px-6 py-4 text-right">Realized Profit</th>
                                <th className="px-6 py-4 text-center">Self Sell</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {abroadStats.items.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-foreground/50">
                                        No abroad items found. Logs tagged with `Abroad` will appear here.
                                    </td>
                                </tr>
                            ) : (
                                abroadStats.items.map((item) => {
                                    const availablePrice = prices[item.name];
                                    const isSellingThis = sellingItemId === item.name;

                                    return (
                                        <tr key={item.name} className="hover:bg-foreground/[0.01] transition-colors">
                                            <td className="px-6 py-4 font-medium sm:whitespace-nowrap">{formatItemName(item.name)}</td>
                                            <td className="px-6 py-4 text-right font-mono">
                                                <span className="bg-primary/10 text-primary px-2 py-1 rounded-md">
                                                    {item.stock.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-foreground/70">${Math.round(item.avgCost).toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right">${Math.round(item.totalCost).toLocaleString()}</td>
                                            <td className={`px-6 py-4 text-right font-medium ${item.realizedProfit > 0 ? "text-success" : item.realizedProfit < 0 ? "text-danger" : "text-foreground/70"}`}>
                                                {item.realizedProfit > 0 ? "+" : ""}${Math.round(item.realizedProfit).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => handleSelfSell(item)}
                                                    disabled={item.stock <= 0 || !availablePrice || isSellingThis}
                                                    title={!availablePrice ? `No pricelist data found for ${formatItemName(item.name)}` : `Self sell to standard tracker stock at $${availablePrice.toLocaleString()} each`}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary/10 text-primary hover:bg-primary hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    {isSellingThis ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <ArrowRightLeft className="w-3.5 h-3.5" />
                                                    )}
                                                    Self Sell
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <StatsModal
                isOpen={modalState.isOpen}
                onClose={closeStatsModal}
                title={modalState.title}
                transactions={transactions.filter(t => t.tag === 'Abroad')}
                statType={modalState.statType}
                inventoryScope="abroad"
            />
        </div>
    );
}
