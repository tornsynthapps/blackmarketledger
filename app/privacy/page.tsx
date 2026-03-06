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
                <p className="text-foreground/60 mt-2">Last updated: March 06, 2026</p>
            </div>

            <div className="bg-panel border border-border p-6 rounded-xl space-y-6">
                <section>
                    <h2 className="text-xl font-bold mb-2">1. Local Storage Only</h2>
                    <p className="text-foreground/80 leading-relaxed">
                        BlackMarket Ledger is designed with a privacy-first approach. All of your trading data, logs, API keys, and settings are stored <strong>strictly locally</strong> within your web browser using Local Storage.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-2">2. No Tracking or Data Collection</h2>
                    <p className="text-foreground/80 leading-relaxed">
                        We do not collect, track, aggregate, or sell any of your personal data. We do not use cookies for tracking purposes. There are no backend database servers storing your information on our end.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-2">3. Third-Party Services (Weav3r API)</h2>
                    <p className="text-foreground/80 leading-relaxed">
                        If you choose to use the Weav3r API integration to automatically fetch your trades, your API key and User ID will be sent directly from your browser to Weav3r's application programming interface (<code className="bg-foreground/10 px-1 py-0.5 rounded text-sm">api.weav3r.dev</code>). This data goes strictly to Weav3r, and does not pass through any servers controlled by the BlackMarket Ledger. Please refer to Weav3r's relevant terms and privacy policies regarding how they handle data.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-2">4. Your Control</h2>
                    <p className="text-foreground/80 leading-relaxed">
                        Because data is only stored in your browser, you have complete control over it. You can permanently delete your data at any time by clearing your browser data or using the "Clear All Tracker Data" button within the app.
                    </p>
                </section>
            </div>
        </div>
    );
}
