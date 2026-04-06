"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
    UserIcon,
} from "@hugeicons/core-free-icons";

export interface LeaderboardEntry {
    rank: number;
    username: string;
    userId: number;
    value: number;
    lastActive: string;
    secondaryValue?: number;
}

interface LeaderboardTableProps {
    entries: LeaderboardEntry[];
    valueLabel: string;
    valuePrefix?: string;
    valueIcon: any;
    secondaryValueLabel?: string;
    secondaryValueIcon?: any;
}

export function LeaderboardTable({ 
    entries, 
    valueLabel, 
    valuePrefix = "", 
    valueIcon,
    secondaryValueLabel,
    secondaryValueIcon
}: LeaderboardTableProps) {
    return (
        <main className="lg:col-span-2 flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-6 bg-primary" />
                    <h2 className="text-2xl font-bold uppercase tracking-tighter">Current Rankings</h2>
                </div>
                <div className="text-[10px] font-mono text-muted uppercase">Sorted by {valueLabel}</div>
            </div>

            <div className="overflow-x-auto border-2 border-border">
                <table className="w-full text-left">
                    <thead>
                        <tr>
                            <th className="w-16">Rank</th>
                            <th>Operatives</th>
                            <th>{valueLabel}</th>
                            <th className="hidden md:table-cell text-right">Last Sync</th>
                        </tr>
                    </thead>
                    <tbody className="font-mono text-sm">
                        {entries.map((entry) => (
                            <tr key={entry.userId} className="group hover:bg-primary/5 transition-colors">
                                <td className="font-bold py-4">
                                    {entry.rank === 1 ? (
                                        <div className="flex items-center justify-center w-8 h-8 bg-warning text-black font-black italic">
                                            1st
                                        </div>
                                    ) : (
                                        <span className="pl-2">#{entry.rank}</span>
                                    )}
                                </td>
                                <td className="py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-panel-elevated flex items-center justify-center border border-border group-hover:border-primary/40">
                                            <HugeiconsIcon icon={UserIcon} size={20} className="text-muted" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-primary uppercase">{entry.username}</span>
                                            <span className="text-[10px] text-muted tracking-widest">ID: {entry.userId}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-4 font-bold">
                                    <div className="flex flex-col gap-0.5">
                                        <div className="flex items-center gap-1 text-success text-base">
                                            <HugeiconsIcon icon={valueIcon} size={16} />
                                            {valuePrefix}{entry.value.toLocaleString()}
                                        </div>
                                        {entry.secondaryValue !== undefined && secondaryValueIcon && (
                                            <div className="flex items-center gap-1 text-muted text-[10px] font-mono tracking-tighter">
                                                <HugeiconsIcon icon={secondaryValueIcon} size={10} />
                                                <span>{entry.secondaryValue.toLocaleString()} {secondaryValueLabel}</span>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="py-4 text-right hidden md:table-cell pr-6">
                                    <span className="text-xs text-muted uppercase">{entry.lastActive}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-center p-8">
                <p className="text-[10px] font-mono text-muted uppercase tracking-[0.3em] animate-pulse">
                    --- End of Registry ---
                </p>
            </div>
        </main>
    );
}
