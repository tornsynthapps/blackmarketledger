"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRightLeft,
  CheckCircle2,
  Database,
  Download,
  Eye,
  EyeOff,
  RefreshCw,
  Save,
  Server,
  Settings,
  ShieldCheck,
  Unlink,
} from "lucide-react";
import { useJournal } from "@/store/useJournal";
import {
  initiateGoogleDriveSetup,
  getGoogleDriveStatus,
  writeGoogleDriveData,
  disconnectGoogleDrive,
} from "@/lib/drive-api";
import { verifySubscription, SubscriptionStatus } from "@/lib/subscription-api";
import { useHapticFeedback } from "@/lib/useHapticFeedback";
import * as idb from "@/lib/idb";

type StorageLocation = "browser" | "drive";

type DriveStatus = {
  connected: boolean;
  hasData: boolean;
  email?: string | null;
  connectedAt?: string | null;
  lastSyncedAt?: string | null;
};

const EMPTY_DRIVE_STATUS: DriveStatus = {
  connected: false,
  hasData: false,
  email: null,
  connectedAt: null,
  lastSyncedAt: null,
};

export default function BMLConnectPage() {
  const {
    transactions,
    hasBMLDB,
    driveApiKey,
    saveDriveApiKey,
    switchStorageLocation,
  } = useJournal();
  const { vibrate } = useHapticFeedback();

  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<SubscriptionStatus | null>(null);
  const [storageLocation, setStorageLocation] = useState<StorageLocation>("browser");
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
  const [pendingStorageSwitch, setPendingStorageSwitch] = useState<{
    target: "browser" | "drive";
    label: string;
  } | null>(null);
  const [migrationCounts, setMigrationCounts] = useState<{
    source: number;
    target: number;
    merge: number;
  } | null>(null);

  const driveSuccessBanner = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("drive") === "connected";
  }, []);

  useEffect(() => {
    const pref = localStorage.getItem("bml_storage_pref") as StorageLocation | null;
    if (pref === "browser" || pref === "drive") {
      setStorageLocation(pref);
    }

    const initialize = async () => {
      if (driveApiKey) {
        setManualApiKey(driveApiKey);
        try {
          const sub = await verifySubscription(driveApiKey);
          setUserInfo(sub);
          await refreshDriveStatus(driveApiKey);
        } catch (error) {
          console.error("Initialization check failed", error);
        }
      }
      setLoading(false);
    };

    initialize();
  }, [driveApiKey]);

  const refreshDriveStatus = async (apiKey: string) => {
    const response = await getGoogleDriveStatus(apiKey);
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

  const initiateStorageSwitch = async (target: "browser" | "drive", label: string) => {
    if (storageLocation === target) return;

    // Fetch counts before showing dialog
    const sourceDB = target === 'drive' ? 'LogsDB' : 'GoogleCacheLogsDB';
    const targetDB = target === 'drive' ? 'GoogleCacheLogsDB' : 'LogsDB';

    setIsMigrating(true);
    try {
      const sourceData = await idb.getAllTransactions(sourceDB);
      const targetData = await idb.getAllTransactions(targetDB);

      // Calculate merge count
      const ids = new Set(targetData.map((t: any) => t.id));
      let mergeCount = targetData.length;
      sourceData.forEach((t: any) => {
        if (!ids.has(t.id)) {
          mergeCount++;
        }
      });

      setMigrationCounts({
        source: sourceData.length,
        target: targetData.length,
        merge: mergeCount
      });
      setPendingStorageSwitch({ target, label });
      setShowMigrationDialog(true);
    } catch (e) {
      console.error("Failed to fetch migration counts", e);
      alert("Error preparing migration. Please try again.");
    } finally {
      setIsMigrating(false);
    }
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
      setMigrationCounts(null);
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
    if (!driveApiKey) {
      setShowDriveSetupDialog(true);
      return;
    }
    setLoading(true);
    vibrate("utility");

    try {
      const res = await verifySubscription(driveApiKey);
      setUserInfo(res);
      await refreshDriveStatus(driveApiKey);
      vibrate("success");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to refresh subscription");
      vibrate("danger");
    } finally {
      setLoading(false);
    }
  };

  const handleDriveLoad = async () => {
    if (!driveApiKey) {
      setShowDriveSetupDialog(true);
      return;
    }
    await initiateStorageSwitch("drive", "Google Drive");
  };

  const handleDriveWrite = async () => {
    if (!userInfo?.subscriptionValid) {
      alert("Whale Subscription Required: Your subscription has expired.");
      return;
    }

    if (!driveApiKey) {
      setShowDriveSetupDialog(true);
      return;
    }

    setDriveActionBusy(true);
    setStatusMessage("Syncing ledger to Google Drive...");
    vibrate("utility");

    try {
      const response = await writeGoogleDriveData(driveApiKey, transactions);
      if (!response.success) throw new Error("Sync failed");

      await refreshDriveStatus(driveApiKey);
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
      // First verify subscription with the provided key
      const sub = await verifySubscription(manualApiKey);
      setUserInfo(sub);

      // Save it as Drive API key
      await saveDriveApiKey(manualApiKey);

      const response = await initiateGoogleDriveSetup({
        apiKey: manualApiKey,
        redirectUri: `${window.location.origin}/bmlconnect/redirect`,
      });

      if (response.status === "SESSION_EXISTS") {
        setShowDriveSetupDialog(false);
        await refreshDriveStatus(manualApiKey);
        setStatusMessage("Google Drive session restored.");
        vibrate("success");
      } else if (response.status === "AUTH_REQUIRED") {
        setShowDriveSetupDialog(false);
        setPendingDriveAuthUrl(response.url);
        setShowDriveAuthChoiceDialog(true);
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Verification failed");
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
        <p className="text-sm font-medium text-foreground/50">Authorizing connection...</p>
      </div>
    );
  }

  if (hasBMLDB) {
    return (
      <div className="flex flex-col items-center justify-center bg-background font-sans max-w-2xl mx-auto text-center py-12 px-6">
        <div className="p-4 bg-primary/10 rounded-full text-primary mb-6">
          <Database className="w-12 h-12" />
        </div>
        <h1 className="text-2xl font-bold mb-4">Migration Required</h1>
        <p className="text-foreground/60 mb-8 leading-relaxed">
          We've detected data from an older version of the Ledger (BMLDB). To prevent data conflicts and sync issues, please migrate your legacy data before using BML Connect cloud features.
        </p>
        <div className="bg-foreground/5 border border-border p-6 rounded-2xl w-full text-left space-y-4">
          <h2 className="font-bold flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            How to migrate:
          </h2>
          <ol className="text-sm text-foreground/70 space-y-3 list-decimal list-inside">
            <li>Click the <span className="font-bold text-primary">"Review Migration"</span> button in the banner at the top of the page.</li>
            <li>Back up your current data when prompted.</li>
            <li>Choose to overwrite or discard the old data.</li>
          </ol>
        </div>
        <p className="mt-8 text-xs text-foreground/40 font-mono uppercase tracking-widest">
          Cloud sync is disabled until migration is complete
        </p>
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
              Cloud Storage Tunnel
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div
              className={`flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest font-mono ${driveStatus.connected
                ? "border-success/20 bg-success/10 text-success"
                : "border-border bg-foreground/5 text-foreground/40"
                }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${driveStatus.connected ? "animate-pulse bg-success" : "bg-foreground/20"}`}></span>
              {driveStatus.connected ? "Drive Online" : "Drive Offline"}
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

          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-foreground/5 p-5">
              <h3 className="mb-4 flex items-center gap-2 border-b border-border pb-3 text-sm font-bold">
                <ShieldCheck className="h-4 w-4 text-primary" /> Subscription Details
              </h3>
              {userInfo ? (
                <>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-foreground/50">Operator</p>
                      <p className="font-mono text-sm font-medium">{userInfo.username || "Unknown"}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-foreground/50">User ID</p>
                      <p className="font-mono text-sm font-medium text-foreground/80">{userInfo.userId || "N/A"}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-foreground/50">Tier</p>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${userInfo.subscriptionValid ? "border border-amber-500/20 bg-amber-500/10 text-amber-500" : "border border-border bg-foreground/10 text-foreground/60"}`}>
                        {userInfo.subscriptionValid ? "WHALE SUBSCRIBER" : "FREE USER"}
                      </span>
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-foreground/50">Valid Until</p>
                      <p className="font-mono text-sm font-medium text-foreground/80">{userInfo.validUntil ? new Date(userInfo.validUntil).toLocaleDateString() : "Lifetime"}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button onClick={handleRefreshSubscription} className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-primary transition-colors hover:bg-primary/20">
                      <RefreshCw className="h-3 w-3" /> Refresh Status
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-sm text-foreground/60 mb-4">Connect your Torn API key to check subscription status and enable Drive sync.</p>
                  <button onClick={() => setShowDriveSetupDialog(true)} className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                    Verify Identity
                  </button>
                </div>
              )}
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

                <div className={`rounded-xl border-2 p-4 transition-all ${!userInfo?.subscriptionValid ? "cursor-not-allowed border-border bg-background opacity-50 grayscale" : storageLocation === "drive" ? "border-primary bg-primary/5" : "cursor-pointer border-border bg-background hover:border-primary/50"}`}
                  onClick={() => userInfo?.subscriptionValid && initiateStorageSwitch("drive", "Google Drive")}
                >
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="h-5 w-5 text-amber-500" />
                      <div className="text-sm font-bold">Google Drive Sync</div>
                    </div>
                  </div>
                  <p className="text-xs text-foreground/60">Stores data in your private Google Drive app data folder.</p>
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
                        <h4 className="font-bold">Cloud Sync</h4>
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
                      <p className="text-xs text-foreground/60">Status: {driveStatus.email || "Active"}</p>
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

            <div className="text-center pt-4">
              <Link href="/bmlconnectlegacy" className="text-[10px] font-bold uppercase tracking-widest text-foreground/30 hover:text-primary transition-colors">
                Switch to Legacy Extension Tunnel
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Setup Dialogs */}
      {showDriveSetupDialog && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-panel border border-border p-8">
            <h2 className="text-xl font-bold mb-4">Identity Verification</h2>
            <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500 leading-relaxed">
              <ShieldCheck className="w-5 h-5 mb-2" />
              Provide your Torn API key to verify your Whale subscription.
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
                  {driveSetupBusy ? "Verifying..." : "Verify & Connect"}
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
          <div className="w-full max-w-lg rounded-3xl bg-panel border border-border overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-border bg-foreground/[0.02]">
              <h2 className="text-xl font-bold mb-1">Switch to {pendingStorageSwitch?.label}</h2>
              <p className="text-xs text-foreground/50 uppercase tracking-widest font-mono">Select migration strategy</p>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-border bg-foreground/[0.02] space-y-2">
                  <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-tighter">Current Database</p>
                  <p className="text-2xl font-black font-mono">{migrationCounts?.source.toLocaleString() || "0"}</p>
                  <p className="text-[10px] text-foreground/30 uppercase tracking-widest">Logs Available</p>
                </div>
                <div className="p-4 rounded-2xl border border-border bg-foreground/[0.02] space-y-2">
                  <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-tighter">Target Database</p>
                  <p className="text-2xl font-black font-mono">{migrationCounts?.target.toLocaleString() || "0"}</p>
                  <p className="text-[10px] text-foreground/30 uppercase tracking-widest">Existing Logs</p>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => handleMigrationConfirm("overwrite")}
                  className="group w-full flex items-center gap-4 bg-primary p-4 rounded-2xl hover:bg-primary/90 transition-all text-left border-2 border-primary shadow-lg shadow-primary/20"
                >
                  <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    <Save className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-bold text-sm text-white">Overwrite (Recommended)</div>
                        <div className="text-[10px] text-white/50 mt-1 leading-tight">Replace target data with your current visible logs. Recommended for clean sync.</div>
                      </div>
                      <div className="flex flex-col items-center shrink-0 min-w-[64px]">
                        <span className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1.5 font-mono">Expected</span>
                        <div className="h-12 w-12 flex items-center justify-center rounded-full bg-white/20 border border-white/30 text-xs font-black text-white shadow-inner">
                          {migrationCounts?.source.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleMigrationConfirm("merge")}
                  className="w-full flex items-center gap-4 bg-foreground/5 p-4 rounded-2xl hover:bg-primary/10 border border-border/50 hover:border-primary/20 transition-all text-left"
                >
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <ArrowRightLeft className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-bold text-sm">Merge Data</div>
                        <div className="text-[10px] text-foreground/40 mt-1 leading-tight">Combine items from both storages. Deduplication enabled.</div>
                      </div>
                      <div className="flex flex-col items-center shrink-0 min-w-[64px]">
                        <span className="text-[9px] font-black text-foreground/30 uppercase tracking-widest mb-1.5 font-mono">Expected</span>
                        <div className="h-12 w-12 flex items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-xs font-black text-primary">
                          ~{migrationCounts?.merge.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleMigrationConfirm("none")}
                  className="w-full flex items-center gap-4 bg-foreground/5 p-4 rounded-2xl hover:bg-foreground/10 border border-border/50 transition-all text-left"
                >
                  <div className="h-12 w-12 rounded-xl bg-foreground/10 flex items-center justify-center shrink-0">
                    <Database className="w-6 h-6 text-foreground/40" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-bold text-sm">Do Nothing</div>
                        <div className="text-[10px] text-foreground/40 mt-1 leading-tight">Just switch storage. Keep existing data where it is.</div>
                      </div>
                      <div className="flex flex-col items-center shrink-0 min-w-[64px]">
                        <span className="text-[9px] font-black text-foreground/20 uppercase tracking-widest mb-1.5 font-mono">Expected</span>
                        <div className="h-12 w-12 flex items-center justify-center rounded-full bg-foreground/10 border border-border text-xs font-black text-foreground/40">
                          {migrationCounts?.target.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              <div className="pt-2 text-center">
                <button onClick={() => setShowMigrationDialog(false)} className="text-[11px] font-bold text-red-500 hover:text-red-600 uppercase tracking-widest transition-colors">Discard Switch Request</button>
              </div>
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
