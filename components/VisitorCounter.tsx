"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserIcon, UserGroupIcon } from "@hugeicons/core-free-icons";

export function VisitorCounter() {
    const [stats, setStats] = useState<{ todayViews: number; totalViews: number } | null>(null);

    useEffect(() => {
        fetch(
            "https://script.google.com/macros/s/AKfycbxF9XJdE1ff3FYcTGMTK99Ue7j_Y-jabrQiO-WFM7U1mMEQUpIGaVbnaQsHEpp11h04gQ/exec?app=BlackMarket%20Ledger"
        )
            .then((res) => res.json())
            .then((data) => {
                if (data && data.success) {
                    setStats({
                        todayViews: data.todayViews,
                        totalViews: data.totalViews,
                    });
                }
            })
            .catch((err) => console.error("Failed to fetch visitor stats:", err));
    }, []);

    if (!stats)
        return <div className="h-4 w-32 animate-pulse bg-foreground/5 border border-border"></div>;

    return (
        <div className="flex items-center gap-4 text-[10px] font-black uppercase bg-muted/20 py-1.5 px-4 border border-border border-l-4 border-l-primary font-mono tracking-widest">
            <div className="flex items-center gap-2" title="Visitors Today">
                <HugeiconsIcon icon={UserIcon} size={14} className="text-primary" />
                <span>{stats.todayViews.toLocaleString()} ACTIVE_NODES</span>
            </div>
            <div className="w-px h-3 bg-border"></div>
            <div className="flex items-center gap-2" title="Total Visitors">
                <HugeiconsIcon icon={UserGroupIcon} size={14} className="text-primary" />
                <span>{stats.totalViews.toLocaleString()} TOTAL_THROUGHPUT</span>
            </div>
        </div>
    );
}
