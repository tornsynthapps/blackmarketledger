"use client";

import { useState } from "react";
import { useJournal } from "@/store/useJournal";
import { Radar, Calendar, RefreshCw, ArrowLeft, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function ResetCursorPage() {
  const { isLoaded, autoPilotCursor, saveAutoPilotState } = useJournal();
  const [selectedDate, setSelectedDate] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState("");

  if (!isLoaded) return null;

  const handleReset = async () => {
    if (!selectedDate) {
      setMessage("Please select a date first.");
      return;
    }

    setIsUpdating(true);
    setMessage("");

    try {
      const timestamp = Math.floor(new Date(selectedDate).getTime() / 1000);
      
      await saveAutoPilotState({
        autoPilotCursor: {
          lastTimestamp: timestamp,
          lastLogId: ""
        }
      });

      setMessage(`Cursor successfully reset to ${new Date(selectedDate).toLocaleString()}`);
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : "Failed to reset cursor"}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const currentCursorDate = autoPilotCursor 
    ? new Date(autoPilotCursor.lastTimestamp * 1000).toLocaleString() 
    : "Not initialized";

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-12 animate-in fade-in duration-700">
      <div className="max-w-2xl mx-auto space-y-12">
        {/* Header */}
        <div className="space-y-4">
          <Link 
            href="/auto" 
            className="inline-flex items-center gap-2 text-sm text-foreground/50 hover:text-orange-500 transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Auto-Pilot
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20">
              <Radar className="h-8 w-8 text-orange-500 animate-pulse" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter uppercase">Treasure Chest</h1>
              <p className="text-foreground/40 font-medium tracking-widest text-[10px] uppercase">
                Temporal Manipulation Module
              </p>
            </div>
          </div>
        </div>

        {/* Warning Card */}
        <section className="relative overflow-hidden rounded-3xl border border-orange-500/30 bg-orange-500/[0.03] p-8">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <ShieldAlert className="h-24 w-24 text-orange-500" />
          </div>
          <div className="relative z-10 space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-orange-500">
              <ShieldAlert className="h-5 w-5" />
              Administrative Overrides
            </h2>
            <p className="text-sm text-foreground/70 leading-relaxed max-w-lg">
              Resetting the Auto-Pilot cursor will force the system to re-fetch logs starting from the chosen date. 
              If the date is in the past, <span className="text-orange-500 font-bold">duplicates may occur</span> if those logs were already imported.
            </p>
          </div>
        </section>

        {/* Action Area */}
        <div className="grid gap-8">
          <div className="space-y-6">
            <div className="grid gap-2">
              <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 ml-1">
                Current Cursor Status
              </label>
              <div className="p-4 rounded-2xl bg-panel border border-border shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-foreground/30" />
                    <span className="font-mono text-sm">{currentCursorDate}</span>
                  </div>
                  {autoPilotCursor && (
                    <span className="text-[10px] font-bold bg-foreground/5 px-2 py-1 rounded text-foreground/40">
                      ID: {autoPilotCursor.lastLogId || "START"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 ml-1">
                New Target Date
              </label>
              <div className="relative group">
                <input
                  type="datetime-local"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-panel border border-border rounded-2xl px-5 py-4 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/40 transition-all appearance-none"
                />
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity">
                  <Calendar className="h-6 w-6" />
                </div>
              </div>
            </div>

            <button
              onClick={handleReset}
              disabled={isUpdating || !selectedDate}
              className="w-full group relative overflow-hidden rounded-2xl bg-foreground text-background py-5 font-black uppercase tracking-widest text-sm transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none shadow-xl shadow-foreground/10"
            >
              <div className="relative z-10 flex items-center justify-center gap-3">
                {isUpdating ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <RefreshCw className="h-5 w-5 group-hover:rotate-180 transition-transform duration-700" />
                    Recalibrate Temporal Sync
                  </>
                )}
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            {message && (
              <div className={`p-4 rounded-2xl text-center text-sm font-bold animate-in zoom-in-95 duration-300 ${
                message.startsWith("Error") 
                  ? "bg-danger/10 text-danger border border-danger/20" 
                  : "bg-green-500/10 text-green-600 border border-green-500/20"
              }`}>
                {message}
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-12 border-t border-border">
          <p className="text-[10px] text-center text-foreground/20 font-bold uppercase tracking-[0.4em]">
            Internal Utility · Unauthorized Use Discouraged
          </p>
        </div>
      </div>
    </div>
  );
}
