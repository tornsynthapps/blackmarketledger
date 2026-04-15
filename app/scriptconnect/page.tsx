"use client";

import { useState, useEffect, useCallback } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    FlashIcon,
    RefreshIcon,
    CheckmarkCircle02Icon,
    Alert02Icon,
    DatabaseIcon,
    EyeIcon,
} from "@hugeicons/core-free-icons";
import { useHapticFeedback } from "@/lib/old/useHapticFeedback";

const BML_EXTENSION_REQUEST_EVENT = "BML_EXTENSION_REQUEST";
const BML_EXTENSION_RESPONSE_EVENT = "BML_EXTENSION_RESPONSE";

interface CostBasisData {
    [key: string]: number;
}

export default function ScriptConnectPage() {
    const { vibrate } = useHapticFeedback();
    const [status, setStatus] = useState<"idle" | "checking" | "connected" | "error">("idle");
    const [lastSync, setLastSync] = useState<string | null>(null);
    const [itemCount, setItemCount] = useState<number>(0);
    const [showData, setShowData] = useState(false);
    const [costBasisData, setCostBasisData] = useState<CostBasisData>({});
    const [debugLog, setDebugLog] = useState<string[]>([]);

    const addDebug = useCallback((msg: string) => {
        setDebugLog((prev) => [...prev.slice(-4), `${new Date().toLocaleTimeString()} ${msg}`]);
    }, []);

    const checkHealth = useCallback(async (): Promise<boolean> => {
        addDebug("Starting health check...");
        return new Promise((resolve) => {
            const messageId = crypto.randomUUID();
            addDebug(`Health check messageId: ${messageId}`);
            let resolved = false;

            const handler = (event: MessageEvent) => {
                addDebug(`Received event: ${event.data?.type}, id: ${event.data?.id}`);
                if (event.data?.type !== BML_EXTENSION_RESPONSE_EVENT) return;
                if (event.data?.id !== messageId) return;

                const response = event.data.response;
                addDebug(`Response: ${JSON.stringify(response)}`);
                if (response?.success && response?.data?.status === "ok") {
                    resolved = true;
                    window.removeEventListener("message", handler);
                    window.clearTimeout(timeoutId);
                    addDebug("Health check passed!");
                    resolve(true);
                }
            };

            const timeoutId = window.setTimeout(() => {
                if (!resolved) {
                    window.removeEventListener("message", handler);
                    addDebug("Health check timed out");
                    resolve(false);
                }
            }, 3000);

            window.addEventListener("message", handler);
            window.postMessage(
                {
                    type: BML_EXTENSION_REQUEST_EVENT,
                    id: messageId,
                    message: { type: "HEALTH", payload: {} },
                },
                "*"
            );
            addDebug("Sent HEALTH message");
        });
    }, [addDebug]);

    const triggerSync = useCallback(async () => {
        vibrate("tap");
        setStatus("checking");
        addDebug("Skipping health check, sending SAVE_DATA directly...");

        // Skip health check, send directly
        const messageId = crypto.randomUUID();
        addDebug(`SAVE_DATA messageId: ${messageId}`);

        const savePromise = new Promise<boolean>((resolve) => {
            const timeoutId = window.setTimeout(() => {
                window.removeEventListener("message", handler);
                addDebug("SAVE_DATA timed out");
                resolve(false);
            }, 5000);

            const handler = (event: MessageEvent) => {
                addDebug(
                    `Received response: type=${event.data?.type}, id=${event.data?.id}, response=${JSON.stringify(event.data?.response)}`
                );
                if (event.data?.type !== BML_EXTENSION_RESPONSE_EVENT) return;
                if (event.data?.id !== messageId) return;

                const response = event.data.response;
                addDebug(`SAVE_DATA Response: ${JSON.stringify(response)}`);
                if (response?.success && response?.data?.saved) {
                    window.clearTimeout(timeoutId);
                    window.removeEventListener("message", handler);
                    setItemCount(response.data.itemCount || 0);
                    setLastSync(new Date().toLocaleTimeString());
                    setStatus("connected");
                    addDebug("SAVE_DATA successful!");
                    resolve(true);
                }
            };

            window.addEventListener("message", handler);

            window.postMessage(
                {
                    type: BML_EXTENSION_REQUEST_EVENT,
                    id: messageId,
                    message: {
                        type: "SAVE_DATA",
                        payload: {
                            data: {
                                _trigger: "manual",
                            },
                        },
                    },
                },
                "*"
            );
            addDebug("Sent SAVE_DATA message");
        });

        const success = await savePromise;
        if (!success) {
            setStatus("error");
        }
    }, [addDebug, vibrate]);

    const loadStoredData = useCallback(() => {
        try {
            const stored = localStorage.getItem("bml_synced_cost_basis");
            if (stored) {
                const data = JSON.parse(stored);
                setCostBasisData(data);
                setItemCount(Object.keys(data).length);
                setStatus("connected");
            }
        } catch (e) {
            console.error("Failed to load stored data", e);
        }
    }, []);

    useEffect(() => {
        const init = () => {
            loadStoredData();
            setStatus("idle");
        };
        init();
    }, [loadStoredData]);

    return (
        <div className="flex flex-col gap-6 max-w-2xl mx-auto py-6 px-4">
            <header className="border-l-2 border-blue-500 pl-4">
                <h1 className="text-2xl font-black uppercase tracking-tighter sm:text-3xl">
                    Script Connect
                </h1>
                <p className="text-muted text-xs font-sans mt-1 uppercase tracking-widest">
                    Sync cost-basis data to your userscript
                </p>
            </header>

            <div className="bg-panel border border-border p-4 rounded-lg">
                <div className="flex items-center gap-3 mb-4">
                    {status === "idle" && (
                        <HugeiconsIcon icon={FlashIcon} className="text-muted" size={24} />
                    )}
                    {status === "checking" && (
                        <HugeiconsIcon
                            icon={RefreshIcon}
                            className="text-blue-500 animate-spin"
                            size={24}
                        />
                    )}
                    {status === "connected" && (
                        <HugeiconsIcon
                            icon={CheckmarkCircle02Icon}
                            className="text-green-500"
                            size={24}
                        />
                    )}
                    {status === "error" && (
                        <HugeiconsIcon icon={Alert02Icon} className="text-red-500" size={24} />
                    )}
                    <div>
                        <p className="font-bold">
                            {status === "idle" && "Ready to connect"}
                            {status === "checking" && "Checking connection..."}
                            {status === "connected" && "Connected to userscript"}
                            {status === "error" && "Connection failed"}
                        </p>
                        {lastSync && <p className="text-xs text-muted">Last sync: {lastSync}</p>}
                    </div>
                </div>

                {status === "connected" && itemCount > 0 && (
                    <div className="mb-4 p-3 bg-background rounded">
                        <div className="flex items-center gap-2 mb-2">
                            <HugeiconsIcon icon={DatabaseIcon} size={16} className="text-muted" />
                            <span className="text-sm font-bold">Stored Data</span>
                        </div>
                        <p className="text-xs text-muted">
                            {itemCount} items synced to userscript GM storage
                        </p>
                    </div>
                )}

                <button
                    onClick={triggerSync}
                    disabled={status === "checking"}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-muted text-white font-bold rounded transition-colors"
                >
                    <HugeiconsIcon icon={FlashIcon} size={20} />
                    {status === "checking" ? "Syncing..." : "Sync Cost-Basis Now"}
                </button>
            </div>

            {status === "connected" && itemCount > 0 && (
                <div className="bg-panel border border-border p-4 rounded-lg">
                    <button
                        onClick={() => {
                            vibrate("tap");
                            setShowData(!showData);
                        }}
                        className="flex items-center gap-2 text-sm font-bold mb-3"
                    >
                        <HugeiconsIcon
                            icon={EyeIcon}
                            size={16}
                            className={showData ? "text-blue-500" : "text-muted"}
                        />
                        {showData ? "Hide" : "View"} Stored Data
                    </button>

                    {showData && (
                        <div className="max-h-64 overflow-y-auto bg-background rounded p-3">
                            <pre className="text-xs font-mono whitespace-pre-wrap">
                                {JSON.stringify(costBasisData, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            )}

            {debugLog.length > 0 && (
                <div className="bg-panel border border-border p-4 rounded-lg">
                    <p className="text-xs font-bold mb-2">Debug Log:</p>
                    <div className="bg-background rounded p-2 max-h-32 overflow-y-auto">
                        {debugLog.map((log, i) => (
                            <p key={i} className="text-xs font-mono text-muted">
                                {log}
                            </p>
                        ))}
                    </div>
                </div>
            )}

            <div className="text-xs text-muted">
                <p>
                    <strong>Note:</strong> This page syncs the cost-basis data from your
                    transactions to the Tampermonkey userscript. The userscript uses GM storage to
                    persist data across tabs.
                </p>
                <p className="mt-2">
                    In Tampermonkey, go to BML Userscript → Storage to view stored data.
                </p>
            </div>
        </div>
    );
}
