"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { File01Icon } from "@hugeicons/core-free-icons";

export default function TermsOfService() {
    return (
        <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4">
                    <HugeiconsIcon icon={File01Icon} size={24} />
                </div>
                <h1 className="text-3xl font-bold tracking-tight">Terms of Use</h1>
            </div>

            <div className="bg-panel border border-border p-6 rounded-xl space-y-6">
                <section>
                    <h2 className="text-xl font-bold mb-2">Acceptable Use</h2>
                    <p className="text-foreground/80 leading-relaxed">
                        You agree to use your own Torn API key and to comply with Torn&apos;s API
                        rules. You must not claim to be another user, misrepresent your identity, or
                        use API keys that do not belong to you. You must not abuse, reverse
                        engineer, disrupt, or overload the application services.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-2">Disclaimer</h2>
                    <p className="text-foreground/80 leading-relaxed">
                        This software is provided &quot;as is&quot; without warranties. We are not
                        liable for losses, missed trades, API outages, or any indirect damages
                        related to usage of BlackMarket Ledger.
                    </p>
                </section>
            </div>
        </div>
    );
}
