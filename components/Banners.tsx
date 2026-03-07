"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useHapticFeedback } from "@/lib/useHapticFeedback";

export function Banners() {
    const [showForum, setShowForum] = useState(false);
    const [showDonation, setShowDonation] = useState(false);
    const { vibrate } = useHapticFeedback();

    // Dynamic text stats
    const [forumClicks, setForumClicks] = useState(0);

    useEffect(() => {
        // Run logic only on client-side mounting
        const statsStr = localStorage.getItem("blackmarket_banner_stats");
        let stats = statsStr ? JSON.parse(statsStr) : {
            forumClicks: 0,
            forumCloseStreak: 0,
            donationClicks: 0,
            donationCloseStreak: 0
        };

        setForumClicks(stats.forumClicks);

        // Probability Calculations
        // Forum: Base 10%, decrease roughly by half per click, increase if closed 3 times consecutively
        let forumProb = 0.1 * Math.pow(0.5, stats.forumClicks);
        if (stats.forumCloseStreak >= 3) {
            forumProb *= 2;
        }

        // Donation: Base 20%, decrease roughly by half per click, increase if closed 3 times consecutively
        let donationProb = 0.2 * Math.pow(0.5, stats.donationClicks);
        if (stats.donationCloseStreak >= 3) {
            donationProb *= 2;
        }

        // Only show one banner at a time, prioritize Forum
        if (Math.random() < forumProb) {
            setShowForum(true);
        } else if (Math.random() < donationProb) {
            setShowDonation(true);
        }
    }, []);

    const updateStats = (key: string, val: number) => {
        const statsStr = localStorage.getItem("blackmarket_banner_stats");
        let stats = statsStr ? JSON.parse(statsStr) : {
            forumClicks: 0,
            forumCloseStreak: 0,
            donationClicks: 0,
            donationCloseStreak: 0
        };
        stats[key] = val;
        localStorage.setItem("blackmarket_banner_stats", JSON.stringify(stats));
        return stats;
    };

    const handleForumClick = () => {
        vibrate("success");
        const stats = updateStats("forumClicks", forumClicks + 1);
        setForumClicks(stats.forumClicks);
        updateStats("forumCloseStreak", 0); // Reset close streak if they click the link
        setShowForum(false);
    };

    const handleForumClose = () => {
        vibrate("utility");
        const statsStr = localStorage.getItem("blackmarket_banner_stats");
        let stats = statsStr ? JSON.parse(statsStr) : { forumCloseStreak: 0 };
        updateStats("forumCloseStreak", (stats.forumCloseStreak || 0) + 1);
        setShowForum(false);
    };

    const handleDonationClick = () => {
        vibrate("success");
        const statsStr = localStorage.getItem("blackmarket_banner_stats");
        let stats = statsStr ? JSON.parse(statsStr) : { donationClicks: 0 };
        updateStats("donationClicks", (stats.donationClicks || 0) + 1);
        updateStats("donationCloseStreak", 0);
        setShowDonation(false);
    };

    const handleDonationClose = () => {
        vibrate("utility");
        const statsStr = localStorage.getItem("blackmarket_banner_stats");
        let stats = statsStr ? JSON.parse(statsStr) : { donationCloseStreak: 0 };
        updateStats("donationCloseStreak", (stats.donationCloseStreak || 0) + 1);
        setShowDonation(false);
    };

    if (showForum) {
        return (
            <div className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-b border-yellow-500/20 p-3 text-center relative text-sm animate-in fade-in slide-in-from-top-4 z-40">
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
                    <button onClick={handleForumClose} className="p-1 hover:bg-yellow-500/20 rounded-full transition-colors shrink-0" aria-label="Dismiss banner">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }

    if (showDonation) {
        return (
            <div className="bg-red-500/10 text-red-600 dark:text-red-500 border-b border-red-500/20 p-3 text-center relative text-sm animate-in fade-in slide-in-from-top-4 z-40">
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
                    <button onClick={handleDonationClose} className="p-1 hover:bg-red-500/20 rounded-full transition-colors shrink-0" aria-label="Dismiss banner">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }

    return null;
}
