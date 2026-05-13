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
    DatabaseIcon,
    Sun01Icon,
    Moon01Icon,
    Menu01Icon,
    Cancel01Icon,
    DiscordIcon,
    UserIcon,
    BookOpenTextIcon,
    Link01Icon,
    PackageProcessIcon,
    TableIcon,
    Settings01Icon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import pkg from "@/package.json";
import { useHapticFeedback } from "@/lib/old/useHapticFeedback";
import Image from "next/image";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

const navItems = [
    { name: "Dashboard", href: "/", icon: ChartRadarIcon, color: "var(--info)" },
    { name: "Museum", href: "/museum", icon: BankIcon, color: "var(--warning)" },
    { name: "Abroad", href: "/abroad", icon: Airplane02Icon, color: "var(--success)" },
    { name: "Logs", href: "/logs", icon: ReceiptTextIcon, color: "var(--secondary)" },
    { name: "Terminal", href: "/add", icon: ComputerTerminal01Icon, color: "var(--muted)" },
    { name: "Auto-Pilot", href: "/auto", icon: Radar03Icon, color: "var(--danger)" },
    { name: "Blackbox", href: "/blackbox", icon: PackageProcessIcon, color: "var(--secondary)" },
    { name: "BML Connect", href: "/bmlconnect", icon: Exchange01Icon, color: "var(--primary)" },
    { name: "Account", href: "/account", icon: UserIcon, color: "var(--info)" },
    { name: "Settings", href: "/settings", icon: Settings01Icon, color: "var(--primary)" },
    { name: "Links", href: "/links", icon: Link01Icon, color: "var(--accent-red)" },
];

export function Navigation() {
    const pathname = usePathname();
    const [isDark, setIsDark] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [museumDrift, setMuseumDrift] = useState(false);
    const { vibrate } = useHapticFeedback();

    useEffect(() => {
        const saved = localStorage.getItem("museum-drift-status");
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setMuseumDrift(parsed.flowers || parsed.plushies);
            } catch {}
        }

        const handleSync = (e: any) => {
            if (e.detail) {
                setMuseumDrift(e.detail.flowers || e.detail.plushies);
            }
        };

        window.addEventListener("museum-sync-updated", handleSync);
        return () => window.removeEventListener("museum-sync-updated", handleSync);
    }, []);

    useEffect(() => {
        setIsDark(
            document.documentElement.classList.contains("dark") ||
                !document.documentElement.classList.contains("light")
        );
    }, []);

    const applyTheme = (theme: "dark" | "light") => {
        const root = document.documentElement;
        root.classList.toggle("dark", theme === "dark");
        root.classList.toggle("light", theme === "light");
        localStorage.setItem("theme", theme);
        setIsDark(theme === "dark");
    };

    const toggleDark = () => {
        vibrate("utility");
        applyTheme(isDark ? "light" : "dark");
    };

    return (
        <>
            {/* Top Navigation */}
            <nav className="nav-top sticky top-0 h-16 bg-background border-b-2 border-primary z-[70] transition-colors">
                <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between gap-6">
                    <Link
                        href="/"
                        onClick={() => vibrate("nav")}
                        className="flex items-center justify-center p-2"
                    >
                        {/* New logo replacing text and old database icon */}
                        {isDark ? (
                            <img src="/logos/dark/android-chrome-192x192.png" alt="BlackMarket Ledger Logo" className="w-8 h-8 object-contain" />
                        ) : (
                            <img src="/logos/light/android-chrome-192x192.png" alt="BlackMarket Ledger Logo" className="w-8 h-8 object-contain" />
                        )}
                    </Link>

                    <div className="hidden sm:flex items-center gap-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive =
                                item.href === "/"
                                    ? pathname === "/"
                                    : pathname.startsWith(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => vibrate("nav")}
                                    className={cn(
                                        "group flex items-center gap-0 hover:gap-2 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest transition-all border border-transparent",
                                        isActive
                                            ? "bg-primary text-primary-foreground"
                                            : "text-muted hover:text-foreground hover:bg-foreground/5 hover:border-border"
                                    )}
                                >
                                    <div className="relative flex items-center justify-center">
                                        <HugeiconsIcon
                                            icon={Icon}
                                            size={14}
                                            color={
                                                isActive
                                                    ? "var(--primary-foreground)"
                                                    : "currentColor"
                                            }
                                        />
                                        {item.name === "Museum" && museumDrift && (
                                            <div className="absolute -top-[1px] -right-[1px] w-1.5 h-1.5 bg-warning rounded-full shadow-sm" />
                                        )}
                                    </div>
                                    <span className="max-w-0 overflow-hidden group-hover:max-w-32 transition-all duration-300 whitespace-nowrap">
                                        {item.name}
                                    </span>
                                </Link>
                            );
                        })}
                        <div className="w-[2px] h-6 bg-border mx-2" />
                        <button
                            onClick={toggleDark}
                            className="p-1.5 rounded-none text-muted hover:text-foreground hover:bg-foreground/5 transition-colors border border-transparent hover:border-border"
                            aria-label="Toggle dark mode"
                        >
                            <HugeiconsIcon icon={isDark ? Sun01Icon : Moon01Icon} size={18} />
                        </button>
                    </div>

                    <div className="flex items-center gap-1 sm:hidden">
                        <button
                            onClick={toggleDark}
                            className="p-2 text-muted hover:text-foreground"
                            aria-label="Toggle dark mode"
                        >
                            <HugeiconsIcon icon={isDark ? Sun01Icon : Moon01Icon} size={18} />
                        </button>
                        <button
                            onClick={() => {
                                vibrate("nav");
                                setIsDrawerOpen((open) => !open);
                            }}
                            className="p-2 text-foreground"
                        >
                            <HugeiconsIcon
                                icon={isDrawerOpen ? Cancel01Icon : Menu01Icon}
                                size={22}
                            />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Left Sidebar Navigation (Desktop Only) */}
            <aside className="nav-left flex w-[240px] h-full bg-panel flex-col justify-between py-4 px-4 shrink-0 transition-opacity border-r-2 border-primary z-[70]">
                <div className="flex flex-col gap-10">
                    <Link
                        href="/"
                        onClick={() => vibrate("nav")}
                        className="flex flex-row items-center gap-3 px-1"
                    >
                        {isDark ? (
                            <img src="/logos/dark/android-chrome-192x192.png" alt="BlackMarket Ledger Logo" className="w-10 h-10 object-contain shrink-0" />
                        ) : (
                            <img src="/logos/light/android-chrome-192x192.png" alt="BlackMarket Ledger Logo" className="w-10 h-10 object-contain shrink-0" />
                        )}
                        <div className="flex flex-col min-w-0 justify-center leading-none mt-1">
                            <span className="font-bold text-[22px] tracking-wider font-departure leading-[0.9]">
                                BlackMarket
                            </span>
                            <span className="font-bold text-[22px] tracking-wider font-departure leading-[0.9]">
                                Ledger
                            </span>
                        </div>
                    </Link>

                    <div className="flex flex-col gap-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive =
                                item.href === "/"
                                    ? pathname === "/"
                                    : pathname.startsWith(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => vibrate("nav")}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 text-[11px] font-bold uppercase tracking-widest transition-all border-l-2",
                                        isActive
                                            ? "bg-primary/5 text-primary border-primary"
                                            : "text-muted hover:text-foreground hover:bg-foreground/5 border-transparent"
                                    )}
                                >
                                    <div className="relative flex items-center justify-center">
                                        <HugeiconsIcon
                                            icon={Icon}
                                            size={16}
                                            color={isActive ? "var(--primary)" : "currentColor"}
                                        />
                                        {item.name === "Museum" && museumDrift && (
                                            <div className="absolute -top-[1px] -right-[1px] w-1.5 h-1.5 bg-warning rounded-full shadow-sm" />
                                        )}
                                    </div>
                                    <span>{item.name}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                <div className="flex flex-col gap-3 px-2">
                    <div className="flex flex-row gap-2">
                        <Link
                            href="/docs"
                            onClick={() => vibrate("nav")}
                            className="flex-1 flex items-center justify-center gap-2 h-8 bg-foreground/5 hover:bg-foreground/10 border border-border transition-all text-muted hover:text-primary"
                        >
                            <HugeiconsIcon icon={BookOpenTextIcon} size={14} />
                            <span className="text-[9px] font-bold uppercase tracking-wider">
                                Docs
                            </span>
                        </Link>
                        <button
                            onClick={toggleDark}
                            className="w-8 h-8 flex items-center justify-center bg-foreground/5 hover:bg-foreground/10 border border-border transition-all text-muted hover:text-primary"
                            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
                        >
                            <HugeiconsIcon icon={isDark ? Sun01Icon : Moon01Icon} size={16} />
                        </button>
                    </div>

                    <div className="flex flex-row gap-2 pt-3 border-t border-border">
                        <a
                            href="https://discord.gg/Xz4GZfh4ep"
                            target="_blank"
                            rel="noreferrer noopener"
                            className="flex-1 flex items-center justify-center h-8 border border-border hover:bg-foreground/5 transition-all text-muted hover:text-[#5865f2]"
                        >
                            <HugeiconsIcon icon={DiscordIcon} size={16} />
                        </a>
                        <a
                            href="https://buymeacoffee.com/pixelghost3165209"
                            target="_blank"
                            rel="noreferrer noopener"
                            className="flex-[2] flex items-center justify-center h-8 bg-[#FFDD00] text-black font-bold text-[9px] uppercase tracking-wider hover:opacity-90 transition-all border border-black/10"
                        >
                            SUPPORT DEV
                        </a>
                    </div>
                </div>
            </aside>

            {isDrawerOpen && (
                <div className="sm:hidden fixed inset-0 top-16 z-40">
                    <button
                        type="button"
                        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                        onClick={() => setIsDrawerOpen(false)}
                    />
                    <div className="absolute right-0 top-0 h-full w-full max-w-[280px] border-l-2 border-primary bg-panel shadow-2xl">
                        <div className="flex flex-col gap-1 p-4 pt-10">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive =
                                    item.href === "/"
                                        ? pathname === "/"
                                        : pathname.startsWith(item.href);

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => {
                                            vibrate("nav");
                                            setIsDrawerOpen(false);
                                        }}
                                        className={cn(
                                            "flex items-center gap-4 px-6 py-4 text-[13px] font-bold uppercase tracking-widest transition-all",
                                            isActive
                                                ? "bg-primary text-primary-foreground"
                                                : "text-muted hover:text-foreground hover:bg-foreground/5"
                                        )}
                                    >
                                        <div className="relative flex items-center justify-center">
                                            <HugeiconsIcon
                                                icon={Icon}
                                                size={18}
                                                color={
                                                    isActive
                                                        ? "var(--primary-foreground)"
                                                        : "currentColor"
                                                }
                                            />
                                            {item.name === "Museum" && museumDrift && (
                                                <div className="absolute -top-[1px] -right-[1px] w-1.5 h-1.5 bg-warning rounded-full shadow-sm" />
                                            )}
                                        </div>
                                        <span>{item.name}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
