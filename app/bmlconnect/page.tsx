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
  RefreshCw,
  Server,
  Settings,
  ShieldCheck,
  Trash2,
  Unlink,
} from "lucide-react";
import { useJournal } from "@/store/useJournal";
import { getConnectionString, sendToExtension } from "@/lib/bmlconnect";
import { initiateGoogleDriveSetup } from "@/lib/drive-api";
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
  const { transactions, mergeTransactions, weav3rApiKey } = useJournal();
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
  const [showDriveAuthChoiceDialog, setShowDriveAuthChoiceDialog] = useState(false);
  const [pendingDriveAuthUrl, setPendingDriveAuthUrl] = useState<string | null>(null);
  const [driveSetupBusy, setDriveSetupBusy] = useState(false);
  const [driveActionBusy, setDriveActionBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);

  const driveSuccessBanner = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("drive") === "connected";
  }, []);

  useEffect(() => {
    const pref = localStorage.getItem("bml_storage_pref") as StorageLocation | null;
    if (pref === "browser" || pref === "extension" || pref === "drive") {
      setStorageLocation(pref);
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      const helloRes = await sendToExtension({ type: "HELLO" });
      if (!helloRes.success) {
        setIsExtensionInstalled(false);
        setIsConnected(false);
        setLoading(false);
        return;
      }

      setIsExtensionInstalled(true);

      const token = getConnectionString();
      const connectionRes = await sendToExtension({
        type: "CONNECTION",
        payload: { connectionToken: token },
      });

      if (!connectionRes.success) {
        setIsConnected(false);
        setLoading(false);
        return;
      }

      setIsConnected(true);

      const [userRes, driveRes] = await Promise.all([
        sendToExtension<UserInfo>({ type: "GET_USER_INFO" }),
        sendToExtension<DriveStatus>({ type: "DRIVE_STATUS" }),
      ]);

      if (userRes.success) {
        setUserInfo(userRes.data ?? null);
      }

      if (driveRes.success && driveRes.data) {
        setDriveStatus({
          connected: Boolean(driveRes.data.connected),
          hasData: Boolean(driveRes.data.hasData),
          email: driveRes.data.email ?? null,
          connectedAt: driveRes.data.connectedAt ?? null,
          lastSyncedAt: driveRes.data.lastSyncedAt ?? null,
        });
      }

      setLoading(false);
    };

    initialize();
  }, []);

  const refreshDriveStatus = async () => {
    const response = await sendToExtension<DriveStatus>({ type: "DRIVE_STATUS" });
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

  const applyApiKeyToExtension = async (apiKey: string) => {
    const response = await sendToExtension<UserInfo>({
      type: "SUBSCRIPTION_STATUS",
      payload: { apiKey },
    });

    if (!response.success) {
      throw new Error(response.error || "Failed to sync Torn API key to extension");
    }

    setUserInfo(response.data ?? null);
  };

  const handleMigrationToExtension = async () => {
    if (!userInfo?.subscriptionValid) return;

    setIsMigrating(true);
    vibrate("utility");

    try {
      const resLoad = await sendToExtension<Transaction[]>({
        type: "EXTENSION_DB_LOAD",
      });
      const extensionLogs = resLoad.success && Array.isArray(resLoad.data)
        ? resLoad.data
        : [];

      mergeTransactions(extensionLogs);
      localStorage.setItem("bml_storage_pref", "extension");
      setStorageLocation("extension");
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

  const handleMigrationToBrowser = async () => {
    setIsMigrating(true);
    vibrate("utility");

    try {
      const resLoad = await sendToExtension<Transaction[]>({
        type: "EXTENSION_DB_LOAD",
      });
      if (resLoad.success && Array.isArray(resLoad.data)) {
        mergeTransactions(resLoad.data);
      }

      localStorage.setItem("bml_storage_pref", "browser");
      setStorageLocation("browser");
      vibrate("success");
    } catch (error) {
      console.error("Switch failed", error);
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
    setDriveActionBusy(true);
    setStatusMessage("Loading ledger data from Google Drive...");
    vibrate("utility");

    try {
      const response = await sendToExtension<Transaction[]>({
        type: "DRIVE_LOAD_DATA",
      });
      if (!response.success) {
        throw new Error(response.error || "Drive load failed");
      }

      if (!Array.isArray(response.data) || response.data.length === 0) {
        setStatusMessage("Drive connected. No ledger backup found yet.");
        await refreshDriveStatus();
        return;
      }

      mergeTransactions(response.data);
      localStorage.setItem("bml_storage_pref", "drive");
      setStorageLocation("drive");
      await refreshDriveStatus();
      setStatusMessage("Ledger data loaded from Google Drive.");
      vibrate("success");
    } catch (error) {
      console.error("Drive load failed", error);
      setStatusMessage(error instanceof Error ? error.message : "Drive load failed");
      vibrate("danger");
    } finally {
      setDriveActionBusy(false);
    }
  };

  const handleDriveWrite = async () => {
    if (!userInfo?.subscriptionValid) {
      alert(
        "Whale Subscription Required: Your subscription has expired. Please renew or rescue your data to browser storage.",
      );
      return;
    }

    setDriveActionBusy(true);
    setStatusMessage("Syncing current ledger to Google Drive...");
    vibrate("utility");

    try {
      const response = await sendToExtension({
        type: "DRIVE_WRITE_DATA",
        payload: { data: transactions },
      });

      if (!response.success) {
        throw new Error(response.error || "Drive sync failed");
      }

      localStorage.setItem("bml_storage_pref", "drive");
      setStorageLocation("drive");
      await refreshDriveStatus();
      setStatusMessage("Google Drive sync complete.");
      vibrate("success");
    } catch (error) {
      console.error("Drive sync failed", error);
      setStatusMessage(error instanceof Error ? error.message : "Drive sync failed");
      vibrate("danger");
    } finally {
      setDriveActionBusy(false);
    }
  };

  const handleDriveCardClick = async () => {
    if (!userInfo?.subscriptionValid) {
      alert("Whale Subscription Required for Google Drive Sync.");
      return;
    }

    if (driveStatus.connected) {
      await handleDriveLoad();
      return;
    }

    const existingApiKey = weav3rApiKey || userInfo?.apiKey;
    if (existingApiKey) {
      await handleStartDriveSetup(existingApiKey, false);
      return;
    }

    setShowDriveSetupDialog(true);
  };

  const handleStartDriveSetup = async (apiKeyOverride?: string, fromManualEntry = true) => {
    if (!userInfo?.subscriptionValid) {
      alert("Whale Subscription Required: You must be a Whale to use Google Drive Sync.");
      return;
    }

    const apiKey = apiKeyOverride || weav3rApiKey || userInfo?.apiKey || manualApiKey.trim();
    if (!apiKey) {
      alert("Missing Torn API key. Sync your subscription in the extension first.");
      return;
    }

    setDriveSetupBusy(true);
    setStatusMessage("Checking Google Drive session for this Torn API key...");

    try {
      await applyApiKeyToExtension(apiKey);

      const response = await initiateGoogleDriveSetup({
        apiKey,
        redirectUri: `${window.location.origin}/bmlconnect/redirect`,
      });

      if (response.status === "SESSION_EXISTS") {
        setDriveStatus({
          connected: response.connection.connected,
          hasData: response.connection.hasData,
        });
        setShowDriveSetupDialog(false);
        setStatusMessage("Google Drive session already exists. Starting sync...");
        await handleDriveLoad();
        return;
      }

      if (fromManualEntry) {
        setPendingDriveAuthUrl(response.url);
        setShowDriveSetupDialog(false);
        setShowDriveAuthChoiceDialog(true);
        setStatusMessage("No Drive session found for this Torn API key.");
        return;
      }

      window.location.assign(response.url);
    } catch (error) {
      console.error("Drive setup failed", error);
      setStatusMessage(error instanceof Error ? error.message : "Drive setup failed");
    } finally {
      setDriveSetupBusy(false);
    }
  };

  const handleDeleteDriveData = async () => {
    if (
      !confirm(
        "Permanently delete the Google Drive appData backup for this ledger account?",
      )
    ) {
      return;
    }

    setDriveActionBusy(true);
    try {
      const response = await sendToExtension({ type: "DRIVE_DELETE_DATA" });
      if (!response.success) {
        throw new Error(response.error || "Delete failed");
      }

      await refreshDriveStatus();
      localStorage.setItem("bml_storage_pref", "browser");
      setStorageLocation("browser");
      setStatusMessage("Drive backup deleted.");
      vibrate("success");
    } catch (error) {
      console.error("Delete failed", error);
      setStatusMessage(error instanceof Error ? error.message : "Delete failed");
      vibrate("danger");
    } finally {
      setDriveActionBusy(false);
    }
  };

  const handleDisconnectDrive = async () => {
    if (!confirm("Disconnect Google Drive for this ledger account?")) {
      return;
    }

    setDriveActionBusy(true);
    try {
      const response = await sendToExtension({ type: "DRIVE_DISCONNECT" });
      if (!response.success) {
        throw new Error(response.error || "Disconnect failed");
      }

      setDriveStatus(EMPTY_DRIVE_STATUS);
      localStorage.setItem("bml_storage_pref", "browser");
      setStorageLocation("browser");
      setShowDriveSettings(false);
      setStatusMessage("Google Drive disconnected.");
      vibrate("success");
    } catch (error) {
      console.error("Disconnect failed", error);
      setStatusMessage(error instanceof Error ? error.message : "Disconnect failed");
      vibrate("danger");
    } finally {
      setDriveActionBusy(false);
    }
  };

  const backupAndMigrate = () => {
    if (
      !confirm(
        "You are about to sync your logs with the extension database. A backup will be downloaded first. Continue?",
      )
    ) {
      return;
    }

    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(transactions));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `bml_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();

    handleMigrationToExtension();
  };

  const handleRescueToBrowser = async () => {
    if (
      !confirm(
        "This will recover your most recent data from cloud or extension storage and move you back to browser storage. Continue?",
      )
    ) {
      return;
    }

    setLoading(true);

    try {
      if (storageLocation === "drive") {
        await handleDriveLoad();
      }

      if (storageLocation === "extension") {
        const resLoad = await sendToExtension<Transaction[]>({
          type: "EXTENSION_DB_LOAD",
        });
        if (resLoad.success && Array.isArray(resLoad.data)) {
          mergeTransactions(resLoad.data);
        }
      }

      localStorage.setItem("bml_storage_pref", "browser");
      setStorageLocation("browser");
      setStatusMessage("Data rescued to local browser storage.");
      vibrate("success");
    } catch (error) {
      console.error("Rescue failed", error);
      setStatusMessage(error instanceof Error ? error.message : "Rescue failed");
      vibrate("danger");
    } finally {
      setLoading(false);
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
              className={`flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest font-mono ${
                isConnected
                  ? "border-success/20 bg-success/10 text-success"
                  : "border-danger/20 bg-danger/10 text-danger"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isConnected ? "animate-pulse bg-success" : "bg-danger"
                }`}
              ></span>
              {isConnected ? "Sync Online" : "Sync Offline"}
            </div>

            {userInfo && !userInfo.subscriptionValid && storageLocation !== "browser" && (
              <button
                onClick={handleRescueToBrowser}
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
            <div className="mb-4 rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground/70">
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
                <a
                  href="https://chromewebstore.google.com/"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Download className="h-4 w-4" /> Install Extension
                </a>
                <button
                  onClick={() => window.location.reload()}
                  className="rounded-lg border border-border bg-foreground/5 px-6 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/10"
                >
                  I&apos;ve installed it
                </button>
              </div>
            </div>
          ) : !isConnected ? (
            <div className="py-12 text-center">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
                <Activity className="h-6 w-6" />
              </div>
              <h2 className="mb-2 text-lg font-bold">Tunnel Connection Failed</h2>
              <p className="mx-auto mb-6 max-w-sm text-sm text-foreground/60">
                We couldn&apos;t reach the BML extension. Ensure it&apos;s active and the connection token is configured.
              </p>
              <div className="flex justify-center gap-3">
                <Link
                  href="/bmlconnect/connect"
                  className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Setup Connection
                </Link>
                <button
                  onClick={() => window.location.reload()}
                  className="rounded-lg border border-border bg-foreground/5 px-6 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/10"
                >
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
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-foreground/50">
                      Operator
                    </p>
                    <p className="font-mono text-sm font-medium">
                      {userInfo?.username || "Unknown"}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-foreground/50">
                      User ID
                    </p>
                    <p className="font-mono text-sm font-medium text-foreground/80">
                      {userInfo?.userId || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-foreground/50">
                      Tier
                    </p>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        userInfo?.subscriptionValid
                          ? "border border-amber-500/20 bg-amber-500/10 text-amber-500"
                          : "border border-border bg-foreground/10 text-foreground/60"
                      }`}
                    >
                      {userInfo?.subscriptionValid ? "WHALE SUBSCRIBER" : "FREE USER"}
                    </span>
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-foreground/50">
                      Valid Until
                    </p>
                    <p className="font-mono text-sm font-medium text-foreground/80">
                      {userInfo?.validUntil
                        ? new Date(userInfo.validUntil).toLocaleDateString()
                        : "Lifetime"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleRefreshSubscription}
                    className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-primary transition-colors hover:bg-primary/20"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Refresh Subscription
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-foreground/5 p-5">
                <h3 className="mb-4 flex items-center gap-2 border-b border-border pb-3 text-sm font-bold">
                  <Database className="h-4 w-4 text-primary" /> Storage Configuration
                </h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div
                    onClick={() => {
                      if (storageLocation !== "browser") {
                        handleMigrationToBrowser();
                      }
                    }}
                    className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                      storageLocation === "browser"
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background hover:border-primary/50"
                    }`}
                  >
                    <div className="mb-2 flex items-center gap-3">
                      <Server className="h-5 w-5 text-foreground/60" />
                      <div className="text-sm font-bold">Local Browser</div>
                    </div>
                    <p className="text-xs text-foreground/60">
                      Stores data in local IndexedDB. Cleared if you purge site data.
                    </p>
                  </div>

                  <div
                    onClick={() => {
                      if (!userInfo?.subscriptionValid || storageLocation === "extension") {
                        return;
                      }
                      backupAndMigrate();
                    }}
                    className={`rounded-xl border-2 p-4 transition-all ${
                      !userInfo?.subscriptionValid
                        ? "cursor-not-allowed border-border bg-background opacity-50 grayscale"
                        : storageLocation === "extension"
                          ? "border-primary bg-primary/5"
                          : "cursor-pointer border-border bg-background hover:border-primary/50"
                    }`}
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <ShieldCheck className="h-5 w-5 text-amber-500" />
                        <div className="text-sm font-bold">Extension Database</div>
                      </div>
                      {!userInfo?.subscriptionValid && (
                        <span className="rounded bg-foreground/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-foreground/60">
                          Whale Only
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-foreground/60">
                      Stores data inside the extension so browser site-data clears do not wipe it.
                    </p>
                  </div>

                  <div
                    onClick={handleDriveCardClick}
                    className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                      !userInfo?.subscriptionValid
                        ? "border-border bg-background opacity-50 grayscale"
                        : storageLocation === "drive"
                          ? "border-primary bg-primary/5"
                          : "border-border bg-background hover:border-primary/50"
                    }`}
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <ExternalLink className="h-5 w-5 text-blue-500" />
                        <div className="text-sm font-bold">Google Drive Sync</div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {!userInfo?.subscriptionValid && (
                          <span className="rounded bg-foreground/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-foreground/60">
                            Whale Only
                          </span>
                        )}
                        {!driveStatus.connected && (
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                            Connect
                          </span>
                        )}
                        {driveStatus.connected && (
                          <span className="rounded bg-success/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-success">
                            Connected
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-foreground/60">
                      {driveStatus.connected
                        ? "Click to load ledger data through the extension from Google Drive appData."
                        : "Authorize Google Drive appData access from the web app, then load data through the extension."}
                    </p>

                    {driveStatus.connected && (
                      <div className="mt-3 border-t border-border pt-3">
                        <div className="mb-3 text-[10px] uppercase tracking-wider text-foreground/50">
                          {driveStatus.email || "Drive account connected"}
                          {driveStatus.connectedAt && (
                            <span className="ml-2">
                              since {new Date(driveStatus.connectedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDriveWrite();
                            }}
                            className="text-[10px] font-bold uppercase tracking-wider text-primary hover:underline"
                          >
                            Sync Current Ledger
                          </button>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              setShowDriveSettings((current) => !current);
                            }}
                            className="flex items-center gap-2 rounded-lg p-1.5 text-[10px] font-bold uppercase tracking-wider text-foreground/50 transition-colors hover:bg-foreground/5 hover:text-primary"
                          >
                            <Settings className="h-3.5 w-3.5" />
                            Drive Settings
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {showDriveSettings && driveStatus.connected && (
                  <div className="mt-4 animate-in rounded-xl border-2 border-primary/20 bg-panel p-5 shadow-inner duration-300 slide-in-from-top-2">
                    <h4 className="mb-4 flex items-center gap-2 text-sm font-bold">
                      <Settings className="h-4 w-4 text-primary" /> Google Drive Settings
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                      <button
                        onClick={handleDisconnectDrive}
                        className="flex w-full items-center justify-between rounded-lg border border-border bg-background p-3 text-left transition-all hover:border-danger/50 hover:bg-danger/5"
                      >
                        <div className="flex items-center gap-3">
                          <Unlink className="h-4 w-4 text-foreground/60" />
                          <div>
                            <p className="text-xs font-bold">Disconnect Account</p>
                            <p className="text-[10px] text-foreground/50">
                              Stop syncing and revoke the stored Google Drive session.
                            </p>
                          </div>
                        </div>
                        <ArrowRightLeft className="h-3 w-3 text-foreground/30" />
                      </button>

                      <button
                        onClick={handleDeleteDriveData}
                        className="group flex w-full items-center justify-between rounded-lg border border-danger/20 bg-danger/5 p-3 text-left transition-all hover:bg-danger/10"
                      >
                        <div className="flex items-center gap-3">
                          <Trash2 className="h-4 w-4 text-danger" />
                          <div>
                            <p className="text-xs font-bold text-danger">Wipe Cloud Data</p>
                            <p className="text-[10px] text-danger/60">
                              Permanently delete the ledger backup from Google Drive appData.
                            </p>
                          </div>
                        </div>
                        <ArrowRightLeft className="h-3 w-3 text-danger/30" />
                      </button>
                    </div>
                  </div>
                )}

                {(driveSetupBusy || driveActionBusy || isMigrating) && (
                  <div className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs font-medium text-amber-500">
                    <ArrowRightLeft className="h-4 w-4 animate-spin" />
                    {isMigrating
                      ? "Migrating data to extension storage..."
                      : driveSetupBusy
                        ? "Preparing Google Drive authorization..."
                        : "Running Drive operation..."}
                  </div>
                )}

                {migrationComplete && (
                  <div className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-success/20 bg-success/10 p-3 text-xs font-medium text-success">
                    <ShieldCheck className="h-4 w-4" />
                    Migration Complete! Using isolated extension storage.
                  </div>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <Link
                  href="/bmlconnect/connect"
                  className="rounded-xl border border-border bg-panel p-3 text-center text-xs font-medium transition-colors hover:bg-foreground/5"
                >
                  Manage Connection Token
                </Link>
                <button
                  onClick={() => window.location.reload()}
                  className="rounded-xl border border-border bg-panel p-3 text-center text-xs font-medium transition-colors hover:bg-foreground/5"
                >
                  Refresh Status
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {showDriveSetupDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-panel p-6 shadow-xl">
            <h2 className="mb-3 text-xl font-bold">Google Drive Connect</h2>
            <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-foreground/80">
              <p className="mb-2 font-semibold text-amber-600">
                Your Torn API key will be stored in the database.
              </p>
              <p className="mb-2">
                It will be used to identify the Google Drive <code>appDataFolder</code> session for this integration.
              </p>
              <p>
                Please create a dedicated Torn API key specifically for this integration. Suggested name:{" "}
                <strong>&quot;Only use Ledger Drive Connect&quot;</strong>
              </p>
            </div>

            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-foreground/50">
              Torn API Key
            </label>
            <input
              type="password"
              value={manualApiKey}
              onChange={(event) => setManualApiKey(event.target.value)}
              placeholder="Enter Torn API key"
              className="mb-4 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary/50"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDriveSetupDialog(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground/70"
              >
                Cancel
              </button>
              <button
                onClick={() => handleStartDriveSetup(undefined, true)}
                disabled={driveSetupBusy}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {showDriveAuthChoiceDialog && pendingDriveAuthUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-panel p-6 shadow-xl">
            <h2 className="mb-3 text-xl font-bold">No Existing Drive Session</h2>
            <p className="mb-6 text-sm text-foreground/70">
              No Google Drive session exists for this Torn API key. You can use a different API key or continue to Google auth and start syncing.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDriveAuthChoiceDialog(false);
                  setShowDriveSetupDialog(true);
                  setPendingDriveAuthUrl(null);
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground/70"
              >
                Use Different API Key
              </button>
              <button
                onClick={() => {
                  setShowDriveAuthChoiceDialog(false);
                  window.location.assign(pendingDriveAuthUrl);
                }}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Start Auth and Sync
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
