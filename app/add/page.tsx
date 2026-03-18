"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useJournal, InventoryItemStats } from "@/store/useJournal";
import { parseLogLine, ParsedLog, formatItemName, formatToStandardLog, PARSER_VERSION, FLOWER_SET, PLUSHIE_SET } from "@/lib/parser";
import { Check, Info, AlertCircle, Save, Trash2, ShieldAlert, AlertTriangle, SkipForward } from "lucide-react";
import Link from "next/link";
import { useHapticFeedback } from "@/lib/useHapticFeedback";

export default function AddLogs() {
    const [input, setInput] = useState("");
    const [showToast, setShowToast] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const [configError, setConfigError] = useState("");
    const [justPasted, setJustPasted] = useState(false);
    const highlightRef = useRef<HTMLDivElement>(null);
    const { addLogs, isLoaded, clearLogs, weav3rApiKey, weav3rUserId, saveWeaverConfig, skipNegativeStock, updateSkipNegativeStock, inventory, transactions, calculateInventory } = useJournal();
    const { vibrate } = useHapticFeedback();

    const [tempApiKey, setTempApiKey] = useState("");

    useEffect(() => {
        if (isLoaded) {
            setTempApiKey(weav3rApiKey);
        }
    }, [isLoaded, weav3rApiKey]);

    useEffect(() => {
        let t: NodeJS.Timeout;
        if (showToast) {
            t = setTimeout(() => setShowToast(false), 3000);
        }
        return () => clearTimeout(t);
    }, [showToast]);

    useEffect(() => {
        const urlMatch = input.match(/https:\/\/weav3r\.dev\/receipt\/([A-Za-z0-9_-]+)/);
        if (urlMatch && !isFetching) {
            if (!weav3rApiKey || !weav3rUserId) {
                setConfigError("Please save a valid Weav3r API key to fetch trades.");
                return;
            }

            const receiptId = urlMatch[1];
            setConfigError("");
            setIsFetching(true);

            fetch(`https://weav3r.dev/api/trades/${weav3rUserId}/${receiptId}?apiKey=${weav3rApiKey}`)
                .then(res => res.json())
                .then(data => {
                    if (data.error) throw new Error(data.error);

                    let newLogs = "";
                    if (data.items && Array.isArray(data.items)) {
                        data.items.forEach((item: { item_name: string; quantity: number; total_value: number }) => {
                            newLogs += `b;${item.item_name};${item.quantity};;${item.total_value}\n`;
                        });
                    }

                    setInput(prev => prev.replace(urlMatch[0], newLogs));
                })
                .catch(err => {
                    setConfigError(err.message || 'Failed to fetch trade data.');
                })
                .finally(() => {
                    setIsFetching(false);
                });
        }
    }, [input, weav3rApiKey, weav3rUserId, isFetching]);

    useEffect(() => {
        if (justPasted) {
            setJustPasted(false);

            // Convert shorthand logs to standard logs on paste
            const linesArr = input.split('\n');
            const convertedLines = linesArr.map(line => {
                const trimmed = line.trim();
                if (trimmed === '') return line;

                // Only convert if it's a shorthand log (contains ';')
                // and it's NOT already a standard log
                if (trimmed.includes(';') && !trimmed.includes('You bought') && !trimmed.includes('You sold')) {
                    const parsed = parseLogLine(trimmed);
                    if (parsed) {
                        return formatToStandardLog(parsed);
                    }
                }
                return line;
            });

            const newInput = convertedLines.join('\n');
            const finalLines = newInput.split('\n');
            const lastLine = finalLines[finalLines.length - 1];

            if (lastLine.trim() !== '' && parseLogLine(lastLine)) {
                setInput(newInput + '\n');
            } else {
                setInput(newInput);
            }
        }
    }, [input, justPasted]);

    // Validate on the fly
    const lines = input.split('\n').filter(l => l.trim().length > 0);
    const parsedLines: { line: string; parsed: ParsedLog | null }[] = lines.map(line => ({
        line,
        parsed: parseLogLine(line)
    }));

    const validParsed = parsedLines.filter(p => p.parsed !== null).map(p => p.parsed!);
    const validCount = validParsed.length;
    const inValidCount = lines.length - validCount;

    // Categorize logs based on skipNegativeStock setting and build filtered logs
    const { completeCount, partialCount, skippedCount, filteredLogs } = useMemo(() => {
        let complete = 0;
        let partial = 0;
        let skipped = 0;
        const filtered: ParsedLog[] = [];

        if (skipNegativeStock && validParsed.length > 0) {
            // Create a copy of current inventory to simulate
            const simulatedInventory = new Map(inventory);
            // Helper to clone stats
            const getClonedStats = (item: string) => {
                const stats = simulatedInventory.get(item) || { stock: 0, totalCost: 0, realizedProfit: 0, abroadStock: 0, abroadTotalCost: 0, abroadRealizedProfit: 0 };
                return { ...stats };
            };

            // Step 1: Compute total buys per item per tag (all buys happen simultaneously)
            const totalBuys = new Map<string, { normal: number, abroad: number }>();
            validParsed.forEach(log => {
                if (log.type === 'BUY') {
                    const tag = log.tag || 'Normal';
                    const current = totalBuys.get(log.item) || { normal: 0, abroad: 0 };
                    if (tag === 'Abroad') {
                        current.abroad += log.amount;
                    } else {
                        current.normal += log.amount;
                    }
                    totalBuys.set(log.item, current);
                }
            });

            // Step 2: Initialize available stock (current + buys) and consumed stock trackers
            const availableStock = new Map<string, { normal: number, abroad: number }>();
            const consumedStock = new Map<string, { normal: number, abroad: number }>();

            inventory.forEach((stats, item) => {
                const buys = totalBuys.get(item) || { normal: 0, abroad: 0 };
                availableStock.set(item, {
                    normal: stats.stock + buys.normal,
                    abroad: stats.abroadStock + buys.abroad
                });
                consumedStock.set(item, { normal: 0, abroad: 0 });
            });

            // Also ensure items that have buys but no current inventory are tracked
            totalBuys.forEach((buys, item) => {
                if (!availableStock.has(item)) {
                    availableStock.set(item, { normal: buys.normal, abroad: buys.abroad });
                    consumedStock.set(item, { normal: 0, abroad: 0 });
                }
            });

            // Step 3: Process logs in original order
            validParsed.forEach(log => {
                if (log.type === 'BUY') {
                    // BUY always complete
                    complete++;
                    filtered.push(log);

                    // Update simulated inventory for cost tracking (but stock already accounted in availableStock)
                    const stats = getClonedStats(log.item);
                    const tag = log.tag || 'Normal';
                    if (tag === 'Abroad') {
                        stats.abroadStock += log.amount;
                        stats.abroadTotalCost += (log.price * log.amount);
                    } else {
                        stats.stock += log.amount;
                        stats.totalCost += (log.price * log.amount);
                    }
                    simulatedInventory.set(log.item, stats);

                } else if (log.type === 'MUG') {
                    // MUG always complete
                    complete++;
                    filtered.push(log);

                } else if (log.type === 'SELL') {
                    const item = log.item;
                    const tag = log.tag; // can be undefined, 'Normal', or 'Abroad'

                    const avail = availableStock.get(item) || { normal: 0, abroad: 0 };
                    const consumed = consumedStock.get(item) || { normal: 0, abroad: 0 };

                    // Calculate remaining stock (available - consumed)
                    let remainingNormal = avail.normal - consumed.normal;
                    let remainingAbroad = avail.abroad - consumed.abroad;

                    let amountToSell = log.amount;
                    let soldNormal = 0;
                    let soldAbroad = 0;

                    if (tag === 'Abroad') {
                        // Only use abroad stock
                        soldAbroad = Math.min(remainingAbroad, amountToSell);
                        amountToSell -= soldAbroad;
                    } else if (tag === 'Normal') {
                        // Only use normal stock
                        soldNormal = Math.min(remainingNormal, amountToSell);
                        amountToSell -= soldNormal;
                    } else {
                        // No tag specified - use normal first, then abroad
                        soldNormal = Math.min(remainingNormal, amountToSell);
                        amountToSell -= soldNormal;
                        if (amountToSell > 0) {
                            soldAbroad = Math.min(remainingAbroad, amountToSell);
                            amountToSell -= soldAbroad;
                        }
                    }

                    const totalSold = soldNormal + soldAbroad;

                    if (totalSold <= 0) {
                        skipped++;
                        // Skip this log entirely
                        return;
                    }

                    // Update consumed stock
                    consumed.normal += soldNormal;
                    consumed.abroad += soldAbroad;
                    consumedStock.set(item, consumed);

                    // Update simulated inventory
                    const stats = getClonedStats(item);
                    stats.stock -= soldNormal;
                    stats.abroadStock -= soldAbroad;
                    simulatedInventory.set(item, stats);

                    // Determine if complete or partial
                    const isComplete = totalSold === log.amount;
                    if (isComplete) {
                        complete++;
                    } else {
                        partial++;
                    }

                    // Create appropriate log(s)
                    if (tag === undefined) {
                        // Untagged sell - create tagged logs based on actual allocation
                        if (soldNormal > 0 && soldAbroad > 0) {
                            // Split into two logs
                            if (soldNormal > 0) {
                                const normalLog = { ...log, amount: soldNormal, tag: 'Normal' as const };
                                filtered.push(normalLog);
                            }
                            if (soldAbroad > 0) {
                                const abroadLog = { ...log, amount: soldAbroad, tag: 'Abroad' as const };
                                filtered.push(abroadLog);
                            }
                        } else if (soldNormal > 0) {
                            // Only sold from normal stock
                            const normalLog = { ...log, amount: soldNormal, tag: 'Normal' as const };
                            filtered.push(normalLog);
                        } else if (soldAbroad > 0) {
                            // Only sold from abroad stock
                            const abroadLog = { ...log, amount: soldAbroad, tag: 'Abroad' as const };
                            filtered.push(abroadLog);
                        }
                    } else {
                        // Tag is specified (Normal or Abroad)
                        const adjustedLog = isComplete ? log : { ...log, amount: totalSold };
                        filtered.push(adjustedLog);
                    }

                } else if (log.type === 'CONVERT') {
                    const fromItem = log.fromItem;
                    const toItem = log.toItem;

                    const avail = availableStock.get(fromItem) || { normal: 0, abroad: 0 };
                    const consumed = consumedStock.get(fromItem) || { normal: 0, abroad: 0 };

                    // CONVERT only uses normal stock (not abroad)
                    const remainingNormal = avail.normal - consumed.normal;

                    if (remainingNormal <= 0) {
                        skipped++;
                    } else if (remainingNormal >= log.fromAmount) {
                        complete++;
                        // Update consumed stock
                        consumed.normal += log.fromAmount;
                        consumedStock.set(fromItem, consumed);

                        // Update simulated inventory
                        const fromStats = getClonedStats(fromItem);
                        fromStats.stock -= log.fromAmount;
                        simulatedInventory.set(fromItem, fromStats);

                        const toStats = getClonedStats(toItem);
                        toStats.stock += log.toAmount;
                        simulatedInventory.set(toItem, toStats);

                        filtered.push(log);
                    } else {
                        partial++;
                        // Apply partial conversion proportionally
                        const ratio = remainingNormal / log.fromAmount;
                        const actualToAmount = Math.floor(log.toAmount * ratio);
                        const adjustedLog = { ...log, fromAmount: remainingNormal, toAmount: actualToAmount };

                        // Update consumed stock (consume all remaining)
                        consumed.normal += remainingNormal;
                        consumedStock.set(fromItem, consumed);

                        // Update simulated inventory
                        const fromStats = getClonedStats(fromItem);
                        fromStats.stock = 0;
                        simulatedInventory.set(fromItem, fromStats);

                        const toStats = getClonedStats(toItem);
                        toStats.stock += actualToAmount;
                        simulatedInventory.set(toItem, toStats);

                        filtered.push(adjustedLog);
                    }

                } else if (log.type === 'SET_CONVERT') {
                    const setItems = log.setType === 'flower' ? FLOWER_SET : PLUSHIE_SET;

                    // Find minimum remaining stock across all set items
                    let minRemainingStock = Infinity;
                    const itemConsumptions: { item: string, remaining: number }[] = [];

                    setItems.forEach(item => {
                        const avail = availableStock.get(item) || { normal: 0, abroad: 0 };
                        const consumed = consumedStock.get(item) || { normal: 0, abroad: 0 };
                        // SET_CONVERT only uses normal stock
                        const remaining = avail.normal - consumed.normal;
                        itemConsumptions.push({ item, remaining });
                        minRemainingStock = Math.min(minRemainingStock, remaining);
                    });

                    if (minRemainingStock <= 0) {
                        skipped++;
                    } else if (minRemainingStock >= log.times) {
                        complete++;
                        // Update consumed stock for all items
                        itemConsumptions.forEach(({ item }) => {
                            const consumed = consumedStock.get(item) || { normal: 0, abroad: 0 };
                            consumed.normal += log.times;
                            consumedStock.set(item, consumed);

                            // Update simulated inventory
                            const stats = getClonedStats(item);
                            stats.stock -= log.times;
                            simulatedInventory.set(item, stats);
                        });

                        // Add points
                        const pointsStats = getClonedStats('points');
                        pointsStats.stock += log.pointsEarned;
                        simulatedInventory.set('points', pointsStats);

                        filtered.push(log);
                    } else {
                        partial++;
                        // Apply partial conversion based on min stock
                        const timesToApply = Math.min(minRemainingStock, log.times);
                        const pointsEarned = timesToApply * 10; // 10 points per set
                        const adjustedLog = { ...log, times: timesToApply, pointsEarned };

                        // Update consumed stock for all items
                        itemConsumptions.forEach(({ item }) => {
                            const consumed = consumedStock.get(item) || { normal: 0, abroad: 0 };
                            consumed.normal += timesToApply;
                            consumedStock.set(item, consumed);

                            // Update simulated inventory
                            const stats = getClonedStats(item);
                            stats.stock -= timesToApply;
                            simulatedInventory.set(item, stats);
                        });

                        // Add points
                        const pointsStats = getClonedStats('points');
                        pointsStats.stock += pointsEarned;
                        simulatedInventory.set('points', pointsStats);

                        filtered.push(adjustedLog);
                    }
                }
            });
        } else {
            // When skipNegativeStock is off, all valid logs are considered complete
            complete = validCount;
            filtered.push(...validParsed);
        }

        return { completeCount: complete, partialCount: partial, skippedCount: skipped, filteredLogs: filtered };
    }, [skipNegativeStock, validParsed, inventory, validCount]);

    const handleSave = async () => {
        if (filteredLogs.length > 0) {
            try {
                await addLogs(filteredLogs);
                vibrate("success");
                setInput("");
                setShowToast(true);
            } catch (error) {
                console.error("Failed to add logs", error);
                vibrate("danger");
                alert(error instanceof Error ? error.message : "Failed to add logs.");
            }
        } else {
            // No logs to save (all skipped or invalid)
            vibrate("utility");
            alert("No logs to save. All valid logs were skipped due to insufficient stock.");
        }
    };

    if (!isLoaded) return null;

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">

            {showToast && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-success text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 animate-in slide-in-from-top-4 fade-in z-50">
                    <Check className="w-5 h-5" />
                    <span className="font-medium">Successfully saved {filteredLogs.length} logs!</span>
                </div>
            )}

            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold tracking-tight">Terminal</h1>
                    <span className="px-2 py-0.5 bg-foreground/5 border border-border rounded-full text-[10px] font-bold text-foreground/40 tracking-wider">
                        V{PARSER_VERSION}
                    </span>
                </div>
                <Link
                    href="/docs/log-formats"
                    onClick={() => vibrate("nav")}
                    className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 hover:bg-primary hover:text-white rounded-lg text-xs font-semibold text-primary transition-all whitespace-nowrap"
                >
                    <Info className="w-3.5 h-3.5" /> Docs &rarr;
                </Link>
            </div>

            {/* Configuration */}
            <div className="flex items-center justify-between p-4 bg-panel border border-border rounded-xl shadow-sm">
                <div>
                    <h3 className="font-medium text-sm">Skip Negative Stock</h3>
                    <p className="text-xs text-foreground/60 mt-1">
                        When enabled, logs that would cause negative stock are skipped or partially applied.
                    </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={skipNegativeStock}
                        onChange={(e) => updateSkipNegativeStock(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-foreground/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
            </div>

            {/* Log Breakdown Summary */}
            <div className="space-y-3 p-4 bg-panel border border-border rounded-xl shadow-sm">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="flex flex-col items-center justify-center p-3 bg-primary/5 border border-primary/20 rounded-lg">
                        <div className="text-2xl font-bold text-primary">{validCount}</div>
                        <div className="text-xs font-medium text-foreground/70 mt-1">Valid Logs</div>
                        <div className="text-[10px] text-foreground/40 mt-0.5">Parsed successfully</div>
                    </div>
                    <div className="flex flex-col items-center justify-center p-3 bg-danger/5 border border-danger/20 rounded-lg">
                        <div className="text-2xl font-bold text-danger">{inValidCount}</div>
                        <div className="text-xs font-medium text-foreground/70 mt-1">Invalid Logs</div>
                        <div className="text-[10px] text-foreground/40 mt-0.5">Failed to parse</div>
                    </div>
                    <div className="flex flex-col items-center justify-center p-3 bg-success/5 border border-success/20 rounded-lg">
                        <div className="text-2xl font-bold text-success">{completeCount}</div>
                        <div className="text-xs font-medium text-foreground/70 mt-1">Complete</div>
                        <div className="text-[10px] text-foreground/40 mt-0.5">Will apply fully</div>
                    </div>
                    <div className="flex flex-col items-center justify-center p-3 bg-warning/5 border border-warning/20 rounded-lg">
                        <div className="text-2xl font-bold text-warning">{partialCount}</div>
                        <div className="text-xs font-medium text-foreground/70 mt-1">Partial</div>
                        <div className="text-[10px] text-foreground/40 mt-0.5">Insufficient stock</div>
                    </div>
                    <div className="flex flex-col items-center justify-center p-3 bg-foreground/5 border border-foreground/20 rounded-lg">
                        <div className="text-2xl font-bold text-foreground/60">{skippedCount}</div>
                        <div className="text-xs font-medium text-foreground/70 mt-1">Skipped</div>
                        <div className="text-[10px] text-foreground/40 mt-0.5">Zero/negative stock</div>
                    </div>
                </div>
                <div className="text-xs text-foreground/50 pt-2 border-t border-border/40">
                    {skipNegativeStock ? (
                        <>
                            <span className="font-medium text-primary">Skip Negative Stock is ON.</span> Logs that would cause negative stock are skipped (zero/negative stock) or partially applied (insufficient stock). Complete logs will be applied fully.
                        </>
                    ) : (
                        <>
                            <span className="font-medium text-primary">Skip Negative Stock is OFF.</span> All valid logs will be applied as complete, regardless of stock levels.
                        </>
                    )}
                </div>
            </div>

            {/* Unified Terminal UI */}
            <div className="flex flex-col gap-4">
                <div className="relative font-mono text-sm w-full h-[32rem] bg-panel rounded-xl shadow-inner border border-border overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between p-3 border-b border-border bg-foreground/[0.02] z-30">
                        <div className="flex items-center gap-6">
                            <h2 className="font-bold text-[10px] uppercase tracking-widest text-foreground/40">Log Input</h2>
                            <div className="h-4 w-[1px] bg-border" />
                            <h2 className="font-bold text-[10px] uppercase tracking-widest text-foreground/40">Live Preview</h2>
                        </div>
                        <div className="flex gap-4 text-[10px] font-bold">
                            <span className="text-primary flex items-center gap-1"><Check className="w-3 h-3" /> {validCount} Valid</span>
                            {inValidCount > 0 && <span className="text-danger flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {inValidCount} Invalid</span>}
                            {skipNegativeStock && (
                                <>
                                    <span className="text-success flex items-center gap-1"><Check className="w-3 h-3" /> {completeCount} Complete</span>
                                    {partialCount > 0 && <span className="text-warning flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {partialCount} Partial</span>}
                                    {skippedCount > 0 && <span className="text-foreground/50 flex items-center gap-1"><SkipForward className="w-3 h-3" /> {skippedCount} Skipped</span>}
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 relative overflow-hidden group">
                        {/* Highlighting & Preview Layer */}
                        <div
                            ref={highlightRef}
                            className="absolute inset-0 overflow-y-scroll pointer-events-none p-4 pb-20 select-none z-0"
                        >
                            <div className="flex flex-col w-full">
                                {input.split('\n').map((lineText, i, arr) => {
                                    const parsed = lineText.trim() ? parseLogLine(lineText) : null;
                                    const isLast = i === arr.length - 1;

                                    return (
                                        <div key={i} className="flex relative items-start group/line text-foreground/80 leading-7">
                                            {/* Visual Divider (Absolute positioned to never shift layout) */}
                                            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-foreground/[0.15] z-0" />
                                            {/* Left Column: Editor Highlight */}
                                            <div className="w-[65%] pr-[60px] relative break-words whitespace-pre-wrap">
                                                {lineText.trim() === '' ? (
                                                    <span>&nbsp;</span>
                                                ) : (
                                                    <span className={parsed ? "text-primary bg-primary/10 px-1 py-0.5 rounded shadow-[0_0_0_1px_rgba(var(--primary),0.1)]" : "text-danger bg-danger/10 px-1 py-0.5 rounded font-medium"} style={{ boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}>
                                                        {lineText}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Middle Column: Vertical Divider & Line Number */}
                                            <div className="absolute left-[65%] top-0 bottom-0 w-[1px] bg-border/40 flex justify-center items-start">
                                                {lineText.trim() !== '' && (
                                                    <span className="absolute top-[3px] -translate-x-1/2 w-4 h-4 rounded-full bg-background border border-border text-[9px] flex items-center justify-center font-bold text-foreground/30 shadow-sm z-10 transition-colors group-hover/line:text-primary group-hover/line:border-primary/30">
                                                        {i + 1}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Right Column: Preview Content */}
                                            <div className="flex-1 pl-8 break-all">
                                                {parsed ? (
                                                    <div className="text-[11px] truncate text-primary font-medium flex items-center gap-2 h-6">
                                                        {parsed.type === 'BUY' && <><span>{parsed.tag === 'Abroad' ? '✈️' : '🛒'}</span> <span>Bought</span> {parsed.amount}x {formatItemName(parsed.item)} @ {Math.floor(parsed.price).toLocaleString()}</>}
                                                        {parsed.type === 'SELL' && <>💰 <span>Sold</span> {parsed.amount}x {formatItemName(parsed.item)} @ {Math.floor(parsed.price).toLocaleString()}</>}
                                                        {parsed.type === 'MUG' && <>🥷 <span>Mug Loss</span> ${parsed.amount.toLocaleString()}</>}
                                                        {parsed.type === 'CONVERT' && <>♻️ <span>Exchanged</span> {parsed.fromAmount.toLocaleString()} {formatItemName(parsed.fromItem)} &rarr; {parsed.toAmount.toLocaleString()} {formatItemName(parsed.toItem)}</>}
                                                        {parsed.type === 'SET_CONVERT' && <>🏛️ <span>Museum</span> {parsed.times}x {formatItemName(parsed.setType)} &rarr; {parsed.pointsEarned} Pts</>}
                                                    </div>
                                                ) : lineText.trim() ? (
                                                    <div className="text-[10px] text-danger font-bold flex items-center gap-1 h-6">
                                                        <AlertCircle className="w-3 h-3" /> Error
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Interactive Textarea Layer */}
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onScroll={(e) => {
                                if (highlightRef.current) highlightRef.current.scrollTop = e.currentTarget.scrollTop;
                            }}
                            onPaste={() => setJustPasted(true)}
                            className="absolute inset-0 w-full h-full p-4 resize-none bg-transparent text-transparent caret-foreground focus:outline-none z-20 leading-7 pb-20 overflow-y-scroll font-mono text-sm whitespace-pre-wrap break-words border-none ring-0 focus:ring-0"
                            style={{ 
                                paddingRight: 'calc(35% + 60px)' 
                            }}
                            placeholder="Paste your logs here..."
                            spellCheck="false"
                        />

                        {isFetching && (
                            <div className="absolute inset-0 bg-panel/70 backdrop-blur-[2px] flex items-center justify-center rounded-xl z-50 transition-all">
                                <span className="animate-pulse font-semibold text-primary text-lg">Fetching Trades...</span>
                            </div>
                        )}
                    </div>

                    {/* Footer Controls */}
                    <div className="p-3 border-t border-border bg-foreground/[0.02] flex justify-between items-center z-30">
                        <div className="text-[10px] items-center flex gap-4 text-foreground/40 font-bold uppercase tracking-wider">
                            <span>{lines.length} Line Entries Found</span>
                        </div>
                        <button
                            onClick={() => void handleSave()}
                            disabled={validCount === 0}
                            className="px-6 py-2 bg-primary text-primary-foreground font-semibold rounded-lg shadow-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all active:scale-95 text-xs"
                        >
                            <Save className="w-3.5 h-3.5" />
                            Run Import
                        </button>
                    </div>
                </div>

                {/* Danger Zone moved to bottom */}
                <div className="pt-4 border-t border-border">
                    <div className="bg-danger/5 border border-danger/20 p-3 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <ShieldAlert className="w-5 h-5 text-danger" />
                            <div>
                                <h3 className="text-danger font-semibold text-sm">Danger Zone</h3>
                                <p className="text-[11px] text-foreground/60">This permanently erases all log data from your local browser storage.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                vibrate("danger");
                                if (window.confirm("Are you sure you want to delete all logs permanently?")) {
                                    vibrate("danger");
                                    clearLogs();
                                }
                            }}
                            className="px-3 py-1.5 bg-danger/10 text-danger hover:bg-danger hover:text-white font-medium rounded-lg text-xs transition-colors flex items-center gap-1.5"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Clear Tracker
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
