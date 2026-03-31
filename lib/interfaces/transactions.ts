import {
  getMuseumExchangeDefinition,
  ParsedLog,
  Transaction as LegacyJournalTransaction,
  TransactionSourceType,
  normalizeItemName,
} from "../parser";
import { TornItemSource } from "../game/itemLog";

export const CURR_TRANSACTION_VERSION = 3;
export const TRANSACTION_PAGE_SIZE = 1000;

export type TransactionStockType =
  | "normal"
  | "abroad"
  | "city-find"
  | "consumption"
  | "skip";

export type TransactionSource = TornItemSource | "trade";
export type WrapperTransactionType =
  | "split"
  | "convert"
  | "set-convert"
  | "trade";
export type AnyTrackedTransaction =
  | Transaction
  | WrapperTransaction
  | MugTransaction;

export interface LegacyMigrationIssue {
  transactionId: string;
  reason: string;
}

export interface LegacyMigrationResult {
  transactions: AnyTrackedTransaction[];
  issues: LegacyMigrationIssue[];
}

export interface InventoryItemStats {
  stock: number;
  totalCost: number;
  realizedProfit: number;
  abroadStock: number;
  abroadTotalCost: number;
  abroadRealizedProfit: number;
}

export type ItemIDResolver =
  | Map<string, number>
  | Record<string, number>
  | ((itemName: string) => number | null | undefined);

export interface TransactionInput {
  id?: string;
  timestamp: number;
  itemID: number;
  itemName?: string | null;
  amount: number;
  price: number;
  source?: TransactionSource;
  stockType?: TransactionStockType | "auto";
  tornID?: string | null;
  tradeID?: string | null;
  description?: string | null;
  requestedAmount?: number;
}

export interface SetConvertInput {
  id?: string;
  timestamp: number;
  tornID?: string | null;
  tradeID?: string | null;
  description?: string | null;
  items: TransactionInput[];
}

export interface TradeTransactionInput {
  id?: string;
  timestamp: number;
  tornID?: string | null;
  tradeID?: string | null;
  description?: string | null;
  partnerName?: string | null;
  partnerID?: string | null;
  receiptID?: string | null;
  itemCount?: number | null;
  items: TransactionInput[];
}

export interface MugTransactionInput {
  id?: string;
  timestamp: number;
  amount: number;
  source?: TransactionSource | "attack";
  tornID?: string | null;
  tradeID?: string | null;
  description?: string | null;
}

export interface TransactionBuildResult {
  wrapper: WrapperTransaction | null;
  transactions: Transaction[];
}

function createID() {
  return crypto.randomUUID();
}

function getItemTypeKey(itemID: number, stockType: TransactionStockType) {
  return `${itemID}:${stockType}`;
}

function compareTransactions(
  left: AnyTrackedTransaction,
  right: AnyTrackedTransaction,
) {
  if (left.timestamp !== right.timestamp) {
    return left.timestamp - right.timestamp;
  }

  if (left.isWrapper !== right.isWrapper) {
    return left.isWrapper ? -1 : 1;
  }

  return left.id.localeCompare(right.id);
}

export class BaseTransaction {
  static CURR_TRANSACTION_VERSION = CURR_TRANSACTION_VERSION;

  id: string;
  version: number;
  timestamp: number;
  groupID: string;
  tornID: string | null;
  tradeID: string | null;
  description: string | null;
  isWrapper: boolean;

  constructor(
    id: string,
    timestamp: number,
    {
      version = CURR_TRANSACTION_VERSION,
      groupID,
      tornID = null,
      tradeID = null,
      description = null,
      isWrapper = false,
    }: {
      version?: number;
      groupID?: string;
      tornID?: string | null;
      tradeID?: string | null;
      description?: string | null;
      isWrapper?: boolean;
    } = {},
  ) {
    this.id = id;
    this.version = version;
    this.timestamp = timestamp;
    this.groupID = groupID ?? id;
    this.tornID = tornID;
    this.tradeID = tradeID;
    this.description = description;
    this.isWrapper = isWrapper;
  }
}

export class Transaction extends BaseTransaction {
  itemID: number;
  itemName: string | null;
  amount: number;
  requestedAmount: number;
  price: number;
  source: TransactionSource | null;
  stockType: TransactionStockType;
  currentStock: number;
  currentCostBasis: number;

  constructor(
    id: string,
    input: {
      timestamp: number;
      itemID: number;
      itemName?: string | null;
      amount: number;
      price: number;
      source?: TransactionSource | null;
      stockType?: TransactionStockType;
      tornID?: string | null;
      tradeID?: string | null;
      description?: string | null;
      groupID?: string;
      version?: number;
      requestedAmount?: number;
      currentStock?: number;
      currentCostBasis?: number;
    },
  ) {
    super(id, input.timestamp, {
      version: input.version,
      groupID: input.groupID,
      tornID: input.tornID,
      tradeID: input.tradeID,
      description: input.description,
      isWrapper: false,
    });

    this.itemID = input.itemID;
    this.itemName = input.itemName ?? null;
    this.amount = input.amount;
    this.requestedAmount = input.requestedAmount ?? input.amount;
    this.price = input.price;
    this.source = input.source ?? null;
    this.stockType = input.stockType ?? "normal";
    this.currentStock = input.currentStock ?? 0;
    this.currentCostBasis = input.currentCostBasis ?? 0;
  }

  recalculate(previousTransaction: Transaction | null) {
    const previousStock = previousTransaction?.currentStock ?? 0;
    const previousCostBasis = previousTransaction?.currentCostBasis ?? 0;

    if (this.stockType === "skip") {
      this.currentStock = previousStock;
      this.currentCostBasis = previousCostBasis;
      return;
    }

    if (this.amount >= 0) {
      const nextStock = previousStock + this.amount;
      this.currentStock = nextStock;
      this.currentCostBasis =
        nextStock === 0
          ? 0
          : (previousCostBasis * previousStock + this.amount * this.price) /
            nextStock;
      return;
    }

    const fulfilledAmount = Math.min(previousStock, Math.abs(this.amount));
    this.currentStock = previousStock - fulfilledAmount;
    this.currentCostBasis = previousCostBasis;
  }

  static fromInterface(input: Record<string, any>) {
    return new Transaction(input.id, {
      timestamp: input.timestamp,
      itemID: input.itemID,
      itemName: input.itemName ?? null,
      amount: input.amount,
      price: input.price,
      source: input.source ?? null,
      stockType: input.stockType,
      tornID: input.tornID ?? null,
      tradeID: input.tradeID ?? null,
      description: input.description ?? null,
      groupID: input.groupID,
      version: input.version,
      requestedAmount: input.requestedAmount,
      currentStock: input.currentStock,
      currentCostBasis: input.currentCostBasis,
    });
  }
}

export class WrapperTransaction extends BaseTransaction {
  wrapperType: WrapperTransactionType;
  wrappedTransactionIDs: string[];
  itemID: number | null;
  itemName: string | null;
  amount: number;
  price: number | null;
  source: TransactionSource | null;
  partnerName: string | null;
  partnerID: string | null;
  receiptID: string | null;
  itemCount: number | null;

  constructor(
    id: string,
    input: {
      timestamp: number;
      wrapperType: WrapperTransactionType;
      wrappedTransactionIDs?: string[];
      itemID?: number | null;
      itemName?: string | null;
      amount?: number;
      price?: number | null;
      source?: TransactionSource | null;
      tornID?: string | null;
      tradeID?: string | null;
      description?: string | null;
      partnerName?: string | null;
      partnerID?: string | null;
      receiptID?: string | null;
      itemCount?: number | null;
      groupID?: string;
      version?: number;
    },
  ) {
    super(id, input.timestamp, {
      version: input.version,
      groupID: input.groupID ?? id,
      tornID: input.tornID,
      tradeID: input.tradeID,
      description: input.description,
      isWrapper: true,
    });

    this.wrapperType = input.wrapperType;
    this.wrappedTransactionIDs = input.wrappedTransactionIDs ?? [];
    this.itemID = input.itemID ?? null;
    this.itemName = input.itemName ?? null;
    this.amount = input.amount ?? 0;
    this.price = input.price ?? null;
    this.source = input.source ?? null;
    this.partnerName = input.partnerName ?? null;
    this.partnerID = input.partnerID ?? null;
    this.receiptID = input.receiptID ?? null;
    this.itemCount = input.itemCount ?? null;
  }

  static fromInterface(input: Record<string, any>) {
    return new WrapperTransaction(input.id, {
      timestamp: input.timestamp,
      wrapperType: input.wrapperType,
      wrappedTransactionIDs: input.wrappedTransactionIDs ?? [],
      itemID: input.itemID ?? null,
      itemName: input.itemName ?? null,
      amount: input.amount ?? 0,
      price: input.price ?? null,
      source: input.source ?? null,
      tornID: input.tornID ?? null,
      tradeID: input.tradeID ?? null,
      description: input.description ?? null,
      partnerName: input.partnerName ?? null,
      partnerID: input.partnerID ?? null,
      receiptID: input.receiptID ?? null,
      itemCount: input.itemCount ?? null,
      groupID: input.groupID,
      version: input.version,
    });
  }
}

export class MugTransaction extends BaseTransaction {
  amount: number;
  source: TransactionSource | "attack" | null;
  kind: "mug";

  constructor(
    id: string,
    input: {
      timestamp: number;
      amount: number;
      source?: TransactionSource | "attack" | null;
      tornID?: string | null;
      tradeID?: string | null;
      description?: string | null;
      groupID?: string;
      version?: number;
    },
  ) {
    super(id, input.timestamp, {
      version: input.version,
      groupID: input.groupID,
      tornID: input.tornID,
      tradeID: input.tradeID,
      description: input.description,
      isWrapper: false,
    });
    this.amount = input.amount;
    this.source = input.source ?? "attack";
    this.kind = "mug";
  }

  static fromInterface(input: Record<string, any>) {
    return new MugTransaction(input.id, {
      timestamp: input.timestamp,
      amount: input.amount,
      source: input.source ?? "attack",
      tornID: input.tornID ?? null,
      tradeID: input.tradeID ?? null,
      description: input.description ?? null,
      groupID: input.groupID,
      version: input.version,
    });
  }
}

function isConcreteTransaction(
  transaction: AnyTrackedTransaction,
): transaction is Transaction {
  return !transaction.isWrapper && "itemID" in transaction;
}

function hydrateTransaction(
  transaction: AnyTrackedTransaction | Record<string, any>,
): AnyTrackedTransaction {
  if (transaction instanceof Transaction) {
    return transaction;
  }

  if (transaction instanceof WrapperTransaction) {
    return transaction;
  }

  if (transaction instanceof MugTransaction) {
    return transaction;
  }

  if ("kind" in transaction && transaction.kind === "mug") {
    return MugTransaction.fromInterface(transaction);
  }

  if ("isWrapper" in transaction && transaction.isWrapper === true) {
    return WrapperTransaction.fromInterface(transaction);
  }

  return Transaction.fromInterface(transaction);
}

function createDefaultInventoryStats(): InventoryItemStats {
  return {
    stock: 0,
    totalCost: 0,
    realizedProfit: 0,
    abroadStock: 0,
    abroadTotalCost: 0,
    abroadRealizedProfit: 0,
  };
}

export function getTrackedItemName(transaction: AnyTrackedTransaction) {
  if (transaction.isWrapper) {
    return transaction.itemName || null;
  }

  return transaction.itemName || null;
}

export function isMugTransaction(
  transaction: AnyTrackedTransaction,
): transaction is MugTransaction {
  return !transaction.isWrapper && "kind" in transaction && transaction.kind === "mug";
}

export class TransactionBuilder {
  transactions: AnyTrackedTransaction[];
  lastTransactionPerItemType: Map<string, Transaction>;

  constructor(existingTransactions: Array<AnyTrackedTransaction | Record<string, any>> = []) {
    this.transactions = existingTransactions
      .map((transaction) => hydrateTransaction(transaction))
      .sort(compareTransactions);
    this.lastTransactionPerItemType = new Map();
    this.rebuildIndexes();
  }

  getTransactions() {
    return [...this.transactions];
  }

  addTransaction(input: TransactionInput): TransactionBuildResult {
    const stockType = input.stockType ?? "auto";

    if (input.amount >= 0) {
      const transaction = this.insertSingle({
        ...input,
        stockType: stockType === "auto" ? "normal" : stockType,
      });
      return { wrapper: null, transactions: [transaction] };
    }

    if (stockType !== "auto") {
      const transaction = this.insertSingle({
        ...input,
        stockType,
      });
      return { wrapper: null, transactions: [transaction] };
    }

    const resolvedInputs = this.resolveSplitInputs(input);
    return this.insertWithOptionalWrapper("split", resolvedInputs, {
      timestamp: input.timestamp,
      itemID: input.itemID,
      amount: input.amount,
      price: input.price,
      source: input.source ?? null,
      tornID: input.tornID ?? null,
      tradeID: input.tradeID ?? null,
      description: input.description ?? null,
      forceWrap: resolvedInputs.length > 1,
    });
  }

  addSetConvert(input: SetConvertInput): TransactionBuildResult {
    return this.insertWrappedGroup("set-convert", input.items, {
      id: input.id,
      timestamp: input.timestamp,
      tornID: input.tornID ?? null,
      tradeID: input.tradeID ?? null,
      description: input.description ?? null,
    });
  }

  addTrade(input: TradeTransactionInput): TransactionBuildResult {
    return this.insertWrappedGroup("trade", input.items, {
      id: input.id,
      timestamp: input.timestamp,
      tornID: input.tornID ?? null,
      tradeID: input.tradeID ?? null,
      description: input.description ?? null,
      partnerName: input.partnerName ?? null,
      partnerID: input.partnerID ?? null,
      receiptID: input.receiptID ?? null,
      itemCount: input.itemCount ?? null,
    });
  }

  addConvert(input: SetConvertInput): TransactionBuildResult {
    return this.insertWrappedGroup("convert", input.items, {
      id: input.id,
      timestamp: input.timestamp,
      tornID: input.tornID ?? null,
      tradeID: input.tradeID ?? null,
      description: input.description ?? null,
    });
  }

  addMug(input: MugTransactionInput): MugTransaction {
    const transaction = new MugTransaction(input.id ?? createID(), {
      timestamp: input.timestamp,
      amount: input.amount,
      source: input.source ?? "attack",
      tornID: input.tornID ?? null,
      tradeID: input.tradeID ?? null,
      description: input.description ?? null,
    });
    this.insertIntoStore(transaction);
    return transaction;
  }

  private insertWrappedGroup(
    wrapperType: WrapperTransactionType,
    items: TransactionInput[],
    metadata: {
      id?: string;
      timestamp: number;
      tornID: string | null;
      tradeID: string | null;
      description: string | null;
      partnerName?: string | null;
      partnerID?: string | null;
      receiptID?: string | null;
      itemCount?: number | null;
    },
  ): TransactionBuildResult {
    const resolvedInputs: TransactionInput[] = [];

    items.forEach((item) => {
      if (item.amount < 0 && (item.stockType ?? "auto") === "auto") {
        resolvedInputs.push(...this.resolveSplitInputs(item));
        return;
      }

      resolvedInputs.push({
        ...item,
        stockType:
          (item.stockType ?? "auto") === "auto" ? "normal" : item.stockType,
      });
    });

    const normalizedInputs =
      wrapperType === "convert" || wrapperType === "set-convert"
        ? this.applyCostBasisTransfer(resolvedInputs)
        : resolvedInputs;

    return this.insertWithOptionalWrapper(wrapperType, normalizedInputs, {
      id: metadata.id,
      timestamp: metadata.timestamp,
      tornID: metadata.tornID,
      tradeID: metadata.tradeID,
      description: metadata.description,
      partnerName: metadata.partnerName ?? null,
      partnerID: metadata.partnerID ?? null,
      receiptID: metadata.receiptID ?? null,
      itemCount: metadata.itemCount ?? null,
      forceWrap: true,
    });
  }

  private applyCostBasisTransfer(items: TransactionInput[]) {
    const pricedItems = items.map((item) => ({ ...item }));
    let totalTransferredCost = 0;
    let totalIncomingAmount = 0;

    pricedItems.forEach((item) => {
      if (item.amount >= 0) {
        totalIncomingAmount += item.amount;
        return;
      }

      const stockType =
        item.stockType && item.stockType !== "auto" ? item.stockType : "normal";
      const snapshot = this.getSnapshotBefore(item.itemID, stockType, item.timestamp);
      const basisPrice = snapshot.costBasis;
      item.price = basisPrice;
      totalTransferredCost += basisPrice * Math.abs(item.amount);
    });

    const incomingUnitPrice =
      totalIncomingAmount > 0 ? totalTransferredCost / totalIncomingAmount : 0;

    pricedItems.forEach((item) => {
      if (item.amount > 0 && item.price === 0) {
        item.price = incomingUnitPrice;
      }
    });

    return pricedItems;
  }

  private insertWithOptionalWrapper(
    wrapperType: WrapperTransactionType,
    items: TransactionInput[],
    metadata: {
      id?: string;
      timestamp: number;
      itemID?: number;
      amount?: number;
      price?: number;
      source?: TransactionSource | null;
      tornID: string | null;
      tradeID: string | null;
      description: string | null;
      partnerName?: string | null;
      partnerID?: string | null;
      receiptID?: string | null;
      itemCount?: number | null;
      forceWrap: boolean;
    },
  ): TransactionBuildResult {
    const insertedTransactions = items.map((item) =>
      this.insertSingle({
        ...item,
        stockType:
          item.stockType && item.stockType !== "auto"
            ? item.stockType
            : "normal",
      }),
    );
    const shouldWrap = metadata.forceWrap || insertedTransactions.length > 1;

    if (!shouldWrap) {
      const [singleTransaction] = insertedTransactions;
      singleTransaction.groupID = singleTransaction.id;
      return { wrapper: null, transactions: insertedTransactions };
    }

    const wrapperID = metadata.id ?? createID();
    const wrapper = new WrapperTransaction(wrapperID, {
      timestamp: metadata.timestamp,
      wrapperType,
      wrappedTransactionIDs: insertedTransactions.map(
        (transaction) => transaction.id,
      ),
      itemID: metadata.itemID ?? items[0]?.itemID ?? null,
      itemName: items[0]?.itemName ?? null,
      amount:
        metadata.amount ??
        insertedTransactions.reduce(
          (total, transaction) => total + transaction.amount,
          0,
        ),
      price: metadata.price ?? items[0]?.price ?? null,
      source: metadata.source ?? items[0]?.source ?? null,
      tornID: metadata.tornID,
      tradeID: metadata.tradeID,
      description: metadata.description,
      partnerName: metadata.partnerName ?? null,
      partnerID: metadata.partnerID ?? null,
      receiptID: metadata.receiptID ?? null,
      itemCount: metadata.itemCount ?? null,
      groupID: wrapperID,
    });

    insertedTransactions.forEach((transaction) => {
      transaction.groupID = wrapperID;
    });

    this.insertIntoStore(wrapper);
    return { wrapper, transactions: insertedTransactions };
  }

  private resolveSplitInputs(input: TransactionInput) {
    const splitOrder: TransactionStockType[] = [
      "normal",
      "abroad",
      "city-find",
      "consumption",
    ];
    let remaining = Math.abs(input.amount);
    const resolvedInputs: TransactionInput[] = [];

    splitOrder.forEach((stockType) => {
      if (remaining <= 0) {
        return;
      }

      const available = this.getStockBefore(
        input.itemID,
        stockType,
        input.timestamp,
      );
      const used = Math.min(available, remaining);

      if (used <= 0) {
        return;
      }

      resolvedInputs.push({
        ...input,
        amount: -used,
        stockType,
      });
      remaining -= used;
    });

    if (remaining > 0) {
      resolvedInputs.push({
        ...input,
        amount: -remaining,
        stockType: "skip",
      });
    }

    return resolvedInputs;
  }

  private insertSingle(input: TransactionInput & { stockType: TransactionStockType }) {
    const id = input.id ?? createID();
    const transaction = new Transaction(id, {
      timestamp: input.timestamp,
      itemID: input.itemID,
      itemName: input.itemName ?? null,
      amount: input.amount,
      price: input.price,
      source: input.source ?? null,
      stockType: input.stockType,
      tornID: input.tornID ?? null,
      tradeID: input.tradeID ?? null,
      description: input.description ?? null,
      groupID: id,
      requestedAmount: input.amount,
    });

    this.insertIntoStore(transaction);
    this.recalculateItemType(transaction.itemID, transaction.stockType);
    return transaction;
  }

  private insertIntoStore(transaction: AnyTrackedTransaction) {
    const insertAt = this.transactions.findIndex(
      (current) => compareTransactions(transaction, current) < 0,
    );

    if (insertAt === -1) {
      this.transactions.push(transaction);
      return;
    }

    this.transactions.splice(insertAt, 0, transaction);
  }

  private getStockBefore(
    itemID: number,
    stockType: TransactionStockType,
    timestamp: number,
  ) {
    const key = getItemTypeKey(itemID, stockType);
    const lastTransaction = this.lastTransactionPerItemType.get(key);

    if (lastTransaction && lastTransaction.timestamp <= timestamp) {
      return lastTransaction.currentStock;
    }

    const relevantTransactions = this.transactions
      .filter(
        (transaction): transaction is Transaction =>
          isConcreteTransaction(transaction) &&
          transaction.itemID === itemID &&
          transaction.stockType === stockType &&
          transaction.timestamp <= timestamp,
      )
      .sort(compareTransactions);

    const previousTransaction = relevantTransactions.at(-1);
    return previousTransaction?.currentStock ?? 0;
  }

  private getSnapshotBefore(
    itemID: number,
    stockType: TransactionStockType,
    timestamp: number,
  ) {
    const key = getItemTypeKey(itemID, stockType);
    const lastTransaction = this.lastTransactionPerItemType.get(key);

    if (lastTransaction && lastTransaction.timestamp <= timestamp) {
      return {
        stock: lastTransaction.currentStock,
        costBasis: lastTransaction.currentCostBasis,
      };
    }

    const relevantTransactions = this.transactions
      .filter(
        (transaction): transaction is Transaction =>
          isConcreteTransaction(transaction) &&
          transaction.itemID === itemID &&
          transaction.stockType === stockType &&
          transaction.timestamp <= timestamp,
      )
      .sort(compareTransactions);

    const previousTransaction = relevantTransactions.at(-1);
    return {
      stock: previousTransaction?.currentStock ?? 0,
      costBasis: previousTransaction?.currentCostBasis ?? 0,
    };
  }

  private recalculateItemType(itemID: number, stockType: TransactionStockType) {
    const chain = this.transactions
      .filter(
        (transaction): transaction is Transaction =>
          isConcreteTransaction(transaction) &&
          transaction.itemID === itemID &&
          transaction.stockType === stockType,
      )
      .sort(compareTransactions);

    let previousTransaction: Transaction | null = null;
    chain.forEach((transaction) => {
      transaction.recalculate(previousTransaction);
      previousTransaction = transaction;
    });

    const key = getItemTypeKey(itemID, stockType);
    if (previousTransaction) {
      this.lastTransactionPerItemType.set(key, previousTransaction);
      return;
    }

    this.lastTransactionPerItemType.delete(key);
  }

  private rebuildIndexes() {
    const itemTypeKeys = new Set<string>();

    this.transactions.forEach((transaction) => {
      if (!isConcreteTransaction(transaction)) {
        return;
      }

      itemTypeKeys.add(getItemTypeKey(transaction.itemID, transaction.stockType));
    });

    itemTypeKeys.forEach((key) => {
      const [itemID, stockType] = key.split(":");
      this.recalculateItemType(
        Number(itemID),
        stockType as TransactionStockType,
      );
    });
  }
}

function resolveItemID(
  itemName: string,
  resolver: ItemIDResolver,
): number | null {
  const normalized = normalizeItemName(itemName);
  if (resolver instanceof Map) {
    return resolver.get(normalized) ?? null;
  }

  if (typeof resolver === "function") {
    return resolver(normalized) ?? null;
  }

  return resolver[normalized] ?? null;
}

function mapLegacySourceType(
  sourceType?: TransactionSourceType,
): TransactionSource | undefined {
  if (!sourceType) {
    return undefined;
  }

  if (sourceType === "trade") {
    return "trade";
  }

  return sourceType;
}

function getLegacyTradeGroupKey(transaction: LegacyJournalTransaction) {
  if (transaction.type !== "BUY" && transaction.type !== "SELL") {
    return null;
  }

  if (transaction.sourceType !== "trade") {
    return null;
  }

  return (
    transaction.tradeGroupId ??
    transaction.weav3rReceiptId ??
    transaction.tornLogId ??
    transaction.id
  );
}

export function migrateLegacyTransactions(
  legacyTransactions: LegacyJournalTransaction[],
  itemIDResolver: ItemIDResolver,
): LegacyMigrationResult {
  const builder = new TransactionBuilder();
  const issues: LegacyMigrationIssue[] = [];
  const sortedTransactions = [...legacyTransactions].sort((left, right) => {
    if (left.date !== right.date) {
      return left.date - right.date;
    }

    return left.id.localeCompare(right.id);
  });
  const migratedTradeGroups = new Set<string>();

  sortedTransactions.forEach((legacyTransaction) => {
    const tradeGroupKey = getLegacyTradeGroupKey(legacyTransaction);
    if (tradeGroupKey) {
      if (migratedTradeGroups.has(tradeGroupKey)) {
        return;
      }

      const groupedTransactions = sortedTransactions.filter(
        (candidate) => getLegacyTradeGroupKey(candidate) === tradeGroupKey,
      );
      const tradeItems: TransactionInput[] = [];
      let hasIssue = false;

      groupedTransactions.forEach((candidate) => {
        if (candidate.type !== "BUY" && candidate.type !== "SELL") {
          return;
        }

        const itemID = resolveItemIDWithFallback(candidate.item, itemIDResolver);

        tradeItems.push({
          id: candidate.id,
          timestamp: candidate.date,
          itemID,
          itemName: normalizeItemName(candidate.item),
          amount: candidate.type === "BUY" ? candidate.amount : -candidate.amount,
          price: candidate.price,
          source: "trade",
          stockType:
            candidate.tag === "Abroad"
              ? "abroad"
              : candidate.tag === "Normal"
                ? "normal"
                : "auto",
          tornID: candidate.tornLogId ?? null,
          tradeID: candidate.tradeGroupId ?? candidate.weav3rReceiptId ?? null,
        });
      });

      migratedTradeGroups.add(tradeGroupKey);
      if (!hasIssue && tradeItems.length > 0) {
        builder.addTrade({
          id: tradeGroupKey,
          timestamp: Math.min(...tradeItems.map((item) => item.timestamp)),
          tornID: legacyTransaction.tornLogId ?? null,
          tradeID:
            legacyTransaction.tradeGroupId ??
            legacyTransaction.weav3rReceiptId ??
            tradeGroupKey,
          description: "Migrated trade transaction group",
          items: tradeItems,
        });
      }
      return;
    }

    if (legacyTransaction.type === "BUY" || legacyTransaction.type === "SELL") {
      const itemID = resolveItemIDWithFallback(
        legacyTransaction.item,
        itemIDResolver,
      );

      builder.addTransaction({
        id: legacyTransaction.id,
        timestamp: legacyTransaction.date,
        itemID,
        itemName: normalizeItemName(legacyTransaction.item),
        amount:
          legacyTransaction.type === "BUY"
            ? legacyTransaction.amount
            : -legacyTransaction.amount,
        price: legacyTransaction.price,
        source: mapLegacySourceType(legacyTransaction.sourceType),
        stockType:
          legacyTransaction.tag === "Abroad"
            ? "abroad"
            : legacyTransaction.tag === "Normal"
              ? "normal"
              : "auto",
        tornID: legacyTransaction.tornLogId ?? null,
        tradeID:
          legacyTransaction.tradeGroupId ??
          legacyTransaction.weav3rReceiptId ??
          null,
      });
      return;
    }

    if (legacyTransaction.type === "CONVERT") {
      const fromItemID = resolveItemIDWithFallback(
        legacyTransaction.fromItem,
        itemIDResolver,
      );
      const toItemID = resolveItemIDWithFallback(
        legacyTransaction.toItem,
        itemIDResolver,
      );

      builder.addConvert({
        id: legacyTransaction.id,
        timestamp: legacyTransaction.date,
        tornID: legacyTransaction.tornLogId ?? null,
        tradeID:
          legacyTransaction.tradeGroupId ??
          legacyTransaction.weav3rReceiptId ??
          null,
        description: "Migrated convert transaction",
        items: [
          {
            id: `${legacyTransaction.id}:from`,
            timestamp: legacyTransaction.date,
            itemID: fromItemID,
            itemName: normalizeItemName(legacyTransaction.fromItem),
            amount: -legacyTransaction.fromAmount,
            price: 0,
            source: mapLegacySourceType(legacyTransaction.sourceType),
            stockType: "auto",
            tornID: legacyTransaction.tornLogId ?? null,
            tradeID:
              legacyTransaction.tradeGroupId ??
              legacyTransaction.weav3rReceiptId ??
              null,
          },
          {
            id: `${legacyTransaction.id}:to`,
            timestamp: legacyTransaction.date,
            itemID: toItemID,
            itemName: normalizeItemName(legacyTransaction.toItem),
            amount: legacyTransaction.toAmount,
            price: 0,
            source: mapLegacySourceType(legacyTransaction.sourceType),
            stockType: "normal",
            tornID: legacyTransaction.tornLogId ?? null,
            tradeID:
              legacyTransaction.tradeGroupId ??
              legacyTransaction.weav3rReceiptId ??
              null,
          },
        ],
      });
      return;
    }

    if (legacyTransaction.type === "SET_CONVERT") {
      const exchangeDefinition = getMuseumExchangeDefinition(
        legacyTransaction.setType,
      );
      const setItems = exchangeDefinition.items;
      const pointsItemID = resolveItemIDWithFallback("points", itemIDResolver);

      const migratedItems: TransactionInput[] = [];

      setItems.forEach((itemRequirement) => {
        const itemName = normalizeItemName(itemRequirement.itemName);
        const itemID = resolveItemIDWithFallback(itemName, itemIDResolver);

        migratedItems.push({
          id: `${legacyTransaction.id}:${itemName}`,
          timestamp: legacyTransaction.date,
          itemID,
          itemName,
          amount: -(legacyTransaction.times * itemRequirement.quantity),
          price: 0,
          source: mapLegacySourceType(legacyTransaction.sourceType),
          stockType: "auto",
          tornID: legacyTransaction.tornLogId ?? null,
          tradeID:
            legacyTransaction.tradeGroupId ??
            legacyTransaction.weav3rReceiptId ??
            null,
        });
      });

      migratedItems.push({
        id: `${legacyTransaction.id}:points`,
        timestamp: legacyTransaction.date,
        itemID: pointsItemID,
        itemName: "points",
        amount: legacyTransaction.pointsEarned,
        price: 0,
        source: mapLegacySourceType(legacyTransaction.sourceType),
        stockType: "normal",
        tornID: legacyTransaction.tornLogId ?? null,
        tradeID:
          legacyTransaction.tradeGroupId ??
          legacyTransaction.weav3rReceiptId ??
          null,
      });

      builder.addSetConvert({
        id: legacyTransaction.id,
        timestamp: legacyTransaction.date,
        tornID: legacyTransaction.tornLogId ?? null,
        tradeID:
          legacyTransaction.tradeGroupId ??
          legacyTransaction.weav3rReceiptId ??
          null,
        description: `${exchangeDefinition.label}${exchangeDefinition.isSet ? " Set" : ""} Exchange`,
        items: migratedItems,
      });
      return;
    }

    if (legacyTransaction.type === "MUG") {
      builder.addMug({
        id: legacyTransaction.id,
        timestamp: legacyTransaction.date,
        amount: legacyTransaction.amount,
        source: mapLegacySourceType(legacyTransaction.sourceType) ?? "attack",
        tornID: legacyTransaction.tornLogId ?? null,
        tradeID:
          legacyTransaction.tradeGroupId ??
          legacyTransaction.weav3rReceiptId ??
          null,
        description: "Migrated mug transaction",
      });
      return;
    }

    issues.push({
      transactionId: legacyTransaction.id,
      reason: `Unsupported transaction type "${legacyTransaction.type}"`,
    });
  });

  return {
    transactions: builder.getTransactions(),
    issues,
  };
}

function fallbackItemID(itemName: string) {
  if (itemName === "points") {
    return -1;
  }

  let hash = 0;
  for (let index = 0; index < itemName.length; index += 1) {
    hash = (hash * 31 + itemName.charCodeAt(index)) >>> 0;
  }

  const normalized = hash || 1;
  return -normalized;
}

function resolveItemIDWithFallback(
  itemName: string,
  resolver?: ItemIDResolver,
): number {
  const normalized = normalizeItemName(itemName);
  const resolved = resolver ? resolveItemID(normalized, resolver) : null;
  return resolved ?? fallbackItemID(normalized);
}

function getTradeWrapperDescription(input: {
  partnerName?: string | null;
  partnerID?: string | null;
  itemCount?: number | null;
  tradeID?: string | null;
  receiptID?: string | null;
}) {
  const parts: string[] = [];

  if (input.partnerName || input.partnerID) {
    const partner = [
      input.partnerName?.trim() || null,
      input.partnerID ? `#${input.partnerID}` : null,
    ]
      .filter(Boolean)
      .join(" ");
    if (partner) {
      parts.push(partner);
    }
  }

  if (typeof input.itemCount === "number" && input.itemCount > 0) {
    parts.push(
      `${input.itemCount} different item${input.itemCount === 1 ? "" : "s"}`,
    );
  }

  if (input.tradeID) {
    parts.push(`Trade ${input.tradeID}`);
  }

  if (input.receiptID) {
    parts.push(`Receipt ${input.receiptID}`);
  }

  return parts.length > 0 ? parts.join(" • ") : "Imported trade";
}

export function buildTransactionsFromParsedLogs(
  baseTransactions: AnyTrackedTransaction[],
  parsedLogs: ParsedLog[],
  itemIDResolver?: ItemIDResolver,
): AnyTrackedTransaction[] {
  const builder = new TransactionBuilder(baseTransactions);
  const existingTornIDs = new Set(
    baseTransactions
      .map((transaction) => transaction.tornID)
      .filter((value): value is string => Boolean(value)),
  );
  const initialDate = Date.now();
  const handledTradeGroupKeys = new Set<string>();

  parsedLogs.forEach((log, index) => {
    const tradeGroupKey =
      log.sourceType === "trade"
        ? log.tradeGroupId ?? log.weav3rReceiptId ?? log.tornLogId ?? null
        : null;

    if (tradeGroupKey) {
      if (handledTradeGroupKeys.has(tradeGroupKey)) {
        return;
      }
      handledTradeGroupKeys.add(tradeGroupKey);
    }

    if (log.tornLogId && existingTornIDs.has(log.tornLogId)) {
      return;
    }

    const timestamp = log.loggedAt ?? initialDate + index;

    if (tradeGroupKey) {
      const groupedLogs = parsedLogs.filter((candidate) => {
        if (candidate.sourceType !== "trade") {
          return false;
        }

        const candidateKey =
          candidate.tradeGroupId ??
          candidate.weav3rReceiptId ??
          candidate.tornLogId ??
          null;
        return candidateKey === tradeGroupKey;
      });

      const tradeItems: TransactionInput[] = groupedLogs
        .filter((candidate) => candidate.type === "BUY" || candidate.type === "SELL")
        .map((candidate, candidateIndex) => {
          const itemName = normalizeItemName(candidate.item);
          return {
            id: `${tradeGroupKey}:${candidateIndex}:${itemName}`,
            timestamp: candidate.loggedAt ?? timestamp,
            itemID: resolveItemIDWithFallback(itemName, itemIDResolver),
            itemName,
            amount: candidate.type === "BUY" ? candidate.amount : -candidate.amount,
            price: candidate.price,
            source: "trade",
            stockType: candidate.tag === "Abroad" ? "abroad" : "auto",
            tornID: candidate.tornLogId ?? null,
            tradeID: candidate.tradeGroupId ?? candidate.weav3rReceiptId ?? null,
          };
        });

      if (tradeItems.length > 0) {
        const firstLog = groupedLogs[0];
        const partnerName =
          "tradePartnerName" in (firstLog ?? {})
            ? firstLog.tradePartnerName ?? null
            : null;
        const partnerID =
          "tradePartnerID" in (firstLog ?? {})
            ? firstLog.tradePartnerID ?? null
            : null;
        const receiptID = groupedLogs[0]?.weav3rReceiptId ?? null;
        const itemCount =
          "tradeItemCount" in (firstLog ?? {}) &&
          typeof firstLog.tradeItemCount === "number"
            ? firstLog.tradeItemCount
            : tradeItems.length;
        builder.addTrade({
          id: String(tradeGroupKey),
          timestamp: Math.min(...tradeItems.map((item) => item.timestamp)),
          tornID: groupedLogs[0]?.tornLogId ?? null,
          tradeID:
            groupedLogs[0]?.tradeGroupId ??
            groupedLogs[0]?.weav3rReceiptId ??
            null,
          description: getTradeWrapperDescription({
            partnerName,
            partnerID,
            itemCount,
            tradeID:
              groupedLogs[0]?.tradeGroupId ??
              groupedLogs[0]?.weav3rReceiptId ??
              null,
            receiptID,
          }),
          partnerName,
          partnerID,
          receiptID,
          itemCount,
          items: tradeItems,
        });
      }
      return;
    }

    if (log.type === "BUY" || log.type === "SELL") {
      const itemName = normalizeItemName(log.item);
      builder.addTransaction({
        id: crypto.randomUUID(),
        timestamp,
        itemID: resolveItemIDWithFallback(itemName, itemIDResolver),
        itemName,
        amount: log.type === "BUY" ? log.amount : -log.amount,
        price: log.price,
        source: mapLegacySourceType(log.sourceType),
        stockType: log.tag === "Abroad" ? "abroad" : "auto",
        tornID: log.tornLogId ?? null,
        tradeID: log.tradeGroupId ?? log.weav3rReceiptId ?? null,
      });
      return;
    }

    if (log.type === "CONVERT") {
      const fromItem = normalizeItemName(log.fromItem);
      const toItem = normalizeItemName(log.toItem);
      builder.addConvert({
        id: crypto.randomUUID(),
        timestamp,
        tornID: log.tornLogId ?? null,
        tradeID: log.tradeGroupId ?? log.weav3rReceiptId ?? null,
        description: "Imported convert",
        items: [
          {
            id: crypto.randomUUID(),
            timestamp,
            itemID: resolveItemIDWithFallback(fromItem, itemIDResolver),
            itemName: fromItem,
            amount: -log.fromAmount,
            price: 0,
            source: mapLegacySourceType(log.sourceType),
            stockType: "auto",
          },
          {
            id: crypto.randomUUID(),
            timestamp,
            itemID: resolveItemIDWithFallback(toItem, itemIDResolver),
            itemName: toItem,
            amount: log.toAmount,
            price: 0,
            source: mapLegacySourceType(log.sourceType),
            stockType: "normal",
          },
        ],
      });
      return;
    }

    if (log.type === "SET_CONVERT") {
      const exchangeDefinition = getMuseumExchangeDefinition(log.setType);
      const items: TransactionInput[] = exchangeDefinition.items.map((itemRequirement) => ({
        id: crypto.randomUUID(),
        timestamp,
        itemID: resolveItemIDWithFallback(itemRequirement.itemName, itemIDResolver),
        itemName: itemRequirement.itemName,
        amount: -(log.times * itemRequirement.quantity),
        price: 0,
        source: mapLegacySourceType(log.sourceType),
        stockType: "auto",
      }));

      items.push({
        id: crypto.randomUUID(),
        timestamp,
        itemID: resolveItemIDWithFallback("points", itemIDResolver),
        itemName: "points",
        amount: log.pointsEarned,
        price: 0,
        source: mapLegacySourceType(log.sourceType),
        stockType: "normal",
      });

      builder.addSetConvert({
        id: crypto.randomUUID(),
        timestamp,
        tornID: log.tornLogId ?? null,
        tradeID: log.tradeGroupId ?? log.weav3rReceiptId ?? null,
        description: `${exchangeDefinition.label}${exchangeDefinition.isSet ? " Set" : ""} Exchange`,
        items,
      });
      return;
    }

    if (log.type === "MUG") {
      builder.addMug({
        id: crypto.randomUUID(),
        timestamp,
        amount: log.amount,
        source: "attack",
        tornID: log.tornLogId ?? null,
        tradeID: log.tradeGroupId ?? log.weav3rReceiptId ?? null,
        description: "Imported mug transaction",
      });
    }
  });

  return builder.getTransactions();
}

export function calculateInventoryFromTransactions(
  transactions: AnyTrackedTransaction[],
): Map<string, InventoryItemStats> {
  const inventory = new Map<string, InventoryItemStats>();
  const sorted = [...transactions].sort(compareTransactions);

  sorted.forEach((transaction) => {
    if (!isConcreteTransaction(transaction) || transaction.stockType === "skip") {
      return;
    }

    const itemName = transaction.itemName || `item-${transaction.itemID}`;
    const current = inventory.get(itemName) ?? createDefaultInventoryStats();

    if (transaction.amount >= 0) {
      if (transaction.stockType === "abroad") {
        current.abroadStock += transaction.amount;
        current.abroadTotalCost += transaction.amount * transaction.price;
      } else {
        current.stock += transaction.amount;
        current.totalCost += transaction.amount * transaction.price;
      }
    } else {
      const soldAmount = Math.abs(transaction.amount);
      if (transaction.stockType === "abroad") {
        const avgCost =
          current.abroadStock > 0
            ? current.abroadTotalCost / current.abroadStock
            : 0;
        const costOfGoods = avgCost * soldAmount;
        current.abroadStock -= soldAmount;
        current.abroadTotalCost -= costOfGoods;
        current.abroadRealizedProfit +=
          transaction.price * soldAmount - costOfGoods;
      } else {
        const avgCost = current.stock > 0 ? current.totalCost / current.stock : 0;
        const costOfGoods = avgCost * soldAmount;
        current.stock -= soldAmount;
        current.totalCost -= costOfGoods;
        current.realizedProfit += transaction.price * soldAmount - costOfGoods;
      }
    }

    inventory.set(itemName, current);
  });

  return inventory;
}
