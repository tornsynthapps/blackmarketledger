"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon, ConstructionIcon, ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";

interface UnderConstructionPageProps {
    message?: string;
    title?: string;
}

export function UnderConstructionPage({
    message = "This page is currently under construction.",
    title = "Under Construction",
}: UnderConstructionPageProps) {
    return (
        <div className="min-h-screen bg-background text-foreground p-6 md:p-12 flex items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="max-w-lg w-full text-center space-y-8">
                <div className="relative">
                    <div className="absolute inset-0 bg-amber-500/20 blur-[100px] rounded-full" />
                    <div className="relative p-6 rounded-full bg-amber-500/10 border border-amber-500/30 w-fit mx-auto">
                        <HugeiconsIcon
                            icon={ConstructionIcon}
                            size={48}
                            className="text-amber-500"
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-center gap-2 text-amber-500">
                        <HugeiconsIcon icon={Alert02Icon} size={20} />
                        <span className="text-xs font-bold uppercase tracking-widest">
                            Work in Progress
                        </span>
                    </div>

                    <h1 className="text-4xl font-black tracking-tight">{title}</h1>

                    <p className="text-foreground/60 leading-relaxed">{message}</p>
                </div>

                <div className="pt-8">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm text-foreground/40 hover:text-foreground transition-colors"
                    >
                        <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
                        Back to Home
                    </Link>
                </div>

                <div className="pt-12 border-t border-border">
                    <p className="text-[10px] text-center text-foreground/20 font-bold uppercase tracking-[0.4em]">
                        Torn Ledger
                    </p>
                </div>
            </div>
        </div>
    );
}
