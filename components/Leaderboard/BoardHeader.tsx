"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { HugeiconsProps } from "@hugeicons/react";

interface BoardHeaderProps {
    title: string;
    subtitle: string;
    icon: any;
}

export function BoardHeader({ title, subtitle, icon: Icon }: BoardHeaderProps) {
    return (
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-4 border-primary pb-8">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <div className="bg-primary p-2 text-primary-foreground">
                        <HugeiconsIcon icon={Icon} size={32} />
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter uppercase font-vt323 leading-none">
                        {title}
                    </h1>
                </div>
                <p className="text-muted font-mono text-sm uppercase tracking-widest mt-2 border-l-2 border-muted pl-4">
                    {subtitle}
                </p>
            </div>
            
            <div className="flex flex-col items-end gap-2">
                <span className="text-[10px] font-mono font-bold text-muted uppercase">Engine Status</span>
                <div className="flex items-center gap-2 px-3 py-1 bg-success/10 border border-success">
                    <div className="w-2 h-2 bg-success animate-pulse" />
                    <span className="text-[10px] font-bold text-success uppercase tracking-widest">Systems Active</span>
                </div>
            </div>
        </header>
    );
}
