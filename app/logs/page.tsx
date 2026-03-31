"use client";

import { useMemo, useState, useRef, Suspense } from "react";
import { useJournal } from "@/store/useJournal";
import {
  Download,
  Upload,
  Trash2,
  Edit2,
  Search,
  ArrowLeft,
  RefreshCw,
  CheckSquare,
  Square,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  TransactionSourceType,
  formatItemName,
  getMuseumExchangeDefinition,
} from "@/lib/parser";
import {
  AnyTrackedTransaction,
  MugTransaction,
  Transaction as NewTransaction,
  WrapperTransaction,
} from "@/lib/interfaces/transactions";
import { useHapticFeedback } from "@/lib/useHapticFeedback";

type LegacyTransaction = import("@/lib/parser").Transaction;
type DisplayTransaction = LegacyTransaction | AnyTrackedTransaction;

function isWrapperTransaction(
  transaction: DisplayTransaction,
): transaction is WrapperTransaction {
  return (
    Boolean(transaction) &&
    typeof transaction === "object" &&
    "isWrapper" in transaction &&
    transaction.isWrapper === true &&
    "wrappedTransactionIDs" in transaction
  );
}

function isNewConcreteTransaction(
  transaction: DisplayTransaction,
): transaction is NewTransaction {
  return (
    Boolean(transaction) &&
    typeof transaction === "object" &&
    "isWrapper" in transaction &&
    transaction.isWrapper === false &&
    "timestamp" in transaction &&
    "stockType" in transaction
  );
}

function isNewMugTransaction(
  transaction: DisplayTransaction,
): transaction is MugTransaction {
  return (
    Boolean(transaction) &&
    typeof transaction === "object" &&
    "kind" in transaction &&
    transaction.kind === "mug"
  );
}

function isLegacyTransaction(
  transaction: DisplayTransaction,
): transaction is LegacyTransaction {
  return Boolean(transaction) && typeof transaction === "object" && "date" in transaction && "type" in transaction;
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
  return "";
}

function getTradeWrapperMeta(transaction: WrapperTransaction) {
  const parts: string[] = [];

  if (transaction.partnerName || transaction.partnerID) {
    parts.push(
      [transaction.partnerName, transaction.partnerID ? `#${transaction.partnerID}` : null]
        .filter(Boolean)
        .join(" "),
    );
  }

  if (typeof transaction.itemCount === "number" && transaction.itemCount > 0) {
    parts.push(
      `${transaction.itemCount} different item${transaction.itemCount === 1 ? "" : "s"}`,
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

function inferSourceType(
  transaction: DisplayTransaction,
): TransactionSourceType | undefined {
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
  if (
    transaction.tradeID ||
    transaction.tornID?.startsWith("trade:")
  )
    return "trade";
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
  const [showLinkedIds, setShowLinkedIds] = useState(false);
  const [isRefreshingDrive, setIsRefreshingDrive] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const storagePref =
    typeof window !== "undefined"
      ? localStorage.getItem("bml_storage_pref")
      : null;

  const transactionMap = useMemo(
    () => new Map(transactions.map((transaction) => [transaction.id, transaction])),
    [transactions],
  );

  const itemNameByID = useMemo(() => {
    const map = new Map<number, string>();
    transactions.forEach((transaction) => {
      if (isNewConcreteTransaction(transaction) && transaction.itemName) {
        map.set(transaction.itemID, transaction.itemName);
      }
      if (isWrapperTransaction(transaction) && transaction.itemID !== null && transaction.itemName) {
        map.set(transaction.itemID, transaction.itemName);
      }
    });
    return map;
  }, [transactions]);

  const visibleLogs = useMemo(() => {
    if (groupID) {
      return transactions.filter(
        (transaction) => "groupID" in transaction && transaction.groupID === groupID,
      );
    }

    const wrapperIds = new Set(
      transactions
        .filter(isWrapperTransaction)
        .map((transaction) => transaction.id),
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
            t.wrappedTransactionIDs.some((childId) => {
              const child = transactionMap.get(childId);
              return isNewConcreteTransaction(child as DisplayTransaction)
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
            t.receiptID?.toLowerCase().includes(term) ||
            (showLinkedIds &&
              (t.tornID?.toLowerCase().includes(term) ||
                t.tradeID?.toLowerCase().includes(term) ||
                t.id.toLowerCase().includes(term))),
        );
      }

      if (isNewConcreteTransaction(t)) {
        if (t.description?.toLowerCase().includes(term)) return true;
        if ((t.itemName || "").toLowerCase().includes(term)) return true;
        if (t.stockType.toLowerCase().includes(term)) return true;
        if (!showLinkedIds) return false;
        return Boolean(
          t.tornID?.toLowerCase().includes(term) ||
            t.tradeID?.toLowerCase().includes(term),
        );
      }

      if (isNewMugTransaction(t)) {
        if ("mug".includes(term)) return true;
        if (t.description?.toLowerCase().includes(term)) return true;
        if (!showLinkedIds) return false;
        return Boolean(
          t.tornID?.toLowerCase().includes(term) ||
            t.tradeID?.toLowerCase().includes(term),
        );
      }

      if (t.type === "MUG") return "mug".includes(term);
      if (t.type === "CONVERT")
        return (
          t.fromItem.toLowerCase().includes(term) ||
          t.toItem.toLowerCase().includes(term)
        );
      if (t.type === "SET_CONVERT") {
        const definition = getMuseumExchangeDefinition(t.setType);
        if (
          definition.label.toLowerCase().includes(term) ||
          `${definition.label.toLowerCase()} set`.includes(term) ||
          "set point".includes(term)
        )
          return true;
        return definition.items.some((item) => item.itemName.toLowerCase().includes(term));
      }
      if (t.item.toLowerCase().includes(term)) return true;
      if (!showLinkedIds) return false;
      return Boolean(
        t.tornLogId?.toLowerCase().includes(term) ||
        t.tradeGroupId?.toLowerCase().includes(term) ||
        t.weav3rReceiptId?.toLowerCase().includes(term),
      );
    })
    .sort((a, b) => {
      if (groupID) {
        if (isWrapperTransaction(a) && !isWrapperTransaction(b)) return -1;
        if (!isWrapperTransaction(a) && isWrapperTransaction(b)) return 1;
      }
      return getTransactionTimestamp(b) - getTransactionTimestamp(a);
    });

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
              "Do you want to MERGE with current logs? Cancel will OVERWRITE completely.",
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
    if (
      confirm(`Delete ${count} selected transaction${count > 1 ? "s" : ""}?`)
    ) {
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
    return "Mug loss";
  };

  const renderTransactionRow = (t: DisplayTransaction) => {
    const sourceType = inferSourceType(t);
    const sourceLabel = getSourceLabel(sourceType);
    const isSelected = selectedIds.has(t.id);
    const isWrapper = isWrapperTransaction(t);
    const date = getTransactionTimestamp(t);
    return (
      <tr
        key={t.id}
        className={`hover:bg-foreground/[0.02] transition-colors border-b border-border/50 ${isSelected ? "bg-primary/5" : ""} ${isWrapper ? "cursor-pointer" : ""}`}
        onClick={() => {
          if (!isWrapper || selectionMode) return;
          const params = new URLSearchParams(searchParams.toString());
          params.set("groupID", t.id);
          router.push(`/logs?${params.toString()}`);
        }}
      >
        {selectionMode && (
          <td className="px-4 py-4">
            <button
              onClick={() => {
                vibrate("utility");
                toggleSelection(t.id);
              }}
              className="p-1 rounded hover:bg-foreground/10 transition-colors"
            >
              {isSelected ? (
                <CheckSquare className="w-4 h-4 text-primary" />
              ) : (
                <Square className="w-4 h-4 text-foreground/40" />
              )}
            </button>
          </td>
        )}
        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground/70">
          {format(new Date(date), "MMM d, yyyy HH:mm")}
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-2">
            {isWrapper && (
              <span className="text-primary font-medium bg-primary/10 px-2 py-1 rounded text-xs tracking-wider">
                {t.wrapperType.toUpperCase()}
              </span>
            )}
            {isLegacyTransaction(t) && t.type === "BUY" && (
              <span className="text-primary font-medium bg-primary/10 px-2 py-1 rounded text-xs tracking-wider">
                BUY
              </span>
            )}
            {isLegacyTransaction(t) && t.type === "SELL" && (
              <span className="text-success font-medium bg-success/10 px-2 py-1 rounded text-xs tracking-wider">
                SELL
              </span>
            )}
            {isLegacyTransaction(t) && t.type === "MUG" && (
              <span className="text-danger font-medium bg-danger/10 px-2 py-1 rounded text-xs tracking-wider">
                MUG
              </span>
            )}
            {isLegacyTransaction(t) && t.type === "CONVERT" && (
              <span className="text-primary font-medium bg-primary/10 px-2 py-1 rounded text-xs tracking-wider">
                CONVERT
              </span>
            )}
            {isLegacyTransaction(t) && t.type === "SET_CONVERT" && (
              <span className="text-primary font-medium bg-primary/10 px-2 py-1 rounded text-xs tracking-wider">
                SET CONVERT
              </span>
            )}
            {isLegacyTransaction(t) && t.tag === "Abroad" && (
              <span className="text-warning font-medium bg-warning/10 px-2 py-1 rounded text-xs tracking-wider">
                ABROAD
              </span>
            )}
            {isNewConcreteTransaction(t) && t.stockType === "abroad" && (
              <span className="text-warning font-medium bg-warning/10 px-2 py-1 rounded text-xs tracking-wider">
                ABROAD
              </span>
            )}
            {isNewConcreteTransaction(t) && t.amount >= 0 && (
              <span className="text-primary font-medium bg-primary/10 px-2 py-1 rounded text-xs tracking-wider">
                BUY
              </span>
            )}
            {isNewConcreteTransaction(t) && t.amount < 0 && (
              <span className="text-success font-medium bg-success/10 px-2 py-1 rounded text-xs tracking-wider">
                SELL
              </span>
            )}
            {isNewConcreteTransaction(t) && t.stockType === "skip" && (
              <span className="text-danger font-medium bg-danger/10 px-2 py-1 rounded text-xs tracking-wider">
                SKIP
              </span>
            )}
            {isNewMugTransaction(t) && (
              <span className="text-danger font-medium bg-danger/10 px-2 py-1 rounded text-xs tracking-wider">
                MUG
              </span>
            )}
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="font-medium">
            {isWrapper ? t.description || `${t.wrapperType} wrapper` : getDisplayItemName(t)}
          </div>
          {(sourceLabel ||
            (showLinkedIds &&
              (isLegacyTransaction(t)
                ? t.tornLogId || t.tradeGroupId || t.weav3rReceiptId
                : t.tornID || t.tradeID))) && (
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-foreground/50">
              {sourceLabel && (
                <span className="rounded-full border border-border px-2 py-0.5 font-semibold uppercase tracking-wider">
                  {sourceLabel}
                </span>
              )}
              {showLinkedIds && isLegacyTransaction(t) && t.tornLogId && <span>Torn: {t.tornLogId}</span>}
              {showLinkedIds && isLegacyTransaction(t) && t.tradeGroupId && <span>Trade: {t.tradeGroupId}</span>}
              {showLinkedIds && isLegacyTransaction(t) && t.weav3rReceiptId && <span>Receipt: {t.weav3rReceiptId}</span>}
              {showLinkedIds && !isLegacyTransaction(t) && t.tornID && <span>Torn: {t.tornID}</span>}
              {showLinkedIds && !isLegacyTransaction(t) && t.tradeID && <span>Trade: {t.tradeID}</span>}
            </div>
          )}
          {isWrapper && t.wrapperType === "trade" && (
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-foreground/50">
              {getTradeWrapperMeta(t).map((part) => (
                <span key={`${t.id}:${part}`}>{part}</span>
              ))}
            </div>
          )}
          {isWrapper && (
            <div className="mt-1 text-[11px] text-foreground/50">
              {groupID
                ? `${t.wrappedTransactionIDs.length} wrapped transaction${t.wrappedTransactionIDs.length === 1 ? "" : "s"} in this group`
                : `Click to view ${t.wrappedTransactionIDs.length} wrapped transaction${t.wrappedTransactionIDs.length === 1 ? "" : "s"}`}
            </div>
          )}
        </td>
        <td className="px-6 py-4 text-right">
          {isWrapper
            ? `${t.wrappedTransactionIDs.length} txns`
            : ""}
          {isLegacyTransaction(t) && (t.type === "BUY" || t.type === "SELL")
            ? t.amount.toLocaleString()
            : ""}
          {isLegacyTransaction(t) && t.type === "CONVERT" ? `${t.fromAmount} → ${t.toAmount}` : ""}
          {isLegacyTransaction(t) && t.type === "SET_CONVERT" ? `${t.times} sets` : ""}
          {isNewConcreteTransaction(t)
            ? Math.abs(t.amount).toLocaleString()
            : ""}
          {isNewMugTransaction(t) ? "-" : ""}
        </td>
        <td className="px-6 py-4 text-right">
          {isWrapper && t.price !== null ? `$${t.price.toLocaleString()}` : ""}
          {isLegacyTransaction(t) && (t.type === "BUY" || t.type === "SELL")
            ? `$${t.price.toLocaleString()}`
            : ""}
          {isLegacyTransaction(t) && t.type === "MUG" ? `-$${t.amount.toLocaleString()}` : ""}
          {isNewConcreteTransaction(t) ? `$${t.price.toLocaleString()}` : ""}
          {isNewMugTransaction(t) ? `-$${t.amount.toLocaleString()}` : ""}
        </td>
        <td className="px-6 py-4 text-right flex justify-end gap-2 items-center">
          {isLegacyTransaction(t) && (t.type === "BUY" || t.type === "SELL") && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                vibrate("utility");
                const newPriceStr = prompt(
                  "Enter new price:",
                  t.price.toString(),
                );
                const newAmountStr = prompt(
                  "Enter new amount:",
                  t.amount.toString(),
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
              <Edit2 className="w-4 h-4" />
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
              className="text-primary/70 hover:text-primary hover:bg-primary/10 p-2 rounded-lg transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={(event) => {
              event.stopPropagation();
              vibrate("danger");
              const idsToDelete = isWrapper ? [t.id, ...t.wrappedTransactionIDs] : [t.id];
              if (confirm("Delete this log?")) deleteLogs(idsToDelete);
            }}
            className="text-danger/70 hover:text-danger hover:bg-danger/10 p-2 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
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
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
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
              <X className="w-4 h-4" /> Cancel
            </button>
          ) : (
            <button
              onClick={enterSelectionMode}
              className="flex items-center gap-2 px-4 py-2 bg-panel border border-border shadow-sm rounded-lg hover:bg-foreground/5 transition-colors text-sm font-medium"
            >
              <CheckSquare className="w-4 h-4" /> Select
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
                      : "Failed to download latest Drive data.",
                  );
                } finally {
                  setIsRefreshingDrive(false);
                }
              }}
              disabled={isRefreshingDrive}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white shadow-sm rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-60"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshingDrive ? "animate-spin" : ""}`}
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
            <Upload className="w-4 h-4" /> Import Backup
          </button>
          <button
            onClick={() => {
              vibrate("success");
              handleBackup();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground shadow-sm rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" /> Export Backup
          </button>
        </div>
      </div>

      <div className="bg-panel rounded-xl border border-border shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        <div className="p-4 border-b border-border bg-foreground/[0.02] flex items-center justify-between">
          <h2 className="font-semibold">{filteredLogs.length} Transactions</h2>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-foreground/60">
              <input
                type="checkbox"
                checked={showLinkedIds}
                onChange={(event) => setShowLinkedIds(event.target.checked)}
                className="rounded border-border"
              />
              Show Linked IDs
            </label>
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
              <input
                type="text"
                placeholder={
                  showLinkedIds ? "Search items or IDs..." : "Search items..."
                }
                value={search}
                onChange={(e) => {
                  if (!search && e.target.value) {
                    vibrate("utility");
                  }
                  setSearch(e.target.value);
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
                {selectionMode && (
                  <th className="px-4 py-4">
                    <button
                      onClick={() => {
                        vibrate("utility");
                        toggleSelectAll();
                      }}
                      className="p-1 rounded hover:bg-foreground/10 transition-colors"
                    >
                      {selectedIds.size === filteredLogs.length &&
                      filteredLogs.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : (
                        <Square className="w-4 h-4 text-foreground/40" />
                      )}
                    </button>
                  </th>
                )}
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
                    colSpan={selectionMode ? 7 : 6}
                    className="px-6 py-12 text-center text-foreground/50 italic"
                  >
                    No logs found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(renderTransactionRow)
              )}
            </tbody>
          </table>
        </div>
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
            <Trash2 className="w-4 h-4" /> Delete Selected
          </button>
          <button
            onClick={exitSelectionMode}
            className="flex items-center gap-2 px-3 py-2 bg-foreground/5 rounded-lg hover:bg-foreground/10 transition-colors text-sm"
          >
            <X className="w-4 h-4" />
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
