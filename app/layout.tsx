import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Torn Trade Tracker",
  description: "Track inventory, profits, and flushie conversions securely in your browser.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-primary/30`}
      >
        <Navigation />
        <main className="pt-24 pb-12 min-h-screen px-4 max-w-6xl mx-auto flex-1 h-full flex flex-col">
          <div className="flex-1">
            {children}
          </div>

          <footer className="mt-16 pt-8 pb-4 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-foreground/50">
            <div>
              &copy; {new Date().getFullYear()}{" "}
              <a
                href="https://www.torn.com/profiles.php?XID=3165209"
                target="_blank"
                rel="noreferrer noopener"
                className="hover:text-primary transition-colors font-medium border-b border-transparent hover:border-primary pb-0.5"
              >
                PixelGhost [3165209]
              </a>
            </div>

            <div className="flex items-center gap-6">
              <Link href="/changelog" className="hover:text-foreground transition-colors">
                Version History
              </Link>
              <Link href="/migration" className="hover:text-foreground transition-colors">
                Data Migration
              </Link>
            </div>
          </footer>
        </main>
      </body>
    </html>
  );
}
