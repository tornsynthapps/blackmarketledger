"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
    CheckmarkCircle01Icon,
    ArrowLeft01Icon,
    CrownIcon,
    FlashIcon,
    Cancel01Icon,
    Settings02Icon,
    Activity01Icon,
} from "@hugeicons/core-free-icons";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/old/useAuth";
import { sendToExtension } from "@/lib/old/bmlconnect";
import { useHapticFeedback } from "@/lib/old/useHapticFeedback";
import { getGoogleDriveStatus } from "@/lib/old/drive-api";
import Link from "next/link";

type ServiceItem = {
    name: string;
    active: boolean;
    detail: string;
};

export function ServiceRail() {
    const {
        weav3rApiKey,
        weav3rUserId,
        driveApiKey,
        tornApiKeyFull,
        tornApiRateLimit,
        weav3rApiRateLimit,
    } = useAuth();
    const { vibrate } = useHapticFeedback();
    const [isOpen, setIsOpen] = useState(false);
    const [driveConnected, setDriveConnected] = useState(false);
    const [isWhaleSubscriber, setIsWhaleSubscriber] = useState(false);
    const [hasOpenedServiceRail, setHasOpenedServiceRail] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        setHasOpenedServiceRail(localStorage.getItem("bml_service_rail_opened") === "true");
    }, []);

    useEffect(() => {
        let cancelled = false;

        const loadServiceState = async () => {
            const helloRes = await sendToExtension({ type: "HELLO" });

            const requests: Promise<{ success: boolean; data?: any; connected?: boolean }>[] = [
                helloRes.success
                    ? (sendToExtension<{ subscriptionValid?: boolean }>({
                          type: "GET_USER_INFO",
                      }) as any)
                    : Promise.resolve({ success: false }),
            ];

            if (driveApiKey) {
                requests.push(getGoogleDriveStatus(driveApiKey).catch(() => ({ success: false })));
            } else if (helloRes.success) {
                requests.push(
                    sendToExtension<{ connected?: boolean }>({ type: "DRIVE_STATUS" }) as any
                );
            } else {
                requests.push(Promise.resolve({ success: false }));
            }

            const [userRes, driveRes] = await Promise.all(requests);

            if (cancelled) return;

            setIsWhaleSubscriber(
                Boolean(userRes.success && (userRes.data as any)?.subscriptionValid)
            );
            setDriveConnected(
                Boolean(
                    driveRes.success && (driveRes.data?.connected || (driveRes as any).connected)
                )
            );
        };

        void loadServiceState();

        return () => {
            cancelled = true;
        };
    }, [driveApiKey]);

    const services: ServiceItem[] = [
        {
            name: "Sales fetch using weav3r",
            active: Boolean(weav3rApiKey && weav3rUserId),
            detail: weav3rApiKey && weav3rUserId ? "Ready" : "Needs Torn API key.",
        },
        {
            name: "Auto-Pilot sync",
            active: Boolean(tornApiKeyFull),
            detail: tornApiKeyFull ? "Full-access key saved" : "Needs Torn full-access key.",
        },
        {
            name: "Google Drive Sync",
            active: driveConnected,
            detail: driveConnected ? "Connected" : "Connect in BML Connect.",
        },
        {
            name: "Cost-basis on torn bazaar",
            active: isWhaleSubscriber,
            detail: isWhaleSubscriber ? "Unlocked" : "Whale subscription required.",
        },
    ];

    if (!mounted) {
        return null;
    }

    return (
        <aside
            className={`fixed right-0 top-0 z-[80] h-screen w-[min(88vw,360px)] transition-transform duration-300 ease-out lg:w-[min(34vw,360px)] ${
                isOpen ? "translate-x-0" : "translate-x-full"
            }`}
        >
            <div className="relative h-full border-l border-border bg-panel/95 backdrop-blur-xl shadow-2xl">
                {/* Toggle Button */}
                <button
                    type="button"
                    aria-label={isOpen ? "Hide active services" : "Show active services"}
                    onClick={() => {
                        vibrate("utility");
                        setIsOpen((current) => !current);
                        if (!hasOpenedServiceRail) {
                            setHasOpenedServiceRail(true);
                            localStorage.setItem("bml_service_rail_opened", "true");
                        }
                    }}
                    className={`absolute left-0 top-1/2 flex -translate-x-full -translate-y-1/2 items-center justify-center border shadow-lg transition-all duration-300 overflow-hidden ${
                        !hasOpenedServiceRail
                            ? "h-48 w-14 border-danger bg-danger text-white animate-pulse hover:bg-danger/90"
                            : "h-36 w-8 border-border border-r-0 bg-panel text-foreground/70 hover:bg-foreground/5 hover:text-primary"
                    }`}
                >
                    <div className="flex flex-col items-center justify-center h-full gap-2">
                        <HugeiconsIcon
                            icon={ArrowLeft01Icon}
                            className={`shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""} ${!hasOpenedServiceRail ? "h-6 w-6 text-white" : "h-5 w-5"}`}
                        />
                        <div
                            className={`font-mono font-black uppercase tracking-[0.2em] transform rotate-180 whitespace-nowrap ${!hasOpenedServiceRail ? "text-[11px] text-white" : "text-[10px]"}`}
                            style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
                        >
                            System Rails
                        </div>
                    </div>
                </button>

                <div className="flex h-full min-h-0 flex-col">
                    {/* Header */}
                    <div className="border-b border-border p-4 bg-muted/30">
                        <div className="flex items-center gap-2 text-sm font-mono font-bold tracking-tighter uppercase">
                            <HugeiconsIcon
                                icon={Settings02Icon}
                                size={18}
                                className="text-primary"
                            />
                            Machine Configuration
                        </div>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-6 py-10">
                        {/* Redirection Notice */}
                        <div className="space-y-6 text-center">
                            <div className="mx-auto w-16 h-16 border-2 border-primary flex items-center justify-center bg-primary/5">
                                <HugeiconsIcon icon={FlashIcon} size={32} className="text-primary" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-black uppercase tracking-tight">Configuration Centralized</h3>
                                <p className="text-[10px] font-mono text-muted uppercase leading-relaxed tracking-wide">
                                    All system parameters, API nodes, and industrial schemas have been migrated to the primary settings terminal.
                                </p>
                            </div>
                            <div className="space-y-3">
                                <Link 
                                    href="/settings"
                                    onClick={() => { vibrate("utility"); setIsOpen(false); }}
                                    className="inline-flex w-full items-center justify-center gap-3 bg-foreground text-background py-4 px-6 font-black uppercase text-xs tracking-[0.3em] hover:bg-primary transition-all active:scale-[0.98]"
                                >
                                    <HugeiconsIcon icon={Settings02Icon} size={18} />
                                    ACCESS_SETTINGS
                                </Link>
                                <Link 
                                    href="/logger"
                                    onClick={() => { vibrate("utility"); setIsOpen(false); }}
                                    className="inline-flex w-full items-center justify-center gap-3 border-2 border-foreground text-foreground py-3 px-6 font-black uppercase text-[10px] tracking-[0.3em] hover:bg-foreground hover:text-background transition-all active:scale-[0.98]"
                                >
                                    <HugeiconsIcon icon={Activity01Icon} size={16} />
                                    SYSTEM_AUDIT
                                </Link>
                            </div>
                        </div>

                        <div className="h-px bg-border/50" />

                        {/* Service Diagnostics (Keep simplified) */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-foreground/60">
                                <HugeiconsIcon
                                    icon={CrownIcon}
                                    size={14}
                                    className="text-primary"
                                />
                                Active Diagnostics
                            </div>

                            <ul className="grid gap-2">
                                {services.map((service) => (
                                    <li
                                        key={service.name}
                                        className="flex items-start gap-3 border border-border bg-background/30 p-2"
                                    >
                                        <span
                                            className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center border ${
                                                service.active
                                                    ? "text-success border-success bg-success/5"
                                                    : "text-danger border-danger bg-danger/5"
                                            }`}
                                        >
                                            {service.active ? (
                                                <HugeiconsIcon
                                                    icon={CheckmarkCircle01Icon}
                                                    size={10}
                                                />
                                            ) : (
                                                <HugeiconsIcon icon={Cancel01Icon} size={10} />
                                            )}
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-mono font-black uppercase leading-tight tracking-tight">
                                                {service.name}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
}
