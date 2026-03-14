"use client";

import { useState, useEffect } from "react";
import { getConnectionString, sendToExtension } from "@/lib/bmlconnect";
import Link from "next/link";
import { useJournal } from "@/store/useJournal";
import { useHapticFeedback } from "@/lib/useHapticFeedback";
import { Server, Database, ArrowRightLeft, ShieldCheck, Activity, Download, ExternalLink, Settings, Trash2, Unlink } from "lucide-react";

export default function BMLDashboard() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isExtensionInstalled, setIsExtensionInstalled] = useState<boolean | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [driveDataExists, setDriveDataExists] = useState(false);
  const [showDriveSettings, setShowDriveSettings] = useState(false);

  // Storage selection state
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);

  const { transactions, mergeTransactions, weav3rApiKey, weav3rUserId } = useJournal();
  const { vibrate } = useHapticFeedback();

  // The standard syncPreference uses 'local' or 'drive'. Let's use 'extension' or 'local' but for backward compatibility, maybe we just set a new preference `extension_db` locally.
  const [storageLocation, setStorageLocation] = useState<'browser' | 'extension' | 'drive'>('browser');

  useEffect(() => {
    // Read current storage pref
    const pref = localStorage.getItem("bml_storage_pref") as 'browser' | 'extension' | null;
    if (pref) {
      setStorageLocation(pref as any);
    }

    setIsDriveConnected(localStorage.getItem("bml_drive_connected") === "true");
    setDriveDataExists(localStorage.getItem("bml_drive_data_exists") === "true");

    const checkConnection = async () => {
      // 1. Check if extension is installed
      const helloRes = await sendToExtension({ requestType: "HELLO" });
      if (!helloRes.success && helloRes.error === "Extension request timed out") {
        setIsExtensionInstalled(false);
        setIsConnected(false);
        setLoading(false);
        return;
      }

      setIsExtensionInstalled(true);

      // 2. Check if connected
      const token = getConnectionString();
      const res = await sendToExtension({
        requestType: "CONNECTION",
        connectionToken: token
      });

      if (res.success) {
        setIsConnected(true);
        const userRes = await sendToExtension({ requestType: "GET_USER_INFO" });
        if (userRes.success) {
          setUserInfo(userRes.data);
        }
      } else {
        setIsConnected(false);
      }
      setLoading(false);
    };

    checkConnection();
  }, []);

  const handleMigrationToExtension = async () => {
    if (!userInfo?.subscriptionValid) return;

    setIsMigrating(true);
    vibrate("utility");

    try {
      // 1. Fetch current logs from extension to merge
      const resLoad = await sendToExtension({ requestType: "EXTENSION_DB_LOAD" });
      let extensionLogs = [];
      if (resLoad.success && Array.isArray(resLoad.data)) {
        extensionLogs = resLoad.data;
      }

      // 2. Perform merge in memory (this also saves to extension and local IDB because of useJournal update)
      mergeTransactions(extensionLogs);

      localStorage.setItem("bml_storage_pref", 'extension');
      setStorageLocation('extension');
      setMigrationComplete(true);
      vibrate("success");

      setTimeout(() => setMigrationComplete(false), 3000);
    } catch (err) {
      console.error("Migration failed", err);
      alert("Migration failed");
      vibrate("danger");
    } finally {
      setIsMigrating(false);
    }
  };

  const handleMigrationToBrowser = async () => {
    vibrate("utility");
    setIsMigrating(true);

    try {
      // When moving back to browser, we already have the memory state (which was synced with extension).
      // We just need to change the preference.
      // However, to be extra safe and ensure we have everything from extension:
      const resLoad = await sendToExtension({ requestType: "EXTENSION_DB_LOAD" });
      if (resLoad.success && Array.isArray(resLoad.data)) {
        mergeTransactions(resLoad.data);
      }

      localStorage.setItem("bml_storage_pref", 'browser');
      setStorageLocation('browser');
      vibrate("success");
    } catch (err) {
      console.error("Switch failed", err);
      vibrate("danger");
    } finally {
      setIsMigrating(false);
    }
  };

  const handleRefreshSubscription = async () => {
    vibrate("utility");
    setLoading(true);
    try {
      const res = await sendToExtension({ requestType: "VERIFY_SUBSCRIPTION" });
      if (res.success) {
        setUserInfo(res.data);
        vibrate("success");
      } else {
        alert(res.error || "Failed to refresh subscription");
        vibrate("danger");
      }
    } catch (err) {
      console.error("Refresh failed", err);
      vibrate("danger");
    } finally {
      setLoading(false);
    }
  };

  const handleSyncToDrive = async () => {
    if (!userInfo?.subscriptionValid) {
      alert("Whale Subscription Required: Your subscription has expired. Please renew or use 'Rescue to Browser' to move your data.");
      return;
    }

    setLoading(true);
    vibrate("utility");
    try {
      const apiKey = weav3rApiKey || localStorage.getItem("bml_api_key") || userInfo?.apiKey;

      // 1. Upload raw stringified data
      const res = await fetch(`https://yxjmnkaollkpcvymiicd.supabase.co/functions/v1/sync-google-drive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, action: 'write', data: JSON.stringify(transactions) })
      });
      const data = await res.json();

      if (data.success) {
        setStorageLocation('drive');
        localStorage.setItem("bml_storage_pref", 'drive');
        vibrate("success");
      } else {
        alert(data.error || "Sync failed");
        vibrate("danger");
      }
    } catch (err) {
      console.error("Sync failed", err);
      alert("Sync failed. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleConnectDrive = async () => {
    if (!userInfo?.subscriptionValid) {
      alert("Whale Subscription Required: You must be a Whale to use Google Drive Sync.");
      return;
    }
    vibrate("utility");
    try {
      const apiKey = weav3rApiKey || localStorage.getItem("bml_api_key") || userInfo?.apiKey;
      const userId = weav3rUserId || userInfo?.userId;

      if (!apiKey || !userId) {
        alert(`Missing ${!apiKey ? "API Key" : "User ID"}. Ensure your configuration is set up.`);
        return;
      }

      const redirectUri = `${window.location.origin}/bmlconnect/redirect`;

      const res = await fetch(`https://yxjmnkaollkpcvymiicd.supabase.co/functions/v1/initiate-google-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, userId, redirectUri })
      });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to initiate Google Auth");
      }
    } catch (err) {
      console.error("Auth initiation failed", err);
      alert("Auth initiation failed");
    }
  };

  const handleRestoreFromDrive = async () => {
    setLoading(true);
    vibrate("utility");
    try {
      const apiKey = weav3rApiKey || localStorage.getItem("bml_api_key") || userInfo?.apiKey;

      const res = await fetch(`https://yxjmnkaollkpcvymiicd.supabase.co/functions/v1/sync-google-drive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, action: 'read' })
      });
      const data = await res.json();

      if (data.success && data.data) {
        try {
          // Data is now plain JSON string or already parsed JSON object depending on how Supabase returns it
          // Based on sync-google-drive, it returns whatever was in 'data' field.
          const rawData = data.data;
          const parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

          if (Array.isArray(parsed)) {
            mergeTransactions(parsed);

            localStorage.setItem("bml_storage_pref", 'drive');
            setStorageLocation('drive');
            setDriveDataExists(false);
            localStorage.removeItem("bml_drive_data_exists");
            alert("Data restored successfully from Google Drive!");
            vibrate("success");
          } else {
            throw new Error("Invalid data format in Drive backup");
          }
        } catch (e: any) {
          console.error("Restore parse error", e);
          alert("Restore Failed: Invalid data format in Drive.");
          vibrate("danger");
        }
      } else if (data.success && !data.data) {
        alert("No data found in Google Drive.");
      } else {
        alert(data.error || "Failed to restore data");
      }
    } catch (err) {
      console.error("Restore failed", err);
      alert("Restore failed. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDrive = async () => {
    if (!confirm("Are you sure you want to PERMANENTLY delete your Google Drive sync data? This cannot be undone.")) {
      return;
    }

    setLoading(true);
    vibrate("utility");
    try {
      const apiKey = weav3rApiKey || localStorage.getItem("bml_api_key") || userInfo?.apiKey;

      const res = await fetch(`https://yxjmnkaollkpcvymiicd.supabase.co/functions/v1/sync-google-drive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, action: 'delete' })
      });
      const data = await res.json();

      if (data.success) {
        setStorageLocation('browser');
        localStorage.setItem("bml_storage_pref", 'browser');
        localStorage.removeItem("bml_drive_data_exists");
        setDriveDataExists(false);
        alert("Google Drive sync data deleted successfully.");
        vibrate("success");
      } else {
        alert(data.error || "Delete failed");
        vibrate("danger");
      }
    } catch (err) {
      console.error("Delete failed", err);
      alert("Delete failed. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectDrive = () => {
    if (confirm("Disconnect Google Drive? Your local data will remain, but syncing will stop.")) {
      localStorage.removeItem("bml_drive_connected");
      localStorage.removeItem("bml_drive_data_exists");
      localStorage.removeItem("bml_storage_pref");
      setIsDriveConnected(false);
      setDriveDataExists(false);
      setStorageLocation('browser');
      vibrate("utility");
    }
  };

  const backupAndMigrate = () => {
    if (confirm("You are about to sync your logs with the extension database. We will download a backup first just in case. Proceed?")) {
      // Download backup
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(transactions));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `bml_backup_${Date.now()}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();

      handleMigrationToExtension();
    }
  };

  const handleRescueToBrowser = async () => {
    if (confirm("This will attempt to recovery your most recent data from the cloud/extension and move it back to your local browser storage. Proceed?")) {
      setLoading(true);
      try {
        if (storageLocation === 'drive') {
          await handleRestoreFromDrive();
        } else if (storageLocation === 'extension') {
          const resLoad = await sendToExtension({ requestType: "EXTENSION_DB_LOAD" });
          if (resLoad.success && Array.isArray(resLoad.data)) {
            mergeTransactions(resLoad.data);
          }
        }

        localStorage.setItem("bml_storage_pref", 'browser');
        setStorageLocation('browser');
        alert("Data rescued successfully! You are now using Local Browser storage.");
        vibrate("success");
      } catch (err) {
        console.error("Rescue failed", err);
        alert("Rescue failed. Try again or check your connection.");
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-foreground bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mb-4"></div>
        <p className="text-foreground/50 text-sm font-medium">Authorizing tunnel...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center bg-background font-sans">
      <main className="w-full max-w-3xl p-6 bg-panel rounded-2xl shadow-sm border border-border relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center justify-between mb-6 relative z-10">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">BML <span className="text-primary font-black">CONNECT</span></h1>
            <p className="text-foreground/50 text-xs font-mono uppercase tracking-widest mt-1">Secure Extension Tunnel</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest font-mono ${isConnected ? 'bg-success/10 text-success border border-success/20' : 'bg-danger/10 text-danger border border-danger/20'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-success animate-pulse' : 'bg-danger'}`}></span>
              {isConnected ? 'Sync Online' : 'Sync Offline'}
            </div>
            {userInfo && !userInfo.subscriptionValid && (storageLocation === 'drive' || storageLocation === 'extension') && (
              <button
                onClick={handleRescueToBrowser}
                className="bg-amber-500 text-white text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-tighter animate-pulse shadow-lg shadow-amber-500/20"
              >
                Rescue Data
              </button>
            )}
          </div>
        </div>

        <div className="relative z-10">
          {!isExtensionInstalled ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 mb-4">
                <Download className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold mb-2">Extension Required</h2>
              <p className="text-foreground/60 text-sm mb-6 max-w-sm mx-auto">
                BML Connect requires the browser extension to sync your logs and unlock advanced features.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href="https://chromewebstore.google.com/"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 px-6 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Install Extension
                </a>
                <button onClick={() => window.location.reload()} className="bg-foreground/5 text-foreground font-medium py-2 px-6 rounded-lg border border-border text-sm transition-colors hover:bg-foreground/10">
                  I've installed it
                </button>
              </div>
            </div>
          ) : !isConnected ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-danger/10 text-danger mb-4">
                <Activity className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold mb-2">Tunnel Connection Failed</h2>
              <p className="text-foreground/60 text-sm mb-6 max-w-sm mx-auto">
                We couldn't reach the BML extension. Ensure it's active and the connection token is properly configured.
              </p>
              <div className="flex gap-3 justify-center">
                <Link href="/bmlconnect/connect" className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 px-6 rounded-lg transition-colors text-sm">Setup Connection</Link>
                <button onClick={() => window.location.reload()} className="bg-foreground/5 text-foreground font-medium py-2 px-6 rounded-lg border border-border text-sm transition-colors hover:bg-foreground/10">Retry</button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Extended Profile Info */}
              <div className="bg-foreground/5 border border-border rounded-xl p-5">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-4 border-b border-border pb-3">
                  <ShieldCheck className="w-4 h-4 text-primary" /> Authorization Details
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-foreground/50 text-[10px] uppercase font-bold tracking-wider mb-1">Operator</p>
                    <p className="font-mono text-sm font-medium">{userInfo?.username || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-foreground/50 text-[10px] uppercase font-bold tracking-wider mb-1">User ID</p>
                    <p className="font-mono text-sm font-medium text-foreground/80">{userInfo?.userId || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-foreground/50 text-[10px] uppercase font-bold tracking-wider mb-1">Tier</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${userInfo?.subscriptionValid ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-foreground/10 text-foreground/60 border border-border'}`}>
                      {userInfo?.subscriptionValid ? 'WHALE SUBSCRIBER' : 'FREE USER'}
                    </span>
                  </div>
                  <div>
                    <p className="text-foreground/50 text-[10px] uppercase font-bold tracking-wider mb-1">Valid Until</p>
                    <p className="font-mono text-sm font-medium text-foreground/80">
                      {userInfo?.validUntil ? new Date(userInfo.validUntil).toLocaleDateString() : 'Lifetime'}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleRefreshSubscription}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors border border-primary/20"
                  >
                    <Activity className="w-3 h-3" />
                    Refresh Subscription
                  </button>
                </div>
              </div>

              {/* Storage Configuration */}
              <div className="bg-foreground/5 border border-border rounded-xl p-5">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-4 border-b border-border pb-3">
                  <Database className="w-4 h-4 text-primary" /> Storage Configuration
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Browser Option */}
                  <div
                    onClick={() => {
                      if (storageLocation === 'browser') return;
                      handleMigrationToBrowser();
                    }}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${storageLocation === 'browser' ? 'bg-primary/5 border-primary' : 'bg-background border-border hover:border-primary/50'}`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Server className="w-5 h-5 text-foreground/60" />
                      <div className="font-bold text-sm">Local Browser</div>
                    </div>
                    <p className="text-xs text-foreground/60">Stores data in local IndexedDB. Cleared if you purge site data.</p>
                  </div>

                  {/* Extension Option */}
                  <div
                    onClick={() => {
                      if (!userInfo?.subscriptionValid) return;
                      if (storageLocation === 'extension') return;
                      backupAndMigrate();
                    }}
                    className={`p-4 rounded-xl border-2 transition-all ${!userInfo?.subscriptionValid ? 'opacity-50 cursor-not-allowed bg-background border-border grayscale' : 'cursor-pointer'} ${storageLocation === 'extension' ? 'bg-primary/5 border-primary' : userInfo?.subscriptionValid ? 'bg-background border-border hover:border-primary/50' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <ShieldCheck className="w-5 h-5 text-amber-500" />
                        <div className="font-bold text-sm">Extension Database</div>
                      </div>
                      {!userInfo?.subscriptionValid && <span className="bg-foreground/10 text-foreground/60 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Whale Only</span>}
                    </div>
                    <p className="text-xs text-foreground/60">Stores data securely within the extension. Never wiped by browser cache clears.</p>
                  </div>

                  {/* Google Drive Option */}
                  <div
                    onClick={async () => {
                      if (!userInfo?.subscriptionValid) {
                        if (storageLocation === 'drive') {
                          handleRescueToBrowser();
                        } else {
                          alert("Whale Subscription Required for Google Drive Sync.");
                        }
                        return;
                      }

                      if (!isDriveConnected) {
                        handleConnectDrive();
                        return;
                      }
                      handleSyncToDrive();
                    }}
                    className={`p-4 rounded-xl border-2 transition-all ${!userInfo?.subscriptionValid ? 'opacity-50 grayscale bg-background border-border' : storageLocation === 'drive' ? 'bg-primary/5 border-primary' : 'bg-background border-border hover:border-primary/50'} cursor-pointer`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <ExternalLink className="w-5 h-5 text-blue-500" />
                        <div className="font-bold text-sm">Google Drive Sync</div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {!userInfo?.subscriptionValid && <span className="bg-foreground/10 text-foreground/60 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Whale Only</span>}
                        {!isDriveConnected && <span className="bg-primary/10 text-primary text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Connect</span>}
                      </div>
                    </div>
                    <p className="text-xs text-foreground/60">
                      {isDriveConnected
                        ? "Synchronize your transactions with your Google Drive account."
                        : "Connect your Google account to sync data across devices securely."}
                    </p>

                    {isDriveConnected && (
                      <div className="mt-3 pt-3 border-t border-border flex justify-between items-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestoreFromDrive();
                          }}
                          className="text-[10px] font-bold uppercase tracking-wider text-primary hover:underline"
                        >
                          Restore from Drive
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDriveSettings(!showDriveSettings);
                          }}
                          className="p-1.5 hover:bg-foreground/5 rounded-lg transition-colors flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-foreground/50 hover:text-primary"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          Drive Settings
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {showDriveSettings && isDriveConnected && (
                  <div className="mt-4 p-5 bg-panel border-2 border-primary/20 rounded-xl shadow-inner animate-in slide-in-from-top-2 duration-300">
                    <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                      <Settings className="w-4 h-4 text-primary" /> Google Drive Settings
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                      <button
                        onClick={handleDisconnectDrive}
                        className="w-full flex items-center justify-between p-3 bg-background border border-border rounded-lg hover:border-danger/50 hover:bg-danger/5 transition-all text-left"
                      >
                        <div className="flex items-center gap-3">
                          <Unlink className="w-4 h-4 text-foreground/60" />
                          <div>
                            <p className="text-xs font-bold">Disconnect Account</p>
                            <p className="text-[10px] text-foreground/50">Stop syncing and unauthorizing this device.</p>
                          </div>
                        </div>
                        <ArrowRightLeft className="w-3 h-3 text-foreground/30" />
                      </button>

                      <button
                        onClick={handleDeleteDrive}
                        className="w-full flex items-center justify-between p-3 bg-danger/5 border border-danger/20 rounded-lg hover:bg-danger/10 transition-all text-left group"
                      >
                        <div className="flex items-center gap-3">
                          <Trash2 className="w-4 h-4 text-danger" />
                          <div>
                            <p className="text-xs font-bold text-danger">Wipe Cloud Data</p>
                            <p className="text-[10px] text-danger/60 group-hover:text-danger/60">Permanently delete backup from Google Drive.</p>
                          </div>
                        </div>
                        <ArrowRightLeft className="w-3 h-3 text-danger/30" />
                      </button>
                    </div>
                    <button
                      onClick={() => setShowDriveSettings(false)}
                      className="w-full mt-4 py-2 text-[10px] font-bold uppercase tracking-widest text-foreground/30 hover:text-foreground/60 transition-colors"
                    >
                      Close Settings
                    </button>
                  </div>
                )}


                {isMigrating && (
                  <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-500 text-xs font-medium animate-pulse flex items-center justify-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 animate-spin" />
                    Migrating data to extension... Do not close window.
                  </div>
                )}

                {migrationComplete && (
                  <div className="mt-4 p-3 bg-success/10 border border-success/20 rounded-lg text-success text-xs font-medium flex items-center justify-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    Migration Complete! Using isolated extension storage.
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <Link href="/bmlconnect/connect" className="p-3 bg-panel border border-border rounded-xl hover:bg-foreground/5 transition-colors text-center text-xs font-medium">
                  Manage Connection Token
                </Link>
                <button onClick={() => window.location.reload()} className="p-3 bg-panel border border-border rounded-xl hover:bg-foreground/5 transition-colors text-center text-xs font-medium">
                  Refresh Status
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
