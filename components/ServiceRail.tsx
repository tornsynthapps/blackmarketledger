"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
    CheckmarkCircle01Icon,
    ArrowLeft01Icon,
    CrownIcon,
    ViewIcon,
    ViewOffSlashIcon,
    Database01Icon,
    Key01Icon,
    SaveIcon,
    Cancel01Icon,
    FlashIcon,
    BrushIcon,
    SidebarLeft01Icon,
    Settings02Icon,
} from "@hugeicons/core-free-icons";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/useAuth";
import { saveWeaverConfig } from "@/lib/auth";
import {
    setTornApiKeyFull,
    setDriveApiKey,
    setTornApiRateLimit,
    setWeav3rApiRateLimit,
} from "@/lib/api-keys";
import { refreshApiRateLimiters } from "@/lib/torn-api";
import { sendToExtension } from "@/lib/bmlconnect";
import { useHapticFeedback } from "@/lib/useHapticFeedback";
import { getGoogleDriveStatus } from "@/lib/drive-api";

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
    const [tempWeav3rApiKey, setTempWeav3rApiKey] = useState(weav3rApiKey);
    const [tempDriveApiKey, setTempDriveApiKey] = useState(driveApiKey);
    const [tempTornApiKeyFull, setTempTornApiKeyFull] = useState(tornApiKeyFull);
    const [showWeav3rKey, setShowWeav3rKey] = useState(false);
    const [showDriveKey, setShowDriveKey] = useState(false);
    const [showTornFullKey, setShowTornFullKey] = useState(false);
    const [isSavingWeav3rKey, setIsSavingWeav3rKey] = useState(false);
    const [isSavingDriveKey, setIsSavingDriveKey] = useState(false);
    const [isSavingTornFullKey, setIsSavingTornFullKey] = useState(false);
    const [weav3rError, setWeav3rError] = useState("");
    const [driveError, setDriveError] = useState("");
    const [tornFullError, setTornFullError] = useState("");
    const [tempTornRateLimit, setTempTornRateLimit] = useState(tornApiRateLimit);
    const [tempWeav3rRateLimit, setTempWeav3rRateLimit] = useState(weav3rApiRateLimit);
    const [isSolarized, setIsSolarized] = useState(false);
    const [isNavLeft, setIsNavLeft] = useState(false);
    const [hasOpenedServiceRail, setHasOpenedServiceRail] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        setIsSolarized(localStorage.getItem("theme_solarized") === "true");
        setIsNavLeft(localStorage.getItem("theme_nav_left") === "true");
        setHasOpenedServiceRail(localStorage.getItem("bml_service_rail_opened") === "true");
    }, []);

    const handleToggleSolarized = (enabled: boolean) => {
        vibrate("utility");
        setIsSolarized(enabled);
        if (enabled) {
            localStorage.setItem("theme_solarized", "true");
            document.documentElement.classList.add("theme-solarized");
        } else {
            localStorage.removeItem("theme_solarized");
            document.documentElement.classList.remove("theme-solarized");
        }
    };

    const handleToggleNavLeft = (enabled: boolean) => {
        vibrate("utility");
        setIsNavLeft(enabled);
        if (enabled) {
            localStorage.setItem("theme_nav_left", "true");
            document.documentElement.classList.add("layout-nav-left");
        } else {
            localStorage.removeItem("theme_nav_left");
            document.documentElement.classList.remove("layout-nav-left");
        }
    };

    useEffect(() => {
        setTempWeav3rApiKey(weav3rApiKey);
    }, [weav3rApiKey]);

    useEffect(() => {
        setTempDriveApiKey(driveApiKey);
    }, [driveApiKey]);

    useEffect(() => {
        setTempTornApiKeyFull(tornApiKeyFull);
    }, [tornApiKeyFull]);

    useEffect(() => {
        setTempTornRateLimit(tornApiRateLimit);
    }, [tornApiRateLimit]);

    useEffect(() => {
        setTempWeav3rRateLimit(weav3rApiRateLimit);
    }, [weav3rApiRateLimit]);

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

    const handleSaveWeav3rKey = async () => {
        vibrate("utility");
        setIsSavingWeav3rKey(true);
        setWeav3rError("");

        try {
            await saveWeaverConfig(tempWeav3rApiKey);
        } catch (error) {
            setWeav3rError(
                error instanceof Error ? error.message : "Failed to save Weav3r API key."
            );
        } finally {
            setIsSavingWeav3rKey(false);
        }
    };

    const handleSaveDriveKey = async () => {
        vibrate("utility");
        setIsSavingDriveKey(true);
        setDriveError("");

        try {
            setDriveApiKey(tempDriveApiKey);
        } catch (error) {
            setDriveError(error instanceof Error ? error.message : "Failed to save Drive API key.");
        } finally {
            setIsSavingDriveKey(false);
        }
    };

    const handleSaveTornFullKey = async () => {
        vibrate("utility");
        setIsSavingTornFullKey(true);
        setTornFullError("");

        try {
            setTornApiKeyFull(tempTornApiKeyFull);
        } catch (error) {
            setTornFullError(
                error instanceof Error ? error.message : "Failed to save Torn full-access API key."
            );
        } finally {
            setIsSavingTornFullKey(false);
        }
    };

    const handleUpdateTornRateLimit = (value: number) => {
        vibrate("utility");
        const clamped = Math.max(10, Math.min(80, value));
        setTornApiRateLimit(clamped);
        refreshApiRateLimiters();
    };

    const handleUpdateWeav3rRateLimit = (value: number) => {
        vibrate("utility");
        const clamped = Math.max(10, Math.min(80, value));
        setWeav3rApiRateLimit(clamped);
        refreshApiRateLimiters();
    };

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

                    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 py-6">
                        {/* API Keys Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-foreground/60">
                                <HugeiconsIcon
                                    icon={Key01Icon}
                                    size={14}
                                    className="text-primary"
                                />
                                Authentication
                            </div>

                            <div className="grid gap-6">
                                {/* Weav3r Key */}
                                <div className="space-y-2">
                                    <span className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider text-foreground/50">
                                        Weav3r Node Key
                                    </span>
                                    <div className="relative">
                                        <input
                                            type={showWeav3rKey ? "text" : "password"}
                                            value={tempWeav3rApiKey}
                                            onChange={(event) =>
                                                setTempWeav3rApiKey(event.target.value)
                                            }
                                            placeholder="Access Key Required"
                                            className="w-full border border-border bg-background/50 px-3 py-2 text-xs font-mono outline-none transition-colors focus:border-primary/50 focus:bg-background"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowWeav3rKey(!showWeav3rKey)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-foreground/40 hover:text-foreground/70"
                                        >
                                            {showWeav3rKey ? (
                                                <HugeiconsIcon icon={ViewOffSlashIcon} size={16} />
                                            ) : (
                                                <HugeiconsIcon icon={ViewIcon} size={16} />
                                            )}
                                        </button>
                                    </div>
                                    {weav3rError && (
                                        <p className="text-[10px] text-danger font-mono">
                                            {weav3rError}
                                        </p>
                                    )}
                                    {tempWeav3rApiKey !== (weav3rApiKey || "") && (
                                        <button
                                            type="button"
                                            onClick={() => void handleSaveWeav3rKey()}
                                            disabled={isSavingWeav3rKey}
                                            className="hardline-button w-full justify-center !py-1.5"
                                        >
                                            <HugeiconsIcon icon={SaveIcon} size={14} />
                                            {isSavingWeav3rKey ? "UPDATING..." : "COMMIT KEY"}
                                        </button>
                                    )}
                                </div>

                                {/* Torn Full Key */}
                                <div className="space-y-2">
                                    <span className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider text-foreground/50">
                                        Mainframe Full Access
                                    </span>
                                    <div className="relative">
                                        <input
                                            type={showTornFullKey ? "text" : "password"}
                                            value={tempTornApiKeyFull}
                                            onChange={(event) =>
                                                setTempTornApiKeyFull(event.target.value)
                                            }
                                            placeholder="Required for Auto-Pilot"
                                            className="w-full border border-border bg-background/50 px-3 py-2 text-xs font-mono outline-none transition-colors focus:border-primary/50 focus:bg-background"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowTornFullKey(!showTornFullKey)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-foreground/40 hover:text-foreground/70"
                                        >
                                            {showTornFullKey ? (
                                                <HugeiconsIcon icon={ViewOffSlashIcon} size={16} />
                                            ) : (
                                                <HugeiconsIcon icon={ViewIcon} size={16} />
                                            )}
                                        </button>
                                    </div>
                                    {tornFullError && (
                                        <p className="text-[10px] text-danger font-mono">
                                            {tornFullError}
                                        </p>
                                    )}
                                    {tempTornApiKeyFull !== (tornApiKeyFull || "") && (
                                        <button
                                            type="button"
                                            onClick={() => void handleSaveTornFullKey()}
                                            disabled={isSavingTornFullKey}
                                            className="hardline-button w-full justify-center !py-1.5"
                                        >
                                            <HugeiconsIcon icon={SaveIcon} size={14} />
                                            {isSavingTornFullKey ? "UPDATING..." : "COMMIT KEY"}
                                        </button>
                                    )}
                                </div>

                                {/* Drive Key */}
                                <div className="space-y-2">
                                    <span className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider text-foreground/50">
                                        Vault Sync Key
                                    </span>
                                    <div className="relative">
                                        <input
                                            type={showDriveKey ? "text" : "password"}
                                            value={tempDriveApiKey}
                                            onChange={(event) =>
                                                setTempDriveApiKey(event.target.value)
                                            }
                                            placeholder="Cloud Access Token"
                                            className="w-full border border-border bg-background/50 px-3 py-2 text-xs font-mono outline-none transition-colors focus:border-primary/50 focus:bg-background"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowDriveKey(!showDriveKey)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-foreground/40 hover:text-foreground/70"
                                        >
                                            {showDriveKey ? (
                                                <HugeiconsIcon icon={ViewOffSlashIcon} size={16} />
                                            ) : (
                                                <HugeiconsIcon icon={ViewIcon} size={16} />
                                            )}
                                        </button>
                                    </div>
                                    {driveError && (
                                        <p className="text-[10px] text-danger font-mono">
                                            {driveError}
                                        </p>
                                    )}
                                    {tempDriveApiKey !== (driveApiKey || "") && (
                                        <button
                                            type="button"
                                            onClick={() => void handleSaveDriveKey()}
                                            disabled={isSavingDriveKey}
                                            className="hardline-button w-full justify-center !py-1.5"
                                        >
                                            <HugeiconsIcon icon={SaveIcon} size={14} />
                                            {isSavingDriveKey ? "UPDATING..." : "COMMIT KEY"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-border/50" />

                        {/* Rate Limits Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-foreground/60">
                                <HugeiconsIcon
                                    icon={FlashIcon}
                                    size={14}
                                    className="text-primary"
                                />
                                Flow Control
                            </div>

                            <div className="space-y-6">
                                {/* Torn Rate Limit */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-foreground/50">
                                            Torn API Throttle
                                        </span>
                                        <span className="text-xs font-mono font-bold text-primary">
                                            {tempTornRateLimit}/MIN
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="10"
                                        max="80"
                                        value={tempTornRateLimit}
                                        onChange={(event) =>
                                            setTempTornRateLimit(Number(event.target.value))
                                        }
                                        className="w-full h-1 bg-border/50 appearance-none cursor-pointer accent-primary"
                                    />
                                    {tempTornRateLimit !== tornApiRateLimit && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleUpdateTornRateLimit(tempTornRateLimit)
                                            }
                                            className="hardline-button w-full justify-center !py-1.5"
                                        >
                                            <HugeiconsIcon icon={SaveIcon} size={14} />
                                            SAVE REQ LIMIT
                                        </button>
                                    )}
                                </div>

                                {/* Weav3r Rate Limit */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-foreground/50">
                                            Weav3r Core Throttle
                                        </span>
                                        <span className="text-xs font-mono font-bold text-primary">
                                            {tempWeav3rRateLimit}/MIN
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="10"
                                        max="80"
                                        value={tempWeav3rRateLimit}
                                        onChange={(event) =>
                                            setTempWeav3rRateLimit(Number(event.target.value))
                                        }
                                        className="w-full h-1 bg-border/50 appearance-none cursor-pointer accent-primary"
                                    />
                                    {tempWeav3rRateLimit !== weav3rApiRateLimit && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleUpdateWeav3rRateLimit(tempWeav3rRateLimit)
                                            }
                                            className="hardline-button w-full justify-center !py-1.5"
                                        >
                                            <HugeiconsIcon icon={SaveIcon} size={14} />
                                            SAVE REQ LIMIT
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-border/50" />

                        {/* UI Parameters Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-foreground/60">
                                <HugeiconsIcon
                                    icon={BrushIcon}
                                    size={14}
                                    className="text-primary"
                                />
                                Industrial Schema
                            </div>

                            <div className="space-y-3">
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <span className="text-xs font-mono font-bold uppercase group-hover:text-primary transition-colors">
                                        Solarized Core
                                    </span>
                                    <div
                                        onClick={() => handleToggleSolarized(!isSolarized)}
                                        className={`w-10 h-5 border border-border flex items-center transition-colors px-1 ${isSolarized ? "bg-primary/20 border-primary" : "bg-muted"}`}
                                    >
                                        <div
                                            className={`w-2 h-2 transition-all ${isSolarized ? "translate-x-5 bg-primary" : "translate-x-0 bg-foreground/40"}`}
                                        />
                                    </div>
                                </label>

                                <label className="flex items-center justify-between cursor-pointer group">
                                    <span className="text-xs font-mono font-bold uppercase group-hover:text-primary transition-colors">
                                        Anchor Left
                                    </span>
                                    <div
                                        onClick={() => handleToggleNavLeft(!isNavLeft)}
                                        className={`w-10 h-5 border border-border flex items-center transition-colors px-1 ${isNavLeft ? "bg-primary/20 border-primary" : "bg-muted"}`}
                                    >
                                        <div
                                            className={`w-2 h-2 transition-all ${isNavLeft ? "translate-x-5 bg-primary" : "translate-x-0 bg-foreground/40"}`}
                                        />
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div className="h-px bg-border/50" />

                        {/* Service Diagnostics Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-foreground/60">
                                <HugeiconsIcon
                                    icon={CrownIcon}
                                    size={14}
                                    className="text-primary"
                                />
                                Diagnostics
                            </div>

                            <ul className="space-y-2">
                                {services.map((service) => (
                                    <li
                                        key={service.name}
                                        className="flex items-start gap-3 border border-border bg-background/30 p-2"
                                    >
                                        <span
                                            className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center ${
                                                service.active
                                                    ? "text-success bg-success/10"
                                                    : "text-danger bg-danger/10"
                                            }`}
                                        >
                                            {service.active ? (
                                                <HugeiconsIcon
                                                    icon={CheckmarkCircle01Icon}
                                                    size={12}
                                                />
                                            ) : (
                                                <HugeiconsIcon icon={Cancel01Icon} size={12} />
                                            )}
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-mono font-black uppercase leading-tight tracking-tight">
                                                {service.name}
                                            </p>
                                            <p className="text-[9px] font-mono text-foreground/50 uppercase tracking-tighter">
                                                {service.detail}
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
