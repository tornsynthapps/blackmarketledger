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
        return <div className="h-4 w-24 animate-pulse bg-foreground/5 border border-border"></div>;

    return (
        <div className="flex items-center gap-2 text-xs font-black uppercase bg-muted/20 py-0.5 px-2 border border-border border-l-2 border-l-primary font-departure tracking-wider">
            <div className="flex items-center gap-1" title="Visitors Today">
                <HugeiconsIcon icon={UserIcon} size={10} className="text-primary" />
                <span>{stats.todayViews.toLocaleString()} TODAY</span>
            </div>
            <div className="w-px h-2 bg-border"></div>
            <div className="flex items-center gap-1" title="Total Visitors">
                <HugeiconsIcon icon={UserGroupIcon} size={10} className="text-primary" />
                <span>{stats.totalViews.toLocaleString()} TOTAL</span>
            </div>
        </div>
    );
}
