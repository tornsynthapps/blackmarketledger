"use client";

import { useState, useEffect, useRef } from "react";
import { useJournal } from "@/store/useJournal";
import { parseLogLine, ParsedLog, formatItemName } from "@/lib/parser";
import { Check, Info, AlertCircle, Save, Trash2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useHapticFeedback } from "@/lib/useHapticFeedback";

export default function AddLogs() {
    const [input, setInput] = useState("");
    const [showToast, setShowToast] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const [configError, setConfigError] = useState("");
    const [justPasted, setJustPasted] = useState(false);
    const highlightRef = useRef<HTMLDivElement>(null);
    const { addLogs, isLoaded, clearLogs, weav3rApiKey, weav3rUserId, saveWeaverConfig } = useJournal();
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
                        data.items.forEach((item: any) => {
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
        let converted = input;

        const bazaarRegex = /^.* bought (\d+)\s*x\s*(.+?) from your bazaar for \$([\d,]+)\.?.*$/gm;
        converted = converted.replace(bazaarRegex, (match, qty, item, price) => {
            return `s;${item};${qty};;${price}`;
        });

        const tornBuyRegex = /.*You bought ([\d,]+)\s*x\s*(.+?)(?: on .+? bazaar| on the item market from .+?)? at \$([\d,]+) each(?:(?:(?!from).)*from\s+([a-zA-Z]+))?.*/gmi;
        converted = converted.replace(tornBuyRegex, (match, qty, item, price, country) => {
            return `b;${item};${qty};${price}${country ? `;Abroad` : ''}`;
        });

        if (converted !== input) {
            setInput(converted);
        } else if (justPasted) {
            setJustPasted(false);
            const linesArr = input.split('\n');
            const lastLine = linesArr[linesArr.length - 1];
            if (lastLine.trim() !== '' && parseLogLine(lastLine)) {
                setInput(input + '\n');
            }
        }
    }, [input, justPasted]);

    // Validate on the fly
    const lines = input.split('\n').filter(l => l.trim().length > 0);
    const parsedLines: { line: string; parsed: ParsedLog | null }[] = lines.map(line => ({
        line,
        parsed: parseLogLine(line)
    }));

    const validCount = parsedLines.filter(p => p.parsed !== null).length;
    const inValidCount = lines.length - validCount;

    const handleSave = async () => {
        const validLogs = parsedLines.map(p => p.parsed).filter((p): p is ParsedLog => p !== null);
        if (validLogs.length > 0) {
            try {
                await addLogs(validLogs);
                vibrate("success");
                setInput("");
                setShowToast(true);
            } catch (error) {
                console.error("Failed to add logs", error);
                vibrate("danger");
                alert(error instanceof Error ? error.message : "Failed to add logs.");
            }
        }
    };

    if (!isLoaded) return null;

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">

            {showToast && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-success text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 animate-in slide-in-from-top-4 fade-in z-50">
                    <Check className="w-5 h-5" />
                    <span className="font-medium">Successfully saved {validCount} logs!</span>
                </div>
            )}

            <div>
                <h1 className="text-3xl font-bold tracking-tight">Terminal</h1>
                <p className="text-foreground/60 mt-2">Paste your shorthand logs here to add to your tracker.</p>
            </div>

            <div className="bg-panel border border-border p-4 rounded-xl flex flex-col sm:flex-row gap-4 items-center">
                <div className="flex-1 flex flex-col gap-1 w-full">
                    <label className="text-xs font-semibold text-foreground/70">Weav3r API Key</label>
                    <input type="password" value={tempApiKey} onChange={e => setTempApiKey(e.target.value)} className="px-3 py-1.5 text-sm bg-background border border-border rounded focus:ring-1 focus:ring-primary focus:outline-none" placeholder="Enter API Key" />
                </div>
                <div className="mt-4 sm:mt-auto sm:self-end w-full sm:w-auto">
                    <button
                        onClick={async () => {
                            vibrate("utility");
                            try {
                                await saveWeaverConfig(tempApiKey);
                                setConfigError("");
                            } catch (error) {
                                setConfigError(error instanceof Error ? error.message : "Failed to save Weav3r API key.");
                            }
                        }}
                        className="w-full sm:w-auto px-4 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded font-medium text-sm transition-colors mb-[1px]"
                    >
                        Save Config
                    </button>
                </div>
            </div>

            {configError && <div className="text-sm text-danger flex items-center gap-1.5 bg-danger/10 p-3 rounded-lg border border-danger/20"><AlertCircle className="w-4 h-4" /> {configError}</div>}

            <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl flex flex-col sm:flex-row gap-4 text-sm text-primary items-start sm:items-center justify-between">
                <div className="flex gap-3 items-center">
                    <Info className="w-5 h-5 shrink-0" />
                    <div>
                        <p className="font-semibold">Documentation</p>
                        <p className="opacity-80 text-xs">Learn how to write shorthand logs and use Weav3r receipts or Bazaar logs.</p>
                    </div>
                </div>
                <Link
                    href="/docs/log-formats"
                    onClick={() => vibrate("nav")}
                    className="px-4 py-1.5 bg-primary/10 hover:bg-primary hover:text-white rounded-lg font-medium transition-colors whitespace-nowrap"
                >
                    Open Docs &rarr;
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Editor */}
                <div className="flex flex-col gap-4">
                    <div className="relative font-mono text-sm w-full h-96 bg-panel rounded-xl shadow-inner border border-border overflow-hidden">
                        <div
                            ref={highlightRef}
                            className="absolute inset-0 p-4 pointer-events-none whitespace-pre-wrap break-words overflow-y-auto"
                            aria-hidden="true"
                        >
                            {input.split('\n').map((l, i, arr) => {
                                if (l.trim() === '') return <span key={i}>{l}{i < arr.length - 1 ? '\n' : ''}</span>;
                                const parsed = parseLogLine(l);
                                return (
                                    <span key={i} className={parsed ? "text-transparent" : "text-danger bg-danger/10 font-medium"}>
                                        {l}{i < arr.length - 1 ? '\n' : ''}
                                    </span>
                                );
                            })}
                        </div>
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onScroll={(e) => {
                                if (highlightRef.current) highlightRef.current.scrollTop = e.currentTarget.scrollTop;
                            }}
                            onPaste={() => setJustPasted(true)}
                            className="absolute inset-0 w-full h-full p-4 resize-none bg-transparent text-foreground/90 caret-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 relative z-10"
                            placeholder="Paste your logs here...&#10;b;Xanax;89;899999&#10;m;789789&#10;s;Xanax;89;900000&#10;&#10;Or paste a Weav3r receipt URL like:&#10;https://weav3r.dev/receipt/RJiDVUO9Is"
                            spellCheck="false"
                        />
                        {isFetching && (
                            <div className="absolute inset-0 bg-panel/70 backdrop-blur-[2px] flex items-center justify-center rounded-xl z-20 transition-all">
                                <span className="animate-pulse font-semibold text-primary text-lg">Fetching Trades...</span>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-between items-center bg-panel p-4 rounded-xl border border-border shadow-sm">
                        <div className="text-sm">
                            <span className="font-medium">{lines.length}</span> Total Lines
                            <div className="flex gap-4 mt-1">
                                <span className="text-success flex items-center gap-1"><Check className="w-3 h-3" /> {validCount} Valid</span>
                                {inValidCount > 0 && <span className="text-danger flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {inValidCount} Invalid</span>}
                            </div>
                        </div>
                        <button
                            onClick={() => void handleSave()}
                            disabled={validCount === 0}
                            className="px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg shadow-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all active:scale-95"
                        >
                            <Save className="w-4 h-4" />
                            Run Import
                        </button>
                    </div>

                    <div className="mt-8 pt-8 border-t border-border">
                        <div className="bg-danger/5 border border-danger/20 p-4 rounded-xl">
                            <h3 className="text-danger font-semibold flex items-center gap-2 mb-2">
                                <ShieldAlert className="w-5 h-5" /> Danger Zone
                            </h3>
                            <p className="text-sm text-foreground/70 mb-4">This will completely erase all stored logs from your local browser.</p>
                            <button
                                onClick={() => {
                                    vibrate("danger");
                                    if (window.confirm("Are you sure you want to delete all logs permanently?")) {
                                        vibrate("danger");
                                        clearLogs();
                                    }
                                }}
                                className="px-4 py-2 bg-danger/10 text-danger hover:bg-danger hover:text-white font-medium rounded-lg text-sm transition-colors flex items-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                Clear All Tracker Data
                            </button>
                        </div>
                    </div>
                </div>

                {/* Live Preview */}
                <div className="bg-panel rounded-xl border border-border shadow-sm overflow-hidden flex flex-col h-96 lg:h-auto">
                    <div className="p-4 border-b border-border bg-foreground/[0.02]">
                        <h2 className="font-semibold text-lg flex items-center gap-2">Live Preview</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 bg-foreground/[0.01]">
                        {lines.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-foreground/40 italic">
                                Start typing to see preview
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {parsedLines.map((p, i) => (
                                    <div key={i} className={`p-3 rounded-lg border text-sm ${p.parsed ? 'bg-panel border-border' : 'bg-danger/5 border-danger/20'}`}>
                                        <div className={`font-mono text-xs mb-1 ${p.parsed ? 'text-foreground/50' : 'text-danger font-semibold'}`}>{p.line}</div>
                                        {p.parsed ? (
                                            <div className="text-foreground/90 truncate">
                                                {p.parsed.type === 'BUY' && <>🛒 <span className="font-medium text-primary">Bought</span> {p.parsed.amount}x {formatItemName(p.parsed.item)} @ {p.parsed.price.toLocaleString()}</>}
                                                {p.parsed.type === 'SELL' && <>💰 <span className="font-medium text-success">Sold</span> {p.parsed.amount}x {formatItemName(p.parsed.item)} @ {p.parsed.price.toLocaleString()}</>}
                                                {p.parsed.type === 'MUG' && <>🥷 <span className="font-medium text-danger">Mug Loss</span> ${p.parsed.amount.toLocaleString()}</>}
                                                {p.parsed.type === 'CONVERT' && <>♻️ <span className="font-medium text-primary">Converted</span> {p.parsed.fromAmount} {formatItemName(p.parsed.fromItem)} into {p.parsed.toAmount} {formatItemName(p.parsed.toItem)}</>}
                                                {p.parsed.type === 'SET_CONVERT' && <>🏛️ <span className="font-medium text-primary">Museum Set</span> Converted {p.parsed.times}x {formatItemName(p.parsed.setType)} Sets into {p.parsed.pointsEarned} Points</>}
                                            </div>
                                        ) : (
                                            <div className="text-danger flex items-center gap-1.5 font-medium">
                                                <AlertCircle className="w-4 h-4" /> Invalid Sequence format
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
