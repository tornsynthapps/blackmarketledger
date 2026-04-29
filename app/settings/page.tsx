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
                        
                        <div className="flex border-2 border-border-strong p-1 bg-muted/20">
                            {[
                                { label: "Boxy", value: true },
                                { label: "Curved", value: false },
                            ].map((opt) => (
                                <button
                                    key={opt.label}
                                    onClick={() => {
                                        vibrate("utility");
                                        updateSetting("boxyGraph", opt.value);
                                    }}
                                    className={`px-4 py-1 text-[10px] font-black uppercase transition-all ${
                                        settings.boxyGraph === opt.value
                                            ? "bg-primary text-primary-foreground"
                                            : "text-muted hover:text-foreground"
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* App Theme */}
                    <div className="bg-panel p-4 flex items-center justify-between group hover:bg-panel-elevated transition-colors border-b border-border">
                        <div className="space-y-0.5">
                            <h4 className="font-bold text-sm uppercase tracking-tight">App Theme</h4>
                            <p className="text-[10px] text-muted max-w-sm italic opacity-80">Select between Classic industrial or Playful visual style.</p>
                        </div>
                        
                        <div className="flex border-2 border-border-strong p-1 bg-muted/20">
                            {(["classic", "playful"] as const).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => {
                                        vibrate("utility");
                                        updateSetting("themeStyle", t);
                                    }}
                                    className={`px-4 py-1 text-[10px] font-black uppercase transition-all flex items-center gap-2 ${
                                        settings.themeStyle === t
                                            ? "bg-primary text-primary-foreground"
                                            : "text-muted hover:text-foreground"
                                    }`}
                                >
                                    <span>{t}</span>
                                    {t === "playful" && (
                                        <span className="text-[7px] bg-warning text-black px-1.5 py-0.5 font-black whitespace-nowrap">
                                            UNDER CONSTRUCTION
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Monospace Font */}
                    <div className="bg-panel p-4 flex items-center justify-between group hover:bg-panel-elevated transition-colors">
                        <div className="space-y-0.5">
                            <h4 className="font-bold text-sm uppercase tracking-tight">Monospace Font</h4>
                            <p className="text-[10px] text-muted max-w-sm italic opacity-80">Choose your preferred font for data and code views.</p>
                        </div>
                        
                        <div className="flex border-2 border-border-strong p-1 bg-muted/20">
                            {[
                                { label: "Space Mono", value: "space" },
                                { label: "Cascadia Code", value: "cascadia" },
                            ].map((opt) => (
                                <button
                                    key={opt.label}
                                    onClick={() => {
                                        vibrate("utility");
                                        updateSetting("monospaceFont", opt.value as any);
                                    }}
                                    className={`px-4 py-1 text-[10px] font-black uppercase transition-all ${
                                        settings.monospaceFont === opt.value
                                            ? "bg-primary text-primary-foreground"
                                            : "text-muted hover:text-foreground"
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
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
