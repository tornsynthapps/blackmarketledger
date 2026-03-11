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
                <p className="text-foreground/60 mt-2">BML Connect &amp; BlackMarket Ledger Usage Policy</p>
            </div>

            <div className="bg-panel border border-border p-6 rounded-xl space-y-6">
                <section>
                    <h2 className="text-xl font-bold mb-4">API Key Usage Disclosure</h2>
                    <p className="text-foreground/80 leading-relaxed mb-4">
                        BML Connect requires a Torn API key for account verification and subscription checks. The key is submitted from the extension to our Supabase verification function and then used to call Torn&apos;s basic user endpoint.
                    </p>

                    <div className="overflow-x-auto border border-border rounded-lg">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-foreground/5 border-b border-border">
                                <tr>
                                    <th className="p-3 font-semibold">Context</th>
                                    <th className="p-3 font-semibold">Where Data is Stored</th>
                                    <th className="p-3 font-semibold">Who Receives It</th>
                                    <th className="p-3 font-semibold">Purpose</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                <tr>
                                    <td className="p-3">Web app logs</td>
                                    <td className="p-3">Your browser localStorage</td>
                                    <td className="p-3">Nobody by default</td>
                                    <td className="p-3">Portfolio tracking and analytics</td>
                                </tr>
                                <tr>
                                    <td className="p-3">BML Connect API key</td>
                                    <td className="p-3">Browser extension storage</td>
                                    <td className="p-3">Supabase function + Torn API (on verification)</td>
                                    <td className="p-3">Identity lookup and subscription validation</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-2">Subscription-Gated Features</h2>
                    <p className="text-foreground/80 leading-relaxed">
                        BML Connect displays the Torn in-page cost-basis box only for users with an active subscription record. Users may still sign in and view account state in the extension popup even if no active subscription exists.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-2">Acceptable Use</h2>
                    <p className="text-foreground/80 leading-relaxed">
                        You agree to use your own Torn API key and to comply with Torn&apos;s API rules. You must not abuse, reverse engineer, disrupt, or overload the verification endpoint.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-2">Disclaimer</h2>
                    <p className="text-foreground/80 leading-relaxed">
                        This software is provided &quot;as is&quot; without warranties. We are not liable for losses, missed trades, API outages, or any indirect damages related to usage of BlackMarket Ledger or BML Connect.
                    </p>
                </section>
            </div>
        </div>
    );
}
