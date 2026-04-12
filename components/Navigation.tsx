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
    { name: "Blackbox", href: "/blackbox", icon: DatabaseIcon, color: "var(--secondary)" },
    { name: "BML Connect", href: "/bmlconnect", icon: Exchange01Icon, color: "var(--primary)" },
    { name: "Account", href: "/account", icon: UserIcon, color: "var(--info)" },
    { name: "Links", href: "/links", icon: Link01Icon, color: "var(--accent-red)" },
];

export function Navigation() {
    const pathname = usePathname();
    const [isDark, setIsDark] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const { vibrate } = useHapticFeedback();

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
                        className="flex items-center gap-3"
                    >
                        <div className="bg-primary p-1.5 border border-primary">
                            <HugeiconsIcon
                                icon={DatabaseIcon}
                                size={20}
                                color="var(--primary-foreground)"
                            />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-lg tracking-tight hidden sm:block leading-none uppercase font-vt323">
                                BlackMarket Ledger
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-mono font-bold text-primary px-1 border border-primary/20">
                                    V{pkg.version}
                                </span>
                                <span className="text-[9px] font-bold text-muted uppercase tracking-wider hidden sm:block">
                                    Industrial Engine
                                </span>
                            </div>
                        </div>
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
                                    <HugeiconsIcon
                                        icon={Icon}
                                        size={14}
                                        color={
                                            isActive ? "var(--primary-foreground)" : "currentColor"
                                        }
                                    />
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
                        className="flex items-center gap-3 px-2"
                    >
                        <div className="bg-primary p-2">
                            <HugeiconsIcon
                                icon={DatabaseIcon}
                                size={24}
                                color="var(--primary-foreground)"
                            />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="font-bold text-lg tracking-tighter leading-none uppercase font-vt323">
                                BLACKMARKET LEDGER
                            </span>
                            <div className="flex items-center gap-1 mt-1">
                                <span className="text-[10px] font-mono font-bold text-muted">
                                    V{pkg.version}
                                </span>
                            </div>
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
                                    <HugeiconsIcon
                                        icon={Icon}
                                        size={16}
                                        color={isActive ? "var(--primary)" : "currentColor"}
                                    />
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
                                        <HugeiconsIcon
                                            icon={Icon}
                                            size={18}
                                            color={
                                                isActive
                                                    ? "var(--primary-foreground)"
                                                    : "currentColor"
                                            }
                                        />
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
