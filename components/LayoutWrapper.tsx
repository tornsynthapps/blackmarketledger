"use client";

import { usePathname } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { Banners } from "@/components/Banners";
import { VisitorCounter } from "@/components/VisitorCounter";
import { ServiceRail } from "@/components/ServiceRail";
import Link from "next/link";
import { PromoBannersDesktop } from "@/components/SideBanners";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isDocs = pathname?.startsWith("/docs");

    if (isDocs) {
        return <>{children}</>;
    }

    return (
        <div className="layout-wrapper flex flex-col min-h-screen">
            <Navigation />
            <div className="layout-main-content flex-1 flex flex-col min-w-0">
                <Banners />
                <PromoBannersDesktop />
                <main className="pt-8 pb-12 px-4 w-full max-w-6xl mx-auto flex-1 h-full flex flex-col">
                    <div className="flex-1">{children}</div>

                    <footer className="mt-24 pt-12 pb-12 border-t-2 border-primary flex flex-col md:flex-row items-center justify-between gap-8 text-[11px] uppercase tracking-widest font-bold text-muted font-vt323">
                        <div className="flex items-center gap-4">
                            <div className="bg-primary text-primary-foreground px-2 py-0.5">
                                BML
                            </div>
                            <span>&copy; {new Date().getFullYear()}</span>
                            <a
                                href="https://www.torn.com/profiles.php?XID=3165209"
                                target="_blank"
                                rel="noreferrer noopener"
                                className="text-foreground hover:text-info transition-colors"
                            >
                                PixelGhost [3165209]
                            </a>
                        </div>

                        <div className="flex-1 flex justify-center opacity-70 grayscale">
                            <VisitorCounter />
                        </div>

                        <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-8 gap-y-2">
                            <Link
                                href="/changelog"
                                className="hover:text-foreground transition-colors"
                            >
                                Changelog
                            </Link>
                            <Link
                                href="/migration"
                                className="hover:text-foreground transition-colors"
                            >
                                Migration
                            </Link>
                            <Link
                                href="/terms"
                                className="hover:text-foreground transition-colors"
                            >
                                Terms
                            </Link>
                            <Link
                                href="/privacy"
                                className="hover:text-foreground transition-colors"
                            >
                                Privacy
                            </Link>
                        </div>
                    </footer>
                </main>
            </div>
            <div className="fixed bottom-0 left-0 w-full h-[1px] bg-primary/10 pointer-events-none" />
            <ServiceRail />
        </div>
    );
}
