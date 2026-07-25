"use client";

import { useSettings } from "@/lib/old/useSettings";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Settings01Icon,
    PaintBoardIcon,
    Key01Icon,
    SaveIcon,
    FlashIcon,
    InformationCircleIcon,
    EyeIcon,
    ViewIcon,
    ViewOffSlashIcon,
    UserIcon,
    CheckmarkCircle01Icon,
    CancelCircleIcon,
    RefreshIcon,
    Logout01Icon,
    Copy01Icon,
    Shield01Icon,
    AlertIcon,
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
import {
    login,
    signupInitiate,
    signupVerify,
    resetTokenInitiate,
    resetTokenVerify,
} from "@/lib/ledger-api";
import {
    saveAuth,
    clearAuth,
    getStoredAuth,
    getValidUntil,
    isSubscriptionValid,
    StoredAuth,
} from "@/lib/old/token-auth";
import { clsx } from "clsx";
import { PageHeader } from "@/components/PageHeader";

type AuthMode = "signin" | "signup" | "forgot";
type SignupMethod = "deposit" | "message";
type TabId = "theme" | "api" | "account";

function SecurityWarning() {
    return (
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500 rounded-lg">
            <div className="flex items-start gap-3">
                <HugeiconsIcon
                    icon={InformationCircleIcon}
                    size={24}
                    className="text-blue-500 flex-shrink-0 mt-0.5"
                />
                <div className="space-y-2">
                    <h3 className="font-bold text-blue-500 text-sm uppercase tracking-widest">
                        Store Your Token Securely
                    </h3>
                    <ul className="text-xs text-muted space-y-1">
                        <li className="flex items-center gap-2">
                            <HugeiconsIcon icon={Shield01Icon} size={14} />
                            Your secret token is like a password - never share it
                        </li>
                        <li className="flex items-center gap-2">
                            <HugeiconsIcon icon={AlertIcon} size={14} />
                            BML staff will NEVER ask for your token
                        </li>
                        <li className="flex items-center gap-2">
                            <HugeiconsIcon icon={InformationCircleIcon} size={14} />
                            If you lose your token, use &quot;Forgot Token&quot; to reset it
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default function SettingsPage() {
    const { settings, updateSetting, isLoaded } = useSettings();
    const { vibrate } = useHapticFeedback();
    const [activeTab, setActiveTab] = useState<TabId>("theme");

    // Settings (API Keys) Logic
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

    // TornExchange shared logic
    const [teKey, setTeKey] = useState("");
    const [showTeKey, setShowTeKey] = useState(false);

    // Account Logic
    const [auth, setAuth] = useState<StoredAuth | null>(null);
    const [authMode, setAuthMode] = useState<AuthMode>("signin");
    const [signupMethod, setSignupMethod] = useState<SignupMethod>("deposit");
    const [userIdInput, setUserIdInput] = useState("");
    const [secretTokenInput, setSecretTokenInput] = useState("");
    const [isAuthLoading, setIsAuthLoading] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [showSecretToken, setShowSecretToken] = useState(false);
    const [verificationData, setVerificationData] = useState<{
        amount?: number;
        message?: string;
        token: string;
    } | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [copiedMessage, setCopiedMessage] = useState(false);

    useEffect(() => {
        setIsNavLeft(localStorage.getItem("theme_nav_left") === "true");
        setTeKey(getTEApiKey());
        const stored = getStoredAuth();
        if (stored) {
            setAuth(stored);
        }
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

    // Account Actions
    const handleSignIn = async () => {
        if (!userIdInput.trim() || !secretTokenInput.trim()) {
            setAuthError("Please enter both User ID and Secret Token");
            return;
        }
        setIsAuthLoading(true);
        setAuthError(null);
        try {
            const response = await login(userIdInput.trim(), secretTokenInput.trim());
            if (response.error) { setAuthError(response.error); return; }
            if (response.authenticated) {
                const storedAuth: StoredAuth = {
                    userId: String(response.userId),
                    username: response.username,
                    secretToken: response.secretToken,
                    validUntil: response.validUntil,
                };
                saveAuth(storedAuth);
                setAuth(storedAuth);
                setUserIdInput("");
                setSecretTokenInput("");
            }
        } catch (err) { setAuthError(err instanceof Error ? err.message : "Sign in failed"); } finally { setIsAuthLoading(false); }
    };

    const handleInitiateSignup = async (type: "initiate-money" | "initiate-message") => {
        if (!userIdInput.trim()) { setAuthError("Please enter your Torn User ID"); return; }
        setIsAuthLoading(true);
        setAuthError(null);
        try {
            const response = await signupInitiate(userIdInput.trim(), type);
            if (response.error) { setAuthError(response.error); return; }
            setVerificationData({
                amount: response.amount,
                message: response.message,
                token: response.verificationToken,
            });
        } catch (err) { setAuthError(err instanceof Error ? err.message : "Failed to initiate signup"); } finally { setIsAuthLoading(false); }
    };

    const handleVerifySignup = async () => {
        if (!verificationData) return;
        setVerifying(true);
        setAuthError(null);
        try {
            const response = await signupVerify(verificationData.token);
            if (response.error) { setAuthError(response.error); return; }
            if (response.authenticated) {
                const storedAuth: StoredAuth = {
                    userId: String(response.userId),
                    username: response.username,
                    secretToken: response.secretToken,
                    validUntil: response.validUntil,
                };
                saveAuth(storedAuth);
                setAuth(storedAuth);
                setVerificationData(null);
                setUserIdInput("");
            }
        } catch (err) { setAuthError(err instanceof Error ? err.message : "Verification failed"); } finally { setVerifying(false); }
    };

    const handleInitiateResetToken = async () => {
        if (!userIdInput.trim()) { setAuthError("Please enter your Torn User ID"); return; }
        setIsAuthLoading(true);
        setAuthError(null);
        try {
            const response = await resetTokenInitiate(userIdInput.trim());
            if (response.error) { setAuthError(response.error); return; }
            setVerificationData({ message: response.message, token: response.verificationToken });
        } catch (err) { setAuthError(err instanceof Error ? err.message : "Failed to initiate token reset"); } finally { setIsAuthLoading(false); }
    };

    const handleVerifyResetToken = async () => {
        if (!verificationData) return;
        setVerifying(true);
        setAuthError(null);
        try {
            const response = await resetTokenVerify(verificationData.token);
            if (response.error) { setAuthError(response.error); return; }
            if (response.success) {
                const storedAuth: StoredAuth = {
                    userId: String(response.userId),
                    username: "",
                    secretToken: response.secretToken,
                    validUntil: null,
                };
                saveAuth(storedAuth);
                setAuth(storedAuth);
                setVerificationData(null);
                setUserIdInput("");
            }
        } catch (err) { setAuthError(err instanceof Error ? err.message : "Verification failed"); } finally { setVerifying(false); }
    };

    const handleSignOut = () => {
        clearAuth();
        setAuth(null);
        setVerificationData(null);
        setUserIdInput("");
        setSecretTokenInput("");
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        vibrate("utility");
    };

    if (!isLoaded) {
        return (
            <div className="text-center py-20 animate-pulse text-foreground/50 font-mono">
                LOADING_SETTINGS...
            </div>
        );
    }

    const tabs: { id: TabId; label: string; icon: any }[] = [
        { id: "theme", label: "Theme", icon: PaintBoardIcon },
        { id: "api", label: "API Management", icon: Key01Icon },
        { id: "account", label: "Account", icon: UserIcon },
    ];

    return (
        <div className="space-y-8 pb-10">
            <PageHeader 
                title="Settings" 
                description="System Configuration" 
                icon={Settings01Icon} 
            />

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar Navigation */}
                <div className="lg:w-1/3 flex flex-col gap-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                vibrate("utility");
                                setActiveTab(tab.id);
                            }}
                            className={clsx(
                                "flex items-center gap-4 px-6 py-4 border-2 transition-all group",
                                activeTab === tab.id
                                    ? "bg-primary border-primary text-primary-foreground"
                                    : "bg-panel border-border text-muted hover:border-primary/50 hover:text-foreground"
                            )}
                        >
                            <HugeiconsIcon 
                                icon={tab.icon} 
                                size={20} 
                                className={clsx(
                                    activeTab === tab.id ? "text-primary-foreground" : "text-primary group-hover:scale-110 transition-transform"
                                )} 
                            />
                            <span className="font-departure tracking-widest uppercase text-sm">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 min-h-[600px]">
                    {activeTab === "theme" && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 px-1">
                                <HugeiconsIcon icon={PaintBoardIcon} size={16} className="text-primary" />
                                <h3 className="text-lg font-departure tracking-widest text-primary uppercase">Theme Settings</h3>
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
                                            onChange={(e) => { vibrate("utility"); updateSetting("boxyGraph", e.target.value === "true"); }}
                                            className="w-full appearance-none bg-muted/20 border-2 border-border-strong px-4 py-1.5 pr-10 text-[10px] font-black uppercase tracking-widest text-foreground focus:border-primary outline-none cursor-pointer transition-all"
                                        >
                                            <option value="true" className="bg-panel text-foreground">Boxy (Stepped)</option>
                                            <option value="false" className="bg-panel text-foreground">Curved (Smooth)</option>
                                        </select>
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
                                            onChange={(e) => { vibrate("utility"); updateSetting("themeStyle", e.target.value as any); }}
                                            className="w-full appearance-none bg-muted/20 border-2 border-border-strong px-4 py-1.5 pr-10 text-[10px] font-black uppercase tracking-widest text-foreground focus:border-primary outline-none cursor-pointer transition-all"
                                        >
                                            <option value="classic" className="bg-panel text-foreground">Classic (Industrial)</option>
                                            <option value="playful" className="bg-panel text-foreground">Playful (Experimental)</option>
                                            <option value="modern" className="bg-panel text-foreground">Modern (Geist)</option>
                                        </select>
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
                                            onChange={(e) => { vibrate("utility"); updateSetting("backgroundStyle", e.target.value as any); }}
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
                                            onChange={(e) => { vibrate("utility"); updateSetting("monospaceFont", e.target.value as any); }}
                                            className="w-full appearance-none bg-muted/20 border-2 border-border-strong px-4 py-1.5 pr-10 text-[10px] font-black uppercase tracking-widest text-foreground focus:border-primary outline-none cursor-pointer transition-all"
                                        >
                                            <option value="space" className="bg-panel text-foreground">Space Mono</option>
                                            <option value="cascadia" className="bg-panel text-foreground">Cascadia Code</option>
                                        </select>
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
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "api" && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 px-1">
                                <HugeiconsIcon icon={Key01Icon} size={16} className="text-primary" />
                                <h3 className="text-lg font-departure tracking-widest text-primary uppercase">API Management</h3>
                                <div className="h-px flex-1 bg-border-strong" />
                            </div>

                            <div className="grid grid-cols-1 gap-px bg-border border border-border overflow-hidden">
                                {/* Torn API Throttle */}
                                <div className="bg-panel p-4 space-y-4 border-b border-border">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <h4 className="font-bold text-sm uppercase tracking-tight">Torn API Throttle</h4>
                                            <p className="text-[10px] text-muted max-w-sm italic opacity-80">Maximum requests per minute to the primary mainframe.</p>
                                        </div>
                                        <div className="text-xs font-mono font-bold text-primary">{tempTornRateLimit}/MIN</div>
                                    </div>
                                    <input type="range" min="10" max="80" value={tempTornRateLimit} onChange={(e) => setTempTornRateLimit(Number(e.target.value))} className="w-full h-1 bg-muted/30 appearance-none cursor-pointer accent-primary" />
                                    {tempTornRateLimit !== tornApiRateLimit && (
                                        <button onClick={() => handleUpdateTornRateLimit(tempTornRateLimit)} className="w-full py-2 bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 hover:opacity-90 transition-all">
                                            <HugeiconsIcon icon={SaveIcon} size={14} /> APPLY_THROTTLE
                                        </button>
                                    )}
                                </div>

                                {/* TornExchange Key */}
                                <div className="bg-panel p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <h4 className="font-bold text-sm uppercase tracking-tight">TornExchange API Key</h4>
                                            <p className="text-[10px] text-muted max-w-sm italic opacity-80">Integration key for TornExchange market data.</p>
                                        </div>
                                        <div className="relative w-64">
                                            <input type={showTeKey ? "text" : "password"} value={teKey} onChange={(e) => setTeKey(e.target.value)} className="w-full bg-muted/20 border-2 border-border-strong px-3 py-1.5 text-xs font-mono focus:border-primary outline-none transition-all" />
                                            <button onClick={() => setShowTeKey(!showTeKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground">
                                                <HugeiconsIcon icon={showTeKey ? ViewOffSlashIcon : ViewIcon} size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <button onClick={handleSaveTEKey} className="w-full py-2 bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 hover:opacity-90 transition-all">
                                        <HugeiconsIcon icon={SaveIcon} size={14} /> COMMIT_TE_KEY
                                    </button>
                                </div>
                            </div>

                            {/* Legacy Auth Keys */}
                            <div className="flex items-center gap-3 px-1 mt-8">
                                <HugeiconsIcon icon={FlashIcon} size={16} className="text-primary" />
                                <h3 className="text-lg font-departure tracking-widest text-primary uppercase">Legacy Keyrings</h3>
                                <div className="h-px flex-1 bg-border-strong" />
                            </div>

                            <div className="grid grid-cols-1 gap-px bg-border border border-border overflow-hidden">
                                {/* Weav3r Node Key */}
                                <div className="bg-panel p-4 space-y-3 border-b border-border">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <h4 className="font-bold text-sm uppercase tracking-tight">Weav3r Node Key</h4>
                                            <p className="text-[10px] text-muted max-w-sm italic opacity-80">Access key required for sales data harvesting.</p>
                                        </div>
                                        <div className="relative w-64">
                                            <input type={showWeav3rKey ? "text" : "password"} value={tempWeav3rApiKey} onChange={(e) => setTempWeav3rApiKey(e.target.value)} className="w-full bg-muted/20 border-2 border-border-strong px-3 py-1.5 text-xs font-mono focus:border-primary outline-none transition-all" />
                                            <button onClick={() => setShowWeav3rKey(!showWeav3rKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground">
                                                <HugeiconsIcon icon={showWeav3rKey ? ViewOffSlashIcon : ViewIcon} size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    {tempWeav3rApiKey !== (weav3rApiKey || "") && (
                                        <button onClick={() => void handleSaveWeav3rKey()} disabled={isSavingWeav3rKey} className="w-full py-2 bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 hover:opacity-90 transition-all">
                                            <HugeiconsIcon icon={SaveIcon} size={14} /> {isSavingWeav3rKey ? "UPDATING..." : "COMMIT_WEAV3R_KEY"}
                                        </button>
                                    )}
                                </div>

                                {/* Mainframe Access */}
                                <div className="bg-panel p-4 space-y-3 border-b border-border">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <h4 className="font-bold text-sm uppercase tracking-tight">Mainframe Access</h4>
                                            <p className="text-[10px] text-muted max-w-sm italic opacity-80">Full-access key required for Auto-Pilot sync.</p>
                                        </div>
                                        <div className="relative w-64">
                                            <input type={showTornFullKey ? "text" : "password"} value={tempTornApiKeyFull} onChange={(e) => setTempTornApiKeyFull(e.target.value)} className="w-full bg-muted/20 border-2 border-border-strong px-3 py-1.5 text-xs font-mono focus:border-primary outline-none transition-all" />
                                            <button onClick={() => setShowTornFullKey(!showTornFullKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground">
                                                <HugeiconsIcon icon={showTornFullKey ? ViewOffSlashIcon : ViewIcon} size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    {tempTornApiKeyFull !== (tornApiKeyFull || "") && (
                                        <button onClick={() => void handleSaveTornFullKey()} disabled={isSavingTornFullKey} className="w-full py-2 bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 hover:opacity-90 transition-all">
                                            <HugeiconsIcon icon={SaveIcon} size={14} /> {isSavingTornFullKey ? "SAVING..." : "COMMIT_MAINFRAME_KEY"}
                                        </button>
                                    )}
                                </div>

                                {/* Vault Sync Key */}
                                <div className="bg-panel p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <h4 className="font-bold text-sm uppercase tracking-tight">Vault Sync Key</h4>
                                            <p className="text-[10px] text-muted max-w-sm italic opacity-80">Google Drive database backup token.</p>
                                        </div>
                                        <div className="relative w-64">
                                            <input type={showDriveKey ? "text" : "password"} value={tempDriveApiKey} onChange={(e) => setTempDriveApiKey(e.target.value)} className="w-full bg-muted/20 border-2 border-border-strong px-3 py-1.5 text-xs font-mono focus:border-primary outline-none transition-all" />
                                            <button onClick={() => setShowDriveKey(!showDriveKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground">
                                                <HugeiconsIcon icon={showDriveKey ? ViewOffSlashIcon : ViewIcon} size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    {tempDriveApiKey !== (driveApiKey || "") && (
                                        <button onClick={() => void handleSaveDriveKey()} disabled={isSavingDriveKey} className="w-full py-2 bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 hover:opacity-90 transition-all">
                                            <HugeiconsIcon icon={SaveIcon} size={14} /> {isSavingDriveKey ? "AUTHORIZING..." : "COMMIT_VAULT_KEY"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "account" && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 px-1">
                                <HugeiconsIcon icon={UserIcon} size={16} className="text-primary" />
                                <h3 className="text-lg font-departure tracking-widest text-primary uppercase">Account Management</h3>
                                <div className="h-px flex-1 bg-border-strong" />
                            </div>

                            {auth ? (
                                <div className="bg-panel border-2 border-primary p-6 space-y-6">
                                    <SecurityWarning />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-4 bg-background border border-border">
                                            <span className="text-muted font-bold text-xs uppercase tracking-widest block mb-1">User ID</span>
                                            <span className="font-mono text-lg">{auth.userId}</span>
                                        </div>
                                        <div className="p-4 bg-background border border-border">
                                            <span className="text-muted font-bold text-xs uppercase tracking-widest block mb-1">Username</span>
                                            <span className="text-lg">{auth.username || "N/A"}</span>
                                        </div>
                                        <div className="p-4 bg-background border border-border">
                                            <span className="text-muted font-bold text-xs uppercase tracking-widest block mb-1">Subscription</span>
                                            <span className={clsx("flex items-center gap-2 font-bold text-lg", isSubscriptionValid() ? "text-success" : "text-danger")}>
                                                <HugeiconsIcon icon={isSubscriptionValid() ? CheckmarkCircle01Icon : CancelCircleIcon} size={20} />
                                                {isSubscriptionValid() ? "Active" : "Inactive"}
                                            </span>
                                        </div>
                                        <div className="p-4 bg-background border border-border">
                                            <span className="text-muted font-bold text-xs uppercase tracking-widest block mb-1">Valid Until</span>
                                            <span className="font-mono text-lg">{getValidUntil() ? new Date(getValidUntil()!).toLocaleDateString() : "N/A"}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-muted font-bold text-xs uppercase tracking-widest block mb-2">Secret Token</span>
                                        <div className="flex items-center gap-2">
                                            <code className="flex-1 bg-background px-4 py-3 font-mono text-sm border border-border truncate">
                                                {showSecretToken ? auth.secretToken : "••••••••••••••••••••"}
                                            </code>
                                            <button onClick={() => setShowSecretToken(!showSecretToken)} className="p-3 border border-border hover:bg-foreground/5 transition-colors">
                                                <HugeiconsIcon icon={showSecretToken ? ViewIcon : EyeIcon} size={20} />
                                            </button>
                                            <button onClick={() => copyToClipboard(auth.secretToken)} className="p-3 border border-border hover:bg-foreground/5 transition-colors">
                                                <HugeiconsIcon icon={Copy01Icon} size={20} />
                                            </button>
                                        </div>
                                    </div>
                                    <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-2 bg-danger text-white px-4 py-3 font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all">
                                        <HugeiconsIcon icon={Logout01Icon} size={18} /> SIGN OUT
                                    </button>
                                </div>
                            ) : (
                                <div className="max-w-xl bg-panel border-2 border-primary p-6">
                                    <SecurityWarning />
                                    <div className="flex gap-2 mb-6">
                                        {["signin", "signup", "forgot"].map((m) => (
                                            <button key={m} onClick={() => { setAuthMode(m as AuthMode); setAuthError(null); setVerificationData(null); }} className={clsx("flex-1 py-2 px-4 font-bold text-xs uppercase tracking-widest transition-all", authMode === m ? "bg-primary text-primary-foreground" : "bg-muted/10 text-muted hover:bg-muted/20")}>
                                                {m === "signin" ? "Sign In" : m === "signup" ? "Sign Up" : "Forgot"}
                                            </button>
                                        ))}
                                    </div>

                                    {authError && <div className="mb-4 p-3 bg-danger/10 border border-danger text-danger text-xs uppercase font-mono">{authError}</div>}

                                    {authMode === "signin" ? (
                                        <div className="space-y-4">
                                            <input type="text" value={userIdInput} onChange={(e) => setUserIdInput(e.target.value)} placeholder="Torn User ID" className="w-full px-4 py-3 bg-background border border-border focus:border-primary outline-none font-mono text-sm" />
                                            <input type="password" value={secretTokenInput} onChange={(e) => setSecretTokenInput(e.target.value)} placeholder="Secret Token" className="w-full px-4 py-3 bg-background border border-border focus:border-primary outline-none font-mono text-sm" />
                                            <button onClick={handleSignIn} disabled={isAuthLoading} className="w-full py-4 bg-primary text-primary-foreground font-black uppercase text-xs tracking-widest hover:opacity-90 transition-all disabled:opacity-50">
                                                {isAuthLoading ? "VERIFYING..." : "VERIFY & SIGN IN"}
                                            </button>
                                        </div>
                                    ) : authMode === "forgot" ? (
                                        verificationData ? (
                                            <div className="space-y-4">
                                                <div className="p-4 bg-blue-500/10 border border-blue-500 text-xs">
                                                    <p className="mb-2">Send <span className="font-bold text-primary">$1</span> to PixelGhost [3165209] with message:</p>
                                                    <div className="relative bg-background p-2 font-mono mb-4">
                                                        {verificationData.message}
                                                        <button onClick={() => copyToClipboard(verificationData.message!)} className="absolute right-2 top-1/2 -translate-y-1/2"><HugeiconsIcon icon={Copy01Icon} size={14} /></button>
                                                    </div>
                                                    <button onClick={handleVerifyResetToken} disabled={verifying} className="w-full py-3 bg-blue-500 text-white font-bold uppercase tracking-widest">{verifying ? "VERIFYING..." : "MESSAGE SENT - GET TOKEN"}</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <input type="text" value={userIdInput} onChange={(e) => setUserIdInput(e.target.value)} placeholder="Torn User ID" className="w-full px-4 py-3 bg-background border border-border focus:border-primary outline-none font-mono text-sm" />
                                                <button onClick={handleInitiateResetToken} disabled={isAuthLoading} className="w-full py-4 bg-blue-500 text-white font-black uppercase text-xs tracking-widest hover:opacity-90 transition-all">
                                                    {isAuthLoading ? "INITIATING..." : "INITIATE RESET"}
                                                </button>
                                            </div>
                                        )
                                    ) : (
                                        <div className="space-y-4">
                                            <input type="text" value={userIdInput} onChange={(e) => setUserIdInput(e.target.value)} placeholder="Torn User ID" className="w-full px-4 py-3 bg-background border border-border focus:border-primary outline-none font-mono text-sm" />
                                            <div className="flex gap-2">
                                                <button onClick={() => handleInitiateSignup("initiate-money")} disabled={isAuthLoading} className="flex-1 py-3 bg-primary text-primary-foreground font-bold text-[10px] uppercase">Send $X Deposit</button>
                                                <button onClick={() => handleInitiateSignup("initiate-message")} disabled={isAuthLoading} className="flex-1 py-3 bg-muted text-foreground font-bold text-[10px] uppercase">Send $1 + Message</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
