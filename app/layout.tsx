import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { Banners } from "@/components/Banners";
import { VisitorCounter } from "@/components/VisitorCounter";
import Link from "next/link";

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
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body
        className={`${spaceGrotesk.variable} ${spaceMono.variable} font-sans antialiased selection:bg-primary/30`}
      >
        <Navigation />
        <Banners />
        <main className="pt-8 pb-12 min-h-screen px-4 max-w-6xl mx-auto flex-1 h-full flex flex-col">
          <div className="flex-1">
            {children}
          </div>

          <footer className="mt-16 pt-8 pb-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-foreground/50">
            <div className="flex items-center justify-center md:justify-start">
              &copy; {new Date().getFullYear()}{" "}
              <a
                href="https://www.torn.com/profiles.php?XID=3165209"
                target="_blank"
                rel="noreferrer noopener"
                className="hover:text-primary transition-colors font-medium border-b border-transparent hover:border-primary pb-0.5 ml-1"
              >
                PixelGhost [3165209]
              </a>
            </div>

            <div className="flex-1 flex justify-center">
              <VisitorCounter />
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-6 gap-y-2">
              <Link href="/changelog" className="hover:text-foreground transition-colors">
                Version History
              </Link>
              <Link href="/migration" className="hover:text-foreground transition-colors">
                Data Migration
              </Link>
              <span className="hidden sm:inline text-border">|</span>
              <Link href="/terms" className="hover:text-foreground transition-colors">
                Terms of Use
              </Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
            </div>
          </footer>
        </main>
      </body>
    </html>
  );
}
