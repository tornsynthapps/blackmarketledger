import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-background">
            {/* Sidebar */}
            <aside className="w-full md:w-72 border-r-2 border-primary bg-panel p-8 shrink-0 md:h-screen md:sticky md:top-0">
                <nav className="space-y-8 text-[11px] uppercase tracking-widest font-bold font-mono">
                    <div className="mb-10">
                        <Link
                            href="/"
                            className="flex items-center gap-2 text-primary hover:text-foreground transition-colors border-b-2 border-primary pb-4 mb-4"
                        >
                            <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
                            Back to App
                        </Link>
                    </div>

                    <div>
                        <h3 className="text-foreground/40 mb-4 px-3 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-primary" />
                            Getting Started
                        </h3>
                        <ul className="space-y-1">
                            <li>
                                <Link
                                    href="/docs/introduction"
                                    className="block px-3 py-2 hover:bg-primary/10 text-foreground/70 hover:text-primary transition-all border-l-2 border-transparent hover:border-primary"
                                >
                                    Introduction
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/docs/app-guide"
                                    className="block px-3 py-2 hover:bg-primary/10 text-foreground/70 hover:text-primary transition-all border-l-2 border-transparent hover:border-primary"
                                >
                                    App User Guide
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-foreground/40 mb-4 px-3 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-primary" />
                            Core Features
                        </h3>
                        <ul className="space-y-1">
                            <li>
                                <Link
                                    href="/docs/features/auto-pilot"
                                    className="block px-3 py-2 hover:bg-primary/10 text-foreground/70 hover:text-primary transition-all border-l-2 border-transparent hover:border-primary"
                                >
                                    🤖 Auto-Pilot
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/docs/features/abroad-self-sell"
                                    className="block px-3 py-2 hover:bg-primary/10 text-foreground/70 hover:text-primary transition-all border-l-2 border-transparent hover:border-primary"
                                >
                                    ✈️ Abroad & Self-Sell
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/docs/features/stats-charts"
                                    className="block px-3 py-2 hover:bg-primary/10 text-foreground/70 hover:text-primary transition-all border-l-2 border-transparent hover:border-primary"
                                >
                                    📊 Stats & Charts
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-foreground/40 mb-4 px-3 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-primary" />
                            Resource
                        </h3>
                        <ul className="space-y-1">
                            <li>
                                <Link
                                    href="/docs/log-formats"
                                    className="block px-3 py-2 hover:bg-primary/10 text-foreground/70 hover:text-primary transition-all border-l-2 border-transparent hover:border-primary"
                                >
                                    Log Formats
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/docs/faq-troubleshooting"
                                    className="block px-3 py-2 hover:bg-primary/10 text-foreground/70 hover:text-primary transition-all border-l-2 border-transparent hover:border-primary"
                                >
                                    FAQ / Support
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div className="pt-8 border-t border-border/50">
                        <h3 className="text-foreground/40 mb-4 px-3 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-primary" />
                            System
                        </h3>
                        <ul className="space-y-1">
                            <li>
                                <Link
                                    href="/changelog"
                                    className="block px-3 py-2 hover:bg-primary/10 text-foreground/70 hover:text-primary transition-all border-l-2 border-transparent hover:border-primary"
                                >
                                    Changelog
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/migration"
                                    className="block px-3 py-2 hover:bg-primary/10 text-foreground/70 hover:text-primary transition-all border-l-2 border-transparent hover:border-primary"
                                >
                                    Migration
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/terms"
                                    className="block px-3 py-2 hover:bg-primary/10 text-foreground/70 hover:text-primary transition-all border-l-2 border-transparent hover:border-primary"
                                >
                                    Terms
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/privacy"
                                    className="block px-3 py-2 hover:bg-primary/10 text-foreground/70 hover:text-primary transition-all border-l-2 border-transparent hover:border-primary"
                                >
                                    Privacy
                                </Link>
                            </li>
                        </ul>
                    </div>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 md:p-12 lg:p-20 w-full min-w-0 bg-background/50">
                <div className="prose prose-invert prose-primary max-w-5xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
