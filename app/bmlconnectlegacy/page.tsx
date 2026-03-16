"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRightLeft,
  CheckCircle2,
  Database,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  RefreshCw,
  Save,
  Server,
  Settings,
  ShieldCheck,
  Trash2,
  Unlink,
} from "lucide-react";
import { useJournal } from "@/store/useJournal";
import { getConnectionString, sendToExtension } from "@/lib/bmlconnect";
import {
  initiateGoogleDriveSetup,
  getGoogleDriveStatus,
  loadGoogleDriveData,
  writeGoogleDriveData,
  deleteGoogleDriveData,
  disconnectGoogleDrive,
} from "@/lib/drive-api";
import { useHapticFeedback } from "@/lib/useHapticFeedback";
import type { Transaction } from "@/lib/parser";

type StorageLocation = "browser" | "extension" | "drive";

type DriveStatus = {
  connected: boolean;
  hasData: boolean;
  email?: string | null;
  connectedAt?: string | null;
  lastSyncedAt?: string | null;
};

type UserInfo = {
  username?: string;
  userId?: number | string;
  subscriptionValid?: boolean;
  validUntil?: string | null;
  apiKey?: string;
};

const EMPTY_DRIVE_STATUS: DriveStatus = {
  connected: false,
  hasData: false,
  email: null,
  connectedAt: null,
  lastSyncedAt: null,
};

export default function BMLDashboard() {
  const {
    transactions,
    mergeTransactions,
    driveApiKey,
    saveDriveApiKey,
    switchStorageLocation,
  } = useJournal();
  const { vibrate } = useHapticFeedback();

  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isExtensionInstalled, setIsExtensionInstalled] = useState<boolean | null>(
    null,
  );
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [storageLocation, setStorageLocation] =
    useState<StorageLocation>("browser");
  const [driveStatus, setDriveStatus] = useState<DriveStatus>(EMPTY_DRIVE_STATUS);
  const [showDriveSettings, setShowDriveSettings] = useState(false);
  const [showDriveSetupDialog, setShowDriveSetupDialog] = useState(false);
  const [manualApiKey, setManualApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [showDriveAuthChoiceDialog, setShowDriveAuthChoiceDialog] = useState(false);
  const [pendingDriveAuthUrl, setPendingDriveAuthUrl] = useState<string | null>(null);
  const [driveSetupBusy, setDriveSetupBusy] = useState(false);
  const [driveActionBusy, setDriveActionBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [bypassExtension, setBypassExtension] = useState(false);
  const [pendingStorageSwitch, setPendingStorageSwitch] = useState<{
    target: "browser" | "drive";
    label: string;
  } | null>(null);

  const driveSuccessBanner = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("drive") === "connected";
  }, []);

  useEffect(() => {
    const pref = localStorage.getItem("bml_storage_pref") as StorageLocation | null;
    if (pref === "browser" || pref === "extension" || pref === "drive") {
      setStorageLocation(pref);
    }

    const initialize = async () => {
      const extensionActive = await sendToExtension({ type: "HELLO" });
      setIsExtensionInstalled(extensionActive.success);
      setIsConnected(extensionActive.success);

      if (extensionActive.success) {
        const sub = await sendToExtension<UserInfo>({ type: "SUBSCRIPTION_STATUS" });
        if (sub.success) {
          setUserInfo(sub.data ?? null);
        }
      }

      setLoading(false);
    };

    initialize();
  }, [driveApiKey]);

  const refreshDriveStatus = async () => {
    if (!driveApiKey) {
      return sendToExtension<DriveStatus>({ type: "DRIVE_STATUS" });
    }

    const response = await getGoogleDriveStatus(driveApiKey);
    if (response.success && response.data) {
      setDriveStatus({
        connected: Boolean(response.data.connected),
        hasData: Boolean(response.data.hasData),
        email: response.data.email ?? null,
        connectedAt: response.data.connectedAt ?? null,
        lastSyncedAt: response.data.lastSyncedAt ?? null,
      });
    }
    return response;
  };

  const initiateStorageSwitch = (target: "browser" | "drive", label: string) => {
    if (storageLocation === target) return;
    setPendingStorageSwitch({ target, label });
    setShowMigrationDialog(true);
  };

  const handleMigrationConfirm = async (type: "merge" | "overwrite" | "none") => {
    if (!pendingStorageSwitch) return;
    setIsMigrating(true);
    vibrate("utility");
    try {
      await switchStorageLocation(pendingStorageSwitch.target, type);
      setStorageLocation(pendingStorageSwitch.target);
      setShowMigrationDialog(false);
      setPendingStorageSwitch(null);
      setMigrationComplete(true);
      vibrate("success");
      window.setTimeout(() => setMigrationComplete(false), 3000);
    } catch (error) {
      console.error("Migration failed", error);
      alert("Migration failed");
      vibrate("danger");
    } finally {
      setIsMigrating(false);
    }
  };

  const handleRefreshSubscription = async () => {
    setLoading(true);
    vibrate("utility");

    try {
      const res = await sendToExtension<UserInfo>({ type: "SUBSCRIPTION_STATUS" });
      if (!res.success) {
        throw new Error(res.error || "Failed to refresh subscription");
      }

      setUserInfo(res.data ?? null);
      await refreshDriveStatus();
      vibrate("success");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to refresh subscription");
      vibrate("danger");
    } finally {
      setLoading(false);
    }
  };

  const handleDriveLoad = async () => {
    if (!driveApiKey) {
      alert("Missing Drive API Key. Please configure it in the settings.");
      return;
    }
    initiateStorageSwitch("drive", "Google Drive");
  };

  const handleDriveWrite = async () => {
    if (!userInfo?.subscriptionValid) {
      alert("Whale Subscription Required: Your subscription has expired.");
      return;
    }

    if (!driveApiKey) {
      alert("Missing Drive API Key.");
      return;
    }

    setDriveActionBusy(true);
    setStatusMessage("Syncing ledger to Google Drive...");
    vibrate("utility");

    try {
      const response = await writeGoogleDriveData(driveApiKey, transactions);
      if (!response.success) throw new Error("Sync failed");

      await refreshDriveStatus();
      setStatusMessage("Ledger successfully synced to Google Drive.");
      vibrate("success");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Sync failed");
      vibrate("danger");
    } finally {
      setDriveActionBusy(false);
    }
  };

  const handleStartDriveSetup = async () => {
    if (!manualApiKey.trim()) {
      alert("Please enter a Torn API key.");
      return;
    }

    setDriveSetupBusy(true);
    setStatusMessage(null);
    vibrate("utility");

    try {
      await saveDriveApiKey(manualApiKey);

      const response = await initiateGoogleDriveSetup({
        apiKey: manualApiKey,
        redirectUri: `${window.location.origin}/bmlconnect`,
      });

      if (response.status === "SESSION_EXISTS") {
        setShowDriveSetupDialog(false);
        await refreshDriveStatus();
        setStatusMessage("Google Drive session restored.");
        vibrate("success");
      } else if (response.status === "AUTH_REQUIRED") {
        setShowDriveSetupDialog(false);
        setPendingDriveAuthUrl(response.url);
        setShowDriveAuthChoiceDialog(true);
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Auth failed");
      vibrate("danger");
    } finally {
      setDriveSetupBusy(false);
    }
  };

  const handleDisconnectDrive = async () => {
    if (!driveApiKey) return;
    if (!confirm("Are you sure you want to disconnect Google Drive?")) return;

    setDriveActionBusy(true);
    vibrate("utility");

    try {
      await disconnectGoogleDrive(driveApiKey);

      setDriveStatus(EMPTY_DRIVE_STATUS);
      localStorage.setItem("bml_storage_pref", "browser");
      setStorageLocation("browser");
      setShowDriveSettings(false);
      setStatusMessage("Google Drive disconnected.");
      vibrate("success");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Disconnect failed");
      vibrate("danger");
    } finally {
      setDriveActionBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center bg-background text-foreground">
        <div className="mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
        <p className="text-sm font-medium text-foreground/50">Authorizing tunnel...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center bg-background font-sans">
      <main className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-panel p-6 shadow-sm">
        <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-primary/10 blur-3xl"></div>

        <div className="relative z-10 mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              BML <span className="font-black text-primary">CONNECT</span>
            </h1>
            <p className="mt-1 text-xs uppercase tracking-widest text-foreground/50 font-mono">
              Secure Extension Tunnel
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div
              className={`flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest font-mono ${isConnected
                  ? "border-success/20 bg-success/10 text-success"
                  : "border-danger/20 bg-danger/10 text-danger"
                }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? "animate-pulse bg-success" : "bg-danger"}`}></span>
              {isConnected ? "Sync Online" : "Sync Offline"}
            </div>

            {userInfo && !userInfo.subscriptionValid && storageLocation !== "browser" && (
              <button
                onClick={() => initiateStorageSwitch("browser", "Browser Storage")}
                className="animate-pulse rounded bg-amber-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter text-white shadow-lg shadow-amber-500/20"
              >
                Rescue Data
              </button>
            )}
          </div>
        </div>

        <div className="relative z-10">
          {driveSuccessBanner && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" />
              Google Drive Connected
            </div>
          )}

          {statusMessage && (
            <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${statusMessage.toLowerCase().match(/fail|invalid|error|expired/)
                ? "border-danger/20 bg-danger/5 text-danger"
                : "border-border bg-background text-foreground/70"
              }`}>
              {statusMessage}
            </div>
          )}

          {!isExtensionInstalled ? (
            <div className="py-12 text-center">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
                <Download className="h-6 w-6" />
              </div>
              <h2 className="mb-2 text-lg font-bold">Extension Required</h2>
              <p className="mx-auto mb-6 max-w-sm text-sm text-foreground/60">
                BML Connect requires the browser extension to sync your logs and unlock advanced features.
              </p>
              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <a href="https://chromewebstore.google.com/" target="_blank" rel="noreferrer noopener" className="flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                  <Download className="h-4 w-4" /> Install Extension
                </a>
                <button onClick={() => window.location.reload()} className="rounded-lg border border-border bg-foreground/5 px-6 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/10">
                  I&apos;ve installed it
                </button>
              </div>
              <div className="mt-8 pt-6 border-t border-border/50">
                <button
                  onClick={() => setBypassExtension(true)}
                  className="text-xs font-bold uppercase tracking-widest text-foreground/30 hover:text-primary transition-colors underline underline-offset-4"
                >
                  Continue without extension (Limited features)
                </button>
              </div>
            </div>
          ) : (!isConnected && !bypassExtension) ? (
            <div className="py-12 text-center">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
                <Activity className="h-6 w-6" />
              </div>
              <h2 className="mb-2 text-lg font-bold">Tunnel Connection Failed</h2>
              <p className="mx-auto mb-6 max-w-sm text-sm text-foreground/60">
                We couldn&apos;t reach the BML extension. Ensure it&apos;s active and the connection token is configured.
              </p>
              <div className="flex justify-center gap-3">
                <Link href="/bmlconnect/connect" className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                  Setup Connection
                </Link>
                <button onClick={() => window.location.reload()} className="rounded-lg border border-border bg-foreground/5 px-6 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/10">
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-foreground/5 p-5">
                <h3 className="mb-4 flex items-center gap-2 border-b border-border pb-3 text-sm font-bold">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Authorization Details
                </h3>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-foreground/50">Operator</p>
                    <p className="font-mono text-sm font-medium">{userInfo?.username || "Unknown"}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-foreground/50">User ID</p>
                    <p className="font-mono text-sm font-medium text-foreground/80">{userInfo?.userId || "N/A"}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-foreground/50">Tier</p>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${userInfo?.subscriptionValid ? "border border-amber-500/20 bg-amber-500/10 text-amber-500" : "border border-border bg-foreground/10 text-foreground/60"}`}>
                      {userInfo?.subscriptionValid ? "WHALE SUBSCRIBER" : "FREE USER"}
                    </span>
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-foreground/50">Valid Until</p>
                    <p className="font-mono text-sm font-medium text-foreground/80">{userInfo?.validUntil ? new Date(userInfo.validUntil).toLocaleDateString() : "Lifetime"}</p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button onClick={handleRefreshSubscription} className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-primary transition-colors hover:bg-primary/20">
                    <RefreshCw className="h-3 w-3" /> Refresh Subscription
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-foreground/5 p-5">
                <h3 className="mb-4 flex items-center gap-2 border-b border-border pb-3 text-sm font-bold">
                  <Database className="h-4 w-4 text-primary" /> Storage Configuration
                </h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <button
                    onClick={() => initiateStorageSwitch("browser", "Browser Storage")}
                    className={`cursor-pointer rounded-xl border-2 p-4 text-left transition-all ${storageLocation === "browser" ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/50"}`}
                  >
                    <div className="mb-2 flex items-center gap-3">
                      <Server className="h-5 w-5 text-foreground/60" />
                      <div className="text-sm font-bold">Local Browser</div>
                    </div>
                    <p className="text-xs text-foreground/60">Stores data in local IndexedDB. Cleared if you purge site data.</p>
                  </button>

                  <div className={`rounded-xl border-2 p-4 transition-all ${!userInfo?.subscriptionValid ? "cursor-not-allowed border-border bg-background opacity-50 grayscale" : storageLocation === "extension" ? "border-primary bg-primary/5" : "cursor-pointer border-border bg-background hover:border-primary/50"}`}>
                    <div className="mb-2 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <ShieldCheck className="h-5 w-5 text-amber-500" />
                        <div className="text-sm font-bold">Extension Database</div>
                      </div>
                    </div>
                    <p className="text-xs text-foreground/60">Stores data inside the extension so browser site-data clears do not wipe it.</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-4">
                  <div className={`group relative overflow-hidden rounded-2xl border-2 p-5 transition-all ${driveStatus.connected ? "border-primary/30 bg-primary/5" : "border-border bg-foreground/5 hover:border-primary/20"}`}>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${driveStatus.connected ? "bg-primary/20 text-primary" : "bg-foreground/10 text-foreground/40"}`}>
                          <RefreshCw className={`h-6 w-6 ${driveActionBusy ? "animate-spin" : ""}`} />
                        </div>
                        <div>
                          <h4 className="font-bold">Google Drive Sync</h4>
                          <p className="text-xs text-foreground/50">Direct browser-to-cloud backup</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {driveStatus.connected ? (
                          <>
                            <button onClick={() => setShowDriveSettings(!showDriveSettings)} className="rounded-lg border border-border bg-background p-2 text-foreground/60 transition-colors hover:bg-foreground/5 hover:text-foreground">
                              <Settings className="h-4 w-4" />
                            </button>
                            <button onClick={handleDriveLoad} disabled={driveActionBusy} className={`flex items-center gap-2 rounded-lg py-2 px-4 text-xs font-bold uppercase tracking-wider transition-all ${storageLocation === "drive" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" : "bg-panel text-primary border border-primary/30 hover:bg-primary/5"}`}>
                              <Download className={`h-3.5 w-3.5 ${driveActionBusy ? "animate-bounce" : ""}`} />
                              {storageLocation === "drive" ? "Connected" : "Load Drive"}
                            </button>
                          </>
                        ) : (
                          <button onClick={() => setShowDriveSetupDialog(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground transition-all hover:bg-primary/90">
                            Connect Drive
                          </button>
                        )}
                      </div>
                    </div>

                    {showDriveSettings && driveStatus.connected && (
                      <div className="mt-4 space-y-3 rounded-lg border border-border bg-background/50 p-4">
                        <p className="text-xs text-foreground/60">Email: {driveStatus.email || "Unknown"}</p>
                        <button onClick={handleDisconnectDrive} className="flex items-center gap-2 text-xs font-bold text-danger hover:text-danger/80">
                          <Unlink className="h-3.5 w-3.5" /> Disconnect Google Drive
                        </button>
                      </div>
                    )}
                  </div>

                  {storageLocation === "drive" && (
                    <button onClick={handleDriveWrite} disabled={driveActionBusy} className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-primary py-4 text-sm font-black uppercase tracking-widest text-primary-foreground transition-all hover:scale-[1.01] hover:shadow-xl hover:shadow-primary/20 active:scale-[0.98] disabled:opacity-50">
                      {driveActionBusy ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                      Sync Current Ledger
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Setup Dialogs */}
      {showDriveSetupDialog && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-panel border border-border p-8">
            <h2 className="text-xl font-bold mb-4">Google Drive Setup</h2>
            <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500 leading-relaxed">
              <ShieldCheck className="w-5 h-5 mb-2" />
              Your API key will be stored securely and used only for sync.
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-foreground/50 mb-1.5 block">Torn API Key</label>
                <div className="relative">
                  <input type={showApiKey ? "text" : "password"} value={manualApiKey} onChange={(e) => setManualApiKey(e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-all" placeholder="Enter API Key" />
                  <button onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground">
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowDriveSetupDialog(false)} className="flex-1 py-3 text-sm font-bold text-foreground/60 hover:bg-foreground/5 rounded-xl transition-all">Cancel</button>
                <button onClick={handleStartDriveSetup} disabled={driveSetupBusy} className="flex-1 bg-primary py-3 rounded-xl text-sm font-black text-primary-foreground hover:bg-primary/90 transition-all">
                  {driveSetupBusy ? "Connecting..." : "Confirm Key"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDriveAuthChoiceDialog && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-panel border border-border p-8 text-center">
            <RefreshCw className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Authorize Drive</h2>
            <p className="text-sm text-foreground/60 mb-8">Click below to authorize with Google.</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => {
                const win = window.open(pendingDriveAuthUrl!, "_blank");
                if (win) {
                  setShowDriveAuthChoiceDialog(false);
                  setStatusMessage("Waiting for authorization...");
                } else {
                  window.location.href = pendingDriveAuthUrl!;
                }
              }} className="bg-primary py-4 rounded-2xl text-sm font-black text-primary-foreground hover:scale-[1.02] active:scale-[0.98] transition-all">Open Google Auth</button>
              <button onClick={() => {
                setShowDriveAuthChoiceDialog(false);
                setShowDriveSetupDialog(true);
                setPendingDriveAuthUrl(null);
              }} className="py-4 text-sm font-bold text-foreground/40">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showMigrationDialog && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-panel border border-border p-8">
            <h2 className="text-xl font-bold mb-2">Switch to {pendingStorageSwitch?.label}</h2>
            <p className="text-sm text-foreground/60 mb-6">How should we handle your transactions?</p>
            <div className="space-y-3">
              <button onClick={() => handleMigrationConfirm("merge")} className="w-full flex items-center gap-4 bg-foreground/5 p-4 rounded-2xl hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all text-left">
                <ArrowRightLeft className="w-6 h-6 text-primary" />
                <div>
                  <div className="font-bold text-sm">Merge Data</div>
                  <div className="text-[10px] text-foreground/40">Combine items from both storages. No duplicates.</div>
                </div>
              </button>
              <button onClick={() => handleMigrationConfirm("overwrite")} className="w-full flex items-center gap-4 bg-foreground/5 p-4 rounded-2xl hover:bg-danger/10 border border-transparent hover:border-danger/20 transition-all text-left">
                <Save className="w-6 h-6 text-danger" />
                <div>
                  <div className="font-bold text-sm text-danger whitespace-nowrap overflow-hidden text-ellipsis">Overwrite with current</div>
                  <div className="text-[10px] text-foreground/40">Replace target data with your current visible logs.</div>
                </div>
              </button>
              <button onClick={() => handleMigrationConfirm("none")} className="w-full flex items-center gap-4 bg-foreground/5 p-4 rounded-2xl hover:bg-foreground/10 border border-transparent transition-all text-left">
                <Database className="w-6 h-6 text-foreground/40" />
                <div>
                  <div className="font-bold text-sm">Do Nothing</div>
                  <div className="text-[10px] text-foreground/40">Just switch storage. Keep existing data separate.</div>
                </div>
              </button>
              <button onClick={() => setShowMigrationDialog(false)} className="w-full py-4 text-sm font-bold text-foreground/40 mt-2">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {isMigrating && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-background/50 backdrop-blur-md">
          <div className="text-center">
            <RefreshCw className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-sm font-black uppercase tracking-widest text-primary">Migrating Storage...</p>
          </div>
        </div>
      )}
    </div>
  );
}
