"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Key01Icon,
    ArrowRight01Icon,
    InformationCircleIcon,
    ActivityIcon,
} from "@hugeicons/core-free-icons";
import { useHapticFeedback } from "@/lib/useHapticFeedback";

interface SyncConsoleProps {
    onSync: (apiKey: string) => Promise<void>;
    isSyncing: boolean;
    syncLabel: string;
    protocolNotice: string;
}

export function SyncConsole({ onSync, isSyncing, syncLabel, protocolNotice }: SyncConsoleProps) {
    const [apiKey, setApiKey] = useState("");
    const { vibrate } = useHapticFeedback();

    const handleSync = async () => {
        if (!apiKey) return;
        await onSync(apiKey);
    };

    return (
        <aside className="lg:col-span-1 space-y-6">
            <div className="hardline-panel-elevated p-8 flex flex-col gap-6">
                <div className="flex items-center gap-2 border-b border-border pb-4">
                    <HugeiconsIcon icon={ActivityIcon} size={20} className="text-primary" />
                    <h2 className="text-xl font-bold uppercase tracking-tight">Sync Console</h2>
                </div>
                
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-mono font-bold text-muted uppercase tracking-wider">
                                Full Access API Key
                            </label>
                            {typeof window !== "undefined" && localStorage.getItem("torn_api_key_full") && (
                                <button
                                    onClick={() => {
                                        const stored = localStorage.getItem("torn_api_key_full");
                                        if (stored) {
                                            setApiKey(stored);
                                            vibrate("utility");
                                        }
                                    }}
                                    className="text-[9px] font-mono font-bold text-primary hover:underline uppercase"
                                >
                                    [Use Ledger Key]
                                </button>
                            )}
                        </div>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/50 pointer-events-none">
                                <HugeiconsIcon icon={Key01Icon} size={18} />
                            </div>
                            <input
                                type="password"
                                placeholder="ENTER KEY"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                className="hardline-input w-full pl-16 border-2 pr-4 h-12"
                            />
                        </div>
                        <p className="text-[9px] text-muted font-mono mt-1 leading-tight">
                            Your key is used exclusively by the Cloudflare Worker to fetch logs and is never stored locally on this machine.
                        </p>
                    </div>

                    <button
                        onClick={handleSync}
                        disabled={!apiKey || isSyncing}
                        className={`hardline-button w-full h-14 flex items-center justify-center gap-3 active:translate-x-1 active:translate-y-1 ${
                            isSyncing ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                    >
                        {isSyncing ? (
                            <>
                                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent animate-spin" />
                                <span>PROCESSING</span>
                            </>
                        ) : (
                            <>
                                <span>{syncLabel}</span>
                                <HugeiconsIcon icon={ArrowRight01Icon} size={20} />
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="hardline-panel group border-primary/20 bg-primary/5 p-6 flex flex-col gap-4">
                <div className="flex items-center gap-2 text-primary">
                    <HugeiconsIcon icon={InformationCircleIcon} size={18} />
                    <span className="font-bold text-xs uppercase tracking-widest">Protocol Notice</span>
                </div>
                <p className="text-xs text-muted leading-relaxed font-mono">
                    {protocolNotice}
                </p>
            </div>
        </aside>
    );
}
