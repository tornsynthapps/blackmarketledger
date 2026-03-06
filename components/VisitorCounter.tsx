"use client";

import { useEffect, useState } from "react";
import { Users, User } from "lucide-react";

export function VisitorCounter() {
    const [stats, setStats] = useState<{ todayViews: number; totalViews: number } | null>(null);

    useEffect(() => {
        // Fetch stats on mount
        fetch("https://script.google.com/macros/s/AKfycbxF9XJdE1ff3FYcTGMTK99Ue7j_Y-jabrQiO-WFM7U1mMEQUpIGaVbnaQsHEpp11h04gQ/exec?app=BlackMarket%20Ledger")
            .then(res => res.json())
            .then(data => {
                if (data && data.success) {
                    setStats({
                        todayViews: data.todayViews,
                        totalViews: data.totalViews,
                    });
                }
            })
            .catch(err => console.error("Failed to fetch visitor stats:", err));
    }, []);

    // Only render when we have stats
    if (!stats) return <div className="h-4 w-32 animate-pulse bg-foreground/5 rounded"></div>;

    return (
        <div className="flex items-center gap-4 text-xs font-medium bg-foreground/5 py-1 px-3 rounded-full">
            <div className="flex items-center gap-1.5" title="Visitors Today">
                <User className="w-3.5 h-3.5 text-foreground/70" />
                <span>{stats.todayViews.toLocaleString()} Today</span>
            </div>
            <div className="w-px h-3 bg-foreground/20"></div>
            <div className="flex items-center gap-1.5" title="Total Visitors">
                <Users className="w-3.5 h-3.5 text-foreground/70" />
                <span>{stats.totalViews.toLocaleString()} Total</span>
            </div>
        </div>
    );
}
