"use client";

import { useState, useEffect } from "react";

export interface LedgerSettings {
    boxyGraph: boolean;
    themeStyle: "classic" | "playful" | "modern";
    monospaceFont: "space" | "cascadia";
    backgroundStyle: "dots" | "grid" | "crosses" | "scanlines" | "diagonal" | "solid" | "blueprint" | "noise" | "big-grid";
    compactTable: boolean;
    showVerticalLines: boolean;
    alternatingRowColors: boolean;
}

const STORAGE_KEY = "ledger-settings";

const DEFAULT_SETTINGS: LedgerSettings = {
    boxyGraph: true,
    themeStyle: "classic",
    monospaceFont: "space",
    backgroundStyle: "dots",
    compactTable: false,
    showVerticalLines: false,
    alternatingRowColors: false,
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
        document.documentElement.classList.toggle("theme-modern", settings.themeStyle === "modern");
        document.documentElement.classList.toggle("font-cascadia", settings.monospaceFont === "cascadia");

        // Background Style
        const bgClasses = ["bg-grid", "bg-crosses", "bg-scanlines", "bg-diagonal", "bg-solid", "bg-blueprint", "bg-noise", "bg-big-grid"];
        bgClasses.forEach((cls) => document.documentElement.classList.remove(cls));
        if (settings.backgroundStyle !== "dots") {
            document.documentElement.classList.add(`bg-${settings.backgroundStyle}`);
        }
    }, [settings.themeStyle, settings.monospaceFont, settings.backgroundStyle, isLoaded]);

    return { settings, updateSetting, isLoaded };
}
