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
    UserGroupIcon,
    File01Icon,
    Shield01Icon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useHapticFeedback } from "@/lib/useHapticFeedback";

export default function LinksPage() {
    const { vibrate } = useHapticFeedback();

    const ledgerPages = [
        {
            name: "Dashboard",
            href: "/",
            icon: ChartRadarIcon,
            desc: "Overview of your profit and inventory",
        },
        {
            name: "Museum",
            href: "/museum",
            icon: BankIcon,
            desc: "Track your plushie and flower sets",
        },
        {
            name: "Abroad",
            href: "/abroad",
            icon: Airplane02Icon,
            desc: "Monitor items purchased while traveling",
        },
        {
            name: "Logs",
            href: "/logs",
            icon: ReceiptTextIcon,
            desc: "History of your trades and transactions",
        },
        {
            name: "Terminal",
            href: "/add",
            icon: ComputerTerminal01Icon,
            desc: "Add new trades or manual entries",
        },
        {
            name: "Auto-Pilot",
            href: "/auto",
            icon: Radar03Icon,
            desc: "Automated data synchronization",
        },
        {
            name: "BML Connect",
            href: "/bmlconnect",
            icon: Exchange01Icon,
            desc: "Synchronize data with BML services",
        },
        {
            name: "Account",
            href: "/account",
            icon: UserIcon,
            desc: "Manage your API keys and profile",
        },
        {
            name: "Treasure Chest",
            href: "/treasurechest",
            icon: PackageIcon,
            desc: "Open and manage looted chests",
        },
        {
            name: "Migration",
            href: "/migration",
            icon: AccountSetting01Icon,
            desc: "Migrate legacy data to the new system",
        },
    ];

    const publicPages = [
        {
            name: "Poo Board",
            href: "/public/mugs",
            icon: UserGroupIcon,
            desc: "Public mugging and yoink leaderboards",
        },
        {
            name: "Documentation",
            href: "/docs",
            icon: BookOpenTextIcon,
            desc: "Technical guides and API reference",
        },
        {
            name: "Changelog",
            href: "/changelog",
            icon: Clock01Icon,
            desc: "View the latest updates and changes",
        },
        {
            name: "Terms of Service",
            href: "/terms",
            icon: File01Icon,
            desc: "Acceptable use and user agreements",
        },
        {
            name: "Privacy Policy",
            href: "/privacy",
            icon: Shield01Icon,
            desc: "How we handle and protect your data",
        },
    ];

    return (
        <div className="flex flex-col gap-4 max-w-6xl mx-auto py-4 px-4">
            <header className="border-l-2 border-blue-500 pl-4">
                <h1 className="text-2xl font-black uppercase tracking-tighter sm:text-3xl">
                    Central Directory
                </h1>
                <p className="text-muted text-xs font-sans mt-1 uppercase tracking-widest">
                    Access all ledger modules and public services
                </p>
            </header>

            <section>
                <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-sm font-bold uppercase tracking-widest bg-blue-500 text-white px-3 py-0.5">
                        LEDGER PAGES
                    </h2>
                    <div className="h-[2px] grow bg-border" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-5 gap-1">
                    {ledgerPages.map((page) => (
                        <Link
                            key={page.href}
                            href={page.href}
                            onClick={() => vibrate("nav")}
                            className="group flex flex-col gap-1 p-2 bg-panel border border-transparent hover:border-blue-500 transition-all"
                        >
                            <div className="flex items-center gap-2">
                                <HugeiconsIcon
                                    icon={page.icon}
                                    size={20}
                                    className="text-muted group-hover:text-blue-500 transition-colors"
                                />
                                <span className="font-bold text-base uppercase tracking-tight group-hover:text-blue-500 group-hover:italic">
                                    {page.name}
                                </span>
                            </div>
                            <p className="text-muted text-xs font-sans leading-tight line-clamp-2 group-hover:italic">
                                {page.desc}
                            </p>
                        </Link>
                    ))}
                </div>
            </section>

            <section>
                <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-sm font-bold uppercase tracking-widest bg-danger text-white px-3 py-0.5">
                        PUBLIC PAGES
                    </h2>
                    <div className="h-[2px] grow bg-border" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-1">
                    {publicPages.map((page) => (
                        <Link
                            key={page.href}
                            href={page.href}
                            onClick={() => vibrate("nav")}
                            className="group flex flex-col gap-1 p-2 bg-panel border border-transparent hover:border-danger transition-all"
                        >
                            <div className="flex items-center gap-2">
                                <HugeiconsIcon
                                    icon={page.icon}
                                    size={20}
                                    className="text-muted group-hover:text-danger transition-colors"
                                />
                                <span className="font-bold text-base uppercase tracking-tight group-hover:text-danger group-hover:italic">
                                    {page.name}
                                </span>
                            </div>
                            <p className="text-muted text-xs font-sans leading-tight line-clamp-2 group-hover:italic">
                                {page.desc}
                            </p>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    );
}
