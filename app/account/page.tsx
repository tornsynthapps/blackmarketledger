"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    UserIcon,
    Key01Icon,
    CheckmarkCircle01Icon,
    CancelCircleIcon,
    RefreshIcon,
    Logout01Icon,
    Copy01Icon,
    EyeIcon,
    ViewIcon,
} from "@hugeicons/core-free-icons";
import {
    signIn,
    initiateDepositSignup,
    initiateMessageSignup,
    verifySignup,
    AuthResponse,
} from "@/lib/old/token-api";
import {
    saveAuth,
    clearAuth,
    getStoredAuth,
    getValidUntil,
    isSubscriptionValid,
    StoredAuth,
} from "@/lib/old/token-auth";
import { useHapticFeedback } from "@/lib/old/useHapticFeedback";
import { clsx } from "clsx";

type AuthMode = "signin" | "signup";
type SignupMethod = "deposit" | "message";

export default function AccountPage() {
    const { vibrate } = useHapticFeedback();
    const [mode, setMode] = useState<AuthMode>("signin");
    const [signupMethod, setSignupMethod] = useState<SignupMethod>("deposit");

    const [userIdInput, setUserIdInput] = useState("");
    const [secretTokenInput, setSecretTokenInput] = useState("");

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [auth, setAuth] = useState<StoredAuth | null>(null);
    const [showSecretToken, setShowSecretToken] = useState(false);

    const [verificationData, setVerificationData] = useState<{
        amount?: number;
        message?: string;
        token: string;
    } | null>(null);
    const [verifying, setVerifying] = useState(false);

    useEffect(() => {
        const stored = getStoredAuth();
        if (stored) {
            setAuth(stored);
        }
    }, []);

    const handleSignIn = async () => {
        if (!userIdInput.trim() || !secretTokenInput.trim()) {
            setError("Please enter both User ID and Secret Token");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await signIn(userIdInput.trim(), secretTokenInput.trim());

            if (response.error) {
                setError(response.error);
                return;
            }

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
        } catch (err) {
            setError(err instanceof Error ? err.message : "Sign in failed");
        } finally {
            setIsLoading(false);
        }
    };

    const handleInitiateDepositSignup = async () => {
        if (!userIdInput.trim()) {
            setError("Please enter your Torn User ID");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await initiateDepositSignup(userIdInput.trim());

            if (response.error) {
                setError(response.error);
                return;
            }

            setVerificationData({
                amount: response.amount,
                token: response.verificationToken,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to initiate signup");
        } finally {
            setIsLoading(false);
        }
    };

    const handleInitiateMessageSignup = async () => {
        if (!userIdInput.trim()) {
            setError("Please enter your Torn User ID");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await initiateMessageSignup(userIdInput.trim());

            if (response.error) {
                setError(response.error);
                return;
            }

            setVerificationData({
                message: response.message,
                token: response.verificationToken,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to initiate signup");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifySignup = async () => {
        if (!verificationData) return;

        setVerifying(true);
        setError(null);

        try {
            const response = await verifySignup(verificationData.token);

            if (response.error) {
                setError(response.error);
                return;
            }

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
        } catch (err) {
            setError(err instanceof Error ? err.message : "Verification failed");
        } finally {
            setVerifying(false);
        }
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

    if (auth) {
        const validUntil = getValidUntil();
        const isValid = isSubscriptionValid();

        return (
            <div className="py-8">
                <div className="bg-card border-2 border-primary p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-primary p-2">
                            <HugeiconsIcon
                                icon={UserIcon}
                                size={24}
                                color="var(--primary-foreground)"
                            />
                        </div>
                        <h1 className="text-2xl font-bold font-vt323 uppercase tracking-wide">
                            Account
                        </h1>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="py-3 border-b border-border md:border md:rounded-lg md:p-4">
                            <span className="text-muted font-bold text-xs uppercase tracking-widest block mb-2">
                                User ID
                            </span>
                            <span className="font-mono text-foreground text-lg">{auth.userId}</span>
                        </div>

                        <div className="py-3 border-b border-border md:border md:rounded-lg md:p-4">
                            <span className="text-muted font-bold text-xs uppercase tracking-widest block mb-2">
                                Username
                            </span>
                            <span className="text-foreground text-lg">{auth.username}</span>
                        </div>

                        <div className="py-3 border-b border-border md:border md:rounded-lg md:p-4">
                            <span className="text-muted font-bold text-xs uppercase tracking-widest block mb-2">
                                Subscription
                            </span>
                            <span
                                className={clsx(
                                    "flex items-center gap-2 font-bold text-lg",
                                    isValid ? "text-success" : "text-danger"
                                )}
                            >
                                <HugeiconsIcon
                                    icon={isValid ? CheckmarkCircle01Icon : CancelCircleIcon}
                                    size={20}
                                />
                                {isValid ? "Active" : "Inactive"}
                            </span>
                        </div>

                        <div className="py-3 border-b border-border md:border md:rounded-lg md:p-4">
                            <span className="text-muted font-bold text-xs uppercase tracking-widest block mb-2">
                                Valid Until
                            </span>
                            <span className="font-mono text-lg">
                                {validUntil ? new Date(validUntil).toLocaleDateString() : "N/A"}
                            </span>
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-border">
                        <span className="text-muted font-bold text-xs uppercase tracking-widest block mb-3">
                            Secret Token
                        </span>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 bg-background px-4 py-3 font-mono text-sm border border-border truncate">
                                {showSecretToken ? auth.secretToken : "••••••••••••••••••••"}
                            </code>
                            <button
                                onClick={() => setShowSecretToken(!showSecretToken)}
                                className="p-3 border border-border hover:bg-foreground/5"
                            >
                                <HugeiconsIcon
                                    icon={showSecretToken ? ViewIcon : EyeIcon}
                                    size={20}
                                />
                            </button>
                            <button
                                onClick={() => copyToClipboard(auth.secretToken)}
                                className="p-3 border border-border hover:bg-foreground/5"
                            >
                                <HugeiconsIcon icon={Copy01Icon} size={20} />
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={handleSignOut}
                        className="mt-6 w-full flex items-center justify-center gap-2 bg-destructive text-destructive-foreground px-4 py-3 font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity"
                    >
                        <HugeiconsIcon icon={Logout01Icon} size={18} />
                        Sign Out
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-lg mx-auto py-8">
            <div className="bg-card border-2 border-primary p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-primary p-2">
                        <HugeiconsIcon
                            icon={UserIcon}
                            size={24}
                            color="var(--primary-foreground)"
                        />
                    </div>
                    <h1 className="text-2xl font-bold font-vt323 uppercase tracking-wide">
                        Account
                    </h1>
                </div>

                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => {
                            setMode("signin");
                            setError(null);
                            setVerificationData(null);
                        }}
                        className={clsx(
                            "flex-1 py-2 px-4 font-bold text-xs uppercase tracking-widest transition-all",
                            mode === "signin"
                                ? "bg-primary text-primary-foreground"
                                : "bg-foreground/5 text-muted hover:bg-foreground/10"
                        )}
                    >
                        Sign In
                    </button>
                    <button
                        onClick={() => {
                            setMode("signup");
                            setError(null);
                            setVerificationData(null);
                        }}
                        className={clsx(
                            "flex-1 py-2 px-4 font-bold text-xs uppercase tracking-widest transition-all",
                            mode === "signup"
                                ? "bg-primary text-primary-foreground"
                                : "bg-foreground/5 text-muted hover:bg-foreground/10"
                        )}
                    >
                        Sign Up
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-destructive/10 border border-destructive text-destructive text-sm">
                        {error}
                    </div>
                )}

                {mode === "signin" ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-muted font-bold text-xs uppercase tracking-widest mb-2">
                                Torn User ID
                            </label>
                            <input
                                type="text"
                                value={userIdInput}
                                onChange={(e) => setUserIdInput(e.target.value)}
                                placeholder="Enter your Torn User ID"
                                className="w-full px-3 py-2 bg-background border border-border focus:border-primary outline-none font-mono"
                            />
                        </div>

                        <div>
                            <label className="block text-muted font-bold text-xs uppercase tracking-widest mb-2">
                                Secret Token
                            </label>
                            <input
                                type="password"
                                value={secretTokenInput}
                                onChange={(e) => setSecretTokenInput(e.target.value)}
                                placeholder="Enter your secret token"
                                className="w-full px-3 py-2 bg-background border border-border focus:border-primary outline-none font-mono"
                            />
                        </div>

                        <button
                            onClick={handleSignIn}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-3 font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {isLoading ? (
                                <span className="animate-pulse">Verifying...</span>
                            ) : (
                                <>
                                    <HugeiconsIcon icon={Key01Icon} size={18} />
                                    Verify & Sign In
                                </>
                            )}
                        </button>
                    </div>
                ) : verificationData ? (
                    <div className="space-y-4">
                        <div className="p-4 bg-foreground/5 border border-border">
                            <h3 className="font-bold text-xs uppercase tracking-widest mb-3">
                                Verification Required
                            </h3>

                            {verificationData.amount ? (
                                <div className="space-y-2">
                                    <p className="text-sm">
                                        Send{" "}
                                        <span className="font-bold text-primary">
                                            ${verificationData.amount}
                                        </span>{" "}
                                        to the BML account using Torn.
                                    </p>
                                    <p className="text-xs text-muted">
                                        Use the reference:{" "}
                                        <code className="bg-background px-1">
                                            BML-{verificationData.token.slice(0, 8)}
                                        </code>
                                    </p>
                                </div>
                            ) : verificationData.message ? (
                                <div className="space-y-2">
                                    <p className="text-sm">
                                        Send <span className="font-bold text-primary">$1</span> to
                                        the BML account with the message:
                                    </p>
                                    <code className="block bg-background px-3 py-2 font-mono text-sm">
                                        {verificationData.message}
                                    </code>
                                </div>
                            ) : null}

                            <div className="mt-3 pt-3 border-t border-border">
                                <p className="text-xs text-muted">
                                    Verification Token:{" "}
                                    <code className="font-mono">{verificationData.token}</code>
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={handleVerifySignup}
                            disabled={verifying}
                            className="w-full flex items-center justify-center gap-2 bg-success text-success-foreground px-4 py-3 font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {verifying ? (
                                <span className="animate-pulse">Verifying...</span>
                            ) : (
                                <>
                                    <HugeiconsIcon icon={RefreshIcon} size={18} />
                                    I've Completed Payment - Verify
                                </>
                            )}
                        </button>

                        <button
                            onClick={() => setVerificationData(null)}
                            className="w-full text-center text-muted text-xs hover:text-foreground"
                        >
                            Cancel and start over
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-muted font-bold text-xs uppercase tracking-widest mb-2">
                                Torn User ID
                            </label>
                            <input
                                type="text"
                                value={userIdInput}
                                onChange={(e) => setUserIdInput(e.target.value)}
                                placeholder="Enter your Torn User ID"
                                className="w-full px-3 py-2 bg-background border border-border focus:border-primary outline-none font-mono"
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleInitiateDepositSignup}
                                disabled={isLoading}
                                className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-3 font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <span className="animate-pulse">Generating...</span>
                                ) : (
                                    "Send $X Deposit"
                                )}
                            </button>
                            <button
                                onClick={handleInitiateMessageSignup}
                                disabled={isLoading}
                                className="flex-1 flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-4 py-3 font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <span className="animate-pulse">Generating...</span>
                                ) : (
                                    "Send $1 + Message"
                                )}
                            </button>
                        </div>

                        <p className="text-xs text-muted text-center">
                            Choose how you want to verify your account. Both methods are secure and
                            instant.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
