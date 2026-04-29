"use client";

import { useEffect, useState, useMemo } from "react";
import { ItemLogService } from "@/lib/domain/ItemLogService";
import { ItemLog } from "@/lib/objects/ItemLog";
import { ItemLogWrapper } from "@/lib/objects/ItemLogWrapper";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    ArrowLeft01Icon,
    DatabaseIcon,
    PlusSignIcon,
    Delete02Icon,
    PencilEdit02Icon,
    RefreshIcon,
    Settings01Icon,
    Cancel01Icon,
    Tick01Icon,
    Link01Icon,
    Package01Icon,
    Sorting05Icon,
    Dollar01Icon,
    GridIcon,
    ArchiveIcon,
    Coins01Icon,
    Trophy,
    Clock01Icon,
    Calendar01Icon,
    TextSelectionIcon,
    OptionIcon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";

interface EditModalProps<T> {
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedObject: T) => void;
    initialData: T;
    title: string;
}

function EditModal<T extends Record<string, any>>({
    isOpen,
    onClose,
    onSave,
    initialData,
    title,
}: EditModalProps<T>) {
    const [formData, setFormData] = useState<T>(initialData);

    useEffect(() => {
        setFormData(initialData);
    }, [initialData]);

    if (!isOpen) return null;

    const handleChange = (key: string, value: any) => {
        setFormData((prev) => ({
            ...prev,
            [key]: typeof initialData[key] === "number" ? parseFloat(value) : value,
        }));
    };

    const editableFields = Object.keys(initialData).filter(
        (key) => !["id", "logged_at", "updated_at", "version"].includes(key)
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-panel border-2 border-foreground w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b-2 border-foreground flex justify-between items-center bg-foreground text-background">
                    <h3 className="text-lg font-black uppercase tracking-tight">{title}</h3>
                    <button onClick={onClose} className="hover:opacity-70 transition-opacity">
                        <HugeiconsIcon icon={Cancel01Icon} size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {editableFields.map((key) => (
                        <div key={key} className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted block">
                                {key.replace(/_/g, " ")}
                            </label>
                            <input
                                type={typeof initialData[key] === "number" ? "number" : "text"}
                                value={formData[key] ?? ""}
                                onChange={(e) => handleChange(key, e.target.value)}
                                className="w-full bg-background border border-border p-2 font-mono text-sm focus:border-foreground outline-none transition-colors"
                            />
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t-2 border-border-strong flex justify-end gap-3 bg-foreground/5">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-border hover:bg-foreground/5 font-bold uppercase text-xs tracking-widest transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSave(formData)}
                        className="px-6 py-2 bg-foreground text-background font-bold uppercase text-xs tracking-widest flex items-center gap-2 hover:opacity-90 transition-all"
                    >
                        <HugeiconsIcon icon={Tick01Icon} size={16} />
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function NewArchitecturePage() {
    const [logs, setLogs] = useState<ItemLog[]>([]);
    const [wrappers, setWrappers] = useState<ItemLogWrapper[]>([]);
    const [activeTab, setActiveTab] = useState<"logs" | "wrappers" | "services">("logs");
    const [isLoading, setIsLoading] = useState(true);

    // Modal state
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingObject, setEditingObject] = useState<any>(null);
    const [editType, setEditType] = useState<"log" | "wrapper">("log");

    const service = useMemo(() => new ItemLogService(), []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [fetchedLogs, fetchedWrappers] = await Promise.all([
                service.getAllLogs(),
                service.getAllWrappers(),
            ]);
            setLogs(fetchedLogs);
            setWrappers(fetchedWrappers);
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [service]);

    const handleDeleteLog = async (id: number) => {
        await service.deleteLog(id);
        await fetchData();
    };

    const handleDeleteWrapper = async (id: number) => {
        await service.deleteWrapper(id);
        await fetchData();
    };

    const handleUpdateCostBasis = async () => {
        const itemId = prompt("Enter Item ID:", "1");
        const minTimestamp = logs.length > 0 ? Math.min(...logs.map((l) => l.timestamp)) : Date.now();
        const timestamp = prompt("Enter Start Timestamp (ms):", minTimestamp.toString());
        if (itemId && timestamp) {
            setIsLoading(true);
            try {
                await service.updateCostBasis(parseInt(itemId), parseInt(timestamp));
                alert("Cost basis updated successfully.");
                await fetchData();
            } catch (error) {
                alert("Error updating cost basis: " + (error as Error).message);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleAddDummyLog = async () => {
        try {
            await service.addItemLog({
                timestamp: Date.now(),
                item_id: 1,
                quantity: Math.floor(Math.random() * 20) - 10,
                unit_price: Math.floor(Math.random() * 1000) + 500,
                category: "normal",
            });
            await fetchData();
        } catch (error) {
            alert("Error adding dummy log: " + (error as Error).message);
        }
    };

    const openEditModal = (obj: any, type: "log" | "wrapper") => {
        setEditingObject(obj);
        setEditType(type);
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = async (updatedData: any) => {
        try {
            if (editType === "log") {
                // @ts-ignore - bypassing for direct update test
                const updatedLog = ItemLog.fromDatabase({
                    ...editingObject.toDatabaseRecord(),
                    ...updatedData,
                    id: editingObject.id,
                    logged_at: editingObject.logged_at,
                    updated_at: editingObject.updated_at,
                    version: editingObject.version,
                } as any);

                await service.updateLog(updatedLog);
            } else {
                // @ts-ignore - bypassing for direct update test
                const updatedWrapper = ItemLogWrapper.fromDatabase({
                    ...editingObject.toDatabaseRecord(),
                    ...updatedData,
                    id: editingObject.id,
                    logged_at: editingObject.logged_at,
                    updated_at: editingObject.updated_at,
                    version: editingObject.version,
                } as any);

                await service.updateWrapper(updatedWrapper);
            }
            setIsEditModalOpen(false);
            await fetchData();
        } catch (error) {
            alert("Error updating object: " + (error as Error).message);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground p-4 md:p-8 animate-in fade-in duration-500 font-sans">
            <div className="max-w-full mx-auto space-y-8">
                {/* Header */}
                <div className="space-y-4">
                    <Link
                        href="/treasurechest"
                        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors group"
                    >
                        <HugeiconsIcon
                            icon={ArrowLeft01Icon}
                            size={16}
                            className="group-hover:-translate-x-1 transition-transform"
                        />
                        Back to Treasure Chest
                    </Link>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 border-2 border-foreground bg-panel">
                                <HugeiconsIcon icon={DatabaseIcon} size={32} />
                            </div>
                            <div>
                                <h1 className="text-4xl font-black uppercase tracking-tighter">
                                    New Architecture
                                </h1>
                                <p className="text-xs font-bold uppercase tracking-[0.3em] text-muted">
                                    Object & Service Debugger
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={fetchData}
                                className="px-4 py-2 border-2 border-foreground hover:bg-foreground hover:text-background transition-all font-bold uppercase text-xs tracking-widest flex items-center gap-2"
                            >
                                <HugeiconsIcon
                                    icon={RefreshIcon}
                                    size={16}
                                    className={isLoading ? "animate-spin" : ""}
                                />
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b-2 border-border-strong">
                    {(["logs", "wrappers", "services"] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-8 py-3 font-bold uppercase text-sm tracking-widest transition-all ${
                                activeTab === tab
                                    ? "bg-foreground text-background border-t-2 border-x-2 border-foreground"
                                    : "text-muted hover:text-foreground"
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="bg-panel border-2 border-foreground overflow-hidden">
                    {activeTab === "logs" && (
                        <div className="space-y-4 p-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-black uppercase tracking-tight">Item Logs</h2>
                                <button
                                    onClick={handleAddDummyLog}
                                    className="px-4 py-2 bg-foreground text-background font-bold uppercase text-xs tracking-widest flex items-center gap-2 hover:opacity-90"
                                >
                                    <HugeiconsIcon icon={PlusSignIcon} size={16} />
                                    Add Dummy Log
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse table-auto">
                                    <thead>
                                        <tr className="border-b-2 border-border-strong text-[10px] font-bold uppercase tracking-widest text-muted">
                                            <th className="p-2">ID</th>
                                            <th className="p-2">WID</th>
                                            <th className="p-2">Item ID</th>
                                            <th className="p-2 text-right">Qty</th>
                                            <th className="p-2 text-right">Price</th>
                                            <th className="p-2">Category</th>
                                            <th className="p-2 text-right">Stock</th>
                                            <th className="p-2 text-right">Cost</th>
                                            <th className="p-2 text-right">Profit</th>
                                            <th className="p-2">Timestamp</th>
                                            <th className="p-2">Updated At</th>
                                            <th className="p-2 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[11px]">
                                        {logs.map((log) => (
                                            <tr
                                                key={log.id}
                                                className="border-b border-border hover:bg-foreground/5 transition-colors"
                                            >
                                                <td className="p-2 font-mono">{log.id}</td>
                                                <td className="p-2 font-mono text-muted">
                                                    {log.wrapper_id ?? "-"}
                                                </td>
                                                <td className="p-2 font-mono">{log.item_id}</td>
                                                <td
                                                    className={`p-2 font-mono font-bold text-right ${log.quantity >= 0 ? "text-success" : "text-danger"}`}
                                                >
                                                    {log.quantity}
                                                </td>
                                                <td className="p-2 font-mono text-right">${log.unit_price.toLocaleString()}</td>
                                                <td className="p-2 font-mono">
                                                    <span className="px-1.5 py-0.5 bg-foreground/10 text-[9px] font-bold uppercase tracking-wider">
                                                        {log.category}
                                                    </span>
                                                </td>
                                                <td className="p-2 font-mono text-right">{log.total_stock}</td>
                                                <td className="p-2 font-mono text-right">${log.total_cost.toLocaleString()}</td>
                                                <td className="p-2 font-mono text-success font-bold text-right">
                                                    ${log.realized_profit.toLocaleString()}
                                                </td>
                                                <td className="p-2 font-mono text-muted">
                                                    {log.timestamp}
                                                </td>
                                                <td className="p-2 font-mono text-muted">
                                                    {log.updated_at}
                                                </td>
                                                <td className="p-2 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <button
                                                            onClick={() => openEditModal(log, "log")}
                                                            className="p-1 hover:text-info transition-colors"
                                                            title="Edit Log"
                                                        >
                                                            <HugeiconsIcon icon={PencilEdit02Icon} size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteLog(log.id!)}
                                                            className="p-1 hover:text-danger transition-colors"
                                                            title="Delete"
                                                        >
                                                            <HugeiconsIcon icon={Delete02Icon} size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {logs.length === 0 && (
                                            <tr>
                                                <td colSpan={12} className="p-12 text-center text-muted italic">
                                                    No logs found in database.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === "wrappers" && (
                        <div className="space-y-4 p-6">
                            <h2 className="text-xl font-black uppercase tracking-tight">
                                Item Log Wrappers
                            </h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse table-auto">
                                    <thead>
                                        <tr className="border-b-2 border-border-strong text-[10px] font-bold uppercase tracking-widest text-muted">
                                            <th className="p-2">ID</th>
                                            <th className="p-2">Type</th>
                                            <th className="p-2">Description</th>
                                            <th className="p-2">Timestamp</th>
                                            <th className="p-2">Updated At</th>
                                            <th className="p-2 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[11px]">
                                        {wrappers.map((wrapper) => (
                                            <tr
                                                key={wrapper.id}
                                                className="border-b border-border hover:bg-foreground/5 transition-colors"
                                            >
                                                <td className="p-2 font-mono">{wrapper.id}</td>
                                                <td className="p-2 font-mono">
                                                    <span className="px-1.5 py-0.5 bg-foreground/10 text-[9px] font-bold uppercase tracking-wider">
                                                        {wrapper.type}
                                                    </span>
                                                </td>
                                                <td className="p-2 font-mono">{wrapper.description}</td>
                                                <td className="p-2 font-mono">
                                                    {wrapper.timestamp}
                                                </td>
                                                <td className="p-2 font-mono text-muted">
                                                    {wrapper.updated_at}
                                                </td>
                                                <td className="p-2 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <button
                                                            onClick={() => openEditModal(wrapper, "wrapper")}
                                                            className="p-1 hover:text-info transition-colors"
                                                            title="Edit Wrapper"
                                                        >
                                                            <HugeiconsIcon icon={PencilEdit02Icon} size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteWrapper(wrapper.id!)}
                                                            className="p-1 hover:text-danger transition-colors"
                                                            title="Delete"
                                                        >
                                                            <HugeiconsIcon icon={Delete02Icon} size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {wrappers.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="p-12 text-center text-muted italic">
                                                    No wrappers found in database.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === "services" && (
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-6 border-2 border-border-strong space-y-4">
                                <div className="flex items-center gap-3">
                                    <HugeiconsIcon icon={Settings01Icon} size={24} />
                                    <h3 className="text-lg font-bold uppercase tracking-wider">
                                        Cost Basis Recalculation
                                    </h3>
                                </div>
                                <p className="text-sm text-muted">
                                    Triggers a full recalculation of cost-basis and running totals for a
                                    specific item from a given point in time.
                                </p>
                                <button
                                    onClick={handleUpdateCostBasis}
                                    className="w-full py-3 border-2 border-foreground font-bold uppercase text-xs tracking-widest hover:bg-foreground hover:text-background transition-all"
                                >
                                    Execute updateCostBasis()
                                </button>
                            </div>

                            <div className="p-6 border-2 border-border-strong space-y-4 opacity-50 cursor-not-allowed">
                                <div className="flex items-center gap-3">
                                    <HugeiconsIcon icon={Settings01Icon} size={24} />
                                    <h3 className="text-lg font-bold uppercase tracking-wider">
                                        Future Services
                                    </h3>
                                </div>
                                <p className="text-sm text-muted">
                                    Additional domain services will appear here as they are implemented.
                                </p>
                                <button
                                    disabled
                                    className="w-full py-3 border-2 border-muted text-muted font-bold uppercase text-xs tracking-widest"
                                >
                                    Locked
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="pt-8 border-t border-border">
                    <p className="text-[10px] text-center text-muted font-bold uppercase tracking-[0.4em]">
                        New Architecture Debugger · Hardline System Interface
                    </p>
                </div>
            </div>

            {/* Modal */}
            {isEditModalOpen && (
                <EditModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={handleSaveEdit}
                    initialData={editingObject}
                    title={editType === "log" ? "Edit Item Log" : "Edit Wrapper"}
                />
            )}
        </div>
    );
}
