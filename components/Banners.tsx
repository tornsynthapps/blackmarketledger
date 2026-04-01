"use client";

import { useState, useEffect, type MouseEvent } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, Database01Icon } from "@hugeicons/core-free-icons";
import { useHapticFeedback } from "@/lib/useHapticFeedback";
import { useJournal } from "@/store/useJournal";
import * as idb from '@/lib/idb';
import { useGlobalSyncStatus } from "@/lib/syncStatus";
import { MigrationModal } from "./MigrationModal";

export function Banners() {
    const [showForum, setShowForum] = useState(false);
    const { vibrate } = useHapticFeedback();
    const { needsMigration, performMigration, hasBMLDB, isLoaded } = useJournal();
    const syncStatus = useGlobalSyncStatus();
    const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);

    // Dynamic text stats
    const [forumClicks, setForumClicks] = useState(0);

    useEffect(() => {
        const init = async () => {
            let statsStr = await idb.get<string>("LogsDB", "blackmarket_banner_stats");
            if (!statsStr) {
                statsStr = localStorage.getItem("blackmarket_banner_stats") || undefined;
                if (statsStr) {
                    await idb.set("LogsDB", "blackmarket_banner_stats", statsStr);
                }
            }

            let stats = statsStr ? JSON.parse(statsStr) : {
                forumClicks: 0,
                forumCloseStreak: 0
            };

            setForumClicks(stats.forumClicks);

            // Probability Calculations
            let forumProb = 0.1 * Math.pow(0.5, stats.forumClicks);
            if (stats.forumCloseStreak >= 3) {
                forumProb *= 2;
            }

            if (Math.random() < forumProb) {
                setShowForum(true);
            }
        };

        init();
    }, []);

    const updateStats = async (key: string, val: number) => {
        let statsStr = await idb.get<string>("LogsDB", "blackmarket_banner_stats");
        let stats = statsStr ? JSON.parse(statsStr) : {
            forumClicks: 0,
            forumCloseStreak: 0
        };
        stats[key] = val;
        await idb.set("LogsDB", "blackmarket_banner_stats", JSON.stringify(stats));
        localStorage.setItem("blackmarket_banner_stats", JSON.stringify(stats));
        return stats;
    };

    const handleForumClick = async () => {
        vibrate("success");
        const stats = await updateStats("forumClicks", forumClicks + 1);
        setForumClicks(stats.forumClicks);
        await updateStats("forumCloseStreak", 0);
        setShowForum(false);
    };

    const handleForumClose = async (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        vibrate("utility");
        setShowForum(false);
        let statsStr = await idb.get<string>("LogsDB", "blackmarket_banner_stats");
        let stats = statsStr ? JSON.parse(statsStr) : { forumCloseStreak: 0 };
        await updateStats("forumCloseStreak", (stats.forumCloseStreak || 0) + 1);
    };

    if (needsMigration) {
        return (
            <div className="bg-danger/10 text-danger border-b border-danger/20 p-3 text-center relative text-sm animate-in fade-in slide-in-from-top-4 z-30 font-mono">
                <div className="max-w-4xl mx-auto flex items-center justify-center gap-4">
                    <div className="flex-1">
                        <p className="font-black uppercase tracking-tight">
                            SYSTEM UPGRADE REQUIRED
                        </p>
                        <p className="mt-1 text-[11px] opacity-70 uppercase">
                            LocalStorage limit reached. Migrate to IndexedDB node for industrial-scale storage.
                        </p>
                    </div>
                    <button onClick={() => { vibrate("success"); performMigration(); }} className="hardline-button border-danger text-danger hover:bg-danger hover:text-white px-4 py-2 text-xs font-black uppercase whitespace-nowrap">
                        MIGRATE_DATABASE
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            {hasBMLDB && isLoaded && (
                <div className="bg-primary/10 text-primary border-b border-primary/20 p-3 text-center relative text-sm animate-in fade-in slide-in-from-top-4 z-30 font-mono">
                    <div className="max-w-4xl mx-auto flex items-center justify-center gap-4">
                        <div className="flex-1 text-center">
                            <p className="font-black uppercase tracking-tight flex items-center justify-center gap-2">
                                <HugeiconsIcon icon={Database01Icon} size={16} />
                                Legacy Core Detected
                            </p>
                            <p className="mt-1 text-[11px] opacity-70 uppercase">
                                Archive found in legacy sector. Integrate into current data stream?
                            </p>
                        </div>
                        <button 
                            onClick={() => { vibrate("success"); setIsMigrationModalOpen(true); }} 
                            className="hardline-button px-4 py-2 text-xs font-black uppercase whitespace-nowrap"
                        >
                            INIT_MIGRATION
                        </button>
                    </div>
                </div>
            )}

            {syncStatus.isSyncing && (
                <div className="bg-success/10 text-success border-b border-success/20 p-3 text-center relative text-sm animate-in fade-in slide-in-from-top-4 z-30 font-mono">
                    <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                        <div className="flex-1">
                            <p className="font-black uppercase tracking-widest text-[11px]">{syncStatus.message}</p>
                        </div>
                    </div>
                </div>
            )}

            {showForum && (
                <div className="bg-warning/10 text-warning border-b border-warning/20 p-3 text-center relative text-sm animate-in fade-in slide-in-from-top-4 z-30 font-mono">
                    <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                        <div className="flex-1 uppercase tracking-tight text-xs font-bold">
                            {forumClicks === 0 ? (
                                <p>
                                    Help other traders discover the BML engine.{" "}
                                    <a
                                        href="https://www.torn.com/forums.php#/p=threads&f=67&t=16544638&b=0&a=0&start=0&to=27072718"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={handleForumClick}
                                        className="font-black hover:text-foreground transition-colors underline underline-offset-4"
                                    >
                                        REVEIW ON FORUM
                                    </a>
                                </p>
                            ) : (
                                <p>
                                    Industrial visibility required.{" "}
                                    <a
                                        href="https://www.torn.com/forums.php#/p=threads&f=67&t=16544638&b=0&a=0&start=0&to=27072718"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={handleForumClick}
                                        className="font-black hover:text-foreground transition-colors underline underline-offset-4"
                                    >
                                        BUMP THREAD
                                    </a>
                                </p>
                            )}
                        </div>
                        <button type="button" onClick={handleForumClose} className="p-1 border border-warning/20 bg-background/50 hover:bg-warning hover:text-white transition-all shrink-0" aria-label="Dismiss banner">
                            <HugeiconsIcon icon={Cancel01Icon} size={16} />
                        </button>
                    </div>
                </div>
            )}

            <MigrationModal 
                isOpen={isMigrationModalOpen} 
                onClose={() => setIsMigrationModalOpen(false)} 
            />
        </>
    );
}
