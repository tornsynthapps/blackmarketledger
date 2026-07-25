"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    PoopIcon,
    SkullIcon,
    TargetIcon,
    UserGroupIcon,
    ArrowLeft01Icon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useHapticFeedback } from "@/lib/old/useHapticFeedback";
import { BoardHeader } from "@/components/Leaderboard/BoardHeader";
import { SyncConsole } from "@/components/Leaderboard/SyncConsole";
import { LeaderboardTable, LeaderboardEntry } from "@/components/Leaderboard/LeaderboardTable";
import { UnderConstructionPage } from "@/components/UnderConstructionPage";

type BoardType = "mugs" | "yoinks";

export default function PublicMugsPage() {
    if (process.env.NEXT_PUBLIC_PRODUCTION_MODE === "true") {
        return <UnderConstructionPage />;
    }
    const [activeBoard, setActiveBoard] = useState<BoardType>("mugs");
    const [isSyncing, setIsSyncing] = useState(false);
    const { vibrate } = useHapticFeedback();

    const boards = {
        mugs: {
            title: "POO BOARD",
            subtitle: "The Ultimate Torn Mugging Leaderboard",
            icon: PoopIcon,
            valueLabel: "Amount Stolen",
            valuePrefix: "$",
            valueIcon: PoopIcon,
            secondaryValueLabel: undefined,
            secondaryValueIcon: undefined,
            protocolNotice:
                "The Poo Board aggregates mugging data from the last 1,000 logs. Updates are near real-time once the sync protocol is executed.",
            entries: [
                {
                    rank: 1,
                    username: "PooMaster",
                    userId: 123456,
                    value: 500000000,
                    lastActive: "2 mins ago",
                },
                {
                    rank: 2,
                    username: "MuggerPro",
                    userId: 789012,
                    value: 420000000,
                    lastActive: "15 mins ago",
                },
                {
                    rank: 3,
                    username: "GhostMugger",
                    userId: 345678,
                    value: 380000000,
                    lastActive: "1 hour ago",
                },
                {
                    rank: 4,
                    username: "SilentThief",
                    userId: 901234,
                    value: 310000000,
                    lastActive: "3 hours ago",
                },
                {
                    rank: 5,
                    username: "RichTarget",
                    userId: 567890,
                    value: 250000000,
                    lastActive: "5 hours ago",
                },
            ] as LeaderboardEntry[],
        },
        yoinks: {
            title: "YOINK BOARD",
            subtitle: "High-Stakes Pickpocketing and Elite Thefts",
            icon: SkullIcon,
            valueLabel: "Amount Mugged",
            valuePrefix: "$",
            valueIcon: PoopIcon,
            secondaryValueLabel: "Yoinks",
            secondaryValueIcon: SkullIcon,
            protocolNotice:
                "The Yoink Board monitors high-value thefts and pickpocketing events across the Torn network.",
            entries: [
                {
                    rank: 1,
                    username: "ShadowYoinker",
                    userId: 111111,
                    value: 450000000,
                    secondaryValue: 532,
                    lastActive: "1 min ago",
                },
                {
                    rank: 2,
                    username: "NightStalker",
                    userId: 222222,
                    value: 380000000,
                    secondaryValue: 450,
                    lastActive: "10 mins ago",
                },
                {
                    rank: 3,
                    username: "SilentHand",
                    userId: 333333,
                    value: 310000000,
                    secondaryValue: 420,
                    lastActive: "25 mins ago",
                },
                {
                    rank: 4,
                    username: "QuickFingers",
                    userId: 444444,
                    value: 290000000,
                    secondaryValue: 380,
                    lastActive: "2 hours ago",
                },
                {
                    rank: 5,
                    username: "EmptyPocket",
                    userId: 555555,
                    value: 250000000,
                    secondaryValue: 310,
                    lastActive: "4 hours ago",
                },
            ] as LeaderboardEntry[],
        },
    };

    const currentBoard = boards[activeBoard];

    const handleSync = async (apiKey: string) => {
        vibrate("danger");
        setIsSyncing(true);
        console.log(`Syncing ${activeBoard} with API Key:`, apiKey);

        await new Promise((resolve) => setTimeout(resolve, 2000));

        setIsSyncing(false);
        vibrate("success");
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            <div className="flex items-center justify-between">
                {/* Top Navigation / Toggle */}
                <nav className="flex items-center gap-px bg-border w-fit">
                    <button
                        onClick={() => {
                            setActiveBoard("mugs");
                            vibrate("nav");
                        }}
                        className={`px-8 py-3 font-bold text-xs uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${
                            activeBoard === "mugs"
                                ? "bg-primary text-primary-foreground"
                                : "bg-panel text-muted hover:text-primary hover:bg-panel-elevated"
                        }`}
                    >
                        <HugeiconsIcon icon={TargetIcon} size={16} />
                        Mugs
                    </button>
                    <button
                        onClick={() => {
                            setActiveBoard("yoinks");
                            vibrate("nav");
                        }}
                        className={`px-8 py-3 font-bold text-xs uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${
                            activeBoard === "yoinks"
                                ? "bg-primary text-primary-foreground"
                                : "bg-panel text-muted hover:text-primary hover:bg-panel-elevated"
                        }`}
                    >
                        <HugeiconsIcon icon={UserGroupIcon} size={16} />
                        Yoinks
                    </button>
                </nav>

                <Link
                    href="/"
                    onClick={() => vibrate("nav")}
                    className="flex items-center gap-2 text-[10px] font-mono font-bold text-muted hover:text-primary transition-colors uppercase tracking-widest"
                >
                    <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
                    Back to App
                </Link>
            </div>

            <BoardHeader
                title={currentBoard.title}
                subtitle={currentBoard.subtitle}
                icon={currentBoard.icon}
            />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <SyncConsole
                    onSync={handleSync}
                    isSyncing={isSyncing}
                    syncLabel="SYNC LEDGER"
                    protocolNotice={currentBoard.protocolNotice}
                />

                <div className="lg:col-span-3">
                    <LeaderboardTable
                        entries={currentBoard.entries}
                        valueLabel={currentBoard.valueLabel}
                        valuePrefix={currentBoard.valuePrefix}
                        valueIcon={currentBoard.valueIcon}
                        secondaryValueLabel={currentBoard.secondaryValueLabel}
                        secondaryValueIcon={currentBoard.secondaryValueIcon}
                    />
                </div>
            </div>
        </div>
    );
}
