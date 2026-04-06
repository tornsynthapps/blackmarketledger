import { HugeiconsIcon } from "@hugeicons/react";
import { Shield01Icon } from "@hugeicons/core-free-icons";

export default function PrivacyPolicy() {
    return (
        <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4">
                    <HugeiconsIcon icon={Shield01Icon} size={24} />
                </div>
                <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
                <p className="text-foreground/60 mt-2">Last updated: April 06, 2026</p>
            </div>

            <div className="bg-panel border border-border p-6 rounded-xl space-y-6">
                <section>
                    <h2 className="text-xl font-bold mb-2">1. Web App Local Storage</h2>
                    <p className="text-foreground/80 leading-relaxed">
                        BlackMarket Ledger stores your trading logs, settings, and calculations
                        locally in your browser for the web app experience.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-4">2. API Key Usage Disclosure</h2>
                    <p className="text-foreground/80 leading-relaxed mb-4">
                        BlackMarket Ledger requires a Torn API key for account verification and
                        functionality. The key is stored locally in your browser and used to fetch
                        your trading data directly from Torn&apos;s official API.
                    </p>

                    <div className="overflow-x-auto border border-border rounded-lg">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-foreground/5 border-b border-border">
                                <tr>
                                    <th className="p-3 font-semibold">Data / Feature</th>
                                    <th className="p-3 font-semibold">Data Storage</th>
                                    <th className="p-3 font-semibold">Data Sharing</th>
                                    <th className="p-3 font-semibold">Purpose of Use</th>
                                    <th className="p-3 font-semibold">API Key Required</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                <tr>
                                    <td className="p-3">Logs</td>
                                    <td className="p-3">Locally</td>
                                    <td className="p-3">Nobody</td>
                                    <td className="p-3">
                                        Portfolio tracking and analytics
                                    </td>
                                    <td className="p-3">-</td>
                                </tr>
                                <tr>
                                    <td className="p-3">Logs (with Google Drive)</td>
                                    <td className="p-3">Local Storage + Your Google Drive</td>
                                    <td className="p-3">Nobody</td>
                                    <td className="p-3">Portfolio tracking and analytics</td>
                                    <td className="p-3">Vault Sync Key -<br />Public</td>
                                </tr>
                                <tr>
                                    <td className="p-3">Trades and Receipts</td>
                                    <td className="p-3">Local Storage</td>
                                    <td className="p-3">Nobody</td>
                                    <td className="p-3">Auto-Linking Items and Logging</td>
                                    <td className="p-3">Weav3r Node Key - <br />Any but same as one used in Torn W3B</td>
                                </tr>
                                <tr>
                                    <td className="p-3">Auto-Pilot</td>
                                    <td className="p-3">Local Storage (optionally Google Drive if enabled)</td>
                                    <td className="p-3">Nobody</td>
                                    <td className="p-3">Auto-Pilot</td>
                                    <td className="p-3">Mainframe Full Access -<br />Full Access</td>
                                </tr>
                            </tbody>
                        </table>
                        <table className="w-full text-left text-sm">
                            <thead className="bg-foreground/5 border-b border-border">
                                <tr>
                                    <th className="p-3 font-semibold border-t border-border">
                                        API Key
                                    </th>
                                    <th className="p-3 font-semibold border-t border-border">
                                        Key Access Level
                                    </th>
                                    <th className="p-3 font-semibold border-t border-border">
                                        Key Sharing
                                    </th>
                                    <th className="p-3 font-semibold border-t border-border">
                                        Key Storage
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                <tr>
                                    <td className="p-3">Vault Sync Key</td>
                                    <td className="p-3">Public</td>
                                    <td className="p-3">BML Server</td>
                                    <td className="p-3">Stored in cloud to verify identity</td>
                                </tr>
                                <tr>
                                    <td className="p-3">Weav3r Node Key</td>
                                    <td className="p-3">
                                        Any but same as one used in Torn W3B
                                    </td>
                                    <td className="p-3">
                                        Shared with Weav3r (please see{" "}
                                        <a
                                            href="https://weav3r.dev/privacy-policy"
                                            className="text-primary hover:underline"
                                        >
                                            Weav3r&apos;s Privacy Policy
                                        </a>
                                        )
                                    </td>
                                    <td className="p-3">Only Locally</td>
                                </tr>
                                <tr>
                                    <td className="p-3">Mainframe Full Access</td>
                                    <td className="p-3">Full Access</td>
                                    <td className="p-3">Not Shared</td>
                                    <td className="p-3">Only Locally</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-2">3. Third-Party Services</h2>
                    <p className="text-foreground/80 leading-relaxed">
                        If you use Weav3r features in the web app, requests are sent directly to
                        Weav3r from your browser. Integration with Torn API is performed locally
                        or via approved third-party services like Weav3r as disclosed above.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-2">4. No Advertising / Sale of Data</h2>
                    <p className="text-foreground/80 leading-relaxed">
                        We do not sell your personal data and do not run ad tracking profiles for
                        BlackMarket Ledger.
                    </p>
                </section>
            </div>
        </div>
    );
}
