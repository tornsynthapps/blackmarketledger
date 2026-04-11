"use client";

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    ConstructionIcon,
    Settings01Icon,
    EyeIcon,
    ViewIcon,
    ArrowLeft01Icon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { UnderConstructionPage } from "@/components/UnderConstructionPage";

const underConstruction = true;

function SampleIncompletePage() {
    return (
        <div className="min-h-screen bg-background text-foreground p-6 md:p-12">
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="space-y-4">
                    <h1 className="text-4xl font-black tracking-tight">Sample Page</h1>
                    <p className="text-foreground/60">
                        This is the incomplete page content that would be shown in development mode.
                    </p>
                </div>

                <div className="grid gap-4">
                    <div className="p-6 rounded-2xl bg-panel border border-border space-y-4">
                        <div className="h-4 bg-foreground/10 rounded w-3/4" />
                        <div className="h-4 bg-foreground/10 rounded w-1/2" />
                        <div className="h-4 bg-foreground/10 rounded w-5/6" />
                        <div className="h-4 bg-foreground/10 rounded w-1/3" />
                    </div>

                    <div className="p-6 rounded-2xl bg-panel border border-border space-y-4">
                        <div className="h-4 bg-foreground/10 rounded w-full" />
                        <div className="h-4 bg-foreground/10 rounded w-2/3" />
                        <div className="h-4 bg-foreground/10 rounded w-1/4" />
                    </div>

                    <button className="w-full py-4 rounded-2xl bg-primary/50 text-foreground/30 cursor-not-allowed">
                        Save Changes (Disabled)
                    </button>
                </div>

                <p className="text-sm text-foreground/40">
                    This is the incomplete page that should be hidden in production.
                </p>
            </div>
        </div>
    );
}

export default function UnderConstructionDebugPage() {
    const [isProduction, setIsProduction] = useState(false);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        setIsProduction(process.env.NEXT_PUBLIC_PRODUCTION_MODE === "true");
    }, []);

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="max-w-2xl mx-auto space-y-8 p-6 md:p-12">
                <div className="space-y-4">
                    <Link
                        href="/treasurechest"
                        className="inline-flex items-center gap-2 text-sm text-foreground/50 hover:text-primary transition-colors group"
                    >
                        <HugeiconsIcon
                            icon={ArrowLeft01Icon}
                            size={16}
                            className="group-hover:-translate-x-1 transition-transform"
                        />
                        Back to Treasure Chest
                    </Link>

                    <h1 className="text-3xl font-black tracking-tight">Under Construction Debug</h1>
                    <p className="text-foreground/60">Test the Under Construction page behavior.</p>
                </div>

                <div className="grid gap-6">
                    <div className="p-6 rounded-2xl bg-panel border border-border space-y-4">
                        <div className="flex items-center gap-3">
                            <HugeiconsIcon
                                icon={Settings01Icon}
                                size={20}
                                className="text-primary"
                            />
                            <h2 className="text-lg font-bold">Environment Status</h2>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between py-2 px-4 bg-background rounded-lg">
                                <span className="text-sm text-foreground/60">
                                    NEXT_PUBLIC_PRODUCTION_MODE
                                </span>
                                <span
                                    className={`text-sm font-bold px-3 py-1 rounded-full ${
                                        isProduction
                                            ? "bg-red-500/20 text-red-400"
                                            : "bg-green-500/20 text-green-400"
                                    }`}
                                >
                                    {isProduction ? "true" : "false"}
                                </span>
                            </div>

                            <div className="flex items-center justify-between py-2 px-4 bg-background rounded-lg">
                                <span className="text-sm text-foreground/60">
                                    Page underConstruction flag
                                </span>
                                <span className="text-sm font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-400">
                                    {String(underConstruction)}
                                </span>
                            </div>

                            <div className="flex items-center justify-between py-2 px-4 bg-background rounded-lg">
                                <span className="text-sm text-foreground/60">
                                    Should show Under Construction
                                </span>
                                <span
                                    className={`text-sm font-bold px-3 py-1 rounded-full ${
                                        isProduction && underConstruction
                                            ? "bg-red-500/20 text-red-400"
                                            : "bg-green-500/20 text-green-400"
                                    }`}
                                >
                                    {isProduction && underConstruction ? "Yes" : "No"}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-panel border border-border space-y-4">
                        <div className="flex items-center gap-3">
                            <HugeiconsIcon
                                icon={ConstructionIcon}
                                size={20}
                                className="text-amber-500"
                            />
                            <h2 className="text-lg font-bold">Preview</h2>
                        </div>

                        <div className="space-y-4">
                            {isClient && isProduction && underConstruction ? (
                                <div className="rounded-2xl overflow-hidden border border-amber-500/30">
                                    <div className="bg-amber-500/10 px-4 py-2 border-b border-amber-500/30 flex items-center gap-2">
                                        <HugeiconsIcon
                                            icon={EyeIcon}
                                            size={16}
                                            className="text-amber-500"
                                        />
                                        <span className="text-sm font-bold text-amber-500">
                                            Production View (Under Construction)
                                        </span>
                                    </div>
                                    <UnderConstructionPage />
                                </div>
                            ) : (
                                <div className="rounded-2xl overflow-hidden border border-border/50">
                                    <div className="bg-panel px-4 py-2 border-b border-border/50 flex items-center gap-2">
                                        <HugeiconsIcon
                                            icon={ViewIcon}
                                            size={16}
                                            className="text-foreground/40"
                                        />
                                        <span className="text-sm font-bold text-foreground/40">
                                            Development View (Incomplete Page)
                                        </span>
                                    </div>
                                    <SampleIncompletePage />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-panel border border-border">
                        <h3 className="text-sm font-bold text-foreground/40 uppercase tracking-widest mb-4">
                            How to use
                        </h3>
                        <ol className="space-y-2 text-sm text-foreground/60">
                            <li className="flex gap-3">
                                <span className="font-mono text-primary">1.</span>
                                <span>
                                    Set{" "}
                                    <code className="px-1.5 py-0.5 bg-background rounded text-amber-400">
                                        NEXT_PUBLIC_PRODUCTION_MODE=true
                                    </code>{" "}
                                    in production environment
                                </span>
                            </li>
                            <li className="flex gap-3">
                                <span className="font-mono text-primary">2.</span>
                                <span>
                                    Export{" "}
                                    <code className="px-1.5 py-0.5 bg-background rounded text-amber-400">
                                        const underConstruction = true
                                    </code>{" "}
                                    in your page
                                </span>
                            </li>
                            <li className="flex gap-3">
                                <span className="font-mono text-primary">3.</span>
                                <span>
                                    The UnderConstructionPage will show automatically in production
                                    when both are true
                                </span>
                            </li>
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    );
}
