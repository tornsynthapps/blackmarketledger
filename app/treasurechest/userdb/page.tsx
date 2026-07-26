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
    Search01Icon,
    Cancel01Icon,
} from "@hugeicons/core-free-icons";

/**
 * Modern page for inspecting local IndexedDB (Dexie) data.
 * Features a database selector, table navigation sidebar, column search, and paginated data view.
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
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [searchColumn, setSearchColumn] = useState<string>("all");
    const [availableColumns, setAvailableColumns] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const pageSize = 200;

    // Derived list of tables for the currently selected database
    const tables = useMemo(() => {
        if (!selectedDbName) return [];
        return Object.keys(SCHEMA_REGISTRY[selectedDbName] || {});
    }, [selectedDbName]);

    /**
     * Resets navigation and search state when the database or table changes.
     */
    useEffect(() => {
        if (tables.length > 0 && !tables.includes(selectedTableName)) {
            setSelectedTableName(tables[0]);
        }
        setCurrentPage(1);
        setSearchQuery("");
        setSearchColumn("all");
    }, [selectedDbName, tables]);

    /**
     * Fetches paginated data and total count for the selected table, applying search filters if active.
     */
    useEffect(() => {
        if (!selectedDbName || !selectedTableName) return;

        async function fetchData() {
            setIsLoading(true);
            setError(null);
            try {
                const db = getDatabase(selectedDbName);
                const table = db.table(selectedTableName);

                const trimmedQuery = searchQuery.trim().toLowerCase();

                if (trimmedQuery.length > 0) {
                    // Fetch all records for full client-side column searching
                    const allRecords = await table.toArray();
                    
                    // Discover all distinct columns across all records
                    const colsSet = new Set<string>();
                    allRecords.forEach(rec => Object.keys(rec).forEach(k => colsSet.add(k)));
                    setAvailableColumns(Array.from(colsSet));

                    const filtered = allRecords.filter((row) => {
                        if (searchColumn === "all") {
                            return Object.values(row).some((val) => {
                                if (val === null || val === undefined) return false;
                                return String(val).toLowerCase().includes(trimmedQuery);
                            });
                        } else {
                            const val = row[searchColumn];
                            if (val === null || val === undefined) return false;
                            return String(val).toLowerCase().includes(trimmedQuery);
                        }
                    });

                    setTotalRecords(filtered.length);
                    const offset = (currentPage - 1) * pageSize;
                    setData(filtered.slice(offset, offset + pageSize));
                } else {
                    // Standard fast IndexedDB pagination
                    const [count, records] = await Promise.all([
                        table.count(),
                        table.offset((currentPage - 1) * pageSize).limit(pageSize).toArray()
                    ]);

                    // Extract columns from current records or schema definition
                    if (records.length > 0) {
                        const colsSet = new Set<string>();
                        records.forEach(rec => Object.keys(rec).forEach(k => colsSet.add(k)));
                        setAvailableColumns(Array.from(colsSet));
                    } else {
                        setAvailableColumns([]);
                    }

                    setTotalRecords(count);
                    setData(records);
                }
            } catch (err) {
                console.error("Failed to fetch database data:", err);
                setError(err instanceof Error ? err.message : "Failed to load table data.");
            } finally {
                setIsLoading(false);
            }
        }

        fetchData();
    }, [selectedDbName, selectedTableName, currentPage, searchQuery, searchColumn]);

    // Calculate total pages for pagination controls
    const totalPages = Math.ceil(totalRecords / pageSize);

    /**
     * Formats a raw database cell value for display in the table.
     */
    const renderCell = (value: any): string => {
        if (value === null) return "null";
        if (value === undefined) return "undefined";
        if (typeof value === "object") return JSON.stringify(value);
        return String(value);
    };

    // Columns to display in the header
    const columns = useMemo(() => {
        if (availableColumns.length > 0) return availableColumns;
        if (data.length === 0) return [];
        return Object.keys(data[0]);
    }, [availableColumns, data]);

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
                                        setSearchQuery("");
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
                    {/* Search Toolbar */}
                    <div className="p-3 border-b border-primary/10 flex items-center justify-between gap-4 bg-panel/40">
                        <div className="flex items-center gap-2 flex-1 max-w-2xl">
                            <HugeiconsIcon icon={Search01Icon} size={16} className="text-muted shrink-0" />
                            
                            {/* Column Selection Dropdown */}
                            <select
                                value={searchColumn}
                                onChange={(e) => {
                                    setSearchColumn(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="bg-background border border-primary/20 rounded-lg px-2 py-1.5 text-xs font-mono font-bold uppercase outline-none focus:border-primary shrink-0"
                            >
                                <option value="all">All Columns</option>
                                {columns.map((col) => (
                                    <option key={col} value={col}>
                                        {col}
                                    </option>
                                ))}
                            </select>

                            {/* Search Input Field */}
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    placeholder={`Search ${searchColumn === "all" ? "all columns" : searchColumn}...`}
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full bg-background border border-primary/20 rounded-lg pl-3 pr-8 py-1.5 text-xs font-mono outline-none focus:border-primary"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => {
                                            setSearchQuery("");
                                            setCurrentPage(1);
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground p-0.5"
                                        title="Clear search"
                                    >
                                        <HugeiconsIcon icon={Cancel01Icon} size={14} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="text-[10px] font-mono text-muted uppercase tracking-wider shrink-0">
                            {totalRecords.toLocaleString()} {totalRecords === 1 ? "record" : "records"}
                        </div>
                    </div>

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
                                                    <th key={col} className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest ${searchColumn === col ? 'text-primary font-bold underline' : 'text-muted'}`}>
                                                        {col}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-primary/5">
                                            {data.map((row, i) => (
                                                <tr key={i} className="hover:bg-primary/5 transition-colors">
                                                    {columns.map((col) => (
                                                        <td key={`${i}-${col}`} className={`px-4 py-2 font-mono text-[10px] break-all max-w-xs ${searchColumn === col ? 'bg-primary/5 font-bold text-foreground' : 'text-foreground/80'}`}>
                                                            {renderCell(row[col])}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="p-12 text-center text-muted font-mono text-xs uppercase italic">
                                        {searchQuery ? `No records found matching "${searchQuery}" in ${searchColumn === "all" ? "any column" : searchColumn}.` : "No data found in this table."}
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
