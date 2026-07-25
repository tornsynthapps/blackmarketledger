"use client";

import React, { useEffect, useState, useMemo } from "react";
import { SCHEMA_REGISTRY, getDatabase } from "@/lib/objects/BaseObject";
import { PageHeader } from "@/components/PageHeader";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    DatabaseIcon,
    TableIcon,
    ArrowLeft01Icon,
    ArrowRight01Icon,
    Loading03Icon,
} from "@hugeicons/core-free-icons";

/**
 * Modern page for inspecting local IndexedDB (Dexie) data.
 * Features a database selector, table navigation sidebar, and paginated data view.
 */
export default function UserDBPage() {
    // List of available databases from the shared schema registry
    const dbNames = useMemo(() => Object.keys(SCHEMA_REGISTRY), []);
    
    // UI State
    const [selectedDbName, setSelectedDbName] = useState<string>(dbNames[0] || "");
    const [selectedTableName, setSelectedTableName] = useState<string>("");
    const [data, setData] = useState<any[]>([]);
    const [totalRecords, setTotalRecords] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const pageSize = 200;

    // Derived list of tables for the currently selected database
    const tables = useMemo(() => {
        if (!selectedDbName) return [];
        return Object.keys(SCHEMA_REGISTRY[selectedDbName] || {});
    }, [selectedDbName]);

    /**
     * Resets navigation state when the database changes.
     * @purpose Ensure the UI reflects the first table of the new database and resets pagination.
     * @inputs None (uses state from selectedDbName and tables)
     * @outputs None (updates state)
     * @sideEffects Updates selectedTableName, setCurrentPage, setData, and setTotalRecords state.
     */
    useEffect(() => {
        if (tables.length > 0) {
            setSelectedTableName(tables[0]);
            setCurrentPage(1);
        } else {
            setSelectedTableName("");
            setData([]);
            setTotalRecords(0);
        }
    }, [selectedDbName, tables]);

    /**
     * Fetches paginated data and total count for the selected table.
     * @purpose Retrieve a slice of data from IndexedDB for the current view.
     * @inputs None (uses state from selectedDbName, selectedTableName, and currentPage)
     * @outputs None (updates state)
     * @sideEffects Reads from IndexedDB through Dexie; updates setIsLoading, setError, setTotalRecords, and setData state.
     */
    useEffect(() => {
        if (!selectedDbName || !selectedTableName) return;

        async function fetchData() {
            setIsLoading(true);
            setError(null);
            try {
                const db = getDatabase(selectedDbName);
                const table = db.table(selectedTableName);

                // Fetch total count and paginated data in parallel
                const [count, records] = await Promise.all([
                    table.count(),
                    table.offset((currentPage - 1) * pageSize).limit(pageSize).toArray()
                ]);

                setTotalRecords(count);
                setData(records);
            } catch (err) {
                console.error("Failed to fetch database data:", err);
                setError(err instanceof Error ? err.message : "Failed to load table data.");
            } finally {
                setIsLoading(false);
            }
        }

        fetchData();
    }, [selectedDbName, selectedTableName, currentPage]);

    // Calculate total pages for pagination controls
    const totalPages = Math.ceil(totalRecords / pageSize);

    /**
     * Formats a raw database cell value for display in the table.
     * @purpose Convert various data types (null, undefined, objects) into a human-readable string.
     * @param value (any): The raw value from the database record
     * @returns (string): A string representation of the value
     * @sideEffects None
     */
    const renderCell = (value: any): string => {
        if (value === null) return "null";
        if (value === undefined) return "undefined";
        if (typeof value === "object") return JSON.stringify(value);
        return String(value);
    };

    // Dynamically determine column headers from the data objects
    const columns = useMemo(() => {
        if (data.length === 0) return [];
        return Object.keys(data[0]);
    }, [data]);

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Header Section with DB Selector */}
            <div className="flex items-center justify-between">
                <PageHeader 
                    title="User Database" 
                    description="Inspect local IndexedDB data (Dexie)" 
                    icon={DatabaseIcon} 
                />
                
                <div className="flex items-center gap-2 bg-panel border-2 border-primary p-2 rounded-xl mb-6">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted px-2">DB:</span>
                    <select
                        value={selectedDbName}
                        onChange={(e) => setSelectedDbName(e.target.value)}
                        className="bg-transparent text-xs font-mono font-bold uppercase outline-none cursor-pointer pr-4"
                    >
                        {dbNames.map((name) => (
                            <option key={name} value={name} className="bg-background">
                                {name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Main Content: Sidebar + Table View */}
            <div className="flex flex-1 gap-6 min-h-0">
                {/* Left Navigation: Tables Sidebar */}
                <div className="w-64 flex flex-col gap-2 shrink-0">
                    <div className="bg-panel border-2 border-primary/20 rounded-xl p-4 flex flex-col h-full overflow-hidden">
                        <h3 className="text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2 text-primary">
                            <HugeiconsIcon icon={TableIcon} size={14} /> Tables
                        </h3>
                        <div className="flex flex-col gap-1 overflow-y-auto pr-2 custom-scrollbar">
                            {tables.map((table) => (
                                <button
                                    key={table}
                                    onClick={() => {
                                        setSelectedTableName(table);
                                        setCurrentPage(1);
                                    }}
                                    className={`
                                        text-left px-3 py-2 rounded-lg text-xs font-mono transition-all duration-200
                                        ${selectedTableName === table 
                                            ? "bg-primary text-background font-bold shadow-lg" 
                                            : "hover:bg-primary/10 text-muted hover:text-foreground"
                                        }
                                    `}
                                >
                                    {table}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Content: Data Table */}
                <div className="flex-1 min-w-0 bg-panel border-2 border-primary/20 rounded-xl flex flex-col overflow-hidden relative">
                    {isLoading && (
                        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center">
                            <HugeiconsIcon icon={Loading03Icon} className="animate-spin text-primary" size={48} />
                        </div>
                    )}

                    {error ? (
                        <div className="p-8 text-center text-red-500 font-mono text-sm uppercase">
                            Error: {error}
                        </div>
                    ) : (
                        <>
                            <div className="flex-1 overflow-auto custom-scrollbar">
                                {data.length > 0 ? (
                                    <table className="w-full text-left border-collapse min-w-full">
                                        <thead className="sticky top-0 bg-panel/90 backdrop-blur-md z-20 shadow-sm border-b border-primary/10">
                                            <tr>
                                                {columns.map((col) => (
                                                    <th key={col} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted">
                                                        {col}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-primary/5">
                                            {data.map((row, i) => (
                                                <tr key={i} className="hover:bg-primary/5 transition-colors">
                                                    {columns.map((col) => (
                                                        <td key={`${i}-${col}`} className="px-4 py-2 font-mono text-[10px] text-foreground/80 break-all max-w-xs">
                                                            {renderCell(row[col])}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="p-12 text-center text-muted font-mono text-xs uppercase italic">
                                        No data found in this table.
                                    </div>
                                )}
                            </div>

                            {/* Pagination Footer */}
                            {totalPages > 1 && (
                                <div className="p-4 border-t border-primary/10 flex items-center justify-between bg-panel/50">
                                    <div className="text-[10px] font-mono text-muted uppercase">
                                        Showing {data.length} of {totalRecords} records
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <button
                                            disabled={currentPage === 1 || isLoading}
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            className="p-2 border border-primary/20 rounded-lg hover:bg-primary/10 disabled:opacity-30 transition-colors"
                                        >
                                            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
                                        </button>
                                        <div className="text-[10px] font-black uppercase tracking-widest">
                                            Page {currentPage} / {totalPages}
                                        </div>
                                        <button
                                            disabled={currentPage === totalPages || isLoading}
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            className="p-2 border border-primary/20 rounded-lg hover:bg-primary/10 disabled:opacity-30 transition-colors"
                                        >
                                            <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
