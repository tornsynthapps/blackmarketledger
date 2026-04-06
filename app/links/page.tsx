"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
    ChartRadarIcon,
    BankIcon,
    Airplane02Icon,
    ReceiptTextIcon,
    ComputerTerminal01Icon,
    Radar03Icon,
    Exchange01Icon,
    UserIcon,
    BookOpenTextIcon,
    PackageIcon,
    AccountSetting01Icon,
    Clock01Icon,
    PoopIcon,
    SkullIcon,
    UserGroupIcon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useHapticFeedback } from "@/lib/useHapticFeedback";

export default function LinksPage() {
    const { vibrate } = useHapticFeedback();

    const ledgerPages = [
        { name: "Dashboard", href: "/", icon: ChartRadarIcon, desc: "Overview of your profit and inventory" },
        { name: "Museum", href: "/museum", icon: BankIcon, desc: "Track your plushie and flower sets" },
        { name: "Abroad", href: "/abroad", icon: Airplane02Icon, desc: "Monitor items purchased while traveling" },
        { name: "Logs", href: "/logs", icon: ReceiptTextIcon, desc: "History of your trades and transactions" },
        { name: "Terminal", href: "/add", icon: ComputerTerminal01Icon, desc: "Add new trades or manual entries" },
        { name: "Auto-Pilot", href: "/auto", icon: Radar03Icon, desc: "Automated data synchronization" },
        { name: "BML Connect", href: "/bmlconnect", icon: Exchange01Icon, desc: "Synchronize data with BML services" },
        { name: "Account", href: "/account", icon: UserIcon, desc: "Manage your API keys and profile" },
        { name: "Treasure Chest", href: "/treasurechest", icon: PackageIcon, desc: "Open and manage looted chests" },
        { name: "Migration", href: "/migration", icon: AccountSetting01Icon, desc: "Migrate legacy data to the new system" },
    ];

    const publicPages = [
        { name: "Poo Board", href: "/public/mugs", icon: UserGroupIcon, desc: "Public mugging and yoink leaderboards" },
        { name: "Documentation", href: "/docs", icon: BookOpenTextIcon, desc: "Technical guides and API reference" },
        { name: "Changelog", href: "/changelog", icon: Clock01Icon, desc: "View the latest updates and changes" },
    ];

    return (
        <div className="flex flex-col gap-12 max-w-6xl mx-auto py-12 px-6">
            <header className="border-l-4 border-primary pl-6">
                <h1 className="text-4xl font-black uppercase tracking-tighter sm:text-5xl font-vt323">
                    Central Directory
                </h1>
                <p className="text-muted text-sm font-mono mt-2 uppercase tracking-widest">
                    Access all ledger modules and public services
                </p>
            </header>

            <section>
                <div className="flex items-center gap-4 mb-8">
                    <h2 className="text-xl font-bold uppercase tracking-widest bg-primary text-primary-foreground px-4 py-1">
                        LEDGER PAGES
                    </h2>
                    <div className="h-[2px] grow bg-border" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
                    {ledgerPages.map((page) => (
                        <Link
                            key={page.href}
                            href={page.href}
                            onClick={() => vibrate("nav")}
                            className="group flex flex-col gap-4 p-6 bg-panel border-2 border-transparent hover:border-primary transition-all hover:translate-x-1 hover:-translate-y-1 hover:shadow-[4px_4px_0px_var(--primary)]"
                        >
                            <div className="flex items-center justify-between">
                                <div className="p-3 bg-foreground/5 group-hover:bg-primary transition-colors">
                                    <HugeiconsIcon
                                        icon={page.icon}
                                        size={24}
                                        className="group-hover:text-primary-foreground transition-colors"
                                    />
                                </div>
                                <span className="text-[10px] font-mono text-muted uppercase">Ledger::{page.name.replace(/\s+/g, "")}</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg uppercase tracking-tight group-hover:text-primary">
                                    {page.name}
                                </h3>
                                <p className="text-muted text-xs font-mono mt-1 leading-relaxed">
                                    {page.desc}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            <section>
                <div className="flex items-center gap-4 mb-8">
                    <h2 className="text-xl font-bold uppercase tracking-widest bg-danger text-white px-4 py-1">
                        PUBLIC PAGES
                    </h2>
                    <div className="h-[2px] grow bg-border" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
                    {publicPages.map((page) => (
                        <Link
                            key={page.href}
                            href={page.href}
                            onClick={() => vibrate("nav")}
                            className="group flex flex-col gap-4 p-6 bg-panel border-2 border-transparent hover:border-danger transition-all hover:translate-x-1 hover:-translate-y-1 hover:shadow-[4px_4px_0px_var(--danger)]"
                        >
                            <div className="flex items-center justify-between">
                                <div className="p-3 bg-foreground/5 group-hover:bg-danger transition-colors">
                                    <HugeiconsIcon
                                        icon={page.icon}
                                        size={24}
                                        className="group-hover:text-white transition-colors"
                                    />
                                </div>
                                <span className="text-[10px] font-mono text-muted uppercase">Public::{page.name.replace(/\s+/g, "")}</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg uppercase tracking-tight group-hover:text-danger">
                                    {page.name}
                                </h3>
                                <p className="text-muted text-xs font-mono mt-1 leading-relaxed">
                                    {page.desc}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    );
}
