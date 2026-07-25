"use client";

import { useSettings } from "@/lib/old/useSettings";
import { DataManagementService } from "@/lib/domain/DataManagementService";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Settings01Icon,
    PaintBoardIcon,
    Key01Icon,
    SaveIcon,
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
    DatabaseIcon,
    Delete02Icon,
    AlertCircleIcon,
} from "@hugeicons/core-free-icons";
import { useHapticFeedback } from "@/lib/old/useHapticFeedback";
import { useState, useEffect, useMemo } from "react";
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
type TabId = "theme" | "api" | "account" | "data";

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
    const { settings, updateSetting, updateSettings, isLoaded } = useSettings();
    const dataService = useMemo(() => new DataManagementService(), []);
    const { vibrate } = useHapticFeedback();
    const [activeTab, setActiveTab] = useState<TabId>("account");
    const [isClearing, setIsClearing] = useState(false);
    const [showConfirmClearModal, setShowConfirmClearModal] = useState(false);
    const [clearSuccess, setClearSuccess] = useState(false);

    const handleClearAllData = async () => {
        vibrate("utility");
        setIsClearing(true);
        try {
            await dataService.clearAllData();
            setClearSuccess(true);
            setShowConfirmClearModal(false);
            vibrate("success");
        } catch (err) {
            console.error("Failed to clear data:", err);
        } finally {
            setIsClearing(false);
        }
    };

    // Auto-sync active tab based on visible scroll section
    useEffect(() => {
        const sectionIds: TabId[] = ["account", "api", "theme", "data"];
        const observerOptions = {
            root: null,
            rootMargin: "-20% 0px -50% 0px",
            threshold: 0,
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const id = entry.target.id.replace("settings-", "") as TabId;
                    setActiveTab(id);
                }
            });
        }, observerOptions);

        sectionIds.forEach((id) => {
            const el = document.getElementById(`settings-${id}`);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, []);

    const scrollToSection = (id: TabId) => {
        vibrate("utility");
        setActiveTab(id);
        const el = document.getElementById(`settings-${id}`);
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };

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
    const [savedTeKey, setSavedTeKey] = useState("");
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
        const key = getTEApiKey() || "";
        setTeKey(key);
        setSavedTeKey(key);
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
        setSavedTeKey(teKey);
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
        { id: "account", label: "Account", icon: UserIcon },
        { id: "api", label: "API Management", icon: Key01Icon },
        { id: "theme", label: "Theme Settings", icon: PaintBoardIcon },
        { id: "data", label: "Data Management", icon: DatabaseIcon },
    ];

    return (
        <div className="space-y-8 pb-10">
            <PageHeader 
                title="Settings" 
                description="System Configuration" 
                icon={Settings01Icon} 
            />

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sticky Sidebar Navigation Rail (Flush / Gapless) */}
                <div className="lg:w-1/3 flex flex-col border-2 border-border divide-y-2 divide-border bg-panel self-start sticky top-6 shadow-sm overflow-hidden">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => scrollToSection(tab.id)}
                            className={clsx(
                                "flex items-center gap-4 px-6 py-4 transition-all group text-left cursor-pointer",
                                activeTab === tab.id
                                    ? "bg-primary text-primary-foreground font-bold"
                                    : "bg-panel text-muted hover:bg-panel-elevated hover:text-foreground"
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

                {/* Main Settings Continuous Scroll Content Area */}
                <div className="flex-1 space-y-12 min-h-[600px]">
                    {/* Section 1: Account Management */}
                    <section id="settings-account" className="space-y-6 scroll-mt-6">
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
                    </section>

                    {/* Section 2: API Management */}
                    <section id="settings-api" className="space-y-6 scroll-mt-6">
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

                            {/* Weav3r Key */}
                            <div className="bg-panel p-4 space-y-3 border-b border-border">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <h4 className="font-bold text-sm uppercase tracking-tight">Weav3r Key</h4>
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

                            {/* Torn Full Access API Key */}
                            <div className="bg-panel p-4 space-y-3 border-b border-border">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <h4 className="font-bold text-sm uppercase tracking-tight">Torn Full Access API Key</h4>
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

                            {/* TornExchange Key */}
                            <div className="bg-panel p-4 space-y-3 border-b border-border">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <h4 className="font-bold text-sm uppercase tracking-tight">TornExchange Key</h4>
                                        <p className="text-[10px] text-muted max-w-sm italic opacity-80">Integration key for TornExchange market data.</p>
                                    </div>
                                    <div className="relative w-64">
                                        <input type={showTeKey ? "text" : "password"} value={teKey} onChange={(e) => setTeKey(e.target.value)} className="w-full bg-muted/20 border-2 border-border-strong px-3 py-1.5 text-xs font-mono focus:border-primary outline-none transition-all" />
                                        <button onClick={() => setShowTeKey(!showTeKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground">
                                            <HugeiconsIcon icon={showTeKey ? ViewOffSlashIcon : ViewIcon} size={14} />
                                        </button>
                                    </div>
                                </div>
                                {teKey !== savedTeKey && (
                                    <button onClick={handleSaveTEKey} className="w-full py-2 bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 hover:opacity-90 transition-all">
                                        <HugeiconsIcon icon={SaveIcon} size={14} /> COMMIT_TE_KEY
                                    </button>
                                )}
                            </div>

                            {/* Vault Sync Key (Deprecated) */}
                            <div className="bg-panel p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <h4 className="font-bold text-sm uppercase tracking-tight">
                                            Vault Sync Key <span className="text-[10px] text-danger uppercase tracking-wider ml-1 font-normal">(deprecated)</span>
                                        </h4>
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
                    </section>

                    {/* Section 3: Theme Settings */}
                    <section id="settings-theme" className="space-y-6 scroll-mt-6">
                        <div className="flex items-center gap-3 px-1">
                            <HugeiconsIcon icon={PaintBoardIcon} size={16} className="text-primary" />
                            <h3 className="text-lg font-departure tracking-widest text-primary uppercase">Theme Settings</h3>
                            <div className="h-px flex-1 bg-border-strong" />
                        </div>

                        <div className="grid grid-cols-1 gap-px bg-border border border-border overflow-hidden">
                            {/* Typography Theme Selection Boxes */}
                            <div className="bg-panel p-5 border-b border-border space-y-4">
                                <div className="space-y-0.5">
                                    <h4 className="font-bold text-sm uppercase tracking-tight">Typography Theme</h4>
                                    <p className="text-[11px] text-muted italic opacity-80">Select your preferred font suite across the entire application.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                                    {/* Pixel Box */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            vibrate("utility");
                                            updateSettings({ fontTheme: "pixel", themeStyle: "classic" });
                                        }}
                                        className={clsx(
                                            "p-5 border-2 text-left transition-all relative flex flex-col justify-between min-h-[140px] cursor-pointer",
                                            settings.fontTheme === "pixel" || settings.fontTheme === undefined
                                                ? "bg-primary/10 border-primary text-foreground"
                                                : "bg-panel border-border text-muted hover:border-border-strong hover:text-foreground"
                                        )}
                                    >
                                        <div className="flex items-start justify-between">
                                            <span className="text-4xl font-bold tracking-tight" style={{ fontFamily: "'Departure Mono', monospace" }}>
                                                Aa
                                            </span>
                                            {(settings.fontTheme === "pixel" || settings.fontTheme === undefined) && (
                                                <span className="text-[10px] font-black uppercase tracking-widest bg-primary text-primary-foreground px-2 py-0.5">
                                                    ACTIVE
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-4">
                                            <h4 className="font-bold text-sm uppercase tracking-wider text-foreground">Pixel</h4>
                                            <p className="text-[11px] text-muted mt-0.5 opacity-90">Departure Mono for Headings, Body, & Data</p>
                                        </div>
                                    </button>

                                    {/* Modern Box */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            vibrate("utility");
                                            updateSettings({ fontTheme: "modern", themeStyle: "modern" });
                                        }}
                                        className={clsx(
                                            "p-5 border-2 text-left transition-all relative flex flex-col justify-between min-h-[140px] cursor-pointer",
                                            settings.fontTheme === "modern"
                                                ? "bg-primary/10 border-primary text-foreground"
                                                : "bg-panel border-border text-muted hover:border-border-strong hover:text-foreground"
                                        )}
                                    >
                                        <div className="flex items-start justify-between">
                                            <span className="text-4xl font-bold tracking-tight" style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}>
                                                Aa
                                            </span>
                                            {settings.fontTheme === "modern" && (
                                                <span className="text-[10px] font-black uppercase tracking-widest bg-primary text-primary-foreground px-2 py-0.5">
                                                    ACTIVE
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-4">
                                            <h4 className="font-bold text-sm uppercase tracking-wider text-foreground">Modern</h4>
                                            <p className="text-[11px] text-muted mt-0.5 opacity-90">Geist Pixel Headings, Geist Sans Body, Geist Mono Data</p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Navigation Bar Position */}
                            <div className="bg-panel p-5 border-b border-border space-y-4">
                                <div className="space-y-0.5">
                                    <h4 className="font-bold text-sm uppercase tracking-tight">Navigation Bar Position</h4>
                                    <p className="text-[11px] text-muted italic opacity-80">Select preferred layout position for the primary navigation rail.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                                    {/* Top Navigation Box */}
                                    <button
                                        type="button"
                                        onClick={() => handleToggleNavLeft(false)}
                                        className={clsx(
                                            "p-5 border-2 text-left transition-all relative flex flex-col justify-between min-h-[130px] cursor-pointer",
                                            !isNavLeft
                                                ? "bg-primary/10 border-primary text-foreground"
                                                : "bg-panel border-border text-muted hover:border-border-strong hover:text-foreground"
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            {/* Wireframe Diagram */}
                                            <div className="w-16 h-10 border border-border-strong bg-panel-elevated p-1 flex flex-col gap-1">
                                                <div className="w-full h-2 bg-primary/70" />
                                                <div className="w-full flex-1 bg-muted/20" />
                                            </div>
                                            {!isNavLeft && (
                                                <span className="text-[10px] font-black uppercase tracking-widest bg-primary text-primary-foreground px-2 py-0.5">
                                                    ACTIVE
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-4">
                                            <h4 className="font-bold text-sm uppercase tracking-wider text-foreground">Top Navigation</h4>
                                            <p className="text-[11px] text-muted mt-0.5 opacity-90">Standard horizontal navigation bar at the top</p>
                                        </div>
                                    </button>

                                    {/* Left Navigation Box */}
                                    <button
                                        type="button"
                                        onClick={() => handleToggleNavLeft(true)}
                                        className={clsx(
                                            "p-5 border-2 text-left transition-all relative flex flex-col justify-between min-h-[130px] cursor-pointer",
                                            isNavLeft
                                                ? "bg-primary/10 border-primary text-foreground"
                                                : "bg-panel border-border text-muted hover:border-border-strong hover:text-foreground"
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            {/* Wireframe Diagram */}
                                            <div className="w-16 h-10 border border-border-strong bg-panel-elevated p-1 flex gap-1">
                                                <div className="w-3.5 h-full bg-primary/70" />
                                                <div className="flex-1 h-full bg-muted/20" />
                                            </div>
                                            {isNavLeft && (
                                                <span className="text-[10px] font-black uppercase tracking-widest bg-primary text-primary-foreground px-2 py-0.5">
                                                    ACTIVE
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-4">
                                            <h4 className="font-bold text-sm uppercase tracking-wider text-foreground">Left Navigation</h4>
                                            <p className="text-[11px] text-muted mt-0.5 opacity-90">Anchored vertical sidebar rail on the left side</p>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Section 4: Data Management */}
                    <section id="settings-data" className="space-y-6 scroll-mt-6">
                        <div className="flex items-center gap-3 px-1">
                            <HugeiconsIcon icon={DatabaseIcon} size={16} className="text-primary" />
                            <h3 className="text-lg font-departure tracking-widest text-primary uppercase">Data Management</h3>
                            <div className="h-px flex-1 bg-border-strong" />
                        </div>

                        {/* Warning Banner */}
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <div className="flex items-start gap-3">
                                <HugeiconsIcon
                                    icon={AlertCircleIcon}
                                    size={22}
                                    className="text-red-500 flex-shrink-0 mt-0.5"
                                />
                                <div className="space-y-1">
                                    <h4 className="font-bold text-red-500 text-xs uppercase tracking-widest">
                                        Warning: Irreversible Action
                                    </h4>
                                    <p className="text-xs text-muted">
                                        Clearing data will permanently wipe stored item logs, trade records, receipts, cost-basis history, and autopilot sync cursors from your browser. Your API keys and login tokens will remain safe.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {clearSuccess && (
                            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-2 text-green-500 text-xs font-bold uppercase tracking-wider">
                                    <HugeiconsIcon icon={CheckmarkCircle01Icon} size={18} />
                                    All logs, trade records, and autopilot cursors cleared successfully!
                                </div>
                                <button
                                    onClick={() => setClearSuccess(false)}
                                    className="text-xs text-muted hover:text-foreground"
                                >
                                    Dismiss
                                </button>
                            </div>
                        )}

                        {/* Data Actions Panel */}
                        <div className="bg-panel border border-border p-6 space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h4 className="font-bold text-sm uppercase tracking-tight text-foreground">
                                        Clear All Ledger & Autopilot Data
                                    </h4>
                                    <p className="text-xs text-muted max-w-md mt-1">
                                        Purge item logs, trade records, receipt history, cost-basis calculations, and reset autopilot sync cursors in one click.
                                    </p>
                                </div>

                                {!showConfirmClearModal ? (
                                    <button
                                        onClick={() => {
                                            vibrate("utility");
                                            setShowConfirmClearModal(true);
                                            setClearSuccess(false);
                                        }}
                                        className="px-5 py-3 bg-red-600/90 hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 flex-shrink-0"
                                    >
                                        <HugeiconsIcon icon={Delete02Icon} size={16} />
                                        Clear All Data
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            onClick={handleClearAllData}
                                            disabled={isClearing}
                                            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider transition-all"
                                        >
                                            {isClearing ? "CLEARING..." : "CONFIRM CLEAR"}
                                        </button>
                                        <button
                                            onClick={() => setShowConfirmClearModal(false)}
                                            disabled={isClearing}
                                            className="px-3 py-2.5 bg-muted text-foreground font-bold text-xs uppercase transition-all"
                                        >
                                            CANCEL
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
