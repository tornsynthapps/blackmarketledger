import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { Banners } from "@/components/Banners";
import { VisitorCounter } from "@/components/VisitorCounter";
import { ServiceRail } from "@/components/ServiceRail";
import Link from "next/link";
import { PromoBannersDesktop } from "@/components/SideBanners";

const spaceGrotesk = Space_Grotesk({
    variable: "--font-space-grotesk",
    subsets: ["latin"],
});

const spaceMono = Space_Mono({
    variable: "--font-space-mono",
    weight: ["400", "700"],
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "BlackMarket Ledger",
    description: "Track inventory, profits, and flushie conversions securely in your browser.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
              try {
                const theme = localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
                  ? 'dark'
                  : 'light';
                document.documentElement.classList.toggle('dark', theme === 'dark');
                document.documentElement.classList.toggle('light', theme === 'light');
                
                if (localStorage.getItem('theme_solarized') === 'true') {
                  document.documentElement.classList.add('theme-solarized');
                }
                
                if (localStorage.getItem('theme_nav_left') === 'true') {
                  document.documentElement.classList.add('layout-nav-left');
                }
              } catch (_) {}
            `,
                    }}
                />
            </head>
            <body
                className={`${spaceGrotesk.variable} ${spaceMono.variable} font-mono antialiased selection:bg-primary selection:text-primary-foreground`}
            >
                <div className="layout-wrapper flex flex-col min-h-screen">
                    <Navigation />
                    <div className="layout-main-content flex-1 flex flex-col min-w-0">
                        <Banners />
                        <PromoBannersDesktop />
                        <main className="pt-8 pb-12 px-4 w-full max-w-6xl mx-auto flex-1 h-full flex flex-col">
                            <div className="flex-1">{children}</div>

                            <footer className="mt-24 pt-12 pb-12 border-t-2 border-primary flex flex-col md:flex-row items-center justify-between gap-8 text-[11px] uppercase tracking-widest font-bold text-muted">
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
                </div>
                <div className="fixed bottom-0 left-0 w-full h-[1px] bg-primary/10 pointer-events-none" />
                <ServiceRail />
            </body>
        </html>
    );
}
