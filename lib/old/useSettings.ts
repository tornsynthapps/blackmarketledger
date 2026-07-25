"use client";

import { useState, useEffect } from "react";

export type HeadingFontOption = "departure" | "geist-pixel" | "space-grotesk" | "sour-gummy" | "cascadia" | "vt323";
export type SansFontOption = "space-grotesk" | "geist-sans" | "departure" | "sour-gummy" | "system";
export type MonoFontOption = "space-mono" | "geist-mono" | "cascadia" | "departure" | "vt323";

export interface LedgerSettings {
    boxyGraph: boolean;
    themeStyle: "classic" | "playful" | "modern";
    monospaceFont: "space" | "cascadia";
    backgroundStyle: "dots" | "grid" | "crosses" | "scanlines" | "diagonal" | "solid" | "blueprint" | "noise" | "big-grid";
    compactTable: boolean;
    showVerticalLines: boolean;
    alternatingRowColors: boolean;
    headingFont: HeadingFontOption;
    sansFont: SansFontOption;
    monoFont: MonoFontOption;
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
    headingFont: "departure",
    sansFont: "space-grotesk",
    monoFont: "space-mono",
};

export function resolveFontValue(type: "heading" | "sans" | "mono", fontKey: string): string {
    if (type === "heading") {
        switch (fontKey) {
            case "geist-pixel": return "var(--font-geist-pixel), monospace";
            case "space-grotesk": return "\"Space Grotesk\", sans-serif";
            case "sour-gummy": return "var(--font-sour-gummy), cursive";
            case "cascadia": return "var(--font-cascadia-code), monospace";
            case "vt323": return "var(--font-vt323), monospace";
            case "departure":
            default: return "\"Departure Mono\", monospace";
        }
    }
    if (type === "sans") {
        switch (fontKey) {
            case "geist-sans": return "var(--font-geist-sans), sans-serif";
            case "departure": return "\"Departure Mono\", sans-serif";
            case "sour-gummy": return "var(--font-sour-gummy), cursive";
            case "system": return "system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif";
            case "space-grotesk":
            default: return "\"Space Grotesk\", var(--font-geist-sans), sans-serif";
        }
    }
    // mono
    switch (fontKey) {
        case "geist-mono": return "var(--font-geist-mono), monospace";
        case "cascadia": return "var(--font-cascadia-code), monospace";
        case "departure": return "\"Departure Mono\", monospace";
        case "vt323": return "var(--font-vt323), monospace";
        case "space-mono":
        default: return "\"Space Mono\", var(--font-geist-mono), monospace";
    }
}

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

    // Apply global classes & font variables
    useEffect(() => {
        if (!isLoaded) return;
        document.documentElement.classList.toggle("theme-playful", settings.themeStyle === "playful");
        document.documentElement.classList.toggle("theme-modern", settings.themeStyle === "modern");
        document.documentElement.classList.toggle("font-cascadia", settings.monospaceFont === "cascadia");

        // Set CSS Variables for 4-font system
        const headingVal = resolveFontValue("heading", settings.headingFont || "departure");
        const sansVal = resolveFontValue("sans", settings.sansFont || "space-grotesk");
        const monoVal = resolveFontValue("mono", settings.monoFont || "space-mono");

        document.documentElement.style.setProperty("--font-heading", headingVal);
        document.documentElement.style.setProperty("--font-sans", sansVal);
        document.documentElement.style.setProperty("--font-mono", monoVal);

        // Background Style
        const bgClasses = ["bg-grid", "bg-crosses", "bg-scanlines", "bg-diagonal", "bg-solid", "bg-blueprint", "bg-noise", "bg-big-grid"];
        bgClasses.forEach((cls) => document.documentElement.classList.remove(cls));
        if (settings.backgroundStyle !== "dots") {
            document.documentElement.classList.add(`bg-${settings.backgroundStyle}`);
        }
    }, [settings.themeStyle, settings.monospaceFont, settings.headingFont, settings.sansFont, settings.monoFont, settings.backgroundStyle, isLoaded]);

    return { settings, updateSetting, isLoaded };
}
