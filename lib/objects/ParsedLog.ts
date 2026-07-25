export type TransactionType = "BUY" | "SELL" | "MUG" | "CONVERT";
export type MuseumExchangeType =
    | "flower"
    | "plushie"
    | "meteorite-fragment"
    | "patagonian-fossil"
    | "arrowhead"
    | "medieval-coin"
    | "vairocana-buddha"
    | "ganesha-sculpture"
    | "shabti-sculpture"
    | "companion-scripts"
    | "senet-game"
    | "egyptian-amulet";

export type TransactionTag = "Abroad" | "Normal";
export type TransactionSourceType =
    | "item-market"
    | "bazaar"
    | "trade"
    | "points-market"
    | "museum"
    | "attack"
    | "travel";

export interface BaseParsedLog {
    tag?: TransactionTag; // Used to differentiate source of items
    sourceType?: TransactionSourceType;
    loggedAt?: number;
    tornLogId?: string;
    weav3rReceiptId?: string;
    tradeGroupId?: string;
    tradePartnerName?: string;
    tradePartnerID?: string;
    tradeItemCount?: number;
}

export interface ParsedTradeLog extends BaseParsedLog {
    type: "BUY" | "SELL";
    item: string;
    amount: number;
    price: number;
}

export interface ParsedMugLog extends BaseParsedLog {
    type: "MUG";
    amount: number; // money lost
}

export interface ParsedConvertLog extends BaseParsedLog {
    type: "CONVERT";
    fromItem: string;
    toItem: string;
    fromAmount: number;
    toAmount: number;
}

export interface ParsedSetConvertLog extends BaseParsedLog {
    type: "SET_CONVERT";
    setType: MuseumExchangeType;
    times: number;
    pointsEarned: number;
}

export type ParsedLog = ParsedTradeLog | ParsedMugLog | ParsedConvertLog | ParsedSetConvertLog;

export interface MuseumExchangeRequirement {
    itemID: number;
    itemName: string;
    quantity: number;
}

export interface MuseumExchangeDefinition {
    label: string;
    aliases: string[];
    pointsPerExchange: number;
    isSet: boolean;
    items: MuseumExchangeRequirement[];
}
