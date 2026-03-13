"use client";

import { Shield } from "lucide-react";

export default function PrivacyPolicy() {
    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4">
                    <Shield className="w-6 h-6" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
                <p className="text-foreground/60 mt-2">Last updated: March 11, 2026</p>
            </div>

            <div className="bg-panel border border-border p-6 rounded-xl space-y-6">
                <section>
                    <h2 className="text-xl font-bold mb-2">1. Web App Local Storage</h2>
                    <p className="text-foreground/80 leading-relaxed">
                        BlackMarket Ledger stores your trading logs, settings, and calculations locally in your browser for the web app experience.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-2">2. BML Connect Extension Data</h2>
                    <p className="text-foreground/80 leading-relaxed">
                        The BML Connect extension stores your Torn API key, sign-in state, subscription status, and synced cost-basis summary in browser extension storage. This data is used to show your cost-basis panel on Torn pages and can be removed by uninstalling the extension or clearing extension storage.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-2">3. Supabase Subscription Verification (only if you use BML Connect)</h2>
                    <p className="text-foreground/80 leading-relaxed">
                        When you verify inside BML Connect, your API key is sent to our Supabase edge function endpoint at <code className="bg-foreground/10 px-1 py-0.5 rounded text-sm">yxjmnkaollkpcvymiicd.supabase.co</code>. The function calls Torn&apos;s basic user endpoint to read your Torn user ID and checks subscription validity in our Supabase database.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-2">4. Third-Party Services</h2>
                    <p className="text-foreground/80 leading-relaxed">
                        If you use Weav3r features in the web app, requests are sent directly to Weav3r from your browser. If you use BML Connect verification, requests are sent to Supabase and Torn API for identity/subscription checks.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-2">5. No Advertising / Sale of Data</h2>
                    <p className="text-foreground/80 leading-relaxed">
                        We do not sell your personal data and do not run ad tracking profiles for BML Connect or BlackMarket Ledger.
                    </p>
                </section>
            </div>
        </div>
    );
}
