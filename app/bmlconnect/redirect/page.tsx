"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";

const SUPABASE_FUNCTIONS_URL = "https://yxjmnkaollkpcvymiicd.supabase.co/functions/v1";

async function saveDriveTokens(session: Session): Promise<{ success: boolean; error?: string; dataExists?: boolean }> {
  const providerToken = session.provider_token;
  const providerRefreshToken = session.provider_refresh_token;

  if (!providerToken) {
    return {
      success: false,
      error:
        "Google didn't provide a Drive access token. " +
        "Ensure the drive.appdata scope is enabled in Supabase → Auth → Providers → Google, " +
        "and that you granted Drive access during sign-in.",
    };
  }

  const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/sync-google-drive`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Authenticate with the Supabase JWT — NOT the Google provider_token
      "Authorization": `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      action: "save_tokens",
      providerToken,
      providerRefreshToken,
    }),
  });

  const result = await res.json();
  return result;
}

function AuthCallbackContent() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let handled = false;

    const handleSession = async (session: Session) => {
      if (handled) return;
      handled = true;

      try {
        const result = await saveDriveTokens(session);

        if (result.success) {
          localStorage.setItem("bml_drive_connected", "true");
          if (result.dataExists) {
            localStorage.setItem("bml_drive_data_exists", "true");
          }
          setStatus("success");
          setTimeout(() => router.push("/bmlconnect"), 2000);
        } else {
          setStatus("error");
          setError(result.error || "Failed to save Drive connection");
        }
      } catch (err) {
        console.error("Save tokens failed", err);
        setStatus("error");
        setError("Network error while saving tokens");
      }
    };

    // 1. Supabase processes the hash fragment (#access_token=... or #code=...) automatically.
    //    We listen for the resulting SIGNED_IN event — this is the canonical way to handle
    //    OAuth redirects with Supabase in a SPA.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
        await handleSession(session);
      }
    });

    // 2. Also check if a session is already established (e.g., the hash was parsed before
    //    this component mounted, or the user refreshed the page).
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !handled) {
        handleSession(session);
      }
    });

    // 3. Timeout guard — if no session arrives after 10 seconds, show an error.
    const timeout = setTimeout(() => {
      if (!handled) {
        handled = true;
        setStatus("error");
        setError("Timed out waiting for Google sign-in to complete. Please try again.");
      }
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-md p-8 bg-panel rounded-2xl border border-border text-center shadow-sm">
        {status === "loading" && (
          <>
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Finalizing Connection</h1>
            <p className="text-foreground/60 text-sm">
              Please wait while we secure your Google Drive tunnel...
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Connected!</h1>
            <p className="text-foreground/60 text-sm">
              Google Drive is successfully linked. Redirecting you back...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-12 h-12 text-danger mx-auto mb-4" />
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
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
