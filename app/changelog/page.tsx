import fs from 'fs';
import path from 'path';
import { History, GitCommitHorizontal } from "lucide-react";
import pkg from '../../package.json';

interface ChangelogEntry {
    version: string;
    date: string;
    items: { title: string; description: string }[];
}

function parseChangelog(content: string): ChangelogEntry[] {
    const lines = content.split('\n');
    const entries: ChangelogEntry[] = [];
    let currentEntry: ChangelogEntry | null = null;

    for (const line of lines) {
        // Match ## vX.X.X (YYYY-MM-DD)
        const headerMatch = line.match(/^##\s+(v\d+\.\d+\.\d+)\s+\((.+)\)/);
        if (headerMatch) {
            if (currentEntry) entries.push(currentEntry);
            currentEntry = {
                version: headerMatch[1],
                date: headerMatch[2],
                items: []
            };
            continue;
        }

        // Match - **Title**: Description
        const itemMatch = line.match(/^\s*-\s+\*\*(.+?)\*\*:\s*(.+)$/);
        if (itemMatch && currentEntry) {
            currentEntry.items.push({
                title: itemMatch[1],
                description: itemMatch[2]
            });
            continue;
        }

        // Fallback for simple list items or description only
        const simpleMatch = line.match(/^\s*-\s+(.+)$/);
        if (simpleMatch && currentEntry && !itemMatch) {
            currentEntry.items.push({
                title: "",
                description: simpleMatch[1]
            });
        }
    }

    if (currentEntry) entries.push(currentEntry);
    return entries;
}

export default async function ChangelogPage() {
    const filePath = path.join(process.cwd(), 'version-history.md');
    let content = "";
    try {
        content = fs.readFileSync(filePath, 'utf8');
    } catch (e) {
        content = "## v0.0.0 (Error)\n- Error loading version history.";
    }

    const entries = parseChangelog(content);

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Version History</h1>
                <p className="text-foreground/60 mt-2">Track the latest updates and improvements.</p>
            </div>

            <div className="space-y-6">
                {entries.map((entry, idx) => {
                    const isCurrent = entry.version.replace('v', '') === pkg.version;
                    
                    return (
                        <div 
                            key={entry.version} 
                            className={`p-6 rounded-2xl border transition-all ${
                                isCurrent 
                                    ? "bg-panel border-primary/30 shadow-lg shadow-primary/5 ring-1 ring-primary/10 relative overflow-hidden" 
                                    : "bg-panel/50 border-border/50 opacity-90"
                            }`}
                        >
                            {isCurrent && (
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10 pointer-events-none" />
                            )}
                            
                            <div className="flex items-center gap-4 mb-6">
                                <div className={`p-2.5 rounded-xl ${isCurrent ? "bg-primary/10 text-primary" : "bg-foreground/5 text-foreground/45"}`}>
                                    <History className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className={`text-xl font-bold tracking-tight ${!isCurrent && "text-foreground/80"}`}>
                                            {entry.version}
                                        </h2>
                                        {isCurrent && (
                                            <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                                                Current
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs font-medium text-foreground/45 mt-0.5">{entry.date}</p>
                                </div>
                            </div>

                            <ul className="space-y-4 relative before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-border/60 ml-2">
                                {entry.items.map((item, i) => (
                                    <li key={i} className="relative pl-8 group">
                                        <div className="absolute left-0 top-1.5 w-6 h-6 bg-panel flex items-center justify-center">
                                            <GitCommitHorizontal className={`w-4 h-4 transition-colors ${isCurrent ? "text-primary/60" : "text-foreground/30"}`} />
                                        </div>
                                        {item.title && (
                                            <span className={`block text-sm font-bold tracking-tight mb-0.5 ${isCurrent ? "text-foreground/90" : "text-foreground/70"}`}>
                                                {item.title}
                                            </span>
                                        )}
                                        <p className="text-sm text-foreground/55 leading-relaxed">
                                            {item.description}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
