import type { Metadata } from "next";
import "./globals.css";
import { Sour_Gummy, Space_Mono, Cascadia_Code, VT323 } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { GeistPixelSquare } from "geist/font/pixel";

const sourGummy = Sour_Gummy({
    subsets: ["latin"],
    variable: "--font-sour-gummy",
});

const spaceMono = Space_Mono({
    subsets: ["latin"],
    weight: ["400", "700"],
    variable: "--font-space-mono-google",
});

const cascadiaCode = Cascadia_Code({
    subsets: ["latin"],
    variable: "--font-cascadia-code",
});

const vt323 = VT323({
    subsets: ["latin"],
    weight: "400",
    variable: "--font-vt323",
});

export const metadata: Metadata = {
    title: "Torn Ledger",
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
        <html
            lang="en"
            className={`${sourGummy.variable} ${spaceMono.variable} ${cascadiaCode.variable} ${vt323.variable} ${GeistSans.variable} ${GeistMono.variable} ${GeistPixelSquare.variable}`}
            style={{
                // @ts-ignore
                "--font-geist-sans": GeistSans.style.fontFamily,
                "--font-geist-mono": GeistMono.style.fontFamily,
                "--font-geist-pixel": GeistPixelSquare.style.fontFamily,
            }}
            suppressHydrationWarning
        >
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
                  const fontTheme = settings.fontTheme || (settings.themeStyle === 'modern' ? 'modern' : 'pixel');
                  document.documentElement.style.setProperty('--font-brand', '"Departure Mono", monospace');
                  if (fontTheme === 'modern') {
                    document.documentElement.classList.add('theme-modern');
                    document.documentElement.style.setProperty('--font-heading', 'var(--font-geist-pixel), monospace');
                    document.documentElement.style.setProperty('--font-sans', 'var(--font-geist-sans), sans-serif');
                    document.documentElement.style.setProperty('--font-mono', 'var(--font-geist-mono), monospace');
                  } else {
                    document.documentElement.classList.remove('theme-modern');
                    document.documentElement.style.setProperty('--font-heading', '"Departure Mono", monospace');
                    document.documentElement.style.setProperty('--font-sans', '"Departure Mono", sans-serif');
                    document.documentElement.style.setProperty('--font-mono', '"Departure Mono", monospace');
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
