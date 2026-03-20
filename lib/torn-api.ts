import { ParsedLog, TransactionSourceType, normalizeItemName } from "./parser";

const TORN_V2_API_BASE = "https://api.torn.com/v2";
const WEAV3R_API_BASE = "https://weav3r.dev/api";
const AUTO_PILOT_LOG_CATEGORIES = [11, 18, 6];
const MARKET_LOG_TYPE_MAP: Record<number, { type: "BUY" | "SELL"; sourceType: TransactionSourceType }> = {
  1112: { type: "BUY", sourceType: "item-market" },
  1113: { type: "SELL", sourceType: "item-market" },
  1225: { type: "BUY", sourceType: "bazaar" },
  1226: { type: "SELL", sourceType: "bazaar" },
  5010: { type: "BUY", sourceType: "points-market" },
  5011: { type: "SELL", sourceType: "points-market" },
};
const RELEVANT_LOG_TITLES = [
  "bazaar",
  "item market",
  "points market",
  "points",
  "trade",
  "museum",
];

export interface SyncCursor {
  lastTimestamp: number;
  lastLogId: string;
}

export interface TornLogEntry {
  id: number | string;
  timestamp: number;
  details?: {
    id?: number;
    title?: string;
    category?: string;
  };
  data?: Record<string, unknown>;
  params?: Record<string, unknown>;
}

export interface NormalizedLog {
  id: string;
  timestamp: number;
  category: string;
  typeId: number;
  title: string;
  data: Record<string, unknown>;
  params: Record<string, unknown>;
}

export interface TornTradeParticipant {
  id: number | string;
  name: string;
}

export interface TornTradeListItem {
  id: number | string;
  timestamp: number;
  user: TornTradeParticipant;
  trader: TornTradeParticipant;
}

export interface TornTradeDetailItem {
  user_id: number | string;
  type: string;
  details?: Record<string, unknown>;
}

export interface TornTradeDetail extends TornTradeListItem {
  items: TornTradeDetailItem[];
}

export interface Weav3rTradeListItem {
  id: string;
  name?: string;
  value?: number;
}

export interface Weav3rReceiptItem {
  item_id: number;
  item_name: string;
  quantity: number;
  price_used: number;
  total_value: number;
}

export interface Weav3rReceipt {
  id: string;
  trade_id: string;
  total_value: number;
  created_at: number;
  items: Weav3rReceiptItem[];
}

export interface AutoPilotImportRecord {
  id: string;
  timestamp: number;
  title: string;
  status: "imported" | "manual_required" | "skipped";
  sourceType?: TransactionSourceType;
  tornLogId?: string;
  weav3rReceiptId?: string;
  note?: string;
}

export interface TradeDifference {
  kind: "money" | "items" | "direction" | "missing_receipt";
  message: string;
}

export interface PendingAutoPilotTrade {
  tradeId: string;
  timestamp: number;
  partnerName: string;
  currentUserId: string;
  tradeType: "BUY" | "SELL" | "UNKNOWN";
  moneyAmount: number;
  tradeItems: Array<{ itemId: number; amount: number }>;
  receipt?: Weav3rReceipt;
  differences: TradeDifference[];
}

export interface AutoPilotTradeLink {
  tradeId: string;
  receiptId: string;
  manual?: boolean;
}

function compareLogIds(left: string, right: string) {
  return left.localeCompare(right);
}

type ParseResult =
  | { kind: "parsed"; logs: ParsedLog[] }
  | { kind: "trade" }
  | { kind: "unsupported" };

export type TornItemNameMap = Map<number, string>;

async function parseJson(response: Response) {
  const data = await response.json();

  if (!response.ok || data?.error) {
    const message =
      data?.error?.error ||
      data?.error?.message ||
      data?.message ||
      data?.error ||
      "Request failed";
    throw new Error(message);
  }

  return data;
}

function buildUrl(
  base: string,
  path: string,
  params: Record<string, string | number | undefined>,
) {
  if (path.startsWith("/")) {
    path = path.slice(1);
  }
  if (!base.endsWith("/")) {
    base += "/";
  }
  const url = new URL(path, base);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") return;
    url.searchParams.set(key, String(value));
  });
  return url.toString();
}

function withApiKey(url: string, apiKey: string) {
  const parsed = new URL(url);
  if (!parsed.searchParams.get("key")) {
    parsed.searchParams.set("key", apiKey);
  }
  return parsed.toString();
}

function pickString(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function pickNumber(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const normalized = Number(value.replace(/[$,]/g, ""));
      if (Number.isFinite(normalized)) {
        return normalized;
      }
    }
  }
  return undefined;
}

function extractItemId(source: Record<string, unknown>) {
  return pickNumber(source, ["item_id", "itemID", "id"]);
}

function extractItemName(
  source: Record<string, unknown>,
  itemNameMap?: TornItemNameMap,
) {
  const name = pickString(source, ["item_name", "itemName", "name", "item"]);
  if (name) return normalizeItemName(name);
  const itemId = extractItemId(source);
  if (!itemId) return "";
  return itemNameMap?.get(itemId) || "";
}

function extractAmount(source: Record<string, unknown>) {
  return pickNumber(source, ["quantity", "qty", "amount", "points", "count", "qty_bought", "qty_sold"]);
}

function extractPrice(source: Record<string, unknown>) {
  return pickNumber(source, [
    "price",
    "price_each",
    "price_used",
    "cost_each",
    "cost_per_item",
  ]);
}

function extractTotal(source: Record<string, unknown>) {
  return pickNumber(source, [
    "total",
    "total_value",
    "total_price",
    "cost_total",
    "price_total",
    "cost",
    "value",
    "money",
    "revenue",
    "net",
  ]);
}

function extractItems(source: Record<string, unknown>) {
  const candidates = ["items", "item_details", "entries"];
  for (const key of candidates) {
    const value = source[key];
    if (Array.isArray(value)) {
      return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
    }
    if (value && typeof value === "object") {
      const nestedValues = Object.values(value);
      if (nestedValues.every((item) => Boolean(item) && typeof item === "object")) {
        return nestedValues.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
      }
    }
  }
  return [];
}

function hasKeyFragment(source: Record<string, unknown>, fragments: string[]) {
  return Object.keys(source).some((key) => fragments.some((fragment) => key.toLowerCase().includes(fragment)));
}

function detectMarketAction(
  haystack: string,
  data: Record<string, unknown> = {},
  params: Record<string, unknown> = {},
): "BUY" | "SELL" | undefined {
  if (haystack.includes("bought") || haystack.includes(" buy")) {
    return "BUY";
  }
  if (haystack.includes("sold") || haystack.includes(" sell")) {
    return "SELL";
  }
  if (
    hasKeyFragment(data, ["qty_bought", "bought", "purchased"]) ||
    hasKeyFragment(params, ["qty_bought", "bought", "purchased"])
  ) {
    return "BUY";
  }
  if (
    hasKeyFragment(data, ["qty_sold", "sold", "revenue", "fee", "customer", "buyer"]) ||
    hasKeyFragment(params, ["qty_sold", "sold", "revenue", "fee", "customer", "buyer"])
  ) {
    return "SELL";
  }
  return undefined;
}

function isTradeLog(log: NormalizedLog) {
  const haystack = `${log.category} ${log.title}`.toLowerCase();
  return haystack.includes("trade");
}

function isRelevantLog(log: NormalizedLog) {
  const haystack = `${log.category} ${log.title}`.toLowerCase();
  return RELEVANT_LOG_TITLES.some((needle) => haystack.includes(needle));
}

function parseMarketLog(
  log: NormalizedLog,
  mode: "BUY" | "SELL",
  sourceType: TransactionSourceType,
  itemName?: string,
  amount?: number,
  price?: number,
): ParsedLog[] {
  if (!itemName || !amount || !price) return [];
  return [
    {
      type: mode,
      item: itemName,
      amount,
      price,
      sourceType,
      loggedAt: log.timestamp * 1000,
      tornLogId: String(log.id),
    },
  ];
}

export function normalizeTornLog(entry: TornLogEntry): NormalizedLog {
  return {
    id: String(entry.id),
    timestamp: Number(entry.timestamp),
    category: entry.details?.category || "",
    typeId: Number(entry.details?.id || 0),
    title: entry.details?.title || "",
    data: (entry.data as Record<string, unknown>) || {},
    params: (entry.params as Record<string, unknown>) || {},
  };
}

function parsePointLog(log: NormalizedLog): ParsedLog[] {
  const haystack = `${log.category} ${log.title}`.toLowerCase();
  const quantity = extractAmount(log.data);
  const total = extractTotal(log.data);
  const price =
    extractPrice(log.data) ??
    (quantity && total ? total / quantity : undefined);

  if (!quantity || !price) return [];

  const type = detectMarketAction(haystack, log.data, log.params);
  if (!type) return [];

  return [
    {
      type,
      item: "points",
      amount: quantity,
      price,
      sourceType: "points-market",
      loggedAt: log.timestamp * 1000,
      tornLogId: String(log.id),
    },
  ];
}

function parseMuseumLog(log: NormalizedLog): ParsedLog[] {
  const pointsEarned =
    pickNumber(log.data, ["points", "points_earned", "points_received"]) ||
    pickNumber(log.params, ["points", "points_earned", "points_received"]);
  const times =
    pickNumber(log.data, ["sets", "times", "amount", "quantity", "qty"]) ||
    pickNumber(log.params, ["sets", "times", "amount", "quantity", "qty"]);
  const typeStr = (
    pickString(log.data, ["set_type", "type", "set"]) ||
    pickString(log.params, ["set_type", "type", "set"])
  ).toLowerCase();

  if (!pointsEarned || !times) return [];

  const setType: "flower" | "plushie" = typeStr.includes("flower")
    ? "flower"
    : "plushie";

  return [
    {
      type: "SET_CONVERT",
      setType,
      times,
      pointsEarned,
      sourceType: "museum",
      loggedAt: log.timestamp * 1000,
      tornLogId: String(log.id),
    },
  ];
}

function parseBazaarOrMarketLog(
  log: NormalizedLog,
  itemNameMap?: TornItemNameMap,
): ParsedLog[] {
  const data = log.data || {};
  const haystack = `${log.category} ${log.title}`.toLowerCase();
  const explicitMapping = MARKET_LOG_TYPE_MAP[log.typeId];
  const type = explicitMapping?.type || detectMarketAction(haystack, data, log.params);
  if (!type) return [];
  const sourceType: TransactionSourceType =
    explicitMapping?.sourceType ||
    (haystack.includes("bazaar") ? "bazaar" : "item-market");

  const nestedItems = extractItems(data);
  if (nestedItems.length) {
    return nestedItems.flatMap((item) => {
      const itemName =
        extractItemName(item, itemNameMap) ||
        extractItemName(data, itemNameMap) ||
        extractItemName(log.params, itemNameMap);
      const amount = extractAmount(item) ?? extractAmount(data);
      const total = extractTotal(item);
      const price =
        extractPrice(item) ??
        extractPrice(data) ??
        (amount && total ? total / amount : undefined);

      return parseMarketLog(log, type, sourceType, itemName, amount, price);
    });
  }

  const itemName =
    extractItemName(data, itemNameMap) ||
    extractItemName(log.params, itemNameMap);
  const amount = extractAmount(data);
  const total = extractTotal(data);
  const price = extractPrice(data) ?? (amount && total ? total / amount : undefined);

  return parseMarketLog(log, type, sourceType, itemName, amount, price);
}

export function parseNormalizedLog(
  log: NormalizedLog,
  itemNameMap?: TornItemNameMap,
): ParseResult {
  if (isTradeLog(log)) {
    return { kind: "trade" };
  }

  if (!isRelevantLog(log)) {
    return { kind: "unsupported" };
  }

  const haystack = `${log.category} ${log.title}`.toLowerCase();

  if (haystack.includes("points") || [5010, 5011].includes(log.typeId)) {
    const logs = parsePointLog(log);
    return logs.length ? { kind: "parsed", logs } : { kind: "unsupported" };
  }

  if (haystack.includes("museum") || log.typeId === 7000) {
    const logs = parseMuseumLog(log);
    return logs.length ? { kind: "parsed", logs } : { kind: "unsupported" };
  }

  if (haystack.includes("bazaar") || haystack.includes("item market")) {
    const logs = parseBazaarOrMarketLog(log, itemNameMap);
    return logs.length ? { kind: "parsed", logs } : { kind: "unsupported" };
  }

  return { kind: "unsupported" };
}

async function getLogsForCategory(
  apiKey: string,
  categoryId: number,
  cursor: SyncCursor,
) {
  let nextUrl = buildUrl(TORN_V2_API_BASE, "/user/log", {
    cat: categoryId,
    from: cursor.lastTimestamp,
    to: Math.floor(Date.now() / 1000),
    limit: 20,
    sort: "desc",
    key: apiKey,
  });
  const collected: NormalizedLog[] = [];
  let workingCursor = { ...cursor };
  const seenLogIds = new Set<string>();

  while (nextUrl) {
    const response = await fetch(nextUrl);
    const data = await parseJson(response);
    const page: NormalizedLog[] = Array.isArray(data?.log)
      ? (data.log as TornLogEntry[]).map(normalizeTornLog)
      : [];
    const prevLink =
      typeof data?._metadata?.links?.prev === "string" && data._metadata.links.prev
        ? withApiKey(String(data._metadata.links.prev), apiKey)
        : "";
    const filtered = page
      .filter((log) => {
        if (seenLogIds.has(log.id)) return false;
        seenLogIds.add(log.id);
        return true;
      })
      .filter(
        (log) =>
          log.timestamp > workingCursor.lastTimestamp ||
          (log.timestamp === workingCursor.lastTimestamp &&
            compareLogIds(log.id, workingCursor.lastLogId) > 0),
      )
      .sort((a, b) => a.timestamp - b.timestamp || compareLogIds(a.id, b.id));

    if (filtered.length) {
      collected.push(...filtered);
      const last = filtered[filtered.length - 1];
      workingCursor = { lastTimestamp: last.timestamp, lastLogId: last.id };
    }

    if (!page.length || !prevLink) {
      break;
    }

    nextUrl = prevLink;
  }

  return collected;
}

export async function getNewLogs(apiKey: string, cursor: SyncCursor) {
  const categoryPages = await Promise.all(
    AUTO_PILOT_LOG_CATEGORIES.map((categoryId) =>
      getLogsForCategory(apiKey, categoryId, cursor),
    ),
  );
  const logs = categoryPages
    .flat()
    .sort((a, b) => a.timestamp - b.timestamp || compareLogIds(a.id, b.id));
  const last = logs[logs.length - 1];
  const nextCursor = last
    ? { lastTimestamp: last.timestamp, lastLogId: last.id }
    : { ...cursor };

  return { logs, nextCursor };
}

export async function getTornItems(apiKey: string) {
  const url = buildUrl(TORN_V2_API_BASE, "/torn/items", {
    key: apiKey,
  });
  const response = await fetch(url);
  const data = await parseJson(response);
  const itemsSource = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.data?.items)
      ? data.data.items
      : [];
  const itemMap: TornItemNameMap = new Map();

  for (const item of itemsSource) {
    const id = Number(item?.id);
    const name =
      typeof item?.name === "string" ? normalizeItemName(item.name) : "";
    if (Number.isFinite(id) && name) {
      itemMap.set(id, name);
    }
  }

  return itemMap;
}

export async function getCompletedTrades(
  apiKey: string,
  startTimestamp: number,
) {
  let from = startTimestamp;
  const collected: TornTradeListItem[] = [];
  const seenIds = new Set<string>();

  while (true) {
    const url = buildUrl(TORN_V2_API_BASE, "/user/trades", {
      cat: "finished",
      from,
      limit: 100,
      sort: "ASC",
      key: apiKey,
    });
    const response = await fetch(url);
    const data = await parseJson(response);
    const page: TornTradeListItem[] = Array.isArray(data?.trades)
      ? (data.trades as TornTradeListItem[])
      : [];
    const filtered = page
      .filter((trade) => Number(trade.timestamp) >= startTimestamp)
      .filter((trade) => {
        const tradeId = String(trade.id);
        if (seenIds.has(tradeId)) return false;
        seenIds.add(tradeId);
        return true;
      })
      .sort(
        (a, b) =>
          Number(a.timestamp) - Number(b.timestamp) ||
          Number(a.id) - Number(b.id),
      );

    if (!filtered.length) {
      break;
    }

    collected.push(...filtered);
    const last = filtered[filtered.length - 1];
    from = Number(last.timestamp) + 1;

    if (page.length < 100) {
      break;
    }
  }

  return collected;
}

export async function getTradeDetail(apiKey: string, tradeId: string | number) {
  const url = buildUrl(TORN_V2_API_BASE, `/user/${tradeId}/trade`, {
    key: apiKey,
  });
  const response = await fetch(url);
  const data = await parseJson(response);
  return data?.trade as TornTradeDetail;
}

export async function getWeav3rTrades(
  apiKey: string,
  userId: string,
  startTimestamp: number,
  cachedReceipts: Weav3rReceipt[] = [],
) {
  let nextUrl = buildUrl(WEAV3R_API_BASE, `/trades/${userId}`, {
    apiKey,
    limit: 100,
  });
  const collected: Weav3rReceipt[] = [];
  const cachedReceiptMap = new Map(cachedReceipts.map((receipt) => [receipt.id, receipt]));

  while (true) {
    const response = await fetch(nextUrl);
    const data = await parseJson(response);
    const page: Weav3rTradeListItem[] = Array.isArray(data?.trades)
      ? (data.trades as Weav3rTradeListItem[])
      : [];
    let shouldContinue = Boolean(data?.metadata?.next);

    if (!page.length) {
      break;
    }

    for (const trade of page) {
      const receipt = cachedReceiptMap.get(trade.id) || await getWeav3rReceipt(apiKey, userId, trade.id);
      if (Number(receipt.created_at) < startTimestamp) {
        shouldContinue = false;
        continue;
      }
      collected.push(receipt);
    }

    if (!shouldContinue) {
      break;
    }

    nextUrl = String(data.metadata.next);
  }

  return collected;
}

export async function getWeav3rReceipt(
  apiKey: string,
  userId: string,
  receiptId: string,
) {
  const url = buildUrl(WEAV3R_API_BASE, `/trades/${userId}/${receiptId}`, {
    apiKey,
  });
  const response = await fetch(url);
  const data = await parseJson(response);
  return data as Weav3rReceipt;
}

export function summarizeTrade(detail: TornTradeDetail, currentUserId: string) {
  let currentUserMoney = 0;
  let otherUserMoney = 0;
  const currentUserItems: Array<{ itemId: number; amount: number }> = [];
  const otherUserItems: Array<{ itemId: number; amount: number }> = [];

  detail.items.forEach((item) => {
    const ownerId = String(item.user_id);
    if (item.type === "Money") {
      const amount = Number((item.details?.amount as number) || 0);
      if (ownerId === currentUserId) {
        currentUserMoney += amount;
      } else {
        otherUserMoney += amount;
      }
      return;
    }

    if (item.type === "Item") {
      const itemId = Number(item.details?.id || 0);
      const amount = Number(item.details?.amount || 0);
      if (itemId > 0 && amount > 0) {
        if (ownerId === currentUserId) {
          currentUserItems.push({ itemId, amount });
        } else {
          otherUserItems.push({ itemId, amount });
        }
      }
    }
  });

  currentUserItems.sort((a, b) => a.itemId - b.itemId || a.amount - b.amount);
  otherUserItems.sort((a, b) => a.itemId - b.itemId || a.amount - b.amount);

  if (currentUserMoney > 0 && otherUserItems.length > 0 && currentUserItems.length === 0 && otherUserMoney === 0) {
    return {
      tradeType: "BUY" as const,
      moneyAmount: currentUserMoney,
      tradeItems: otherUserItems,
      currentUserMoney,
      otherUserMoney,
      currentUserItems,
      otherUserItems,
    };
  }

  if (otherUserMoney > 0 && currentUserItems.length > 0 && otherUserItems.length === 0 && currentUserMoney === 0) {
    return {
      tradeType: "SELL" as const,
      moneyAmount: otherUserMoney,
      tradeItems: currentUserItems,
      currentUserMoney,
      otherUserMoney,
      currentUserItems,
      otherUserItems,
    };
  }

  return {
    tradeType: "UNKNOWN" as const,
    moneyAmount: 0,
    tradeItems: [] as Array<{ itemId: number; amount: number }>,
    currentUserMoney,
    otherUserMoney,
    currentUserItems,
    otherUserItems,
  };
}

export function compareTradeAgainstReceipt(
  detail: TornTradeDetail,
  receipt: Weav3rReceipt | undefined,
  currentUserId: string,
): PendingAutoPilotTrade {
  const summary = summarizeTrade(detail, currentUserId);
  const partnerName = String(detail.trader?.name || "");
  const pending: PendingAutoPilotTrade = {
    tradeId: String(detail.id),
    timestamp: Number(detail.timestamp),
    partnerName,
    currentUserId,
    tradeType: summary.tradeType,
    moneyAmount: summary.moneyAmount,
    tradeItems: summary.tradeItems,
    receipt,
    differences: [],
  };

  if (!receipt) {
    pending.differences.push({
      kind: "missing_receipt",
      message: "No Weav3r receipt matched this Torn trade.",
    });
    return pending;
  }

  if (summary.tradeType === "UNKNOWN") {
    pending.differences.push({
      kind: "direction",
      message: "Trade does not reduce to one money side and one item side.",
    });
  }

  if (summary.moneyAmount !== Number(receipt.total_value || 0)) {
    pending.differences.push({
      kind: "money",
      message: `Torn money ${summary.moneyAmount} does not match receipt total ${receipt.total_value}.`,
    });
  }

  const tornItems = summary.tradeItems
    .map((item) => `${item.itemId}:${item.amount}`)
    .sort();
  const receiptItems = receipt.items
    .map((item) => `${item.item_id}:${item.quantity}`)
    .sort();

  if (
    tornItems.length !== receiptItems.length ||
    tornItems.some((value, index) => value !== receiptItems[index])
  ) {
    pending.differences.push({
      kind: "items",
      message: "Item ids or quantities do not match between Torn and Weav3r.",
    });
  }

  const maxAgeSeconds = 6 * 60 * 60;
  if (receipt.created_at > Number(detail.timestamp) || receipt.created_at < Number(detail.timestamp) - maxAgeSeconds) {
    pending.differences.push({
      kind: "direction",
      message: "Receipt timestamp is not within 6 hours before the Torn trade timestamp.",
    });
  }

  return pending;
}

export function findMatchingReceipt(
  detail: TornTradeDetail,
  receipts: Weav3rReceipt[],
  currentUserId: string,
  excludedReceiptIds: Set<string> = new Set(),
) {
  const matches = receipts
    .filter((receipt) => !excludedReceiptIds.has(receipt.id))
    .map((receipt) => ({
      receipt,
      comparison: compareTradeAgainstReceipt(detail, receipt, currentUserId),
    }))
    .filter(({ comparison }) => comparison.differences.length === 0);

  return matches.length === 1 ? matches[0].receipt : undefined;
}

export function createParsedLogsFromReceipt(
  trade: TornTradeDetail,
  receipt: Weav3rReceipt,
): ParsedLog[] {
  return receipt.items.map((item) => ({
    type: "BUY",
    item: normalizeItemName(item.item_name),
    amount: Number(item.quantity),
    price: Number(item.price_used),
    sourceType: "trade",
    loggedAt: Number(trade.timestamp) * 1000,
    tornLogId: `trade:${trade.id}`,
    weav3rReceiptId: receipt.id,
    tradeGroupId: String(trade.id),
  }));
}

export function buildImportRecord(
  input: AutoPilotImportRecord,
): AutoPilotImportRecord {
  return input;
}
