"use client";

import { useMemo, useState, useRef, Suspense } from "react";
import { useJournal } from "@/store/useJournal";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    ArrowRight01Icon,
    ArrowLeft01Icon,
    ArrowUp01Icon,
    ArrowDown01Icon,
    Download01Icon,
    Upload01Icon,
    Delete02Icon,
    PencilEdit01Icon,
    Search01Icon,
    RefreshIcon,
    Tick01Icon,
    Square01Icon,
    Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { format } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { TransactionSourceType, formatItemName, getMuseumExchangeDefinition } from "@/lib/old/parser";
import {
    AnyTrackedTransaction,
    MugTransaction,
    Transaction as NewTransaction,
    WrapperTransaction,
} from "@/lib/old/interfaces/transactions";
import { useHapticFeedback } from "@/lib/old/useHapticFeedback";

type LegacyTransaction = import("@/lib/old/parser").Transaction;
type DisplayTransaction = LegacyTransaction | AnyTrackedTransaction;

function isWrapperTransaction(transaction: DisplayTransaction): transaction is WrapperTransaction {
    return (
        Boolean(transaction) &&
        typeof transaction === "object" &&
        "isWrapper" in transaction &&
        transaction.isWrapper === true &&
        "wrappedTransactionIDs" in transaction
    );
}

function isNewConcreteTransaction(transaction: DisplayTransaction): transaction is NewTransaction {
    return (
        Boolean(transaction) &&
        typeof transaction === "object" &&
        "isWrapper" in transaction &&
        transaction.isWrapper === false &&
        "timestamp" in transaction &&
        "stockType" in transaction
    );
}

function isNewMugTransaction(transaction: DisplayTransaction): transaction is MugTransaction {
    return (
        Boolean(transaction) &&
        typeof transaction === "object" &&
        "kind" in transaction &&
        transaction.kind === "mug"
    );
}

function isLegacyTransaction(transaction: DisplayTransaction): transaction is LegacyTransaction {
    return (
        Boolean(transaction) &&
        typeof transaction === "object" &&
        "date" in transaction &&
        "type" in transaction
    );
}

function getTransactionTimestamp(transaction: DisplayTransaction) {
    return isLegacyTransaction(transaction) ? transaction.date : transaction.timestamp;
}

function getDisplayItemName(transaction: DisplayTransaction) {
    if (isWrapperTransaction(transaction)) {
        return transaction.itemName
            ? formatItemName(transaction.itemName)
            : transaction.description || "Grouped Transaction";
    }

    if (isNewConcreteTransaction(transaction)) {
        return transaction.itemName
            ? formatItemName(transaction.itemName)
            : `Item ${transaction.itemID}`;
    }

    if (isNewMugTransaction(transaction)) {
        return "Money";
    }

    if (transaction.type === "BUY" || transaction.type === "SELL") {
        return formatItemName(transaction.item);
    }
    if (transaction.type === "CONVERT") {
        return `${formatItemName(transaction.fromItem)} → ${formatItemName(transaction.toItem)}`;
    }
    if (transaction.type === "SET_CONVERT") {
        const definition = getMuseumExchangeDefinition(transaction.setType);
        return `${transaction.times}x ${definition.label}${definition.isSet ? " Set" : ""} → ${transaction.pointsEarned} Points`;
    }
    return "Money";
}

function getSourceLabel(sourceType?: TransactionSourceType) {
    if (sourceType === "item-market") return "Item Market";
    if (sourceType === "bazaar") return "Bazaar";
    if (sourceType === "trade") return "Trade";
    if (sourceType === "points-market") return "Points Market";
    if (sourceType === "museum") return "Museum";
    if (sourceType === "attack") return "Attack";
    if (sourceType === "travel") return "Travel";
    return "";
}

function getTradeWrapperMeta(transaction: WrapperTransaction) {
    const parts: string[] = [];

    if (transaction.partnerName || transaction.partnerID) {
        parts.push(
            [transaction.partnerName, transaction.partnerID ? `#${transaction.partnerID}` : null]
                .filter(Boolean)
                .join(" ")
        );
    }

    if (typeof transaction.itemCount === "number" && transaction.itemCount > 0) {
        parts.push(
            `${transaction.itemCount} different item${transaction.itemCount === 1 ? "" : "s"}`
        );
    }

    if (transaction.tradeID) {
        parts.push(`Trade ${transaction.tradeID}`);
    }

    if (transaction.receiptID) {
        parts.push(`Receipt ${transaction.receiptID}`);
    }

    return parts;
}

function inferSourceType(transaction: DisplayTransaction): TransactionSourceType | undefined {
    if (isLegacyTransaction(transaction)) {
        if (transaction.sourceType) return transaction.sourceType;
        if (
            transaction.tradeGroupId ||
            transaction.weav3rReceiptId ||
            transaction.tornLogId?.startsWith("trade:")
        )
            return "trade";
        return undefined;
    }

    if (transaction.source === "trade") return "trade";
    if (transaction.source) return transaction.source;
    if (transaction.tradeID || transaction.tornID?.startsWith("trade:")) return "trade";
    return undefined;
}

function LogsPageContent() {
    const {
        isLoaded,
        transactions,
        deleteLog,
        deleteLogs,
        restoreData,
        editLog,
        refreshDriveCache,
    } = useJournal();
    const { vibrate } = useHapticFeedback();
    const router = useRouter();
    const searchParams = useSearchParams();
    const filterItem = searchParams.get("item");
    const filterItemID = searchParams.get("itemID");
    const groupID = searchParams.get("groupID");

    const [search, setSearch] = useState(filterItem || "");
    const [isRefreshingDrive, setIsRefreshingDrive] = useState(false);
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 50;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const storagePref =
        typeof window !== "undefined" ? localStorage.getItem("bml_storage_pref") : null;

    const transactionMap = useMemo(
        () => new Map(transactions.map((transaction) => [transaction.id, transaction])),
        [transactions]
    );

    const itemNameByID = useMemo(() => {
        const map = new Map<number, string>();
        transactions.forEach((transaction) => {
            if (isNewConcreteTransaction(transaction) && transaction.itemName) {
                map.set(transaction.itemID, transaction.itemName);
            }
            if (
                isWrapperTransaction(transaction) &&
                transaction.itemID !== null &&
                transaction.itemName
            ) {
                map.set(transaction.itemID, transaction.itemName);
            }
        });
        return map;
    }, [transactions]);

    const visibleLogs = useMemo(() => {
        if (groupID) {
            return transactions.filter(
                (transaction) =>
                    "groupID" in transaction &&
                    transaction.groupID === groupID &&
                    transaction.id !== groupID
            );
        }

        const wrapperIds = new Set(
            transactions.filter(isWrapperTransaction).map((transaction) => transaction.id)
        );

        return transactions.filter((transaction) => {
            if (isWrapperTransaction(transaction)) {
                return true;
            }

            if (
                "groupID" in transaction &&
                transaction.groupID &&
                transaction.groupID !== transaction.id &&
                wrapperIds.has(transaction.groupID)
            ) {
                return false;
            }

            return true;
        });
    }, [groupID, transactions]);

    const filteredLogs = visibleLogs
        .filter((t) => {
            if (filterItemID) {
                const numericItemID = Number(filterItemID);
                const wrapperMatchesItem = isWrapperTransaction(t)
                    ? t.itemID === numericItemID ||
                      (t.wrappedTransactionIDs || []).some((childId) => {
                          const child = transactionMap.get(childId);
                          return child && isNewConcreteTransaction(child)
                              ? child.itemID === numericItemID
                              : false;
                      })
                    : isNewConcreteTransaction(t)
                      ? t.itemID === numericItemID
                      : false;

                if (!wrapperMatchesItem) {
                    return false;
                }
            }

            if (!search) return true;
            const term = search.toLowerCase();
            if (isWrapperTransaction(t)) {
                return Boolean(
                    t.wrapperType.toLowerCase().includes(term) ||
                    t.description?.toLowerCase().includes(term) ||
                    t.partnerName?.toLowerCase().includes(term) ||
                    t.partnerID?.toLowerCase().includes(term) ||
                    t.receiptID?.toLowerCase().includes(term)
                );
            }

            if (isNewConcreteTransaction(t)) {
                if (t.description?.toLowerCase().includes(term)) return true;
                return (t.itemName || "").toLowerCase().includes(term);
            }

            if (isNewMugTransaction(t)) {
                if ("mug".includes(term)) return true;
                return t.description?.toLowerCase().includes(term) || false;
            }

            if (isLegacyTransaction(t)) {
                const legacy = t as LegacyTransaction;
                if (legacy.type === "MUG") return "mug".includes(term);
                if (legacy.type === "CONVERT")
                    return (
                        legacy.fromItem.toLowerCase().includes(term) ||
                        legacy.toItem.toLowerCase().includes(term)
                    );
                if (legacy.type === "SET_CONVERT") {
                    const definition = getMuseumExchangeDefinition(legacy.setType);
                    if (
                        definition.label.toLowerCase().includes(term) ||
                        `${definition.label.toLowerCase()} set`.includes(term) ||
                        "set point".includes(term)
                    )
                        return true;
                    return definition.items.some((item) =>
                        item.itemName.toLowerCase().includes(term)
                    );
                }
                return legacy.item.toLowerCase().includes(term);
            }

            return false;
        })
        .sort((a, b) => {
            if (groupID) {
                if (isWrapperTransaction(a) && !isWrapperTransaction(b)) return -1;
                if (!isWrapperTransaction(a) && isWrapperTransaction(b)) return 1;
            }
            return getTransactionTimestamp(b) - getTransactionTimestamp(a);
        });

    const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    if (!isLoaded)
        return (
            <div className="text-center py-20 animate-pulse text-foreground/50">
                Loading Tracker Data...
            </div>
        );

    const handleBackup = () => {
        const dataStr = JSON.stringify(transactions, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `torn-invest-backup-${format(new Date(), "yyyy-MM-dd")}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                if (Array.isArray(json)) {
                    if (
                        confirm(
                            "Do you want to MERGE with current logs? Cancel will OVERWRITE completely."
                        )
                    ) {
                        restoreData(json, true);
                    } else {
                        restoreData(json, false);
                    }
                    alert("Backup restored successfully.");
                }
            } catch (err) {
                alert("Invalid backup file.");
            }
        };
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const toggleSelection = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredLogs.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredLogs.map((t) => t.id)));
        }
    };

    const enterSelectionMode = () => {
        vibrate("utility");
        setSelectionMode(true);
        setSelectedIds(new Set());
    };

    const exitSelectionMode = () => {
        setSelectionMode(false);
        setSelectedIds(new Set());
    };

    const expandDeletionIds = (ids: string[]) => {
        const expanded = new Set<string>();
        ids.forEach((id) => {
            expanded.add(id);
            const transaction = transactionMap.get(id);
            if (transaction && isWrapperTransaction(transaction)) {
                transaction.wrappedTransactionIDs.forEach((childId) => expanded.add(childId));
            }
        });
        return Array.from(expanded);
    };

    const handleBulkDelete = () => {
        const count = selectedIds.size;
        if (count === 0) return;
        vibrate("danger");
        if (confirm(`Delete ${count} selected transaction${count > 1 ? "s" : ""}?`)) {
            deleteLogs(expandDeletionIds(Array.from(selectedIds)));
            exitSelectionMode();
        }
    };

    const renderWrappedTransactionLine = (t: DisplayTransaction) => {
        if (isWrapperTransaction(t)) {
            return `${t.wrapperType} wrapper`;
        }

        if (isNewConcreteTransaction(t)) {
            const direction = t.amount >= 0 ? "IN" : "OUT";
            return `${getDisplayItemName(t)} • ${direction} ${Math.abs(t.amount).toLocaleString()} • ${t.stockType}`;
        }

        if (isLegacyTransaction(t)) {
            if (t.type === "BUY" || t.type === "SELL") {
                return `${t.type} ${t.amount.toLocaleString()}x ${formatItemName(t.item)}`;
            }
            if (t.type === "CONVERT") {
                return `${formatItemName(t.fromItem)} → ${formatItemName(t.toItem)}`;
            }
            if (t.type === "SET_CONVERT") {
                const definition = getMuseumExchangeDefinition(t.setType);
                return `${t.times}x ${definition.label}${definition.isSet ? " set" : ""}`;
            }
        }

        return "Mug loss";
    };

    const renderTransactionRow = (t: DisplayTransaction) => {
        const sourceType = inferSourceType(t);
        const sourceLabel = getSourceLabel(sourceType);
        const isSelected = selectedIds.has(t.id);
        const isWrapper = isWrapperTransaction(t);
        const isSkipRow = isNewConcreteTransaction(t) && t.stockType === "skip";
        const date = getTransactionTimestamp(t);
        return (
            <tr
                key={t.id}
                className={`hover:bg-foreground/[0.02] transition-colors border-b border-border/50 ${isSelected ? "bg-primary/5" : ""} ${isWrapper || selectionMode ? "cursor-pointer" : ""} ${isSkipRow ? "opacity-60" : ""}`}
                onClick={() => {
                    if (selectionMode) {
                        vibrate("utility");
                        toggleSelection(t.id);
                        return;
                    }
                    if (!isWrapper) return;
                    const params = new URLSearchParams(searchParams.toString());
                    params.set("groupID", t.id);
                    router.push(`/logs?${params.toString()}`);
                }}
            >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground/70">
                    {format(new Date(date), "MMM d, yyyy HH:mm")}
                </td>
                <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                        {isWrapperTransaction(t) && (
                            <span className="text-violet-700 font-medium bg-violet-500/10 px-2 py-1 rounded text-xs tracking-wider">
                                {t.wrapperType.toUpperCase()}
                            </span>
                        )}
                        {isLegacyTransaction(t) && t.type === "BUY" && (
                            <span className="text-green-700 font-medium bg-green-500/10 px-2 py-1 rounded text-xs tracking-wider">
                                BUY
                            </span>
                        )}
                        {isLegacyTransaction(t) && t.type === "SELL" && (
                            <span className="text-blue-700 font-medium bg-blue-500/10 px-2 py-1 rounded text-xs tracking-wider">
                                SELL
                            </span>
                        )}
                        {isLegacyTransaction(t) && t.type === "MUG" && (
                            <span className="text-red-700 font-medium bg-red-500/10 px-2 py-1 rounded text-xs tracking-wider">
                                MUG
                            </span>
                        )}
                        {isLegacyTransaction(t) && t.type === "CONVERT" && (
                            <span className="text-violet-700 font-medium bg-violet-500/10 px-2 py-1 rounded text-xs tracking-wider">
                                CONVERT
                            </span>
                        )}
                        {isLegacyTransaction(t) && t.type === "SET_CONVERT" && (
                            <span className="text-violet-700 font-medium bg-violet-500/10 px-2 py-1 rounded text-xs tracking-wider">
                                SET CONVERT
                            </span>
                        )}
                        {isNewConcreteTransaction(t) && t.amount >= 0 && (
                            <span className="text-green-700 font-medium bg-green-500/10 px-2 py-1 rounded text-xs tracking-wider">
                                BUY
                            </span>
                        )}
                        {isNewConcreteTransaction(t) && t.amount < 0 && (
                            <span className="text-blue-700 font-medium bg-blue-500/10 px-2 py-1 rounded text-xs tracking-wider">
                                SELL
                            </span>
                        )}
                        {isNewConcreteTransaction(t) && t.stockType === "skip" && (
                            <span className="text-slate-600 font-medium bg-slate-500/10 px-2 py-1 rounded text-xs tracking-wider">
                                SKIP
                            </span>
                        )}
                        {isNewMugTransaction(t) && (
                            <span className="text-red-700 font-medium bg-red-500/10 px-2 py-1 rounded text-xs tracking-wider">
                                MUG
                            </span>
                        )}
                        {isLegacyTransaction(t) && t.tag === "Abroad" && (
                            <span className="text-amber-700 font-medium bg-amber-500/10 px-2 py-1 rounded text-xs tracking-wider">
                                ABROAD
                            </span>
                        )}
                        {isNewConcreteTransaction(t) && t.stockType === "abroad" && (
                            <span className="text-amber-700 font-medium bg-amber-500/10 px-2 py-1 rounded text-xs tracking-wider">
                                ABROAD
                            </span>
                        )}
                    </div>
                </td>
                <td className="px-6 py-4">
                    <div className="font-medium">
                        {isWrapperTransaction(t)
                            ? t.description || `${t.wrapperType} wrapper`
                            : getDisplayItemName(t)}
                    </div>
                    {sourceLabel && (
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-foreground/50">
                            <span className="rounded-full border border-border px-2 py-0.5 font-semibold uppercase tracking-wider">
                                {sourceLabel}
                            </span>
                        </div>
                    )}
                    {isWrapper && t.wrapperType === "trade" && !t.description && (
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-foreground/50">
                            {getTradeWrapperMeta(t).map((part) => (
                                <span key={`${t.id}:${part}`}>{part}</span>
                            ))}
                        </div>
                    )}
                    {isWrapperTransaction(t) && (
                        <div className="mt-1 text-[11px] text-foreground/50">
                            {groupID
                                ? `${t.wrappedTransactionIDs.length} wrapped transaction${t.wrappedTransactionIDs.length === 1 ? "" : "s"} in this group`
                                : `Click to view ${t.wrappedTransactionIDs.length} wrapped transaction${t.wrappedTransactionIDs.length === 1 ? "" : "s"}`}
                        </div>
                    )}
                </td>
                <td className="px-6 py-4 text-right">
                    {isWrapperTransaction(t) ? `${t.wrappedTransactionIDs.length} txns` : ""}
                    {isLegacyTransaction(t) && (t.type === "BUY" || t.type === "SELL")
                        ? t.amount.toLocaleString()
                        : ""}
                    {isLegacyTransaction(t) && t.type === "CONVERT"
                        ? `${t.fromAmount} → ${t.toAmount}`
                        : ""}
                    {isLegacyTransaction(t) && t.type === "SET_CONVERT" ? `${t.times} sets` : ""}
                    {isNewConcreteTransaction(t) ? Math.abs(t.amount).toLocaleString() : ""}
                    {isNewMugTransaction(t) ? "-" : ""}
                </td>
                <td className="px-6 py-4 text-right">
                    <div className="flex flex-col items-end">
                        <div className="font-medium text-foreground">
                            {isWrapperTransaction(t) && t.price !== null
                                ? `$${t.price.toLocaleString()}`
                                : ""}
                            {isLegacyTransaction(t) && (t.type === "BUY" || t.type === "SELL")
                                ? `$${t.price.toLocaleString()}`
                                : ""}
                            {isLegacyTransaction(t) && t.type === "MUG"
                                ? `-$${t.amount.toLocaleString()}`
                                : ""}
                            {isNewConcreteTransaction(t) ? `$${t.price.toLocaleString()}` : ""}
                            {isNewMugTransaction(t) ? `-$${t.amount.toLocaleString()}` : ""}
                        </div>
                        {(() => {
                            let profitValue = 0;
                            let costBasisTotal = 0;
                            let hasSell = false;

                            if (isNewConcreteTransaction(t) && t.amount < 0) {
                                hasSell = true;
                                const absAmount = Math.abs(t.amount);
                                profitValue = (t.price - (t.currentCostBasis || 0)) * absAmount;
                                costBasisTotal = (t.currentCostBasis || 0) * absAmount;
                            } else if (isWrapper) {
                                t.wrappedTransactionIDs.forEach((childId) => {
                                    const child = transactionMap.get(childId);
                                    if (
                                        child &&
                                        isNewConcreteTransaction(child) &&
                                        child.amount < 0
                                    ) {
                                        hasSell = true;
                                        const absAmount = Math.abs(child.amount);
                                        profitValue +=
                                            (child.price - (child.currentCostBasis || 0)) *
                                            absAmount;
                                        costBasisTotal += (child.currentCostBasis || 0) * absAmount;
                                    }
                                });
                            }

                            if (!hasSell) return null;

                            const profitPercentage =
                                costBasisTotal > 0 ? (profitValue / costBasisTotal) * 100 : 0;

                            return (
                                <div
                                    className={`text-[12px] font-bold tracking-tight ${profitValue >= 0 ? "text-green-500/80" : "text-red-500/80"}`}
                                >
                                    {profitValue >= 0 ? "+" : "-"}$
                                    {Math.round(Math.abs(profitValue)).toLocaleString()}
                                    {" · "}
                                    {profitValue >= 0 ? "+" : "-"}
                                    {Math.round(Math.abs(profitPercentage))}%
                                </div>
                            );
                        })()}
                    </div>
                </td>
                <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 items-center">
                        {isLegacyTransaction(t) && (t.type === "BUY" || t.type === "SELL") && (
                            <button
                                onClick={(event) => {
                                    event.stopPropagation();
                                    vibrate("utility");
                                    const newPriceStr = prompt(
                                        "Enter new price:",
                                        t.price.toString()
                                    );
                                    const newAmountStr = prompt(
                                        "Enter new amount:",
                                        t.amount.toString()
                                    );
                                    if (newPriceStr !== null && newAmountStr !== null) {
                                        const newPrice = parseInt(newPriceStr, 10);
                                        const newAmount = parseInt(newAmountStr, 10);
                                        if (!isNaN(newPrice) && !isNaN(newAmount)) {
                                            vibrate("success");
                                            editLog(t.id, { price: newPrice, amount: newAmount });
                                        } else {
                                            vibrate("danger");
                                            alert("Invalid numbers provided.");
                                        }
                                    }
                                }}
                                className="text-primary/70 hover:text-primary hover:bg-primary/10 p-2 rounded-lg transition-colors"
                            >
                                <HugeiconsIcon icon={PencilEdit01Icon} size={16} />
                            </button>
                        )}
                        {isWrapper && (
                            <button
                                onClick={(event) => {
                                    event.stopPropagation();
                                    const params = new URLSearchParams(searchParams.toString());
                                    params.set("groupID", t.id);
                                    router.push(`/logs?${params.toString()}`);
                                }}
                                className="text-foreground/60 hover:text-foreground hover:bg-foreground/5 p-1.5 rounded-lg transition-colors"
                            >
                                <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                            </button>
                        )}
                    </div>
                </td>
            </tr>
        );
    };

    return (
        <div
            className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
            style={
                {
                    "--primary": "#8b5cf6", // Violet
                } as React.CSSProperties
            }
        >
            {(filterItem || filterItemID || groupID) && (
                <Link
                    href={groupID ? "/logs" : "/"}
                    onClick={() => vibrate("nav")}
                    className="inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-foreground transition-colors"
                >
                    <HugeiconsIcon icon={ArrowLeft01Icon} size={16} /> Back to Dashboard
                </Link>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {groupID
                            ? `Transaction Group ${groupID}`
                            : filterItemID
                              ? `${formatItemName(itemNameByID.get(Number(filterItemID)) || `item ${filterItemID}`)} Logs`
                              : filterItem
                                ? `${formatItemName(filterItem)} Logs`
                                : "Manage Logs"}
                    </h1>
                    <p className="text-foreground/60 mt-2">
                        View, edit, or delete specific transactions.
                    </p>
                </div>

                <div className="flex gap-2">
                    {selectionMode ? (
                        <button
                            onClick={exitSelectionMode}
                            className="flex items-center gap-2 px-4 py-2 bg-panel border border-border shadow-sm rounded-lg hover:bg-foreground/5 transition-colors text-sm font-medium"
                        >
                            <HugeiconsIcon icon={Cancel01Icon} size={16} /> Cancel
                        </button>
                    ) : (
                        <button
                            onClick={enterSelectionMode}
                            className="flex items-center gap-2 px-4 py-2 bg-panel border border-border shadow-sm rounded-lg hover:bg-foreground/5 transition-colors text-sm font-medium"
                        >
                            <HugeiconsIcon icon={Tick01Icon} size={16} /> Select
                        </button>
                    )}
                    {storagePref === "drive" && (
                        <button
                            onClick={async () => {
                                setIsRefreshingDrive(true);
                                vibrate("utility");
                                try {
                                    await refreshDriveCache();
                                    vibrate("success");
                                } catch (error) {
                                    console.error("Force download failed", error);
                                    vibrate("danger");
                                    alert(
                                        error instanceof Error
                                            ? error.message
                                            : "Failed to download latest Drive data."
                                    );
                                } finally {
                                    setIsRefreshingDrive(false);
                                }
                            }}
                            disabled={isRefreshingDrive}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white shadow-sm rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-60"
                        >
                            <HugeiconsIcon
                                icon={RefreshIcon}
                                size={16}
                                className={isRefreshingDrive ? "animate-spin" : ""}
                            />
                            Force Download
                        </button>
                    )}
                    <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleRestore}
                    />
                    <button
                        onClick={() => {
                            vibrate("utility");
                            fileInputRef.current?.click();
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-panel border border-border shadow-sm rounded-lg hover:bg-foreground/5 transition-colors text-sm font-medium"
                    >
                        <HugeiconsIcon icon={Upload01Icon} size={16} /> Import Backup
                    </button>
                    <button
                        onClick={() => {
                            vibrate("success");
                            handleBackup();
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground shadow-sm rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                    >
                        <HugeiconsIcon icon={Download01Icon} size={16} /> Export Backup
                    </button>
                </div>
            </div>

            <div className="bg-panel rounded-xl border border-border shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                <div className="p-4 border-b border-border bg-foreground/[0.02] flex items-center justify-between flex-wrap gap-4">
                    <h2 className="font-semibold">
                        {filteredLogs.length > 0
                            ? `Showing ${startIndex + 1}-${Math.min(endIndex, filteredLogs.length)} of ${filteredLogs.length} Transactions`
                            : "No Transactions"}
                    </h2>
                    <div className="flex items-center gap-3">
                        <div className="relative w-64">
                            <HugeiconsIcon
                                icon={Search01Icon}
                                size={16}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40"
                            />
                            <input
                                type="text"
                                placeholder="Search items..."
                                value={search}
                                onChange={(e) => {
                                    if (!search && e.target.value) {
                                        vibrate("utility");
                                    }
                                    setSearch(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full pl-9 pr-4 py-2 text-sm bg-panel border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase text-foreground/60 bg-foreground/5 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Action</th>
                                <th className="px-6 py-4">Item</th>
                                <th className="px-6 py-4 text-right">Qty</th>
                                <th className="px-6 py-4 text-right">Price/Loss</th>
                                <th className="px-6 py-4 text-right"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-6 py-12 text-center text-foreground/50 italic"
                                    >
                                        No logs found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                paginatedLogs.map(renderTransactionRow)
                            )}
                        </tbody>
                    </table>
                </div>

                {filteredLogs.length > ITEMS_PER_PAGE && (
                    <div className="p-4 border-t border-border flex items-center justify-between">
                        <div className="text-sm text-foreground/60">
                            Page {currentPage} of {totalPages}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => goToPage(1)}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg hover:bg-foreground/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="First page"
                            >
                                <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
                            </button>
                            <button
                                onClick={() => goToPage(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg hover:bg-foreground/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Previous page"
                            >
                                <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
                            </button>
                            <button
                                onClick={() => goToPage(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg hover:bg-foreground/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Next page"
                            >
                                <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                            </button>
                            <button
                                onClick={() => goToPage(totalPages)}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg hover:bg-foreground/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Last page"
                            >
                                <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {selectionMode && selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-panel border border-border shadow-lg rounded-xl animate-in fade-in slide-in-from-bottom-4 duration-200">
                    <span className="text-sm font-medium text-foreground/80">
                        {selectedIds.size} selected
                    </span>
                    <button
                        onClick={handleBulkDelete}
                        className="flex items-center gap-2 px-4 py-2 bg-danger text-danger-foreground rounded-lg hover:bg-danger/90 transition-colors text-sm font-medium"
                    >
                        <HugeiconsIcon icon={Delete02Icon} size={16} /> Delete Selected
                    </button>
                    <button
                        onClick={exitSelectionMode}
                        className="flex items-center gap-2 px-3 py-2 bg-foreground/5 rounded-lg hover:bg-foreground/10 transition-colors text-sm"
                    >
                        <HugeiconsIcon icon={Cancel01Icon} size={16} />
                    </button>
                </div>
            )}
        </div>
    );
}

// Wrap inside Suspense boundary due to useSearchParams
export default function LogsPage() {
    return (
        <Suspense fallback={<div className="animate-pulse">Loading...</div>}>
            <LogsPageContent />
        </Suspense>
    );
}
