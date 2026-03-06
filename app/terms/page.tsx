"use client";

import { FileText } from "lucide-react";

export default function TermsOfService() {
    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4">
                    <FileText className="w-6 h-6" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight">Terms of Use</h1>
                <p className="text-foreground/60 mt-2">API Terms of Service &amp; Usage Policy</p>
            </div>

            <div className="bg-panel border border-border p-6 rounded-xl space-y-6">

                <section>
                    <h2 className="text-xl font-bold mb-4">API Key Usage Disclosure</h2>
                    <p className="text-foreground/80 leading-relaxed mb-4">
                        In order to provide automatic fetching of trades through the Weav3r platform, we require you to input your Weav3r API Key. As per the official Torn API guidelines, below is the exact breakdown of how your API key and data are handled:
                    </p>

                    <div className="overflow-x-auto border border-border rounded-lg">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-foreground/5 border-b border-border">
                                <tr>
                                    <th className="p-3 font-semibold">Data Storage</th>
                                    <th className="p-3 font-semibold">Data Sharing</th>
                                    <th className="p-3 font-semibold">Purpose of Use</th>
                                    <th className="p-3 font-semibold">Key Storage &amp; Sharing</th>
                                    <th className="p-3 font-semibold">Key Access Level</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                <tr>
                                    <td className="p-3">Only locally</td>
                                    <td className="p-3">Nobody</td>
                                    <td className="p-3">Public community tools / Automation</td>
                                    <td className="p-3">Not shared. Stored securely in your browser's local storage.</td>
                                    <td className="p-3">Public / Minimal (Standard access required by Weav3r integration)</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-2">Acceptance of Terms</h2>
                    <p className="text-foreground/80 leading-relaxed">
                        By using the BlackMarket Ledger, you agree to these Terms of Use and acknowledge that your API key and generated logs remain within your device. Your data is not transmitted to us nor shared with anyone by our application.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-2">Third-Party integrations (Weav3r)</h2>
                    <p className="text-foreground/80 leading-relaxed">
                        The Tracker allows you to opt-in and integrate your Weav3r API key. Please note we do not own or maintain Weav3r, and your usage of the Weav3r API is subject to their own respective terms. We only facilitate the request straight from your browser.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-2">Disclaimer</h2>
                    <p className="text-foreground/80 leading-relaxed">
                        This tool is provided "as is" and is an independent public community tool. We take no responsibility for the accuracy of pricing, loss of tracking data, or any consequences resulting from the use of this software.
                    </p>
                </section>

            </div>
        </div>
    );
}
