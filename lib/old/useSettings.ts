"use client";

import { useState, useEffect } from "react";

export interface LedgerSettings {
    boxyGraph: boolean;
    themeStyle: "classic" | "playful";
    monospaceFont: "space" | "cascadia";
}

const STORAGE_KEY = "ledger-settings";

const DEFAULT_SETTINGS: LedgerSettings = {
    boxyGraph: true,
    themeStyle: "classic",
    monospaceFont: "space",
};

export function useSettings() {
    const [settings, setSettings] = useState<LedgerSettings>(DEFAULT_SETTINGS);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setSettings({ ...DEFAULT_SETTINGS, ...parsed });
            } catch (e) {
                console.error("Failed to parse ledger-settings", e);
            }
        }
        setIsLoaded(true);
    }, []);

    const updateSetting = <K extends keyof LedgerSettings>(key: K, value: LedgerSettings[K]) => {
        const next = { ...settings, [key]: value };
        setSettings(next);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent("ledger-settings-updated", { detail: next }));
    };

    // Listen for updates from other tabs/components
    useEffect(() => {
        const handler = (e: any) => {
            if (e.detail) {
                setSettings(e.detail);
            }
        };
        window.addEventListener("ledger-settings-updated", handler);
        return () => window.removeEventListener("ledger-settings-updated", handler);
    }, []);

    // Apply global classes
    useEffect(() => {
        if (!isLoaded) return;
        document.documentElement.classList.toggle("theme-playful", settings.themeStyle === "playful");
        document.documentElement.classList.toggle("font-cascadia", settings.monospaceFont === "cascadia");
    }, [settings.themeStyle, settings.monospaceFont, isLoaded]);

    return { settings, updateSetting, isLoaded };
}
