"use client";

import { useState, useEffect } from "react";
import { getConnectionString, sendToExtension } from "@/lib/bmlconnect";
import Link from "next/link";
import { useJournal } from "@/store/useJournal";
import { useHapticFeedback } from "@/lib/useHapticFeedback";
import { Server, Database, ArrowRightLeft, ShieldCheck, Activity } from "lucide-react";

export default function BMLDashboard() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Storage selection state
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);
  
  const { transactions, syncPreference, setSyncPreference, forceSync, mergeTransactions } = useJournal();
  const { vibrate } = useHapticFeedback();
  
  // The standard syncPreference uses 'local' or 'drive'. Let's use 'extension' or 'local' but for backward compatibility, maybe we just set a new preference `extension_db` locally.
  const [storageLocation, setStorageLocation] = useState<'browser' | 'extension'>('browser');

  useEffect(() => {
    // Read current storage pref
    const pref = localStorage.getItem("bml_storage_pref") as 'browser' | 'extension' | null;
    if (pref) {
      setStorageLocation(pref);
    }
    
    const checkConnection = async () => {
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
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest font-mono ${isConnected ? 'bg-success/10 text-success border border-success/20' : 'bg-danger/10 text-danger border border-danger/20'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-success animate-pulse' : 'bg-danger'}`}></span>
            {isConnected ? 'Sync Online' : 'Sync Offline'}
          </div>
        </div>
        
        <div className="relative z-10">
        {!isConnected ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-danger/10 text-danger mb-4">
              <Activity className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold mb-2">Tunnel Connection Failed</h2>
            <p className="text-foreground/60 text-sm mb-6 max-w-sm mx-auto">
              We couldn't reach the BML extension. Ensure it's installed and the connection token is properly configured.
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
              </div>

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
