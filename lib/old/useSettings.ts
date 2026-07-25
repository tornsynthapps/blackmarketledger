"use client";

import { useState, useEffect } from "react";

export type FontThemeOption = "pixel" | "modern";

export interface LedgerSettings {
    boxyGraph: boolean;
    themeStyle: "classic" | "playful" | "modern";
    fontTheme: FontThemeOption;
    backgroundStyle: "dots" | "grid" | "crosses" | "scanlines" | "diagonal" | "solid" | "blueprint" | "noise" | "big-grid";
    compactTable: boolean;
    showVerticalLines: boolean;
    alternatingRowColors: boolean;
}

const STORAGE_KEY = "ledger-settings";

const DEFAULT_SETTINGS: LedgerSettings = {
    boxyGraph: false,
    themeStyle: "classic",
    fontTheme: "pixel",
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
                // Backward-compatibility migration if fontTheme isn't set yet
                if (!parsed.fontTheme && parsed.themeStyle === "modern") {
                    parsed.fontTheme = "modern";
                }
                setSettings({ ...DEFAULT_SETTINGS, ...parsed });
            } catch (e) {
                console.error("Failed to parse ledger-settings", e);
            }
        }
        setIsLoaded(true);
    }, []);

    const updateSetting = <K extends keyof LedgerSettings>(key: K, value: LedgerSettings[K]) => {
        setSettings((prev) => {
            const next = { ...prev, [key]: value };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            window.dispatchEvent(new CustomEvent("ledger-settings-updated", { detail: next }));
            return next;
        });
    };

    const updateSettings = (partial: Partial<LedgerSettings>) => {
        setSettings((prev) => {
            const next = { ...prev, ...partial };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            window.dispatchEvent(new CustomEvent("ledger-settings-updated", { detail: next }));
            return next;
        });
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

    // Apply global classes & font variables
    useEffect(() => {
        if (!isLoaded) return;
        const isModern = settings.fontTheme === "modern";
        document.documentElement.classList.toggle("theme-playful", settings.themeStyle === "playful");
        document.documentElement.classList.toggle("theme-modern", isModern);

        // Set CSS Variables for 4-font system based on selected Font Theme
        document.documentElement.style.setProperty("--font-brand", "\"Departure Mono\", monospace");
        if (isModern) {
            document.documentElement.style.setProperty("--font-heading", "var(--font-geist-pixel), monospace");
            document.documentElement.style.setProperty("--font-sans", "var(--font-geist-sans), sans-serif");
            document.documentElement.style.setProperty("--font-mono", "var(--font-geist-mono), monospace");
        } else {
            document.documentElement.style.setProperty("--font-heading", "\"Departure Mono\", monospace");
            document.documentElement.style.setProperty("--font-sans", "\"Departure Mono\", sans-serif");
            document.documentElement.style.setProperty("--font-mono", "\"Departure Mono\", monospace");
        }

        // Background Style
        const bgClasses = ["bg-grid", "bg-crosses", "bg-scanlines", "bg-diagonal", "bg-solid", "bg-blueprint", "bg-noise", "bg-big-grid"];
        bgClasses.forEach((cls) => document.documentElement.classList.remove(cls));
        if (settings.backgroundStyle !== "dots") {
            document.documentElement.classList.add(`bg-${settings.backgroundStyle}`);
        }
    }, [settings.themeStyle, settings.fontTheme, settings.backgroundStyle, isLoaded]);

    return { settings, updateSetting, updateSettings, isLoaded };
}
