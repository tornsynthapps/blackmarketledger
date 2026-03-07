"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Wallet, Database, PlusCircle, List, Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import pkg from '@/package.json';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Museum", href: "/museum", icon: Wallet },
    { name: "Abroad", href: "/abroad", icon: Wallet },
    { name: "Logs", href: "/logs", icon: List },
    { name: "Add Data", href: "/add", icon: PlusCircle },
];

export function Navigation() {
    const pathname = usePathname();
    const [isDark, setIsDark] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        setIsDark(document.documentElement.classList.contains("dark"));
    }, []);

    const toggleDark = () => {
        const next = !isDark;
        setIsDark(next);
        if (next) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    };

    return (
        <nav className="sticky top-0 h-16 bg-panel border-b border-border/50 z-50 backdrop-blur-md bg-opacity-80">
            <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                    <Database className="w-6 h-6 text-primary" />
                    <div className="flex flex-col">
                        <span className="font-bold text-lg tracking-tight hidden sm:block leading-none">BlackMarket Ledger</span>
                        <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] font-mono text-foreground/50 hidden sm:block">v{pkg.version}</span>
                            <span className="text-[10px] font-medium text-foreground/40 hidden sm:block">by Torn Synth Apps</span>
                        </div>
                    </div>
                </Link>

                <div className="flex items-center gap-1 sm:gap-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        // Exact match for dashboard, startswith for others if detail pages exist
                        const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-primary/10 text-primary"
                                        : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
                                )}
                            >
                                <Icon className="w-4 h-4" />
                                <span className="hidden sm:inline">{item.name}</span>
                            </Link>
                        );
                    })}
                    {mounted && (
                        <button
                            onClick={toggleDark}
                            className="p-1.5 ml-1 sm:ml-2 rounded-lg text-foreground/70 hover:bg-foreground/5 hover:text-foreground transition-colors"
                            aria-label="Toggle dark mode"
                        >
                            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
}
