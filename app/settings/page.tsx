"use client";

import { useSettings } from "@/lib/old/useSettings";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Settings01Icon,
    AiViewIcon,
    PaintBoardIcon,
    CheckmarkCircle01Icon,
    CrownIcon,
    ViewIcon,
    ViewOffSlashIcon,
    Database01Icon,
    Key01Icon,
    SaveIcon,
    Cancel01Icon,
    FlashIcon,
    BrushIcon,
    InformationCircleIcon,
    EyeIcon,
} from "@hugeicons/core-free-icons";
import { useHapticFeedback } from "@/lib/old/useHapticFeedback";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/old/useAuth";
import { saveWeaverConfig } from "@/lib/old/auth";
import {
    setTornApiKeyFull,
    setDriveApiKey,
    setTornApiRateLimit,
    setWeav3rApiRateLimit,
    getTEApiKey,
    setTEApiKey,
} from "@/lib/old/api-keys";
import { refreshApiRateLimiters } from "@/lib/old/torn-api";
import { sendToExtension } from "@/lib/old/bmlconnect";
import { getGoogleDriveStatus } from "@/lib/old/drive-api";

import { PageHeader } from "@/components/PageHeader";

type ServiceItem = {
    name: string;
    active: boolean;
    detail: string;
};
export default function SettingsPage() {
    const { settings, updateSetting, isLoaded } = useSettings();
    const { vibrate } = useHapticFeedback();
// ... (rest of imports and logic remains, but wait I need to be careful with replace)

    // Migrated from ServiceRail
    const {
        weav3rApiKey,
        weav3rUserId,
        driveApiKey,
        tornApiKeyFull,
        tornApiRateLimit,
        weav3rApiRateLimit,
    } = useAuth();

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
    const [isNavLeft, setIsNavLeft] = useState(false);

    // TornExchange migration
    const [teKey, setTeKey] = useState("");
    const [showTeKey, setShowTeKey] = useState(false);

    useEffect(() => {
        setIsNavLeft(localStorage.getItem("theme_nav_left") === "true");
        setTeKey(getTEApiKey());
    }, []);

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

    const handleSaveTEKey = () => {
        setTEApiKey(teKey);
        vibrate("success");
    };

    useEffect(() => { setTempWeav3rApiKey(weav3rApiKey); }, [weav3rApiKey]);
    useEffect(() => { setTempDriveApiKey(driveApiKey); }, [driveApiKey]);
    useEffect(() => { setTempTornApiKeyFull(tornApiKeyFull); }, [tornApiKeyFull]);
    useEffect(() => { setTempTornRateLimit(tornApiRateLimit); }, [tornApiRateLimit]);
    useEffect(() => { setTempWeav3rRateLimit(weav3rApiRateLimit); }, [weav3rApiRateLimit]);

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
                requests.push(sendToExtension<{ connected?: boolean }>({ type: "DRIVE_STATUS" }) as any);
            } else {
                requests.push(Promise.resolve({ success: false }));
            }
            const [userRes, driveRes] = await Promise.all(requests);
            if (cancelled) return;
            setIsWhaleSubscriber(Boolean(userRes.success && (userRes.data as any)?.subscriptionValid));
            setDriveConnected(Boolean(driveRes.success && (driveRes.data?.connected || (driveRes as any).connected)));
        };
        void loadServiceState();
        return () => { cancelled = true; };
    }, [driveApiKey]);

    const services: ServiceItem[] = [
        { name: "Sales fetch using weav3r", active: Boolean(weav3rApiKey && weav3rUserId), detail: weav3rApiKey && weav3rUserId ? "Ready" : "Needs Torn API key." },
        { name: "Auto-Pilot sync", active: Boolean(tornApiKeyFull), detail: tornApiKeyFull ? "Full-access key saved" : "Needs Torn full-access key." },
        { name: "Google Drive Sync", active: driveConnected, detail: driveConnected ? "Connected" : "Connect in BML Connect." },
        { name: "Cost-basis on torn bazaar", active: isWhaleSubscriber, detail: isWhaleSubscriber ? "Unlocked" : "Whale subscription required." },
    ];

    const handleSaveWeav3rKey = async () => {
        vibrate("utility");
        setIsSavingWeav3rKey(true);
        setWeav3rError("");
        try { await saveWeaverConfig(tempWeav3rApiKey); } catch (error) { setWeav3rError(error instanceof Error ? error.message : "Failed to save Weav3r API key."); } finally { setIsSavingWeav3rKey(false); }
    };

    const handleSaveDriveKey = async () => {
        vibrate("utility");
        setIsSavingDriveKey(true);
        setDriveError("");
        try { setDriveApiKey(tempDriveApiKey); } catch (error) { setDriveError(error instanceof Error ? error.message : "Failed to save Drive API key."); } finally { setIsSavingDriveKey(false); }
    };

    const handleSaveTornFullKey = async () => {
        vibrate("utility");
        setIsSavingTornFullKey(true);
        setTornFullError("");
        try { setTornApiKeyFull(tempTornApiKeyFull); } catch (error) { setTornFullError(error instanceof Error ? error.message : "Failed to save Torn full-access API key."); } finally { setIsSavingTornFullKey(false); }
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

    if (!isLoaded) {
        return (
            <div className="text-center py-20 animate-pulse text-foreground/50 font-mono">
                LOADING_SETTINGS...
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
            <PageHeader 
                title="Settings" 
                description="System Configuration" 
                icon={Settings01Icon} 
            />

            {/* UI/UX Group */}
            <div className="space-y-3">
                <div className="flex items-center gap-3 px-1">
                    <HugeiconsIcon icon={PaintBoardIcon} size={16} className="text-primary" />
                    <h3 className="text-lg font-vt323 tracking-widest text-primary uppercase">
                        UI/UX
                    </h3>
                    <div className="h-px flex-1 bg-border-strong" />
                </div>

                <div className="grid grid-cols-1 gap-px bg-border border border-border overflow-hidden">
                    {/* Graph Type */}
                    <div className="bg-panel p-4 flex items-center justify-between group hover:bg-panel-elevated transition-colors border-b border-border">
                        <div className="space-y-0.5">
                            <h4 className="font-bold text-sm uppercase tracking-tight">Graph Type</h4>
                            <p className="text-[10px] text-muted max-w-sm italic opacity-80">Toggle between stepped "boxy" and smooth "curved" charts.</p>
                        </div>
                        
                        <div className="relative w-48">
                            <select
                                value={String(settings.boxyGraph)}
                                onChange={(e) => {
                                    vibrate("utility");
                                    updateSetting("boxyGraph", e.target.value === "true");
                                }}
                                className="w-full appearance-none bg-muted/20 border-2 border-border-strong px-4 py-1.5 pr-10 text-[10px] font-black uppercase tracking-widest text-foreground focus:border-primary outline-none cursor-pointer transition-all"
                            >
                                <option value="true" className="bg-panel text-foreground">Boxy (Stepped)</option>
                                <option value="false" className="bg-panel text-foreground">Curved (Smooth)</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* App Theme */}
                    <div className="bg-panel p-4 flex items-center justify-between group hover:bg-panel-elevated transition-colors border-b border-border">
                        <div className="space-y-0.5">
                            <h4 className="font-bold text-sm uppercase tracking-tight">App Theme</h4>
                            <p className="text-[10px] text-muted max-w-sm italic opacity-80">Select between Classic industrial or Playful visual style.</p>
                        </div>
                        
                        <div className="relative w-48">
                            <select
                                value={settings.themeStyle}
                                onChange={(e) => {
                                    vibrate("utility");
                                    updateSetting("themeStyle", e.target.value as any);
                                }}
                                className="w-full appearance-none bg-muted/20 border-2 border-border-strong px-4 py-1.5 pr-10 text-[10px] font-black uppercase tracking-widest text-foreground focus:border-primary outline-none cursor-pointer transition-all"
                            >
                                <option value="classic" className="bg-panel text-foreground">Classic (Industrial)</option>
                                <option value="playful" className="bg-panel text-foreground">Playful (Experimental)</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Background Style */}
                    <div className="bg-panel p-4 flex items-center justify-between group hover:bg-panel-elevated transition-colors border-b border-border">
                        <div className="space-y-0.5">
                            <h4 className="font-bold text-sm uppercase tracking-tight">Background Style</h4>
                            <p className="text-[10px] text-muted max-w-sm italic opacity-80">Choose between the classic industrial Dots or technical Gridlines.</p>
                        </div>
                        
                        <div className="relative w-48">
                            <select
                                value={settings.backgroundStyle}
                                onChange={(e) => {
                                    vibrate("utility");
                                    updateSetting("backgroundStyle", e.target.value as any);
                                }}
                                className="w-full appearance-none bg-muted/20 border-2 border-border-strong px-4 py-1.5 pr-10 text-[10px] font-black uppercase tracking-widest text-foreground focus:border-primary outline-none cursor-pointer transition-all"
                            >
                                {[
                                    { label: "Dots", value: "dots" },
                                    { label: "Grid", value: "grid" },
                                    { label: "Crosses", value: "crosses", experimental: true },
                                    { label: "Scanlines", value: "scanlines", experimental: true },
                                    { label: "Diagonal", value: "diagonal", experimental: true },
                                    { label: "Solid", value: "solid", experimental: true },
                                    { label: "Blueprint", value: "blueprint", experimental: true },
                                    { label: "Noise", value: "noise", experimental: true },
                                    { label: "Big Grid", value: "big-grid", experimental: true },
                                ].map((opt) => (
                                    <option key={opt.value} value={opt.value} className="bg-panel text-foreground">
                                        {opt.label}{opt.experimental ? " (EXPERIMENTAL)" : ""}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Monospace Font */}
                    <div className="bg-panel p-4 flex items-center justify-between group hover:bg-panel-elevated transition-colors border-b border-border">
                        <div className="space-y-0.5">
                            <h4 className="font-bold text-sm uppercase tracking-tight">Monospace Font</h4>
                            <p className="text-[10px] text-muted max-w-sm italic opacity-80">Choose your preferred font for data and code views.</p>
                        </div>
                        
                        <div className="relative w-48">
                            <select
                                value={settings.monospaceFont}
                                onChange={(e) => {
                                    vibrate("utility");
                                    updateSetting("monospaceFont", e.target.value as any);
                                }}
                                className="w-full appearance-none bg-muted/20 border-2 border-border-strong px-4 py-1.5 pr-10 text-[10px] font-black uppercase tracking-widest text-foreground focus:border-primary outline-none cursor-pointer transition-all"
                            >
                                <option value="space" className="bg-panel text-foreground">Space Mono</option>
                                <option value="cascadia" className="bg-panel text-foreground">Cascadia Code</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Anchor Left */}
                    <div className="bg-panel p-4 flex items-center justify-between group hover:bg-panel-elevated transition-colors">
                        <div className="space-y-0.5">
                            <h4 className="font-bold text-sm uppercase tracking-tight">Anchor Left</h4>
                            <p className="text-[10px] text-muted max-w-sm italic opacity-80">Relocate navigation rail to the left terminal side.</p>
                        </div>
                        
                        <div className="relative w-48">
                            <select
                                value={String(isNavLeft)}
                                onChange={(e) => handleToggleNavLeft(e.target.value === "true")}
                                className="w-full appearance-none bg-muted/20 border-2 border-border-strong px-4 py-1.5 pr-10 text-[10px] font-black uppercase tracking-widest text-foreground focus:border-primary outline-none cursor-pointer transition-all"
                            >
                                <option value="false" className="bg-panel text-foreground">Standard Right</option>
                                <option value="true" className="bg-panel text-foreground">Anchored Left</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Authentication Group */}
            <div className="space-y-3">
                <div className="flex items-center gap-3 px-1">
                    <HugeiconsIcon icon={Key01Icon} size={16} className="text-primary" />
                    <h3 className="text-lg font-vt323 tracking-widest text-primary uppercase">
                        Authentication
                    </h3>
                    <div className="h-px flex-1 bg-border-strong" />
                </div>

                <div className="grid grid-cols-1 gap-px bg-border border border-border overflow-hidden">
                    {/* Weav3r Node Key */}
                    <div className="bg-panel p-4 space-y-3 group hover:bg-panel-elevated transition-colors border-b border-border">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <h4 className="font-bold text-sm uppercase tracking-tight">Weav3r Node Key</h4>
                                <p className="text-[10px] text-muted max-w-sm italic opacity-80">Access key required for sales data harvesting.</p>
                            </div>
                            <div className="relative w-64">
                                <input
                                    type={showWeav3rKey ? "text" : "password"}
                                    value={tempWeav3rApiKey}
                                    onChange={(e) => setTempWeav3rApiKey(e.target.value)}
                                    className="w-full bg-muted/20 border-2 border-border-strong px-3 py-1.5 text-xs font-mono focus:border-primary outline-none transition-all"
                                    placeholder="Enter API Key"
                                />
                                <button
                                    onClick={() => setShowWeav3rKey(!showWeav3rKey)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-foreground transition-colors"
                                >
                                    <HugeiconsIcon icon={showWeav3rKey ? ViewOffSlashIcon : ViewIcon} size={14} />
                                </button>
                            </div>
                        </div>
                        {weav3rError && <p className="text-[10px] text-danger font-mono uppercase">{weav3rError}</p>}
                        {tempWeav3rApiKey !== (weav3rApiKey || "") && (
                            <button
                                onClick={() => void handleSaveWeav3rKey()}
                                disabled={isSavingWeav3rKey}
                                className="w-full py-2 bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all"
                            >
                                <HugeiconsIcon icon={SaveIcon} size={14} />
                                {isSavingWeav3rKey ? "UPDATING_NODE..." : "COMMIT_WEAV3R_KEY"}
                            </button>
                        )}
                    </div>

                    {/* Mainframe Full Access */}
                    <div className="bg-panel p-4 space-y-3 group hover:bg-panel-elevated transition-colors border-b border-border">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <h4 className="font-bold text-sm uppercase tracking-tight">Mainframe Access</h4>
                                <p className="text-[10px] text-muted max-w-sm italic opacity-80">Full-access key required for Auto-Pilot synchronization.</p>
                            </div>
                            <div className="relative w-64">
                                <input
                                    type={showTornFullKey ? "text" : "password"}
                                    value={tempTornApiKeyFull}
                                    onChange={(e) => setTempTornApiKeyFull(e.target.value)}
                                    className="w-full bg-muted/20 border-2 border-border-strong px-3 py-1.5 text-xs font-mono focus:border-primary outline-none transition-all"
                                    placeholder="Enter Full Access Key"
                                />
                                <button
                                    onClick={() => setShowTornFullKey(!showTornFullKey)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-foreground transition-colors"
                                >
                                    <HugeiconsIcon icon={showTornFullKey ? ViewOffSlashIcon : ViewIcon} size={14} />
                                </button>
                            </div>
                        </div>
                        {tornFullError && <p className="text-[10px] text-danger font-mono uppercase">{tornFullError}</p>}
                        {tempTornApiKeyFull !== (tornApiKeyFull || "") && (
                            <button
                                onClick={() => void handleSaveTornFullKey()}
                                disabled={isSavingTornFullKey}
                                className="w-full py-2 bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all"
                            >
                                <HugeiconsIcon icon={SaveIcon} size={14} />
                                {isSavingTornFullKey ? "SYNCHRONIZING..." : "COMMIT_MAINFRAME_KEY"}
                            </button>
                        )}
                    </div>

                    {/* Vault Sync Key */}
                    <div className="bg-panel p-4 space-y-3 group hover:bg-panel-elevated transition-colors border-b border-border">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <h4 className="font-bold text-sm uppercase tracking-tight">Vault Sync Key</h4>
                                <p className="text-[10px] text-muted max-w-sm italic opacity-80">Cloud access token for Google Drive database backups.</p>
                            </div>
                            <div className="relative w-64">
                                <input
                                    type={showDriveKey ? "text" : "password"}
                                    value={tempDriveApiKey}
                                    onChange={(e) => setTempDriveApiKey(e.target.value)}
                                    className="w-full bg-muted/20 border-2 border-border-strong px-3 py-1.5 text-xs font-mono focus:border-primary outline-none transition-all"
                                    placeholder="Enter Drive Token"
                                />
                                <button
                                    onClick={() => setShowDriveKey(!showDriveKey)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                                >
                                    <HugeiconsIcon icon={showDriveKey ? ViewOffSlashIcon : ViewIcon} size={14} />
                                </button>
                            </div>
                        </div>
                        {driveError && <p className="text-[10px] text-danger font-mono uppercase">{driveError}</p>}
                        {tempDriveApiKey !== (driveApiKey || "") && (
                            <button
                                onClick={() => void handleSaveDriveKey()}
                                disabled={isSavingDriveKey}
                                className="w-full py-2 bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all"
                            >
                                <HugeiconsIcon icon={SaveIcon} size={14} />
                                {isSavingDriveKey ? "AUTHORIZING..." : "COMMIT_VAULT_KEY"}
                            </button>
                        )}
                    </div>

                    {/* TornExchange API Key */}
                    <div className="bg-panel p-4 space-y-3 group hover:bg-panel-elevated transition-colors">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <h4 className="font-bold text-sm uppercase tracking-tight">TornExchange API Key</h4>
                                <p className="text-[10px] text-muted max-w-sm italic opacity-80">Integration key for TornExchange market data.</p>
                            </div>
                            <div className="relative w-64">
                                <input
                                    type={showTeKey ? "text" : "password"}
                                    value={teKey}
                                    onChange={(e) => setTeKey(e.target.value)}
                                    className="w-full bg-muted/20 border-2 border-border-strong px-3 py-1.5 text-xs font-mono focus:border-primary outline-none transition-all"
                                    placeholder="Enter TE Key"
                                />
                                <button
                                    onClick={() => setShowTeKey(!showTeKey)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                                >
                                    <HugeiconsIcon icon={showTeKey ? ViewIcon : EyeIcon} size={14} />
                                </button>
                            </div>
                        </div>
                        <p className="text-[9px] text-muted flex items-center gap-1.5 font-mono uppercase">
                            <HugeiconsIcon icon={InformationCircleIcon} size={12} />
                            <span>Find at <a href="https://tornexchange.com/profile" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-bold">tornexchange.com/profile</a></span>
                        </p>
                        <button
                            onClick={handleSaveTEKey}
                            className="w-full py-2 bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all"
                        >
                            <HugeiconsIcon icon={SaveIcon} size={14} />
                            COMMIT_TE_KEY
                        </button>
                    </div>
                </div>
            </div>

            {/* Flow Control Group */}
            <div className="space-y-3">
                <div className="flex items-center gap-3 px-1">
                    <HugeiconsIcon icon={FlashIcon} size={16} className="text-primary" />
                    <h3 className="text-lg font-vt323 tracking-widest text-primary uppercase">
                        Flow Control
                    </h3>
                    <div className="h-px flex-1 bg-border-strong" />
                </div>

                <div className="grid grid-cols-1 gap-px bg-border border border-border overflow-hidden">
                    {/* Torn Rate Limit */}
                    <div className="bg-panel p-4 space-y-4 group hover:bg-panel-elevated transition-colors border-b border-border">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <h4 className="font-bold text-sm uppercase tracking-tight">Torn API Throttle</h4>
                                <p className="text-[10px] text-muted max-w-sm italic opacity-80">Maximum requests per minute to the primary mainframe.</p>
                            </div>
                            <div className="text-xs font-mono font-bold text-primary">
                                {tempTornRateLimit}/MIN
                            </div>
                        </div>
                        <input
                            type="range"
                            min="10"
                            max="80"
                            value={tempTornRateLimit}
                            onChange={(e) => setTempTornRateLimit(Number(e.target.value))}
                            className="w-full h-1 bg-muted/30 appearance-none cursor-pointer accent-primary"
                        />
                        {tempTornRateLimit !== tornApiRateLimit && (
                            <button
                                onClick={() => handleUpdateTornRateLimit(tempTornRateLimit)}
                                className="w-full py-2 bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all"
                            >
                                <HugeiconsIcon icon={SaveIcon} size={14} />
                                APPLY_MAINFRAME_THROTTLE
                            </button>
                        )}
                    </div>

                    {/* Weav3r Rate Limit */}
                    <div className="bg-panel p-4 space-y-4 group hover:bg-panel-elevated transition-colors">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <h4 className="font-bold text-sm uppercase tracking-tight">Weav3r Core Throttle</h4>
                                <p className="text-[10px] text-muted max-w-sm italic opacity-80">Harvesting frequency for decentralized node data.</p>
                            </div>
                            <div className="text-xs font-mono font-bold text-primary">
                                {tempWeav3rRateLimit}/MIN
                            </div>
                        </div>
                        <input
                            type="range"
                            min="10"
                            max="80"
                            value={tempWeav3rRateLimit}
                            onChange={(e) => setTempWeav3rRateLimit(Number(e.target.value))}
                            className="w-full h-1 bg-muted/30 appearance-none cursor-pointer accent-primary"
                        />
                        {tempWeav3rRateLimit !== weav3rApiRateLimit && (
                            <button
                                onClick={() => handleUpdateWeav3rRateLimit(tempWeav3rRateLimit)}
                                className="w-full py-2 bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all"
                            >
                                <HugeiconsIcon icon={SaveIcon} size={14} />
                                APPLY_WEAV3R_THROTTLE
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
