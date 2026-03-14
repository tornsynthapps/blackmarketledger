"use client";

import { useState, useEffect } from "react";
import { getConnectionString, sendToExtension, regenerateToken } from "@/lib/bmlconnect";
import Link from "next/link";
import { Copy, RefreshCw, Terminal, Activity, CheckCircle, XCircle } from "lucide-react";
import { useHapticFeedback } from "@/lib/useHapticFeedback";

export default function ConnectionSetup() {
  const [connectionToken, setConnectionToken] = useState<string>("");
  const [status, setStatus] = useState<string>("Ready");
  const [response, setResponse] = useState<any>(null);
  const { vibrate } = useHapticFeedback();

  useEffect(() => {
    setConnectionToken(getConnectionString());
  }, []);

  const handleRegenerateToken = () => {
    vibrate("danger");
    if (confirm("Are you sure? This will invalidate your previous connection token.")) {
      const newToken = regenerateToken();
      setConnectionToken(newToken);
      setStatus("Token Regenerated");
      vibrate("success");
    }
  };

  const handleTestHello = async () => {
    setStatus("Testing Protocol...");
    vibrate("utility");
    const res = await sendToExtension({ requestType: "HELLO" });
    setStatus(res.success ? "Hello Test Success" : "Hello Test Failed");
    setResponse(res);
    if (res.success) vibrate("success");
    else vibrate("danger");
  };

  const handleTestConnection = async () => {
    setStatus("Testing Authentication...");
    vibrate("utility");
    const res = await sendToExtension({ 
      requestType: "CONNECTION", 
      connectionToken: connectionToken 
    });
    setStatus(res.success ? "Authentication Success" : "Authentication Failed");
    setResponse(res);
    if (res.success) vibrate("success");
    else vibrate("danger");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-6 bg-background font-sans">
      <main className="w-full max-w-lg p-8 bg-panel rounded-2xl shadow-sm border border-border relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-48 h-48 bg-primary/10 rounded-full blur-[80px] pointer-events-none"></div>

        <div className="flex items-center justify-between mb-8 relative z-10">
          <Link href="/bmlconnect" className="text-foreground/60 hover:text-foreground transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
            <span>←</span> Dashboard
          </Link>
          <div className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-[9px] font-black text-primary uppercase tracking-widest">
            Setup Module
          </div>
        </div>

        <h1 className="text-2xl font-bold tracking-tight mb-2 relative z-10">Connection <span className="text-primary font-black">Setup</span></h1>
        <p className="text-foreground/60 text-sm mb-8 relative z-10">Establish a secure tunnel between this web app and the BML extension.</p>
        
        <div className="space-y-8 relative z-10">
          <section>
            <div className="flex justify-between items-end mb-3">
              <h2 className="text-foreground/70 text-xs font-bold uppercase tracking-wider font-mono">Connection Token</h2>
              <button
                onClick={handleRegenerateToken}
                className="text-xs flex items-center gap-1.5 text-danger/80 hover:text-danger font-medium transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Regenerate
              </button>
            </div>
            <div className="flex gap-2 p-1.5 bg-background rounded-xl border border-border focus-within:border-primary/50 transition-colors shadow-inner">
              <input 
                type="text" 
                readOnly
                value={connectionToken} 
                className="flex-1 px-4 py-3 bg-transparent text-foreground font-mono text-sm focus:outline-none cursor-default"
              />
              <button
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-5 py-3 rounded-lg transition-all text-sm flex items-center gap-2"
                onClick={() => {
                  navigator.clipboard.writeText(connectionToken);
                  setStatus("Copied to clipboard");
                  vibrate("success");
                }}
              >
                <Copy className="w-4 h-4" /> Copy
              </button>
            </div>
          </section>

          <section className="bg-amber-500/5 border border-amber-500/10 p-5 rounded-2xl">
            <h4 className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider mb-4 border-b border-amber-500/10 pb-2">Implementation Steps</h4>
            <ol className="text-foreground/70 text-sm space-y-3 leading-relaxed">
              <li className="flex gap-3"><span className="text-amber-500/50 font-black font-mono">01</span> Copy the connection token above.</li>
              <li className="flex gap-3"><span className="text-amber-500/50 font-black font-mono">02</span> Open the BML Connect extension popup.</li>
              <li className="flex gap-3"><span className="text-amber-500/50 font-black font-mono">03</span> Access "Manage Connections" on the dashboard.</li>
              <li className="flex gap-3"><span className="text-amber-500/50 font-black font-mono">04</span> Add a new entry and paste your token.</li>
            </ol>
          </section>

          <div className="pt-6 border-t border-border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-foreground/70 text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-2"><Terminal className="w-4 h-4" /> Diagnostics</h3>
              <span className={`text-[10px] font-bold tracking-wider font-mono px-2 py-0.5 rounded flex items-center gap-1 transition-colors ${status.includes('Failed') ? 'bg-danger/10 text-danger' : status.includes('Success') ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
                {status.includes('Failed') ? <XCircle className="w-3 h-3" /> : status.includes('Success') ? <CheckCircle className="w-3 h-3" /> : <Activity className="w-3 h-3 animate-pulse" />}
                {status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleTestHello}
                className="bg-panel hover:bg-foreground/5 text-foreground font-medium py-3 px-4 rounded-xl transition-all border border-border text-sm"
              >
                Test Protocol
              </button>
              <button
                onClick={handleTestConnection}
                className="bg-panel hover:bg-foreground/5 text-foreground font-medium py-3 px-4 rounded-xl transition-all border border-border text-sm"
              >
                Test Auth
              </button>
            </div>
          </div>

          {response && (
            <section className="animate-in fade-in slide-in-from-top-2 duration-300">
               <pre className="p-4 bg-background border border-border text-foreground/80 rounded-xl text-xs font-mono overflow-auto max-h-40 shadow-inner">
                {JSON.stringify(response, null, 2)}
              </pre>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
