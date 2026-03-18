"use client";

import { useState, useEffect, useRef } from "react";
import { useJournal } from "@/store/useJournal";
import { parseLogLine, ParsedLog, formatItemName, formatToStandardLog, PARSER_VERSION } from "@/lib/parser";
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
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">

            {showToast && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-success text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 animate-in slide-in-from-top-4 fade-in z-50">
                    <Check className="w-5 h-5" />
                    <span className="font-medium">Successfully saved {validCount} logs!</span>
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
