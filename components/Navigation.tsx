"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import pkg from '@/package.json';
import { useHapticFeedback } from "@/lib/useHapticFeedback";
import { LayoutDashboard, Database, Terminal, List, Moon, Sun, Landmark, Plane, ArrowRightLeft, Menu, X, Radar } from "lucide-react";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard, color: "#3b82f6" },
    { name: "Museum", href: "/museum", icon: Landmark, color: "#f59e0b" },
    { name: "Abroad", href: "/abroad", icon: Plane, color: "#0d9488" },
    { name: "Logs", href: "/logs", icon: List, color: "#8b5cf6" },
    { name: "Terminal", href: "/add", icon: Terminal, color: "#8b5cf6" },
    { name: "Auto-Pilot", href: "/auto", icon: Radar, color: "#f97316" },
    { name: "BML Connect", href: "/bmlconnect", icon: ArrowRightLeft, color: "#ec4899" },
];

export function Navigation() {
    const pathname = usePathname();
    const [isDark, setIsDark] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const { vibrate } = useHapticFeedback();

    useEffect(() => {
        setIsDark(document.documentElement.classList.contains("dark"));
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
            <nav className="sticky top-0 h-16 bg-panel/80 border-b border-border/50 z-[70] backdrop-blur-md">
            <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between gap-3">
                <Link href="/" onClick={() => vibrate("nav")} className="flex items-center gap-2">
                    <Database className="w-8 h-8 text-foreground" />
                    <div className="flex flex-col">
                        <span className="font-bold text-lg tracking-tight hidden sm:block leading-none">BlackMarket Ledger</span>
                        <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] font-mono text-foreground/50 hidden sm:block">v{pkg.version}</span>
                            <span className="text-[10px] font-medium text-foreground/40 hidden sm:block">by Torn Synth Apps</span>
                        </div>
                    </div>
                </Link>

                <div className="hidden sm:flex items-center gap-1 sm:gap-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => vibrate("nav")}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                    !isActive && "text-foreground/70 hover:bg-foreground/5"
                                )}
                                style={isActive ? { backgroundColor: `${item.color}1a`, color: item.color } : {}}
                            >
                                <Icon className="w-4 h-4" style={{ color: item.color }} />
                                <span className="hidden sm:inline" style={isActive ? { color: item.color } : undefined}>{item.name}</span>
                            </Link>
                        );
                    })}
                    <button
                        onClick={toggleDark}
                        className="p-1.5 ml-1 sm:ml-2 rounded-lg text-foreground/70 hover:bg-foreground/5 hover:text-foreground transition-colors"
                        aria-label="Toggle dark mode"
                    >
                        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                </div>

                <div className="flex items-center gap-1 sm:hidden">
                    <button
                        onClick={toggleDark}
                        className="p-2 rounded-lg text-foreground/70 hover:bg-foreground/5 hover:text-foreground transition-colors"
                        aria-label="Toggle dark mode"
                    >
                        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                    <button
                        onClick={() => {
                            vibrate("nav");
                            setIsDrawerOpen((open) => !open);
                        }}
                        className="p-2 rounded-lg text-foreground/80 hover:bg-foreground/5 hover:text-foreground transition-colors"
                        aria-label={isDrawerOpen ? "Close navigation menu" : "Open navigation menu"}
                        aria-expanded={isDrawerOpen}
                    >
                        {isDrawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
                </div>
            </nav>
            {isDrawerOpen && (
                <div className="sm:hidden fixed inset-0 top-16 z-40">
                    <button
                        type="button"
                        className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]"
                        aria-label="Close navigation menu"
                        onClick={() => setIsDrawerOpen(false)}
                    />
                    <div className="absolute right-0 top-0 h-full w-full max-w-xs border-l border-border bg-panel/95 backdrop-blur-xl shadow-2xl">
                        <div className="flex flex-col gap-2 p-4">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => {
                                            vibrate("nav");
                                            setIsDrawerOpen(false);
                                        }}
                                        className={cn(
                                            "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                                            !isActive && "text-foreground/75 hover:bg-foreground/5"
                                        )}
                                        style={isActive ? { backgroundColor: `${item.color}1a`, color: item.color } : {}}
                                    >
                                        <Icon className="w-5 h-5" style={{ color: item.color }} />
                                        <span style={isActive ? { color: item.color } : undefined}>{item.name}</span>
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
