"use client";

import { useState, useEffect } from "react";
import { getConnectionString, sendToExtension } from "@/lib/bmlconnect";
import Link from "next/link";

export default function BMLDashboard() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkConnection = async () => {
      const token = getConnectionString();
      const res = await sendToExtension({ 
        requestType: "CONNECTION", 
        connectionToken: token 
      });
      
      if (res.success) {
        setIsConnected(true);
        const userRes = await sendToExtension({ requestType: "GET_USER_INFO" });
        console.log("BML_DEBUG: user info response", userRes);
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

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center bg-[#0a0c10] text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-500 text-sm font-medium">Authorizing tunnel...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center bg-[#0a0c10] font-sans">
      <main className="w-full max-w-3xl p-6 bg-[#12161d] rounded-2xl shadow-2xl border border-[#232a35] relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center justify-between mb-6 relative z-10">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tighter">BML <span className="text-blue-500">CONN</span></h1>
            <p className="text-[#484f58] text-[9px] font-black uppercase tracking-[0.2em]">Secure Extension Tunnel v1.4</p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${isConnected ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
            {isConnected ? 'Sync Online' : 'Sync Offline'}
          </div>
        </div>
        
        <div className="relative z-10">
        {!isConnected ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 text-red-500 mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Tunnel Connection Failed</h2>
            <p className="text-[#8b949e] text-xs mb-6 max-w-sm mx-auto">
              We couldn't reach the BML extension. Ensure it's installed and the connection token is properly configured.
            </p>
            <div className="flex gap-3 justify-center">
              <Link href="/bmlconnect/connect" className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-lg transition-all text-xs">Setup Connection</Link>
              <button onClick={() => window.location.reload()} className="bg-[#1c2128] text-[#adbac7] font-bold py-2.5 px-6 rounded-lg border border-[#2d333b] text-xs transition-colors hover:bg-[#22272e]">Retry</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Minimal Profile Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 bg-[#1c2128]/50 border border-[#2d333b] rounded-xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 font-black">
                  {userInfo?.username?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-[#484f58] text-[9px] font-black uppercase tracking-tight">Operator</p>
                  <h3 className="text-white text-sm font-bold truncate max-w-[120px]">{userInfo?.username || 'Unknown'}</h3>
                </div>
              </div>
              
              <div className="p-4 bg-[#1c2128]/50 border border-[#2d333b] rounded-xl">
                <p className="text-[#484f58] text-[9px] font-black uppercase tracking-tight mb-1">Status</p>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${userInfo?.subscriptionValid ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'bg-[#2d333b] text-[#8b949e]'}`}>
                    {userInfo?.subscriptionValid ? 'PRO SUBSCRIBER' : 'FREE USER'}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-[#1c2128]/50 border border-[#2d333b] rounded-xl">
                <p className="text-[#484f58] text-[9px] font-black uppercase tracking-tight">Valid Until</p>
                <h3 className="text-[#adbac7] text-sm font-bold">
                  {userInfo?.validUntil ? new Date(userInfo.validUntil).toLocaleDateString() : 'Lifetime'}
                </h3>
              </div>
            </div>

            {/* Compact Action Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link href="/bmlconnect/connect" className="p-4 bg-[#1c2128] border border-[#2d333b] rounded-xl hover:border-blue-500/40 transition-all flex flex-col items-center text-center group">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
                </div>
                <span className="text-white font-bold text-[10px] uppercase tracking-tighter">Connection</span>
              </Link>
              <div className="p-4 bg-[#1c2128] border border-[#2d333b] rounded-xl hover:border-purple-500/40 transition-all flex flex-col items-center text-center group cursor-pointer opacity-50">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <span className="text-white font-bold text-[10px] uppercase tracking-tighter">Sync Logs</span>
              </div>
              <div className="p-4 bg-[#1c2128] border border-[#2d333b] rounded-xl hover:border-green-500/40 transition-all flex flex-col items-center text-center group cursor-pointer opacity-50">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                </div>
                <span className="text-white font-bold text-[10px] uppercase tracking-tighter">Export Data</span>
              </div>
              <div className="p-4 bg-[#1c2128] border border-[#2d333b] rounded-xl hover:border-red-500/40 transition-all flex flex-col items-center text-center group cursor-pointer opacity-50">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </div>
                <span className="text-white font-bold text-[10px] uppercase tracking-tighter">Purge Cache</span>
              </div>
            </div>
          </div>
        )}
        </div>

        <div className="mt-8 pt-4 border-t border-[#232a35] flex justify-center items-center relative z-10">
          <p className="text-[#484f58] text-[8px] font-black uppercase tracking-[0.3em]">Encrypted Session • Node.JS v20</p>
        </div>
      </main>
    </div>
  );
}
