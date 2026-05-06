"use client";

import { useEffect, useState, useMemo } from "react";
import { ItemLogService } from "@/lib/domain/ItemLogService";
import { MuseumService } from "@/lib/domain/MuseumService";
import { TradeService } from "@/lib/domain/TradeService";
import { ReceiptService } from "@/lib/domain/ReceiptService";
import { ItemLog } from "@/lib/objects/ItemLog";
import { ItemLogWrapper } from "@/lib/objects/ItemLogWrapper";
import { Trade } from "@/lib/objects/Trade";
import { TradeItem } from "@/lib/objects/TradeItem";
import { Receipt } from "@/lib/objects/Receipt";
import { ReceiptItem } from "@/lib/objects/ReceiptItem";
import { PageHeader } from "@/components/PageHeader";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    DatabaseIcon,
    PlusSignIcon,
    Delete02Icon,
    PencilEdit02Icon,
    RefreshIcon,
    Settings01Icon,
    Cancel01Icon,
    Tick01Icon,
    Link01Icon,
    TradeUpIcon,
} from "@hugeicons/core-free-icons";

/**
 * UTILS: EXPORT ENGINE
 */
const exportData = {
    csv: (data: any[], filename: string) => {
        if (!data.length) return;
        const headers = Object.keys(data[0]).join(",");
        const rows = data.map(obj => 
            Object.values(obj).map(val => `"${val ?? ''}"`).join(",")
        ).join("\n");
        const blob = new Blob([`${headers}\n${rows}`], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${filename}.csv`;
        a.click();
    },
    markdown: (data: any[], filename: string) => {
        if (!data.length) return;
        const keys = Object.keys(data[0]);
        const header = `| ${keys.join(" | ")} |`;
        const separator = `| ${keys.map(() => "---").join(" | ")} |`;
        const rows = data.map(obj => 
            `| ${keys.map(k => String(obj[k] ?? "")).join(" | ")} |`
        ).join("\n");
        const blob = new Blob([`${header}\n${separator}\n${rows}`], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${filename}.md`;
        a.click();
    }
};

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
        const numericFields = [
            "item_id",
            "quantity",
            "unit_price",
            "timestamp",
            "total_stock",
            "total_cost",
            "realized_profit",
            "wrapper_id",
        ];

        let parsedValue = value;
        if (numericFields.includes(key)) {
            if (value === "" || value === null || value === undefined) {
                parsedValue = null;
            } else {
                const num = parseFloat(value);
                parsedValue = isNaN(num) ? value : num;
            }
        }

        setFormData((prev) => ({
            ...prev,
            [key]: parsedValue,
        }));
    };

    const editableFields = Object.keys(initialData).filter(
        (key) => !["id", "logged_at", "updated_at", "version"].includes(key)
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-panel border-2 border-foreground w-full max-w-lg shadow-[0_0_50px_rgba(255,255,255,0.1)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                <div className="p-4 border-b-2 border-foreground flex justify-between items-center bg-foreground text-background">
                    <h3 className="text-lg font-black uppercase tracking-[0.2em]">{title}</h3>
                    <button onClick={onClose} className="hover:rotate-90 transition-transform duration-300">
                        <HugeiconsIcon icon={Cancel01Icon} size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {editableFields.map((key) => (
                        <div key={key} className="space-y-2 group">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted group-focus-within:text-foreground transition-colors">
                                {key.replace(/_/g, " ")}
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={formData[key] ?? ""}
                                    onChange={(e) => handleChange(key, e.target.value)}
                                    className="w-full bg-background border-b-2 border-border-strong p-3 font-mono text-xs focus:border-foreground outline-none transition-all focus:bg-foreground/5"
                                />
                                <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-foreground transition-all duration-300 group-focus-within:w-full" />
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t-2 border-border-strong flex justify-end gap-4 bg-foreground/5">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 border-2 border-border text-muted hover:text-foreground hover:border-foreground font-black uppercase text-[10px] tracking-[0.2em] transition-all active:translate-y-0.5"
                    >
                        Abort
                    </button>
                    <button
                        onClick={() => onSave(formData)}
                        className="px-8 py-2 bg-foreground text-background font-black uppercase text-[10px] tracking-[0.2em] flex items-center gap-2 hover:invert transition-all active:translate-y-0.5"
                    >
                        <HugeiconsIcon icon={Tick01Icon} size={14} />
                        Commit Changes
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function NewArchitecturePage() {
    const [logs, setLogs] = useState<ItemLog[]>([]);
    const [wrappers, setWrappers] = useState<ItemLogWrapper[]>([]);
    const [trades, setTrades] = useState<Trade[]>([]);
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [activeTab, setActiveTab] = useState<"logs" | "wrappers" | "trades-receipts" | "services">("logs");
    const [isLoading, setIsLoading] = useState(true);

    // Modal state
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingObject, setEditingObject] = useState<any>(null);
    const [editType, setEditType] = useState<"log" | "wrapper">("log");

    const service = useMemo(() => new ItemLogService(), []);
    const museumService = useMemo(() => new MuseumService(), []);
    const tradeService = useMemo(() => new TradeService(), []);
    const receiptService = useMemo(() => new ReceiptService(), []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [fetchedLogs, fetchedWrappers, fetchedTrades, fetchedReceipts] = await Promise.all([
                service.getAllLogs(),
                service.getAllWrappers(),
                tradeService.getAllTrades(),
                receiptService.getAllReceipts(),
            ]);
            setLogs(fetchedLogs);
            setWrappers(fetchedWrappers);
            setTrades(fetchedTrades);
            setReceipts(fetchedReceipts);
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

    const handleAddWrapper = async () => {
        const type = prompt("Enter Wrapper Type (auto-split | manual-transfer | museum-exchange):", "manual-transfer") as any;
        const subType = prompt("Enter Sub-Type (plushie-set | flower-set | leave empty for none):", "");
        const description = prompt("Enter Description:", "Manual transfer");
        const timestamp = prompt("Enter Timestamp (ms):", Date.now().toString());

        if (type && description && timestamp) {
            try {
                const wrapper = ItemLogWrapper.create({
                    type,
                    sub_type: (subType as any) || null,
                    description,
                    timestamp: parseInt(timestamp),
                });
                // @ts-ignore - using updateWrapper as a general put
                await service.updateWrapper(wrapper);
                await fetchData();
            } catch (error) {
                alert("Error adding wrapper: " + (error as Error).message);
            }
        }
    };

    const handleUpdateCostBasis = async () => {
        const minTimestamp = logs.length > 0 ? Math.min(...logs.map((l) => l.timestamp)) : Date.now();
        const timestamp = prompt("Enter Start Timestamp (ms) for global recalculation:", minTimestamp.toString());
        if (timestamp) {
            setIsLoading(true);
            try {
                await service.updateCostBasis(parseInt(timestamp));
                alert("Global cost basis recalculation completed successfully.");
                await fetchData();
            } catch (error) {
                alert("Error updating cost basis: " + (error as Error).message);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleTransferItem = async () => {
        const itemId = prompt("Enter Item ID:", "1");
        const fromCat = prompt("Enter From Category (normal|abroad|museum|city-finds):", "abroad") as any;
        const toCat = prompt("Enter To Category (normal|abroad|museum|city-finds):", "normal") as any;
        const quantity = prompt("Enter Quantity:", "10");
        const unitCost = prompt("Enter Unit Cost (leave empty for automatic avg cost):", "");

        if (itemId && fromCat && toCat && quantity) {
            setIsLoading(true);
            try {
                await service.transferItem(
                    parseInt(itemId),
                    fromCat,
                    toCat,
                    parseInt(quantity),
                    unitCost ? parseFloat(unitCost) : null
                );
                alert("Transfer completed successfully.");
                await fetchData();
            } catch (error) {
                alert("Error during transfer: " + (error as Error).message);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleMuseumExchange = async () => {
        const setType = prompt("Enter Set Type (plushie-set | exotic-flower-set):", "plushie-set") as any;
        const quantity = prompt("Enter Number of Sets:", "1");

        if (setType && quantity) {
            setIsLoading(true);
            try {
                await museumService.exchangeSet(
                    setType,
                    parseInt(quantity),
                    service
                );
                alert("Museum exchange completed successfully.");
                await fetchData();
            } catch (error) {
                alert("Error during museum exchange: " + (error as Error).message);
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

    const handleFetchTrade = async () => {
        const tornId = prompt("Enter Torn Trade ID:");
        if (tornId) {
            setIsLoading(true);
            try {
                await tradeService.fetchAndCreateTrade(tornId);
                alert("Trade fetched and created successfully.");
                await fetchData();
            } catch (error) {
                alert("Error fetching trade: " + (error as Error).message);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleFetchReceipt = async (source: "weav3r" | "tornexchange") => {
        const receiptId = prompt(`Enter ${source} Receipt ID:`);
        if (receiptId) {
            setIsLoading(true);
            try {
                await receiptService.fetchAndCreateReceipt(source, receiptId);
                alert(`${source} receipt fetched and created successfully.`);
                await fetchData();
            } catch (error) {
                alert(`Error fetching ${source} receipt: ` + (error as Error).message);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleLinkTradeReceipt = async () => {
        const tradeId = prompt("Enter Trade DB ID:");
        const receiptId = prompt("Enter Receipt DB ID:");
        if (tradeId && receiptId) {
            setIsLoading(true);
            try {
                await tradeService.linkReceiptToTrade(parseInt(tradeId), parseInt(receiptId));
                alert("Receipt linked to trade successfully.");
                await fetchData();
            } catch (error) {
                alert("Error linking receipt: " + (error as Error).message);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleDeleteTrade = async (id: number) => {
            setIsLoading(true);
            try {
                await tradeService.deleteTrade(id);
                await fetchData();
            } catch (error) {
                alert("Error deleting trade: " + (error as Error).message);
            } finally {
                setIsLoading(false);
            }
    };

    const handleDeleteReceipt = async (id: number) => {
            setIsLoading(true);
            try {
                await receiptService.deleteReceipt(id);
                await fetchData();
            } catch (error) {
                alert("Error deleting receipt: " + (error as Error).message);
            } finally {
                setIsLoading(false);
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

    const handleExport = (format: 'csv' | 'md') => {
        const data = activeTab === 'logs' ? logs : wrappers;
        const filename = activeTab === 'logs' ? 'item_logs' : 'wrappers';
        if (format === 'csv') exportData.csv(data, filename);
        else exportData.markdown(data, filename);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto py-8 px-4">
            <PageHeader 
                title="Archive v2" 
                description="Core Architecture Debug Protocol"
                icon={DatabaseIcon} 
            />

            {/* TAB SYSTEM */}
            <div className="flex flex-wrap gap-2 p-1 bg-panel border-2 border-primary inline-flex">
                {(["logs", "wrappers", "trades-receipts", "services"] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-2 font-black uppercase text-[10px] tracking-[0.3em] transition-all relative overflow-hidden ${
                            activeTab === tab
                                ? "bg-primary text-background"
                                : "text-muted hover:text-foreground hover:bg-primary/5"
                        }`}
                    >
                        {tab.replace("-", " & ")}
                    </button>
                ))}
            </div>

            {/* MAIN CONSOLE */}
            <div className="bg-panel border-2 border-primary overflow-hidden shadow-lg shadow-primary/5">
                {/* Console Header Bar */}
                <div className="h-10 border-b-2 border-primary flex items-center px-4 justify-between bg-muted/10">
                    <div className="flex gap-2">
                        <button
                            onClick={fetchData}
                            className="text-muted hover:text-primary transition-all font-black uppercase text-[9px] tracking-[0.2em] flex items-center gap-2"
                        >
                            <HugeiconsIcon
                                icon={RefreshIcon}
                                size={12}
                                className={isLoading ? "animate-spin" : ""}
                            />
                            SYNC
                        </button>
                        <div className="w-[1px] bg-primary/20 h-3 self-center" />
                        <button
                            onClick={() => handleExport('csv')}
                            className="text-muted hover:text-primary transition-all font-black uppercase text-[9px] tracking-[0.2em]"
                        >
                            CSV
                        </button>
                        <button
                            onClick={() => handleExport('md')}
                            className="text-muted hover:text-primary transition-all font-black uppercase text-[9px] tracking-[0.2em]"
                        >
                            MD
                        </button>
                    </div>
                    <div className="text-[9px] font-black uppercase tracking-[0.5em] text-muted">
                        {activeTab}.{isLoading ? "processing" : "ready"}
                    </div>
                </div>

                <div className="p-0 overflow-hidden min-h-[400px]">
                    {activeTab === "logs" && (
                        <div className="space-y-0">
                            <div className="p-4 border-b border-primary/20 flex justify-between items-center bg-muted/5">
                                <div className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                                    <HugeiconsIcon icon={DatabaseIcon} size={14} />
                                    ITEM_LOG_BUFFER
                                </div>
                                <button
                                    onClick={handleAddDummyLog}
                                    className="px-4 py-1.5 bg-primary text-background font-black uppercase text-[9px] tracking-[0.2em] flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all"
                                >
                                    <HugeiconsIcon icon={PlusSignIcon} size={12} />
                                    INJECT_DUMMY
                                </button>
                            </div>

                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse table-auto border-spacing-0">
                                    <thead>
                                        <tr className="bg-muted/10 border-b border-primary/20 text-[9px] font-black uppercase tracking-[0.3em] text-muted whitespace-nowrap">
                                            <th className="p-2 border-r border-primary/10">ID</th>
                                            <th className="p-2 border-r border-primary/10">WID</th>
                                            <th className="p-2 border-r border-primary/10">Item ID</th>
                                            <th className="p-2 border-r border-primary/10 text-right">Qty</th>
                                            <th className="p-2 border-r border-primary/10 text-right">Price</th>
                                            <th className="p-2 border-r border-primary/10">Category</th>
                                            <th className="p-2 border-r border-primary/10 text-right">Stock</th>
                                            <th className="p-2 border-r border-primary/10 text-right">Cost</th>
                                            <th className="p-2 border-r border-primary/10 text-right">Profit</th>
                                            <th className="p-2 border-r border-primary/10">Timestamp</th>
                                            <th className="p-2 border-r border-primary/10">Updated</th>
                                            <th className="p-2 text-right">Ops</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[10px] font-mono leading-none divide-y divide-primary/5">
                                        {logs.map((log, index) => (
                                            <tr
                                                key={log.id}
                                                className="hover:bg-primary/[0.02] transition-colors group animate-in slide-in-from-left-2 fade-in fill-mode-backwards"
                                                style={{ animationDelay: `${index * 30}ms` }}
                                            >
                                                <td className="p-2 border-r border-primary/5 text-muted/60">{log.id}</td>
                                                <td className="p-2 border-r border-primary/5 text-muted/60">
                                                    {log.wrapper_id ?? "NONE"}
                                                </td>
                                                <td className="p-2 border-r border-primary/5">{log.item_id}</td>
                                                <td className={`p-2 border-r border-primary/5 font-black text-right ${log.quantity >= 0 ? "text-success" : "text-danger"}`}>
                                                    {log.quantity > 0 ? `+${log.quantity}` : log.quantity}
                                                </td>
                                                <td className="p-2 border-r border-primary/5 text-right text-muted/80">${log.unit_price.toLocaleString()}</td>
                                                <td className="p-2 border-r border-primary/5">
                                                    <span className="px-2 py-0.5 border border-primary/20 bg-muted/10 text-[8px] font-black uppercase tracking-wider">
                                                        {log.category}
                                                    </span>
                                                </td>
                                                <td className="p-2 border-r border-primary/5 text-right">{log.total_stock}</td>
                                                <td className="p-2 border-r border-primary/5 text-right text-muted/80">${log.total_cost.toLocaleString()}</td>
                                                <td className="p-2 border-r border-primary/5 text-success font-black text-right">
                                                    +${log.realized_profit.toLocaleString()}
                                                </td>
                                                <td className="p-2 border-r border-primary/5 text-[9px] text-muted/50">
                                                    {log.timestamp}
                                                </td>
                                                <td className="p-2 border-r border-primary/5 text-[9px] text-muted/50">
                                                    {log.updated_at}
                                                </td>
                                                <td className="p-2 text-right">
                                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => openEditModal(log, "log")}
                                                            className="w-6 h-6 flex items-center justify-center border border-primary/20 hover:border-info hover:text-info transition-all"
                                                            title="MOD_LOG"
                                                        >
                                                            <HugeiconsIcon icon={PencilEdit02Icon} size={12} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteLog(log.id!)}
                                                            className="w-6 h-6 flex items-center justify-center border border-primary/20 hover:border-danger hover:text-danger transition-all"
                                                            title="PURGE_LOG"
                                                        >
                                                            <HugeiconsIcon icon={Delete02Icon} size={12} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {logs.length === 0 && (
                                            <tr>
                                                <td colSpan={12} className="p-20 text-center text-muted font-black uppercase tracking-[0.5em] italic animate-pulse">
                                                    NO_DATA_RECORDS_LOCATED
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === "wrappers" && (
                        <div className="space-y-0">
                            <div className="p-4 border-b border-primary/20 flex justify-between items-center bg-muted/5">
                                <div className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                                    <HugeiconsIcon icon={DatabaseIcon} size={14} />
                                    WRAPPER_REGISTRY
                                </div>
                                <button
                                    onClick={handleAddWrapper}
                                    className="px-4 py-1.5 bg-primary text-background font-black uppercase text-[9px] tracking-[0.2em] flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all"
                                >
                                    <HugeiconsIcon icon={PlusSignIcon} size={12} />
                                    INJECT_WRAPPER
                                </button>
                            </div>
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse table-auto divide-y divide-primary/5">
                                    <thead>
                                        <tr className="bg-muted/10 border-b border-primary/20 text-[9px] font-black uppercase tracking-[0.3em] text-muted whitespace-nowrap">
                                            <th className="p-2 border-r border-primary/10">ID</th>
                                            <th className="p-2 border-r border-primary/10">Type</th>
                                            <th className="p-2 border-r border-primary/10">Subtype</th>
                                            <th className="p-2 border-r border-primary/10">Desc</th>
                                            <th className="p-2 border-r border-primary/10">Time</th>
                                            <th className="p-2 border-r border-primary/10">Updated</th>
                                            <th className="p-2 text-right">Ops</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[10px] font-mono leading-none divide-y divide-primary/5">
                                        {wrappers.map((wrapper, index) => (
                                            <tr
                                                key={wrapper.id}
                                                className="hover:bg-primary/[0.02] transition-colors group animate-in slide-in-from-left-2 fade-in fill-mode-backwards"
                                                style={{ animationDelay: `${index * 50}ms` }}
                                            >
                                                <td className="p-2 border-r border-primary/5 text-muted/60">{wrapper.id}</td>
                                                <td className="p-2 border-r border-primary/5">
                                                    <span className="px-2 py-0.5 border border-primary/20 bg-muted/10 text-[8px] font-black uppercase tracking-wider">
                                                        {wrapper.type}
                                                    </span>
                                                </td>
                                                <td className="p-2 border-r border-primary/5">
                                                    {wrapper.sub_type ? (
                                                        <span className="px-2 py-0.5 border border-info/20 bg-info/5 text-info text-[8px] font-black uppercase tracking-wider">
                                                            {wrapper.sub_type}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted/40 italic">-</span>
                                                    )}
                                                </td>
                                                <td className="p-2 border-r border-primary/5">{wrapper.description}</td>
                                                <td className="p-2 border-r border-primary/5 text-muted/60">
                                                    {wrapper.timestamp}
                                                </td>
                                                <td className="p-2 border-r border-primary/5 text-muted/60">
                                                    {wrapper.updated_at}
                                                </td>
                                                <td className="p-2 text-right">
                                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => openEditModal(wrapper, "wrapper")}
                                                            className="w-6 h-6 flex items-center justify-center border border-primary/20 hover:border-info hover:text-info transition-all"
                                                            title="MOD_WRAP"
                                                        >
                                                            <HugeiconsIcon icon={PencilEdit02Icon} size={12} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteWrapper(wrapper.id!)}
                                                            className="w-6 h-6 flex items-center justify-center border border-primary/20 hover:border-danger hover:text-danger transition-all"
                                                            title="PURGE_WRAP"
                                                        >
                                                            <HugeiconsIcon icon={Delete02Icon} size={12} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {wrappers.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="p-20 text-center text-muted font-black uppercase tracking-[0.5em] italic animate-pulse">
                                                    NO_WRAPPER_RECORDS
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === "trades-receipts" && (
                        <div className="space-y-0">
                            <div className="p-4 border-b border-primary/20 flex flex-wrap gap-4 justify-between items-center bg-muted/5">
                                <div className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                                    <HugeiconsIcon icon={TradeUpIcon} size={14} />
                                    TRADES_AND_RECEIPTS_REGISTRY
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleFetchTrade}
                                        className="px-4 py-1.5 bg-primary text-background font-black uppercase text-[9px] tracking-[0.2em] flex items-center gap-2 hover:opacity-90 transition-all"
                                    >
                                        <HugeiconsIcon icon={PlusSignIcon} size={12} />
                                        FETCH_TRADE
                                    </button>
                                    <button
                                        onClick={() => handleFetchReceipt("weav3r")}
                                        className="px-4 py-1.5 bg-primary text-background font-black uppercase text-[9px] tracking-[0.2em] flex items-center gap-2 hover:opacity-90 transition-all"
                                    >
                                        <HugeiconsIcon icon={PlusSignIcon} size={12} />
                                        FETCH_WEAV3R
                                    </button>
                                    <button
                                        onClick={() => handleFetchReceipt("tornexchange")}
                                        className="px-4 py-1.5 bg-primary text-background font-black uppercase text-[9px] tracking-[0.2em] flex items-center gap-2 hover:opacity-90 transition-all"
                                    >
                                        <HugeiconsIcon icon={PlusSignIcon} size={12} />
                                        FETCH_TE
                                    </button>
                                    <button
                                        onClick={handleLinkTradeReceipt}
                                        className="px-4 py-1.5 border-2 border-primary font-black uppercase text-[9px] tracking-[0.2em] flex items-center gap-2 hover:bg-primary hover:text-background transition-all"
                                    >
                                        <HugeiconsIcon icon={Link01Icon} size={12} />
                                        LINK_RECEIPT
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 divide-x divide-primary/20">
                                <div>
                                    <div className="p-2 bg-muted/10 border-b border-primary/20 text-[9px] font-black uppercase tracking-widest text-center">
                                        TRADES
                                    </div>
                                    <div className="overflow-x-auto custom-scrollbar">
                                        <table className="w-full text-left border-collapse table-auto border-spacing-0 divide-y divide-primary/5">
                                            <thead>
                                                <tr className="bg-muted/5 border-b border-primary/20 text-[9px] font-black uppercase tracking-[0.3em] text-muted whitespace-nowrap">
                                                    <th className="p-2 border-r border-primary/10">ID</th>
                                                    <th className="p-2 border-r border-primary/10">Torn ID</th>
                                                    <th className="p-2 border-r border-primary/10">Wrapper</th>
                                                    <th className="p-2 border-r border-primary/10">Receipt</th>
                                                    <th className="p-2 border-r border-primary/10">Timestamp</th>
                                                    <th className="p-2 text-right">Ops</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-[10px] font-mono divide-y divide-primary/5">
                                                {trades.map((trade) => (
                                                    <tr key={trade.id} className="hover:bg-primary/[0.02] group transition-colors">
                                                        <td className="p-2 border-r border-primary/5 text-muted/60">{trade.id}</td>
                                                        <td className="p-2 border-r border-primary/5">{trade.torn_id}</td>
                                                        <td className="p-2 border-r border-primary/5">{trade.wrapper_id}</td>
                                                        <td className="p-2 border-r border-primary/5">{trade.receipt_id ?? "NONE"}</td>
                                                        <td className="p-2 border-r border-primary/5 text-muted/50">{trade.timestamp}</td>
                                                        <td className="p-2 text-right">
                                                            <button
                                                                onClick={() => handleDeleteTrade(trade.id!)}
                                                                className="w-6 h-6 flex items-center justify-center border border-primary/10 hover:border-danger hover:text-danger transition-all opacity-0 group-hover:opacity-100"
                                                                title="PURGE_TRADE"
                                                            >
                                                                <HugeiconsIcon icon={Delete02Icon} size={12} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                <div>
                                    <div className="p-2 bg-muted/10 border-b border-primary/20 text-[9px] font-black uppercase tracking-widest text-center">
                                        RECEIPTS
                                    </div>
                                    <div className="overflow-x-auto custom-scrollbar">
                                        <table className="w-full text-left border-collapse table-auto border-spacing-0 divide-y divide-primary/5">
                                            <thead>
                                                <tr className="bg-muted/5 border-b border-primary/20 text-[9px] font-black uppercase tracking-[0.3em] text-muted whitespace-nowrap">
                                                    <th className="p-2 border-r border-primary/10">ID</th>
                                                    <th className="p-2 border-r border-primary/10">Source</th>
                                                    <th className="p-2 border-r border-primary/10">Ext ID</th>
                                                    <th className="p-2 border-r border-primary/10 text-right">Value</th>
                                                    <th className="p-2 border-r border-primary/10">Created</th>
                                                    <th className="p-2 text-right">Ops</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-[10px] font-mono divide-y divide-primary/5">
                                                {receipts.map((receipt) => (
                                                    <tr key={receipt.id} className="hover:bg-primary/[0.02] group transition-colors">
                                                        <td className="p-2 border-r border-primary/5 text-muted/60">{receipt.id}</td>
                                                        <td className="p-2 border-r border-primary/5">
                                                            <span className={`px-2 py-0.5 border border-primary/20 text-[8px] font-black uppercase tracking-wider ${receipt.source === "weav3r" ? "bg-info/10 text-info" : "bg-warning/10 text-warning"}`}>
                                                                {receipt.source}
                                                            </span>
                                                        </td>
                                                        <td className="p-2 border-r border-primary/5">{receipt.receipt_id_string}</td>
                                                        <td className="p-2 border-r border-primary/5 text-right font-black">${receipt.total_value.toLocaleString()}</td>
                                                        <td className="p-2 border-r border-primary/5 text-muted/50">{receipt.created_at}</td>
                                                        <td className="p-2 text-right">
                                                            <button
                                                                onClick={() => handleDeleteReceipt(receipt.id!)}
                                                                className="w-6 h-6 flex items-center justify-center border border-primary/10 hover:border-danger hover:text-danger transition-all opacity-0 group-hover:opacity-100"
                                                                title="PURGE_RECEIPT"
                                                            >
                                                                <HugeiconsIcon icon={Delete02Icon} size={12} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "services" && (
                        <div className="p-12 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                            <div className="p-6 border-2 border-primary/20 space-y-4 bg-muted/5 hover:border-primary transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 border-2 border-primary group-hover:bg-primary group-hover:text-background transition-all">
                                        <HugeiconsIcon icon={Settings01Icon} size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black uppercase tracking-wider">
                                            RECALCULATE_COST_BASIS
                                        </h3>
                                        <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Protocol.Alpha</p>
                                    </div>
                                </div>
                                <p className="text-xs text-muted leading-relaxed font-mono">
                                    Triggers full recalculation of cost-basis and running totals for specific inventory ID from defined temporal origin.
                                </p>
                                <button
                                    onClick={handleUpdateCostBasis}
                                    className="w-full py-3 border-2 border-primary font-black uppercase text-[10px] tracking-[0.3em] hover:bg-primary hover:text-background transition-all shadow-md shadow-primary/5"
                                >
                                    EXECUTE_SERVICE_001
                                </button>
                            </div>

                            <div className="p-6 border-2 border-primary/20 space-y-4 bg-muted/5 hover:border-primary transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 border-2 border-primary group-hover:bg-primary group-hover:text-background transition-all">
                                        <HugeiconsIcon icon={Settings01Icon} size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black uppercase tracking-wider">
                                            TRANSFER_INVENTORY
                                        </h3>
                                        <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Protocol.Beta</p>
                                    </div>
                                </div>
                                <p className="text-xs text-muted leading-relaxed font-mono">
                                    Executes a manual transfer of inventory units between categories. Creates a wrapper and linked logs.
                                </p>
                                <button
                                    onClick={handleTransferItem}
                                    className="w-full py-3 border-2 border-primary font-black uppercase text-[10px] tracking-[0.3em] hover:bg-primary hover:text-background transition-all shadow-md shadow-primary/5"
                                >
                                    EXECUTE_SERVICE_002
                                </button>
                            </div>

                            <div className="p-6 border-2 border-primary/20 space-y-4 bg-muted/5 hover:border-primary transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 border-2 border-primary group-hover:bg-primary group-hover:text-background transition-all">
                                        <HugeiconsIcon icon={Settings01Icon} size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black uppercase tracking-wider">
                                            MUSEUM_EXCHANGE
                                        </h3>
                                        <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Protocol.Gamma</p>
                                    </div>
                                </div>
                                <p className="text-xs text-muted leading-relaxed font-mono">
                                    Exchanges sets of items for Points at the Museum. Validates sufficient stock in the 'museum' category.
                                </p>
                                <button
                                    onClick={handleMuseumExchange}
                                    className="w-full py-3 border-2 border-primary font-black uppercase text-[10px] tracking-[0.3em] hover:bg-primary hover:text-background transition-all shadow-md shadow-primary/5"
                                >
                                    EXECUTE_SERVICE_003
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Metadata */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 opacity-50">
                <p className="text-[9px] text-muted font-black uppercase tracking-[0.5em]">
                    HARDLINE_ARCH_DEBUGGER // BML_OS.v4.0.0
                </p>
                <div className="flex gap-4 text-[9px] font-black uppercase tracking-[0.2em] text-muted">
                    <span>SYS_OK</span>
                    <span>BUF_ACTIVE</span>
                    <span className="text-success">CON_ESTABLISHED</span>
                </div>
            </div>

            {/* Modal Injection */}
            {isEditModalOpen && (
                <EditModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={handleSaveEdit}
                    initialData={editingObject}
                    title={editType === "log" ? "EDIT_LOG_ENTRY" : "EDIT_WRAPPER_RECORD"}
                />
            )}
            
            {/* Global Style Injection for Custom Scrollbar */}
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                    height: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.05);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #3a3a3f;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #f2f2f2;
                }
            `}</style>
        </div>
    );
}
