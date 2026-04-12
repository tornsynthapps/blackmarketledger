"use client";

import { useState, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    CloudDownloadIcon,
    ArrowDown01Icon,
} from "@hugeicons/core-free-icons";
import { BlackboxData, formatTimestamp } from "../types";
import { BlackboxDetailView } from "../BlackboxDetailView";
import { parseBlackboxData } from "../page";
import { Storage } from "@/lib/storage";
import { Blackbox } from "@/lib/blackbox";

function ImportPageContent() {
    const router = useRouter();
    const [previewBlackbox, setPreviewBlackbox] = useState<BlackboxData | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                const parsed = parseBlackboxData(json);
                if (parsed.length > 0) {
                    setPreviewBlackbox(parsed[0]);
                } else {
                    alert("Invalid blackbox file");
                }
            } catch (err) {
                console.error("Failed to parse blackbox file:", err);
                alert("Failed to parse blackbox file");
            }
        };
        reader.readAsText(file);
    };

    const handleConfirmImport = async () => {
        if (!previewBlackbox) return;
        try {
            await Storage.set(
                Blackbox.STORAGE_KEY,
                previewBlackbox.id,
                JSON.stringify(previewBlackbox.logs)
            );
            alert("Blackbox imported successfully");
            router.push(`/blackbox?id=${previewBlackbox.id}`);
        } catch (error) {
            console.error("Failed to import blackbox:", error);
            alert("Failed to import blackbox");
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 p-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Import Blackbox</h1>
            </div>

            {!previewBlackbox ? (
                <div className="flex flex-col items-center justify-center py-20 bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl">
                    <HugeiconsIcon icon={CloudDownloadIcon} className="w-16 h-16 text-gray-400 mb-4" />
                    <p className="text-gray-500 mb-6">Select a Blackbox JSON file to view its contents</p>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".json"
                        onChange={handleFileChange}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/20"
                    >
                        Select JSON File
                    </button>
                </div>
            ) : (
                <BlackboxDetailView
                    blackbox={previewBlackbox}
                    onBack={() => setPreviewBlackbox(null)}
                    extraActions={
                        <button
                            onClick={handleConfirmImport}
                            className="flex items-center gap-2 px-4 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors font-medium text-sm"
                        >
                            <HugeiconsIcon icon={ArrowDown01Icon} className="w-4 h-4" />
                            Import to Database
                        </button>
                    }
                />
            )}
        </div>
    );
}

export default function ImportPage() {
    return (
        <Suspense fallback={<div className="animate-pulse">Loading...</div>}>
            <ImportPageContent />
        </Suspense>
    );
}
