"use client";

import { useEffect, useState } from "react";
import { Check, ChevronLeft, Crown, HardDrive, KeyRound, Save, X } from "lucide-react";
import { useJournal } from "@/store/useJournal";
import { sendToExtension } from "@/lib/bmlconnect";
import { useHapticFeedback } from "@/lib/useHapticFeedback";

type ServiceItem = {
  name: string;
  active: boolean;
  detail: string;
};

export function ServiceRail() {
  const {
    weav3rApiKey,
    weav3rUserId,
    driveApiKey,
    saveWeaverConfig,
    saveDriveApiKey,
  } = useJournal();
  const { vibrate } = useHapticFeedback();
  const [isOpen, setIsOpen] = useState(false);
  const [driveConnected, setDriveConnected] = useState(false);
  const [isWhaleSubscriber, setIsWhaleSubscriber] = useState(false);
  const [tempWeav3rApiKey, setTempWeav3rApiKey] = useState(weav3rApiKey);
  const [isSavingWeav3rKey, setIsSavingWeav3rKey] = useState(false);
  const [weav3rError, setWeav3rError] = useState("");

  useEffect(() => {
    setTempWeav3rApiKey(weav3rApiKey);
  }, [weav3rApiKey]);

  useEffect(() => {
    let cancelled = false;

    const loadServiceState = async () => {
      const helloRes = await sendToExtension({ type: "HELLO" });
      if (!helloRes.success || cancelled) return;

      const [userRes, driveRes] = await Promise.all([
        sendToExtension<{ subscriptionValid?: boolean }>({ type: "GET_USER_INFO" }),
        sendToExtension<{ connected?: boolean }>({ type: "DRIVE_STATUS" }),
      ]);

      if (cancelled) return;

      setIsWhaleSubscriber(Boolean(userRes.success && userRes.data?.subscriptionValid));
      setDriveConnected(Boolean(driveRes.success && driveRes.data?.connected));
    };

    void loadServiceState();

    return () => {
      cancelled = true;
    };
  }, []);

  const services: ServiceItem[] = [
    {
      name: "Sales fetch using weav3r",
      active: Boolean(weav3rApiKey && weav3rUserId),
      detail: weav3rApiKey && weav3rUserId ? "Ready" : "Needs Torn API key.",
    },
    {
      name: "Google Drive Sync",
      active: driveConnected,
      detail: driveConnected ? "Connected" : "Connect in BML Connect.",
    },
    {
      name: "Cost-basis on torn bazaar",
      active: isWhaleSubscriber,
      detail: isWhaleSubscriber ? "Unlocked" : "Whale subscription required.",
    },
  ];

  const handleSaveWeav3rKey = async () => {
    vibrate("utility");
    setIsSavingWeav3rKey(true);
    setWeav3rError("");

    try {
      await saveWeaverConfig(tempWeav3rApiKey);
    } catch (error) {
      setWeav3rError(error instanceof Error ? error.message : "Failed to save Weav3r API key.");
    } finally {
      setIsSavingWeav3rKey(false);
    }
  };

  return (
    <aside
      className={`fixed right-0 top-0 z-[80] h-screen w-[min(88vw,360px)] transition-transform duration-300 ease-out lg:w-[min(34vw,360px)] ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="relative h-full rounded-l-2xl border border-border bg-panel/96 shadow-2xl backdrop-blur-xl">
        <button
          type="button"
          aria-label={isOpen ? "Hide active services" : "Show active services"}
          onClick={() => {
            vibrate("utility");
            setIsOpen((current) => !current);
          }}
          className="absolute left-0 top-1/2 flex h-14 w-11 -translate-x-full -translate-y-1/2 items-center justify-center rounded-l-2xl border border-r-0 border-border bg-panel text-foreground/70 shadow-lg transition-colors hover:bg-foreground/5 hover:text-primary"
        >
          <ChevronLeft className={`h-5 w-5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        <div className="flex h-full min-h-0 flex-col">
          <div className="border-b border-border px-4 pb-4 pt-20">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary/70">Active Services</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight">Service Access</h2>
            <p className="mt-1 text-xs text-foreground/60">
              Shared across the app for faster status checks.
            </p>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
            <div className="grid gap-3">
              <label className="block">
                <span className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-foreground/60">
                  <KeyRound className="h-3.5 w-3.5 text-primary" />
                  Weav3r API Key
                </span>
                <input
                  type="password"
                  value={tempWeav3rApiKey}
                  onChange={(event) => setTempWeav3rApiKey(event.target.value)}
                  placeholder="Torn API key used with weav3r"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary/50"
                />
                <p className="mt-1.5 text-[11px] text-amber-700 dark:text-amber-300">
                  Save the Torn API key and the app will resolve your user ID automatically.
                </p>
                {weav3rError && <p className="mt-1.5 text-[11px] text-danger">{weav3rError}</p>}
                <button
                  type="button"
                  onClick={() => void handleSaveWeav3rKey()}
                  disabled={isSavingWeav3rKey}
                  className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-3.5 w-3.5" />
                  {isSavingWeav3rKey ? "Saving..." : "Save Weav3r Key"}
                </button>
              </label>

              <label className="block">
                <span className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-foreground/60">
                  <HardDrive className="h-3.5 w-3.5 text-primary" />
                  Drive API Key
                </span>
                <input
                  type="password"
                  value={driveApiKey}
                  onChange={(event) => {
                    const value = event.target.value;
                    saveDriveApiKey(value);
                  }}
                  placeholder="Drive API key"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary/50"
                />
                <p className="mt-1.5 text-[11px] text-danger">
                  Keep this key private. Anyone with it can access your synced data.
                </p>
              </label>
            </div>

            <div className="rounded-2xl border border-border bg-background/65 p-3">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold">
                <Crown className="h-4 w-4 text-primary" />
                Service Status
              </div>
              <ul className="space-y-2">
                {services.map((service) => (
                  <li
                    key={service.name}
                    className="flex items-start gap-3 rounded-xl border border-border bg-panel px-3 py-2.5"
                  >
                    <span
                      className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                        service.active ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
                      }`}
                    >
                      {service.active ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-5">{service.name}</p>
                      <p className="text-xs text-foreground/55">{service.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
