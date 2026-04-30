"use client";

import { useSettings } from "@/lib/old/useSettings";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Settings01Icon,
    AiViewIcon,
    PaintBoardIcon,
} from "@hugeicons/core-free-icons";
import { useHapticFeedback } from "@/lib/old/useHapticFeedback";

export default function SettingsPage() {
    const { settings, updateSetting, isLoaded } = useSettings();
    const { vibrate } = useHapticFeedback();

    if (!isLoaded) {
        return (
            <div className="text-center py-20 animate-pulse text-foreground/50 font-mono">
                LOADING_SETTINGS...
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
            {/* Header */}
            <div className="bg-panel border-2 border-primary p-4 relative overflow-hidden flex items-center justify-between">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 -mr-12 -mt-12 rotate-45 pointer-events-none" />
                <div className="flex items-center gap-4">
                    <HugeiconsIcon icon={Settings01Icon} size={24} className="text-primary" />
                    <div>
                        <h1 className="text-xl font-black uppercase tracking-tighter leading-none">Settings</h1>
                        <p className="font-mono text-[9px] text-muted uppercase tracking-widest mt-1">System Configuration</p>
                    </div>
                </div>
            </div>

            {/* UI/UX Group */}
            <div className="space-y-3">
                <div className="flex items-center gap-3 px-1">
                    <HugeiconsIcon icon={PaintBoardIcon} size={16} className="text-primary" />
                    <h3 className="text-lg font-vt323 tracking-widest text-primary uppercase">
                        UI/UX
                    </h3>
                    <div className="h-px flex-1 bg-border-strong" />
                </div>

                <div className="grid grid-cols-1 gap-px bg-border border border-border overflow-hidden">
                    {/* Graph Type */}
                    <div className="bg-panel p-4 flex items-center justify-between group hover:bg-panel-elevated transition-colors border-b border-border">
                        <div className="space-y-0.5">
                            <h4 className="font-bold text-sm uppercase tracking-tight">Graph Type</h4>
                            <p className="text-[10px] text-muted max-w-sm italic opacity-80">Toggle between stepped "boxy" and smooth "curved" charts.</p>
                        </div>
                        
                        <div className="relative w-48">
                            <select
                                value={String(settings.boxyGraph)}
                                onChange={(e) => {
                                    vibrate("utility");
                                    updateSetting("boxyGraph", e.target.value === "true");
                                }}
                                className="w-full appearance-none bg-muted/20 border-2 border-border-strong px-4 py-1.5 pr-10 text-[10px] font-black uppercase tracking-widest text-foreground focus:border-primary outline-none cursor-pointer transition-all"
                            >
                                <option value="true" className="bg-panel text-foreground">Boxy (Stepped)</option>
                                <option value="false" className="bg-panel text-foreground">Curved (Smooth)</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* App Theme */}
                    <div className="bg-panel p-4 flex items-center justify-between group hover:bg-panel-elevated transition-colors border-b border-border">
                        <div className="space-y-0.5">
                            <h4 className="font-bold text-sm uppercase tracking-tight">App Theme</h4>
                            <p className="text-[10px] text-muted max-w-sm italic opacity-80">Select between Classic industrial or Playful visual style.</p>
                        </div>
                        
                        <div className="relative w-48">
                            <select
                                value={settings.themeStyle}
                                onChange={(e) => {
                                    vibrate("utility");
                                    updateSetting("themeStyle", e.target.value as any);
                                }}
                                className="w-full appearance-none bg-muted/20 border-2 border-border-strong px-4 py-1.5 pr-10 text-[10px] font-black uppercase tracking-widest text-foreground focus:border-primary outline-none cursor-pointer transition-all"
                            >
                                <option value="classic" className="bg-panel text-foreground">Classic (Industrial)</option>
                                <option value="playful" className="bg-panel text-foreground">Playful (Experimental)</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Background Style */}
                    <div className="bg-panel p-4 flex items-center justify-between group hover:bg-panel-elevated transition-colors border-b border-border">
                        <div className="space-y-0.5">
                            <h4 className="font-bold text-sm uppercase tracking-tight">Background Style</h4>
                            <p className="text-[10px] text-muted max-w-sm italic opacity-80">Choose between the classic industrial Dots or technical Gridlines.</p>
                        </div>
                        
                        <div className="relative w-48">
                            <select
                                value={settings.backgroundStyle}
                                onChange={(e) => {
                                    vibrate("utility");
                                    updateSetting("backgroundStyle", e.target.value as any);
                                }}
                                className="w-full appearance-none bg-muted/20 border-2 border-border-strong px-4 py-1.5 pr-10 text-[10px] font-black uppercase tracking-widest text-foreground focus:border-primary outline-none cursor-pointer transition-all"
                            >
                                {[
                                    { label: "Dots", value: "dots" },
                                    { label: "Grid", value: "grid" },
                                    { label: "Crosses", value: "crosses", experimental: true },
                                    { label: "Scanlines", value: "scanlines", experimental: true },
                                    { label: "Diagonal", value: "diagonal", experimental: true },
                                    { label: "Solid", value: "solid", experimental: true },
                                    { label: "Blueprint", value: "blueprint", experimental: true },
                                    { label: "Noise", value: "noise", experimental: true },
                                    { label: "Big Grid", value: "big-grid", experimental: true },
                                ].map((opt) => (
                                    <option key={opt.value} value={opt.value} className="bg-panel text-foreground">
                                        {opt.label}{opt.experimental ? " (EXPERIMENTAL)" : ""}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Monospace Font */}
                    <div className="bg-panel p-4 flex items-center justify-between group hover:bg-panel-elevated transition-colors">
                        <div className="space-y-0.5">
                            <h4 className="font-bold text-sm uppercase tracking-tight">Monospace Font</h4>
                            <p className="text-[10px] text-muted max-w-sm italic opacity-80">Choose your preferred font for data and code views.</p>
                        </div>
                        
                        <div className="relative w-48">
                            <select
                                value={settings.monospaceFont}
                                onChange={(e) => {
                                    vibrate("utility");
                                    updateSetting("monospaceFont", e.target.value as any);
                                }}
                                className="w-full appearance-none bg-muted/20 border-2 border-border-strong px-4 py-1.5 pr-10 text-[10px] font-black uppercase tracking-widest text-foreground focus:border-primary outline-none cursor-pointer transition-all"
                            >
                                <option value="space" className="bg-panel text-foreground">Space Mono</option>
                                <option value="cascadia" className="bg-panel text-foreground">Cascadia Code</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer / Info */}
            <div className="pt-6 mt-8">
                <div className="bg-muted/10 p-3 border border-border flex items-start gap-3">
                    <HugeiconsIcon icon={AiViewIcon} size={14} className="text-muted/60 mt-0.5" />
                    <p className="text-[9px] font-mono text-muted uppercase leading-relaxed tracking-wide">
                        Configuration synced to <span className="text-primary opacity-80">Local Storage</span> • Persistence active
                    </p>
                </div>
            </div>
        </div>
    );
}
