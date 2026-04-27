import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { Banners } from "@/components/Banners";
import { VisitorCounter } from "@/components/VisitorCounter";
import { ServiceRail } from "@/components/ServiceRail";
import Link from "next/link";
import { PromoBannersDesktop } from "@/components/SideBanners";
import { Sour_Gummy } from "next/font/google";

const sourGummy = Sour_Gummy({
    subsets: ["latin"],
    variable: "--font-sour-gummy",
});

export const metadata: Metadata = {
    title: "BlackMarket Ledger",
    description: "Track inventory, profits, and flushie conversions securely in your browser.",
    icons: [
        { rel: "icon", url: "/logos/light/favicon.ico", media: "(prefers-color-scheme: light)" },
        { rel: "icon", url: "/logos/dark/favicon.ico", media: "(prefers-color-scheme: dark)" },
    ],
};

import { LayoutWrapper } from "@/components/LayoutWrapper";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={sourGummy.variable} suppressHydrationWarning>
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

                try {
                  const settings = JSON.parse(localStorage.getItem('ledger-settings') || '{}');
                  if (settings.themeStyle === 'playful') {
                    document.documentElement.classList.add('theme-playful');
                  }
                } catch (_) {}
              } catch (_) {}
            `,
                    }}
                />
            </head>
            <body
                className="antialiased selection:bg-primary selection:text-primary-foreground"
            >
                <LayoutWrapper>{children}</LayoutWrapper>
            </body>
        </html>
    );
}
