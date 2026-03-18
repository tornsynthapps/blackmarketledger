"use client";

import { History, GitCommitHorizontal } from "lucide-react";
import pkg from '../../package.json';

export default function ChangelogPage() {
    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Version History</h1>
                <p className="text-foreground/60 mt-2">Track the latest updates and improvements.</p>
            </div>

            <div className="space-y-6">

                {/* Current Version */}
                <div className="bg-panel border border-border p-6 rounded-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10" />
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-primary/10 rounded-lg text-primary">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">v{pkg.version} <span className="text-sm font-medium text-primary ml-2 bg-primary/10 px-2 py-0.5 rounded-full">Current</span></h2>
                            <p className="text-sm text-foreground/50 mt-0.5">March 18, 2026</p>
                        </div>
                    </div>

                    <ul className="space-y-3 relative before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-border/60 ml-2">
                        <li className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-6 h-6 bg-panel flex items-center justify-center">
                                <GitCommitHorizontal className="w-4 h-4 text-foreground/40" />
                            </div>
                            <span className="font-semibold text-foreground/90">Recharts Data Visualization</span>
                            <p className="text-sm text-foreground/70 mt-1">Added recharts library for enhanced data visualization capabilities, enabling interactive charts and graphs for trading analytics.</p>
                        </li>
                        <li className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-6 h-6 bg-panel flex items-center justify-center">
                                <GitCommitHorizontal className="w-4 h-4 text-foreground/40" />
                            </div>
                            <span className="font-semibold text-foreground/90">Points Market Event Parsing</span>
                            <p className="text-sm text-foreground/70 mt-1">Enhanced log parsing to support points market buy/sell events, expanding transaction tracking capabilities.</p>
                        </li>
                    </ul>
                </div>

                {/* v3.1.0 */}
                <div className="bg-panel/50 border border-border/50 p-6 rounded-xl relative opacity-80 mt-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-foreground/5 rounded-lg text-foreground/60">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground/80">v3.1.0</h2>
                            <p className="text-sm text-foreground/50 mt-0.5">March 17, 2026</p>
                        </div>
                    </div>

                    <ul className="space-y-3 relative before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-border/60 ml-2">
                        <li className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-6 h-6 bg-panel flex items-center justify-center">
                                <GitCommitHorizontal className="w-4 h-4 text-foreground/40" />
                            </div>
                            <span className="font-semibold text-foreground/90">Google Drive Integration</span>
                            <p className="text-sm text-foreground/70 mt-1">Support for persistent cloud storage and synchronization across devices using Google Drive.</p>
                        </li>
                        <li className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-6 h-6 bg-panel flex items-center justify-center">
                                <GitCommitHorizontal className="w-4 h-4 text-foreground/40" />
                            </div>
                            <span className="font-semibold text-foreground/90">BML Connect Extension Deprecation</span>
                            <p className="text-sm text-foreground/70 mt-1">Transitioned core sync and storage functionality directly into the web app, marking the legacy browser extension as deprecated.</p>
                        </li>
                        <li className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-6 h-6 bg-panel flex items-center justify-center">
                                <GitCommitHorizontal className="w-4 h-4 text-foreground/40" />
                            </div>
                            <span className="font-semibold text-foreground/90">Advanced Log Parsing</span>
                            <p className="text-sm text-foreground/70 mt-1">Expanded regex engine support to handle more complex transaction types from the latest game updates.</p>
                        </li>
                        <li className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-6 h-6 bg-panel flex items-center justify-center">
                                <GitCommitHorizontal className="w-4 h-4 text-foreground/40" />
                            </div>
                            <span className="font-semibold text-foreground/90">Enhanced UI & Experience</span>
                            <p className="text-sm text-foreground/70 mt-1">Overall UI update with improved layout stability, faster transitions, and refined visual components for a more premium feel.</p>
                        </li>
                    </ul>
                </div>

                {/* v3.0.0 */}
                <div className="bg-panel/50 border border-border/50 p-6 rounded-xl relative opacity-80 mt-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-foreground/5 rounded-lg text-foreground/60">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground/80">v3.0.0</h2>
                            <p className="text-sm text-foreground/50 mt-0.5">March 15, 2026</p>
                        </div>
                    </div>

                    <ul className="space-y-3 relative before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-border/60 ml-2">
                        <li className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-6 h-6 bg-panel flex items-center justify-center">
                                <GitCommitHorizontal className="w-4 h-4 text-foreground/40" />
                            </div>
                            <span className="font-semibold text-foreground/90">Shared Service Drawer & Theme Controls</span>
                            <p className="text-sm text-foreground/70 mt-1">Added a global active-services drawer with compact status indicators, fixed light mode class handling, and cleaned up mobile stacking and overlay behavior so navigation and banners behave correctly across the app.</p>
                        </li>
                        <li className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-6 h-6 bg-panel flex items-center justify-center">
                                <GitCommitHorizontal className="w-4 h-4 text-foreground/40" />
                            </div>
                            <span className="font-semibold text-foreground/90">Weav3r & Terminal Workflow Refresh</span>
                            <p className="text-sm text-foreground/70 mt-1">Weav3r setup now derives the Torn user ID automatically from the saved API key, the Terminal now links to a dedicated short log-formats doc page, and forum or donation banners dismiss reliably again.</p>
                        </li>
                        <li className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-6 h-6 bg-panel flex items-center justify-center">
                                <GitCommitHorizontal className="w-4 h-4 text-foreground/40" />
                            </div>
                            <span className="font-semibold text-foreground/90">BML Connect Storage & Tunnel Options</span>
                            <p className="text-sm text-foreground/70 mt-1">Added options to use the extension database or Google Drive for sync storage, plus a dedicated tunnel path for more reliable access to the BML Connect extension from the web app.</p>
                        </li>
                    </ul>
                </div>

                {/* v2.5.0 */}
                <div className="bg-panel/50 border border-border/50 p-6 rounded-xl relative opacity-80 mt-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-foreground/5 rounded-lg text-foreground/60">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground/80">v2.5.0</h2>
                            <p className="text-sm text-foreground/50 mt-0.5">March 11, 2026</p>
                        </div>
                    </div>

                    <ul className="space-y-3 relative before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-border/60 ml-2">
                        <li className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-6 h-6 bg-panel flex items-center justify-center">
                                <GitCommitHorizontal className="w-4 h-4 text-foreground/40" />
                            </div>
                            <span className="font-semibold text-foreground/90">Documentation & Guides</span>
                            <p className="text-sm text-foreground/70 mt-1">Added a beautiful, dynamic `/docs` route with sidebar navigation, rendering Markdown documentation files. Covered app features, BML Connect extension setup, and troubleshooting.</p>
                        </li>
                        <li className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-6 h-6 bg-panel flex items-center justify-center">
                                <GitCommitHorizontal className="w-4 h-4 text-foreground/40" />
                            </div>
                            <span className="font-semibold text-foreground/90">IndexedDB V2 Migration</span>
                            <p className="text-sm text-foreground/70 mt-1">Upgraded local storage architecture from a single JSON string block to a dedicated IndexedDB store using individual objects, radically improving performance for huge trading histories. Legacy data seamlessly migrates in the background.</p>
                        </li>
                    </ul>
                </div>

                {/* v2.4.1 */}
                <div className="bg-panel/50 border border-border/50 p-6 rounded-xl relative opacity-80 mt-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-foreground/5 rounded-lg text-foreground/60">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground/80">v2.4.1</h2>
                            <p className="text-sm text-foreground/50 mt-0.5">March 11, 2026</p>
                        </div>
                    </div>

                    <ul className="space-y-3 relative before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-border/60 ml-2">
                        <li className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-6 h-6 bg-panel flex items-center justify-center">
                                <GitCommitHorizontal className="w-4 h-4 text-foreground/40" />
                            </div>
                            <span className="font-semibold text-foreground/90">BML Connect UX + Packaging Update</span>
                            <p className="text-sm text-foreground/70 mt-1">Moved the extension into the new bmlconnect folder, added overlay toggle + drag movement controls, linked popup legal pages, updated policy pages for BML Connect data handling, and added a build script that outputs Chrome and Firefox extension packages.</p>
                        </li>
                    </ul>
                </div>

                {/* v2.4.0 */}
                <div className="bg-panel/50 border border-border/50 p-6 rounded-xl relative opacity-80 mt-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-foreground/5 rounded-lg text-foreground/60">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground/80">v2.4.0</h2>
                            <p className="text-sm text-foreground/50 mt-0.5">March 11, 2026</p>
                        </div>
                    </div>

                    <ul className="space-y-3 relative before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-border/60 ml-2">
                        <li className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-6 h-6 bg-panel flex items-center justify-center">
                                <GitCommitHorizontal className="w-4 h-4 text-foreground/40" />
                            </div>
                            <span className="font-semibold text-foreground/90">BML Connect Subscription Integration</span>
                            <p className="text-sm text-foreground/70 mt-1">Renamed the extension to BML Connect, added Supabase-backed subscription verification via Torn API key sign-in, and restricted Torn overlay rendering to active subscribers while still showing signed-in profile details in extension UI.</p>
                        </li>
                    </ul>
                </div>

                {/* v2.3.3 */}
                <div className="bg-panel/50 border border-border/50 p-6 rounded-xl relative opacity-80 mt-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-foreground/5 rounded-lg text-foreground/60">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground/80">v2.3.3</h2>
                            <p className="text-sm text-foreground/50 mt-0.5">March 11, 2026</p>
                        </div>
                    </div>

                    <ul className="space-y-3 relative before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-border/60 ml-2">
                        <li className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-6 h-6 bg-panel flex items-center justify-center">
                                <GitCommitHorizontal className="w-4 h-4 text-foreground/40" />
                            </div>
                            <span className="font-semibold text-foreground/90">Torn Companion Browser Extension</span>
                            <p className="text-sm text-foreground/70 mt-1">Added a new Chrome/Firefox browser extension scaffold that syncs cost-basis summaries from blackmarketledger.web.app localStorage and displays them in an on-page Torn overlay.</p>
                        </li>
                    </ul>
                </div>

                {/* v2.3.2 */}
                <div className="bg-panel/50 border border-border/50 p-6 rounded-xl relative opacity-80 mt-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-foreground/5 rounded-lg text-foreground/60">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground/80">v2.3.2</h2>
                            <p className="text-sm text-foreground/50 mt-0.5">March 08, 2026</p>
                        </div>
                    </div>

                    <ul className="space-y-3 relative before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-border/60 ml-2">
                        <li className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-6 h-6 bg-panel flex items-center justify-center">
                                <GitCommitHorizontal className="w-4 h-4 text-foreground/40" />
                            </div>
                            <span className="font-semibold text-foreground/90">Firebase Hosting Migration</span>
                            <p className="text-sm text-foreground/70 mt-1">Migrated deployment from GitHub Pages to Firebase Hosting at blackmarketledger.web.app. Added automated PR preview deployments via GitHub Actions and a dedicated deploy npm script.</p>
                        </li>
                    </ul>
                </div>

                {/* v2.3.1 */}
                <div className="bg-panel/50 border border-border/50 p-6 rounded-xl relative opacity-80 mt-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-foreground/5 rounded-lg text-foreground/60">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground/80">v2.3.1</h2>
                            <p className="text-sm text-foreground/50 mt-0.5">March 07, 2026</p>
                        </div>
                    </div>

                    <ul className="space-y-3 relative before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-border/60 ml-2">
                        <li className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-6 h-6 bg-panel flex items-center justify-center">
                                <GitCommitHorizontal className="w-4 h-4 text-foreground/40" />
                            </div>
                            <span className="font-semibold text-foreground/90">Haptic Feedback Fixes</span>
                            <p className="text-sm text-foreground/70 mt-1">Fixed haptic feedback not triggering in production builds. Standardised all navigation button feedback to use a consistent light tap pattern, and added missing haptic response to the logo link.</p>
                        </li>
                    </ul>
                </div>

                {/* v2.3.0 — now demoted */}
                <div className="bg-panel/50 border border-border/50 p-6 rounded-xl relative opacity-80 mt-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-foreground/5 rounded-lg text-foreground/60">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground/80">v2.3.0</h2>
                            <p className="text-sm text-foreground/50 mt-0.5">March 07, 2026</p>
                        </div>
                    </div>

                    <ul className="space-y-3 relative before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-border/60 ml-2">
                        <li className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-6 h-6 bg-panel flex items-center justify-center">
                                <GitCommitHorizontal className="w-4 h-4 text-foreground/40" />
                            </div>
                            <span className="font-semibold text-foreground/90">Web Haptics Feedback</span>
                            <p className="text-sm text-foreground/70 mt-1">Integrated Web Haptics support to provide immersive tactile feedback for mobile users during interactions like navigation, logging, and alerts.</p>
                        </li>
                    </ul>
                </div>

                {/* v2.2.0 */}
                <div className="bg-panel/50 border border-border/50 p-6 rounded-xl relative opacity-80 mt-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-foreground/5 rounded-lg text-foreground/60">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground/80">v2.2.0</h2>
                            <p className="text-sm text-foreground/50 mt-0.5">March 07, 2026</p>
                        </div>
                    </div>

                    <ul className="space-y-3 relative before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-border/60 ml-2">
                        <li className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-6 h-6 bg-panel flex items-center justify-center">
                                <GitCommitHorizontal className="w-4 h-4 text-foreground/40" />
                            </div>
                            <span className="font-semibold text-foreground/90">Robust Log Parsing Strategy</span>
                            <p className="text-sm text-foreground/70 mt-1">Updated parser to seamlessly read and sanitize bazaar and item market transaction logs directly from the game's system events.</p>
                        </li>
                        <li className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-6 h-6 bg-panel flex items-center justify-center">
                                <GitCommitHorizontal className="w-4 h-4 text-foreground/40" />
                            </div>
                            <span className="font-semibold text-foreground/90">Syntax Highlighting & Validation</span>
                            <p className="text-sm text-foreground/70 mt-1">Shorthand log input now features real-time syntax highlighting showing invalid logs with an aggressive red background overlay.</p>
                        </li>
                        <li className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-6 h-6 bg-panel flex items-center justify-center">
                                <GitCommitHorizontal className="w-4 h-4 text-foreground/40" />
                            </div>
                            <span className="font-semibold text-foreground/90">Rapid Paste Support</span>
                            <p className="text-sm text-foreground/70 mt-1">When pasting lines sequentially into the Add page, correctly parsed logs automatically append trailing newlines allowing rapid batch creation.</p>
                        </li>
                    </ul>
                </div>

                {/* v2.1.0 */}
                <div className="bg-panel/50 border border-border/50 p-6 rounded-xl relative opacity-80 mt-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-foreground/5 rounded-lg text-foreground/60">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground/80">v2.1.0</h2>
                            <p className="text-sm text-foreground/50 mt-0.5">March 07, 2026</p>
                        </div>
                    </div>

                    <ul className="space-y-3 relative before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-border/60 ml-2">
                        <li className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-6 h-6 bg-panel flex items-center justify-center">
                                <GitCommitHorizontal className="w-4 h-4 text-foreground/40" />
                            </div>
                            <span className="font-semibold text-foreground/90">UI Improvements & Theming</span>
                            <p className="text-sm text-foreground/70 mt-1">Introduced a comprehensive UI overhaul featuring page-specific color themes, Space Grotesk/Mono typography, and glowing stat card backgrounds.</p>
                        </li>
                        <li className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-6 h-6 bg-panel flex items-center justify-center">
                                <GitCommitHorizontal className="w-4 h-4 text-foreground/40" />
                            </div>
                            <span className="font-semibold text-foreground/90">Museum Dashboard Restructure</span>
                            <p className="text-sm text-foreground/70 mt-1">Refactored Museum to focus on item set economics, removing raw flushies and adding detailed Set Assembly Cost calculations for Flowers and Plushies.</p>
                        </li>
                    </ul>
                </div>

                {/* v2.0.0 */}
                <div className="bg-panel/50 border border-border/50 p-6 rounded-xl relative opacity-80 mt-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-foreground/5 rounded-lg text-foreground/60">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground/80">v2.0.0</h2>
                            <p className="text-sm text-foreground/50 mt-0.5">March 07, 2026</p>
                        </div>
                    </div>

                    <ul className="space-y-3 relative before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-border/60 ml-2">
                        <li className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-6 h-6 bg-panel flex items-center justify-center">
                                <GitCommitHorizontal className="w-4 h-4 text-foreground/40" />
                            </div>
                            <span className="font-semibold text-foreground/90">Abroad Tracking Feature</span>
                            <p className="text-sm text-foreground/70 mt-1">Introduced an entirely new dashboard dedicated to tracking items explicitly purchased from international markets. Items are separated securely via tagging.</p>
                        </li>
                        <li className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-6 h-6 bg-panel flex items-center justify-center">
                                <GitCommitHorizontal className="w-4 h-4 text-foreground/40" />
                            </div>
                            <span className="font-semibold text-foreground/90">Weav3r Pricelist Self Sells</span>
                            <p className="text-sm text-foreground/70 mt-1">Users can now instantly "Self Sell" their Abroad items back to their normal ledger using accurate real-time market prices pulled automatically via the Weav3r integration.</p>
                        </li>
                        <li className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-6 h-6 bg-panel flex items-center justify-center">
                                <GitCommitHorizontal className="w-4 h-4 text-foreground/40" />
                            </div>
                            <span className="font-semibold text-foreground/90">Smart Sell Splits</span>
                            <p className="text-sm text-foreground/70 mt-1">Added background validation inside the store parser. If you have mixed abroad and normal stock, the application automatically divides standard generic sales safely across both ledgers.</p>
                        </li>
                    </ul>
                </div>

                {/* v1.1.2 */}
                <div className="bg-panel/50 border border-border/50 p-6 rounded-xl relative opacity-80 mt-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-foreground/5 rounded-lg text-foreground/60">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground/80">v1.1.2</h2>
                            <p className="text-sm text-foreground/50 mt-0.5">March 07, 2026</p>
                        </div>
                    </div>

                    <ul className="space-y-3 relative before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-border/60 ml-2">
                        <li className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-6 h-6 bg-panel flex items-center justify-center">
                                <GitCommitHorizontal className="w-4 h-4 text-foreground/40" />
                            </div>
                            <span className="font-semibold text-foreground/90">Inline Abroad Log Conversion</span>
                            <p className="text-sm text-foreground/70 mt-1">Abroad logs pasted into the Add Logs page are now automatically converted into standard inline format for seamless live preview validation.</p>
                        </li>
                    </ul>
                </div>

                {/* v1.1.1 */}
                <div className="bg-panel/50 border border-border/50 p-6 rounded-xl relative opacity-80 mt-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-foreground/5 rounded-lg text-foreground/60">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground/80">v1.1.1</h2>
                            <p className="text-sm text-foreground/50 mt-0.5">March 06, 2026</p>
                        </div>
                    </div>

                    <ul className="space-y-3 relative before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-border/60 ml-2">
                        <li className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-6 h-6 bg-panel flex items-center justify-center">
                                <GitCommitHorizontal className="w-4 h-4 text-foreground/40" />
                            </div>
                            <span className="font-semibold text-foreground/90">Torn Abroad Logs</span>
                            <p className="text-sm text-foreground/70 mt-1">Added log parsing support for item purchases directly from Torn abroad markets.</p>
                        </li>
                    </ul>
                </div>

                {/* v1.1.0 */}
                <div className="bg-panel/50 border border-border/50 p-6 rounded-xl relative opacity-80 mt-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-foreground/5 rounded-lg text-foreground/60">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground/80">v1.1.0</h2>
                            <p className="text-sm text-foreground/50 mt-0.5">March 06, 2026</p>
                        </div>
                    </div>

                    <ul className="space-y-3 relative before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-border/60 ml-2">
                        <li className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-6 h-6 bg-panel flex items-center justify-center">
                                <GitCommitHorizontal className="w-4 h-4 text-foreground/40" />
                            </div>
                            <span className="font-semibold text-foreground/90">BlackMarket Ledger Rebrand</span>
                            <p className="text-sm text-foreground/70 mt-1">Renamed the application from Torn Trade Tracker to BlackMarket Ledger. Added "by Torn Synth Apps" branding.</p>
                        </li>
                        <li className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-6 h-6 bg-panel flex items-center justify-center">
                                <GitCommitHorizontal className="w-4 h-4 text-foreground/40" />
                            </div>
                            <span className="font-semibold text-foreground/90">Community & Support Banners</span>
                            <p className="text-sm text-foreground/70 mt-1">Introduced smart, unobtrusive banners to encourage forum bumps and user donations, complete with local-storage probability scaling.</p>
                        </li>
                        <li className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-6 h-6 bg-panel flex items-center justify-center">
                                <GitCommitHorizontal className="w-4 h-4 text-foreground/40" />
                            </div>
                            <span className="font-semibold text-foreground/90">Museum Dashboard & Sets</span>
                            <p className="text-sm text-foreground/70 mt-1">Renamed the Points view to Museum. Added detailed tracking for complete Flower and Plushie Sets. Implemented precise calculation of sets available to convert based on current stock.</p>
                        </li>
                        <li className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-6 h-6 bg-panel flex items-center justify-center">
                                <GitCommitHorizontal className="w-4 h-4 text-foreground/40" />
                            </div>
                            <span className="font-semibold text-foreground/90">Set Conversions</span>
                            <p className="text-sm text-foreground/70 mt-1">Supported shorthand parser logs for 'cf;x' and 'cp;x' to mass convert grouped sets into points perfectly preserving initial cost-basis value transfers.</p>
                        </li>
                        <li className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-6 h-6 bg-panel flex items-center justify-center">
                                <GitCommitHorizontal className="w-4 h-4 text-foreground/40" />
                            </div>
                            <span className="font-semibold text-foreground/90">Flushie Migration Utilities</span>
                            <p className="text-sm text-foreground/70 mt-1">Added a new tool in the Database Migration page allowing users to distribute unstructured older Flushie stock directly into tracked individual Flower and Plushie values.</p>
                        </li>
                    </ul>
                </div>

                {/* v0.1.3 */}
                <div className="bg-panel/50 border border-border/50 p-6 rounded-xl relative opacity-80 mt-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-foreground/5 rounded-lg text-foreground/60">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground/80">v0.1.3</h2>
                            <p className="text-sm text-foreground/50 mt-0.5">March 06, 2026</p>
                        </div>
                    </div>

                    <ul className="space-y-3 relative before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-border/60 ml-2">
                        <li className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-6 h-6 bg-panel flex items-center justify-center">
                                <GitCommitHorizontal className="w-4 h-4 text-foreground/40" />
                            </div>
                            <span className="font-semibold text-foreground/90">Automated GitHub Pages Deployment</span>
                            <p className="text-sm text-foreground/70 mt-1">Configured Next.js static asset export logic targeting GitHub Actions for continuous deployment on the `main` branch.</p>
                        </li>
                    </ul>
                </div>

                {/* v0.1.2 */}
                <div className="bg-panel/50 border border-border/50 p-6 rounded-xl relative opacity-80 mt-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-foreground/5 rounded-lg text-foreground/60">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground/80">v0.1.2</h2>
                            <p className="text-sm text-foreground/50 mt-0.5">March 06, 2026</p>
                        </div>
                    </div>

                    <ul className="space-y-3 relative before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-border/60 ml-2">
                        <li className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-6 h-6 bg-panel flex items-center justify-center">
                                <GitCommitHorizontal className="w-4 h-4 text-foreground/40" />
                            </div>
                            <span className="font-semibold text-foreground/90">Client-Side Fetch Architecture</span>
                            <p className="text-sm text-foreground/70 mt-1">Moved Weav3r API data fetching out of the Next.js server proxy directly onto the client side for better performance.</p>
                        </li>
                    </ul>
                </div>

                {/* v0.1.1 */}
                <div className="bg-panel/50 border border-border/50 p-6 rounded-xl relative opacity-80 mt-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-foreground/5 rounded-lg text-foreground/60">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground/80">v0.1.1</h2>
                            <p className="text-sm text-foreground/50 mt-0.5">March 06, 2026</p>
                        </div>
                    </div>

                    <ul className="space-y-3 relative before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-border/60 ml-2">
                        <li className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-6 h-6 bg-panel flex items-center justify-center">
                                <GitCommitHorizontal className="w-4 h-4 text-foreground/40" />
                            </div>
                            <span className="font-semibold text-foreground/90">Footer & Changelog</span>
                            <p className="text-sm text-foreground/70 mt-1">Added a global footer, copyright link, and version history page.</p>
                        </li>
                    </ul>
                </div>

                {/* v0.1.0 */}
                <div className="bg-panel/50 border border-border/50 p-6 rounded-xl relative opacity-80 mt-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-foreground/5 rounded-lg text-foreground/60">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground/80">v0.1.0</h2>
                            <p className="text-sm text-foreground/50 mt-0.5">March 06, 2026</p>
                        </div>
                    </div>

                    <ul className="space-y-3 relative before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-border/60 ml-2">
                        <li className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-6 h-6 bg-panel flex items-center justify-center">
                                <GitCommitHorizontal className="w-4 h-4 text-foreground/40" />
                            </div>
                            <span className="font-semibold text-foreground/90">Smart Logs Parsing</span>
                            <p className="text-sm text-foreground/70 mt-1">Added a RegExp engine to auto-parse standard Torn Bazaar sale strings copied directly from the game.</p>
                        </li>
                        <li className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-6 h-6 bg-panel flex items-center justify-center">
                                <GitCommitHorizontal className="w-4 h-4 text-foreground/40" />
                            </div>
                            <span className="font-semibold text-foreground/90">Dashboard Column Sorting</span>
                            <p className="text-sm text-foreground/70 mt-1">Inventory table can now be sorted dynamically by Item Name, Stock, Avg Cost, Total Cost, or Realized Profit.</p>
                        </li>
                        <li className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-6 h-6 bg-panel flex items-center justify-center">
                                <GitCommitHorizontal className="w-4 h-4 text-foreground/40" />
                            </div>
                            <span className="font-semibold text-foreground/90">Strict Data Lowercasing</span>
                            <p className="text-sm text-foreground/70 mt-1">Refactored the parser to ensure all item strings are stored strictly lowercase in internal storage for absolute matching parity.</p>
                        </li>
                        <li className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-6 h-6 bg-panel flex items-center justify-center">
                                <GitCommitHorizontal className="w-4 h-4 text-foreground/40" />
                            </div>
                            <span className="font-semibold text-foreground/90">Dynamic UI Presentation</span>
                            <p className="text-sm text-foreground/70 mt-1">Added formatItemName utility so lowercase items appear nicely Title Cased securely on the Dashboard, Logs, and Preview pages.</p>
                        </li>
                        <li className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-6 h-6 bg-panel flex items-center justify-center">
                                <GitCommitHorizontal className="w-4 h-4 text-foreground/40" />
                            </div>
                            <span className="font-semibold text-foreground/90">Weav3r Proxy Intercept</span>
                            <p className="text-sm text-foreground/70 mt-1">Enabled Next.js backend proxy interceptor pointing to Weav3r's Trades API endpoints to gracefully circumvent browser CORS issues when fetching profiles.</p>
                        </li>
                    </ul>
                </div>

                {/* Initial Prototype */}
                <div className="bg-panel/50 border border-border/50 p-6 rounded-xl relative opacity-80">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-foreground/5 rounded-lg text-foreground/60">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground/80">v0.0.1</h2>
                            <p className="text-sm text-foreground/50 mt-0.5">March 05, 2026</p>
                        </div>
                    </div>

                    <ul className="space-y-3 relative before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-border/60 ml-2">
                        <li className="relative pl-8">
                            <div className="absolute left-0 top-1.5 w-6 h-6 bg-transparent flex items-center justify-center">
                                <GitCommitHorizontal className="w-4 h-4 text-foreground/30" />
                            </div>
                            <p className="text-sm text-foreground/70 mt-0.5">Initial prototype release: local-storage backed item tracking, transaction logs, basic flushie ratios, and general dashboard.</p>
                        </li>
                    </ul>
                </div>

            </div>
        </div>
    );
}
