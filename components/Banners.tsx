"use client";

import { useState, useEffect, type MouseEvent } from "react";
import { X } from "lucide-react";
import { useHapticFeedback } from "@/lib/useHapticFeedback";
import { useJournal } from "@/store/useJournal";
import * as idb from '@/lib/idb';
import { useGlobalSyncStatus } from "@/lib/syncStatus";

export function Banners() {
    const [showForum, setShowForum] = useState(false);
    const [showDonation, setShowDonation] = useState(false);
    const { vibrate } = useHapticFeedback();
    const { needsMigration, performMigration } = useJournal();
    const syncStatus = useGlobalSyncStatus();

    // Dynamic text stats
    const [forumClicks, setForumClicks] = useState(0);

    useEffect(() => {
        const init = async () => {
            let statsStr = await idb.get<string>("blackmarket_banner_stats");
            if (!statsStr) {
                statsStr = localStorage.getItem("blackmarket_banner_stats") || undefined;
                if (statsStr) {
                    await idb.set("blackmarket_banner_stats", statsStr);
                }
            }

            let stats = statsStr ? JSON.parse(statsStr) : {
                forumClicks: 0,
                forumCloseStreak: 0,
                donationClicks: 0,
                donationCloseStreak: 0
            };

            setForumClicks(stats.forumClicks);

            // Probability Calculations
            let forumProb = 0.1 * Math.pow(0.5, stats.forumClicks);
            if (stats.forumCloseStreak >= 3) {
                forumProb *= 2;
            }

            let donationProb = 0.2 * Math.pow(0.5, stats.donationClicks);
            if (stats.donationCloseStreak >= 3) {
                donationProb *= 2;
            }

            if (Math.random() < forumProb) {
                setShowForum(true);
            } else if (Math.random() < donationProb) {
                setShowDonation(true);
            }
        };

        init();
    }, []);

    const updateStats = async (key: string, val: number) => {
        let statsStr = await idb.get<string>("blackmarket_banner_stats");
        let stats = statsStr ? JSON.parse(statsStr) : {
            forumClicks: 0,
            forumCloseStreak: 0,
            donationClicks: 0,
            donationCloseStreak: 0
        };
        stats[key] = val;
        await idb.set("blackmarket_banner_stats", JSON.stringify(stats));
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
        let statsStr = await idb.get<string>("blackmarket_banner_stats");
        let stats = statsStr ? JSON.parse(statsStr) : { forumCloseStreak: 0 };
        await updateStats("forumCloseStreak", (stats.forumCloseStreak || 0) + 1);
    };

    const handleDonationClick = async () => {
        vibrate("success");
        let statsStr = await idb.get<string>("blackmarket_banner_stats");
        let stats = statsStr ? JSON.parse(statsStr) : { donationClicks: 0 };
        await updateStats("donationClicks", (stats.donationClicks || 0) + 1);
        await updateStats("donationCloseStreak", 0);
        setShowDonation(false);
    };

    const handleDonationClose = async (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        vibrate("utility");
        setShowDonation(false);
        let statsStr = await idb.get<string>("blackmarket_banner_stats");
        let stats = statsStr ? JSON.parse(statsStr) : { donationCloseStreak: 0 };
        await updateStats("donationCloseStreak", (stats.donationCloseStreak || 0) + 1);
    };

    if (needsMigration) {
        return (
            <div className="bg-red-500/10 text-red-600 dark:text-red-500 border-b border-red-500/20 p-3 text-center relative text-sm animate-in fade-in slide-in-from-top-4 z-30">
                <div className="max-w-4xl mx-auto flex items-center justify-center gap-4">
                    <div className="flex-1">
                        <p className="font-semibold">
                            ⚠️ Database Upgrade Required
                        </p>
                        <p className="mt-1 opacity-90">
                            Your transaction data is currently stored in LocalStorage. Please upgrade to our new IndexedDB backend to lift storage caps and improve performance.
                        </p>
                    </div>
                    <button onClick={() => { vibrate("success"); performMigration(); }} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium text-sm transition-colors whitespace-nowrap">
                        Migrate Now
                    </button>
                </div>
            </div>
        );
    }

    if (syncStatus.isSyncing) {
        return (
            <div className="bg-green-500/10 text-green-700 dark:text-green-400 border-b border-green-500/20 p-3 text-center relative text-sm animate-in fade-in slide-in-from-top-4 z-30">
                <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex-1">
                        <p>{syncStatus.message}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (showForum) {
        return (
            <div className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-b border-yellow-500/20 p-3 text-center relative text-sm animate-in fade-in slide-in-from-top-4 z-30">
                <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex-1">
                        {forumClicks === 0 ? (
                            <p>
                                Enjoying the app? ⭐{" "}
                                <a
                                    href="https://www.torn.com/forums.php#/p=threads&f=67&t=16544638&b=0&a=0&start=0&to=27072718"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={handleForumClick}
                                    className="font-bold hover:underline"
                                >
                                    Leave a quick review on the Torn forum to help other traders discover it!
                                </a>
                            </p>
                        ) : (
                            <p>
                                Help keep the tool visible!{" "}
                                <a
                                    href="https://www.torn.com/forums.php#/p=threads&f=67&t=16544638&b=0&a=0&start=0&to=27072718"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={handleForumClick}
                                    className="font-bold hover:underline"
                                >
                                    Give the forum thread a quick bump if you find this app useful.
                                </a>
                            </p>
                        )}
                    </div>
                    <button type="button" onClick={handleForumClose} className="p-1 hover:bg-yellow-500/20 rounded-full transition-colors shrink-0" aria-label="Dismiss banner">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }

    if (showDonation) {
        return (
            <div className="bg-red-500/10 text-red-600 dark:text-red-500 border-b border-red-500/20 p-3 text-center relative text-sm animate-in fade-in slide-in-from-top-4 z-30">
                <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex-1">
                        <p>
                            This app is free to use. If it helps your trading profits, consider{" "}
                            <a
                                href="https://www.torn.com/profiles.php?XID=3165209"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={handleDonationClick}
                                className="font-bold hover:underline inline-flex items-center gap-1"
                            >
                                sending a small donation in Torn. ❤️
                            </a>
                        </p>
                    </div>
                    <button type="button" onClick={handleDonationClose} className="p-1 hover:bg-red-500/20 rounded-full transition-colors shrink-0" aria-label="Dismiss banner">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }

    return null;
}
