"use client";

import { useState, useEffect } from "react";
import { getConnectionString, sendToExtension, regenerateToken } from "@/lib/bmlconnect";
import Link from "next/link";

export default function ConnectionSetup() {
  const [connectionToken, setConnectionToken] = useState<string>("");
  const [status, setStatus] = useState<string>("Ready");
  const [response, setResponse] = useState<any>(null);

  useEffect(() => {
    setConnectionToken(getConnectionString());
  }, []);

  const handleRegenerateToken = () => {
    if (confirm("Are you sure? This will invalidate your previous connection token.")) {
      const newToken = regenerateToken();
      setConnectionToken(newToken);
      setStatus("Token Regenerated");
    }
  };

  const handleTestHello = async () => {
    setStatus("Testing Hello...");
    const res = await sendToExtension({ requestType: "HELLO" });
    setStatus(res.success ? "Hello Test Success" : "Hello Test Failed");
    setResponse(res);
  };

  const handleTestConnection = async () => {
    setStatus("Testing Connection...");
    const res = await sendToExtension({ 
      requestType: "CONNECTION", 
      connectionToken: connectionToken 
    });
    setStatus(res.success ? "Connection Test Success" : "Connection Test Failed");
    setResponse(res);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-6 bg-[#0a0c10] font-sans">
      <main className="w-full max-w-lg p-8 bg-[#12161d] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-[#232a35] relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-48 h-48 bg-blue-500/5 rounded-full blur-[80px] pointer-events-none"></div>

        <div className="flex items-center justify-between mb-8 relative z-10">
          <Link href="/bmlconnect" className="text-[#484f58] hover:text-white transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
            <span>←</span> Dashboard
          </Link>
          <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[9px] font-black text-blue-400 uppercase tracking-widest">
            Setup Module
          </div>
        </div>

        <h1 className="text-2xl font-black text-white tracking-tighter mb-2 relative z-10">Connection <span className="text-blue-500">Setup</span></h1>
        <p className="text-[#8b949e] text-xs mb-8 relative z-10">Establish a secure tunnel between this web app and the BML extension.</p>
        
        <div className="space-y-8 relative z-10">
          <section>
            <div className="flex justify-between items-end mb-3">
              <h2 className="text-[#484f58] text-[10px] font-black uppercase tracking-[0.2em]">Connection Token</h2>
              <button
                onClick={handleRegenerateToken}
                className="text-[10px] text-red-500/60 hover:text-red-500 font-bold uppercase tracking-wider transition-colors"
              >
                Regenerate
              </button>
            </div>
            <div className="flex gap-2 p-1.5 bg-[#0a0c10] rounded-xl border border-[#232a35] focus-within:border-blue-500/50 transition-colors">
              <input 
                type="text" 
                readOnly
                value={connectionToken} 
                className="flex-1 px-4 py-3 bg-transparent text-[#adbac7] font-mono text-sm focus:outline-none cursor-default"
              />
              <button
                className="bg-blue-600 hover:bg-blue-500 text-white font-black px-6 py-3 rounded-[10px] transition-all text-xs uppercase tracking-widest"
                onClick={() => {
                  navigator.clipboard.writeText(connectionToken);
                  setStatus("Copied to clipboard");
                }}
              >
                Copy
              </button>
            </div>
          </section>

          <section className="bg-yellow-500/5 border border-yellow-500/10 p-6 rounded-2xl">
            <h4 className="text-[10px] font-black text-yellow-500/80 uppercase tracking-[0.2em] mb-4">Implementation Steps</h4>
            <ol className="text-[#8b949e] text-xs space-y-3 leading-relaxed">
              <li className="flex gap-3"><span className="text-yellow-500/40 font-black">01</span> Copy the connection token above.</li>
              <li className="flex gap-3"><span className="text-yellow-500/40 font-black">02</span> Open the BML Connect extension popup.</li>
              <li className="flex gap-3"><span className="text-yellow-500/40 font-black">03</span> Access "Manage Connections" on the dashboard.</li>
              <li className="flex gap-3"><span className="text-yellow-500/40 font-black">04</span> Add a new entry and paste your token.</li>
            </ol>
          </section>

          <div className="pt-4 border-t border-[#232a35]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[#484f58] text-[10px] font-black uppercase tracking-[0.2em]">Diagnostic Tools</h3>
              <span className={`text-[9px] font-bold uppercase tracking-widest transition-colors ${status.includes('Failed') ? 'text-red-400' : 'text-blue-400'}`}>{status}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleTestHello}
                className="bg-[#1c2128] hover:bg-[#22272e] text-[#adbac7] font-bold py-3.5 px-4 rounded-xl transition-all border border-[#2d333b] text-xs uppercase tracking-widest"
              >
                Test Hello
              </button>
              <button
                onClick={handleTestConnection}
                className="bg-[#1c2128] hover:bg-[#22272e] text-[#adbac7] font-bold py-3.5 px-4 rounded-xl transition-all border border-[#2d333b] text-xs uppercase tracking-widest"
              >
                Test Conn
              </button>
            </div>
          </div>

          {response && (
            <section className="animate-in fade-in slide-in-from-top-2 duration-300">
              <h2 className="text-[#484f58] text-[10px] font-black uppercase tracking-[0.2em] mb-2">Protocol Logs</h2>
              <pre className="p-4 bg-[#0a0c10] border border-[#232a35] text-blue-400/80 rounded-xl text-[10px] font-mono overflow-auto max-h-40 scrollbar-hide">
                {JSON.stringify(response, null, 2)}
              </pre>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
