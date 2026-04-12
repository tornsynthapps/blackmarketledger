"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle01Icon, CancelCircleIcon, Loading03Icon } from "@hugeicons/core-free-icons";
import { completeGoogleDriveSetup } from "@/lib/old/drive-api";

function AuthCallbackContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleCallback = async () => {
            const code = searchParams.get("code");
            const state = searchParams.get("state");

            if (!code || !state) {
                setStatus("error");
                setError("Missing code or state from Google");
                return;
            }

            try {
                const data = await completeGoogleDriveSetup({ code, state });

                if (data.success) {
                    setStatus("success");
                    setTimeout(() => {
                        router.push("/bmlconnect?drive=connected");
                    }, 2000);
                } else {
                    setStatus("error");
                    setError("Failed to exchange tokens");
                }
            } catch (err) {
                console.error("Callback handling failed", err);
                setStatus("error");
                setError(err instanceof Error ? err.message : "Network error during callback");
            }
        };

        handleCallback();
    }, [searchParams, router]);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
            <div className="w-full max-w-md p-8 bg-panel rounded-2xl border border-border text-center shadow-sm">
                {status === "loading" && (
                    <>
                        <HugeiconsIcon icon={Loading03Icon} size={48} className="text-primary animate-spin mx-auto mb-4" />
                        <h1 className="text-xl font-bold mb-2">Finalizing Connection</h1>
                        <p className="text-foreground/60 text-sm">
                            Please wait while we secure your Google Drive tunnel...
                        </p>
                    </>
                )}

                {status === "success" && (
                    <>
                        <HugeiconsIcon icon={CheckmarkCircle01Icon} size={48} className="text-success mx-auto mb-4" />
                        <h1 className="text-xl font-bold mb-2">Connected!</h1>
                        <p className="text-foreground/60 text-sm">
                            Google Drive is successfully linked. Redirecting you back...
                        </p>
                    </>
                )}

                {status === "error" && (
                    <>
                        <HugeiconsIcon icon={CancelCircleIcon} size={48} className="text-danger mx-auto mb-4" />
                        <h1 className="text-xl font-bold mb-2">Connection Failed</h1>
                        <p className="text-danger/80 text-sm mb-6">{error}</p>
                        <button
                            onClick={() => router.push("/bmlconnect")}
                            className="bg-primary text-primary-foreground font-bold py-2 px-6 rounded-lg text-sm"
                        >
                            Back to Dashboard
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

export default function GoogleAuthCallback() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center bg-background">
                    <HugeiconsIcon icon={Loading03Icon} size={48} className="text-primary animate-spin" />
                </div>
            }
        >
            <AuthCallbackContent />
        </Suspense>
    );
}
