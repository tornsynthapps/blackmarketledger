"use client";

import { Info, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function LogFormats() {
    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <Link href="/add" className="text-primary hover:underline flex items-center gap-1 text-sm font-medium mb-4 w-fit">
                    <ArrowLeft className="w-4 h-4" /> Back to Add Logs
                </Link>
                <h1 className="text-3xl font-bold tracking-tight">Supported Log Formats</h1>
                <p className="text-foreground/60 mt-2">Learn how to format your data for the tracker.</p>
            </div>

            <div className="bg-panel border border-border p-6 rounded-xl space-y-6">
                <div className="space-y-4">
                    <h2 className="text-xl font-bold border-b border-border pb-2">Weav3r Receipts &amp; Torn Bazaar Logs</h2>
                    <ul className="space-y-3">
                        <li className="flex items-start gap-3">
                            <span className="text-xl">💡</span>
                            <div>
                                <p className="font-semibold text-foreground/90">Weav3r Receipts</p>
                                <p className="text-sm text-foreground/70">Paste a Weav3r receipt URL (e.g. <code className="bg-primary/5 text-primary px-1 p-0.5 rounded">https://weav3r.dev/receipt/RJiDVUO9Is</code>) to automatically fetch trades!</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-xl">💡</span>
                            <div>
                                <p className="font-semibold text-foreground/90">Raw Torn Bazaar Logs</p>
                                <p className="text-sm text-foreground/70">Directly paste your raw Torn Bazaar logs! (e.g. <code className="bg-primary/5 text-primary px-1 p-0.5 rounded">TequilaKing bought 4 x Six-Pack of Alcohol from your bazaar for $3,587,596.</code>)</p>
                            </div>
                        </li>
                    </ul>
                </div>

                <div className="space-y-4">
                    <h2 className="text-xl font-bold border-b border-border pb-2">Manual Entry Shorthand</h2>
                    <p className="text-sm text-foreground/70">Use the following formats to manually log transactions.</p>

                    <div className="grid grid-cols-1 gap-3">
                        <div className="p-3 bg-foreground/5 rounded-lg border border-border">
                            <code className="text-primary font-bold block mb-1">b;&lt;item&gt;;&lt;qty&gt;;&lt;price&gt;</code>
                            <p className="text-sm text-foreground/80">Buy an item based on individual price.</p>
                            <p className="text-xs text-foreground/50 mt-1 font-mono">Example: b;Xanax;100;830000</p>
                        </div>

                        <div className="p-3 bg-foreground/5 rounded-lg border border-border">
                            <code className="text-primary font-bold block mb-1">b;&lt;item&gt;;&lt;qty&gt;;;&lt;total&gt;</code>
                            <p className="text-sm text-foreground/80">Buy an item using total cost.</p>
                            <p className="text-xs text-foreground/50 mt-1 font-mono">Example: b;Xanax;100;;83000000</p>
                        </div>

                        <div className="p-3 bg-foreground/5 rounded-lg border border-border">
                            <code className="text-primary font-bold block mb-1">s;&lt;item&gt;;&lt;qty&gt;;&lt;price&gt;</code>
                            <p className="text-sm text-foreground/80">Sell an item.</p>
                            <p className="text-xs text-foreground/50 mt-1 font-mono">Example: s;Xanax;50;845000</p>
                        </div>

                        <div className="p-3 bg-foreground/5 rounded-lg border border-border">
                            <code className="text-primary font-bold block mb-1">m;&lt;amount&gt;</code>
                            <p className="text-sm text-foreground/80">Mug loss.</p>
                            <p className="text-xs text-foreground/50 mt-1 font-mono">Example: m;500000</p>
                        </div>

                        <div className="p-3 bg-foreground/5 rounded-lg border border-border">
                            <code className="text-primary font-bold block mb-1">c;&lt;flushies_per_10_points&gt;;&lt;times&gt;</code>
                            <p className="text-sm text-foreground/80">Convert flushies to points.</p>
                            <p className="text-xs text-foreground/50 mt-1 font-mono">Example: c;13;120</p>
                        </div>

                        <div className="p-3 bg-foreground/5 rounded-lg border border-border">
                            <code className="text-primary font-bold block mb-1">cf;&lt;times&gt;</code>
                            <p className="text-sm text-foreground/80">Convert Flower sets into Points (10 Points per set).</p>
                            <p className="text-xs text-foreground/50 mt-1 font-mono">Example: cf;5</p>
                        </div>

                        <div className="p-3 bg-foreground/5 rounded-lg border border-border">
                            <code className="text-primary font-bold block mb-1">cp;&lt;times&gt;</code>
                            <p className="text-sm text-foreground/80">Convert Plushie sets into Points (10 Points per set).</p>
                            <p className="text-xs text-foreground/50 mt-1 font-mono">Example: cp;10</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
