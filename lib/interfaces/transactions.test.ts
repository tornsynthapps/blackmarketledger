import { describe, expect, it } from "vitest";
import {
  buildTransactionsFromParsedLogs,
  isMugTransaction,
  Transaction,
  TransactionBuilder,
  migrateLegacyTransactions,
} from "./transactions";
import type { Transaction as LegacyTransaction } from "../parser";

describe("TransactionBuilder", () => {
  it("adds simple transactions with self group ids", () => {
    const builder = new TransactionBuilder();
    const result = builder.addTransaction({
      id: "buy-1",
      timestamp: 100,
      itemID: 1,
      amount: 10,
      price: 500,
      source: "item-market",
    });

    expect(result.wrapper).toBeNull();
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].groupID).toBe("buy-1");
    expect(result.transactions[0].currentStock).toBe(10);
    expect(result.transactions[0].currentCostBasis).toBe(500);
  });

  it("creates a wrapper when a sell splits across normal, abroad, and skip", () => {
    const builder = new TransactionBuilder();

    builder.addTransaction({
      id: "normal-buy",
      timestamp: 100,
      itemID: 1,
      amount: 3,
      price: 100,
      source: "item-market",
      stockType: "normal",
    });
    builder.addTransaction({
      id: "abroad-buy",
      timestamp: 101,
      itemID: 1,
      amount: 2,
      price: 80,
      source: "item-market",
      stockType: "abroad",
    });

    const result = builder.addTransaction({
      id: "sell-auto",
      timestamp: 200,
      itemID: 1,
      amount: -10,
      price: 150,
      source: "bazaar",
    });

    expect(result.wrapper).not.toBeNull();
    expect(result.wrapper?.wrappedTransactionIDs).toHaveLength(3);
    expect(result.transactions.map((transaction) => transaction.stockType)).toEqual(
      ["normal", "abroad", "skip"],
    );
    expect(result.transactions.every((transaction) => transaction.groupID === result.wrapper?.id)).toBe(true);
  });

  it("wraps set converts", () => {
    const builder = new TransactionBuilder();
    builder.addTransaction({
      id: "flower-buy",
      timestamp: 100,
      itemID: 10,
      itemName: "dahlia",
      amount: 1,
      price: 500,
      source: "museum",
      stockType: "normal",
    });
    const result = builder.addSetConvert({
      id: "set-1",
      timestamp: 300,
      description: "Flower set convert",
      items: [
        {
          id: "set-1:dahlia",
          timestamp: 300,
          itemID: 10,
          amount: -1,
          price: 0,
          source: "museum",
        },
        {
          id: "set-1:points",
          timestamp: 300,
          itemID: 11,
          amount: 10,
          price: 0,
          source: "museum",
          stockType: "normal",
        },
      ],
    });

    expect(result.wrapper?.wrapperType).toBe("set-convert");
    expect(result.wrapper?.groupID).toBe("set-1");
    expect(result.transactions).toHaveLength(2);
    expect(result.transactions.every((transaction) => transaction.groupID === "set-1")).toBe(true);
    expect(result.transactions[0].price).toBe(500);
    expect(result.transactions[1].price).toBe(50);
  });

  it("recalculates later transactions after inserting an earlier buy", () => {
    const builder = new TransactionBuilder();

    builder.addTransaction({
      id: "late-buy",
      timestamp: 200,
      itemID: 1,
      amount: 10,
      price: 200,
      source: "item-market",
    });

    builder.addTransaction({
      id: "earlier-buy",
      timestamp: 100,
      itemID: 1,
      amount: 10,
      price: 100,
      source: "item-market",
    });

    const laterBuy = builder
      .getTransactions()
      .find(
        (transaction): transaction is Transaction =>
          !transaction.isWrapper && transaction.id === "late-buy",
      );

    if (!laterBuy) {
      throw new Error("Expected a concrete transaction");
    }

    expect(laterBuy.currentStock).toBe(20);
    expect(laterBuy.currentCostBasis).toBe(150);
  });

  it("hydrates serialized transactions before recomputing", () => {
    const serialized = [
      {
        id: "buy-serialized",
        timestamp: 100,
        version: 3,
        groupID: "buy-serialized",
        tornID: null,
        tradeID: null,
        description: null,
        isWrapper: false,
        itemID: 1,
        itemName: "xanax",
        amount: 10,
        requestedAmount: 10,
        price: 100,
        source: "item-market",
        stockType: "normal",
        currentStock: 10,
        currentCostBasis: 100,
      },
    ];

    const builder = new TransactionBuilder(serialized);
    const result = builder.addTransaction({
      id: "sell-serialized",
      timestamp: 200,
      itemID: 1,
      itemName: "xanax",
      amount: -5,
      price: 150,
      source: "bazaar",
      stockType: "normal",
    });

    expect(result.transactions[0].currentStock).toBe(5);
    expect(result.transactions[0].currentCostBasis).toBe(100);
  });

  it("wraps trade imports", () => {
    const builder = new TransactionBuilder();
    const result = builder.addTrade({
      id: "trade-1",
      timestamp: 400,
      tradeID: "trade-1",
      items: [
        {
          id: "trade-1:item-1",
          timestamp: 400,
          itemID: 1,
          amount: 5,
          price: 1000,
          source: "trade",
        },
        {
          id: "trade-1:item-2",
          timestamp: 400,
          itemID: 2,
          amount: 3,
          price: 2000,
          source: "trade",
        },
      ],
    });

    expect(result.wrapper?.wrapperType).toBe("trade");
    expect(result.transactions).toHaveLength(2);
    expect(result.transactions.every((transaction) => transaction.groupID === "trade-1")).toBe(true);
  });
});

describe("migrateLegacyTransactions", () => {
  it("migrates trade-grouped legacy transactions into a trade wrapper", () => {
    const legacyTransactions: LegacyTransaction[] = [
      {
        id: "legacy-1",
        date: 100,
        type: "BUY",
        item: "xanax",
        amount: 5,
        price: 100,
        sourceType: "trade",
        tradeGroupId: "trade-group-1",
      },
      {
        id: "legacy-2",
        date: 100,
        type: "BUY",
        item: "crocus",
        amount: 2,
        price: 50,
        sourceType: "trade",
        tradeGroupId: "trade-group-1",
      },
    ];

    const result = migrateLegacyTransactions(legacyTransactions, {
      xanax: 1,
      crocus: 2,
      points: 3,
    });

    const wrapper = result.transactions.find((transaction) => transaction.isWrapper);

    expect(result.issues).toHaveLength(0);
    expect(wrapper && "wrapperType" in wrapper ? wrapper.wrapperType : null).toBe("trade");
    expect(result.transactions.filter((transaction) => !transaction.isWrapper)).toHaveLength(2);
  });

  it("uses negative fallback ids for points and unknown items", () => {
    const result = buildTransactionsFromParsedLogs([], [
      {
        type: "BUY",
        item: "points",
        amount: 10,
        price: 100,
      },
      {
        type: "BUY",
        item: "mystery item",
        amount: 1,
        price: 5,
      },
    ]);

    const concreteTransactions = result.filter(
      (transaction): transaction is Transaction => !transaction.isWrapper,
    );

    expect(concreteTransactions[0].itemID).toBe(-1);
    expect(concreteTransactions[1].itemID).toBeLessThan(0);
  });

  it("migrates legacy points transactions even when the item dictionary does not contain points", () => {
    const legacyTransactions: LegacyTransaction[] = [
      {
        id: "legacy-points",
        date: 100,
        type: "BUY",
        item: "points",
        amount: 25,
        price: 1000,
      },
    ];

    const result = migrateLegacyTransactions(legacyTransactions, {});
    const concreteTransactions = result.transactions.filter(
      (transaction): transaction is Transaction => !transaction.isWrapper && "itemID" in transaction,
    );

    expect(result.issues).toHaveLength(0);
    expect(concreteTransactions[0].itemID).toBe(-1);
    expect(concreteTransactions[0].itemName).toBe("points");
  });

  it("imports mug parsed logs into mug transactions", () => {
    const result = buildTransactionsFromParsedLogs([], [
      {
        type: "MUG",
        amount: 500000,
      },
    ]);

    expect(result.some((transaction) => !transaction.isWrapper && isMugTransaction(transaction))).toBe(true);
  });

  it("wraps trade parsed logs that share a trade group id", () => {
    const result = buildTransactionsFromParsedLogs([], [
      {
        type: "BUY",
        item: "xanax",
        amount: 2,
        price: 100,
        sourceType: "trade",
        tradeGroupId: "trade-123",
        weav3rReceiptId: "receipt-1",
        tornLogId: "trade:123",
        loggedAt: 1000,
        tradePartnerName: "Alice",
        tradePartnerID: "987654",
        tradeItemCount: 2,
      },
      {
        type: "BUY",
        item: "crocus",
        amount: 3,
        price: 50,
        sourceType: "trade",
        tradeGroupId: "trade-123",
        weav3rReceiptId: "receipt-1",
        tornLogId: "trade:123",
        loggedAt: 1000,
        tradePartnerName: "Alice",
        tradePartnerID: "987654",
        tradeItemCount: 2,
      },
    ]);

    const wrapper = result.find((transaction) => transaction.isWrapper);
    const concreteTransactions = result.filter(
      (transaction): transaction is Transaction => !transaction.isWrapper && "itemID" in transaction,
    );

    expect(wrapper && "wrapperType" in wrapper ? wrapper.wrapperType : null).toBe("trade");
    expect(wrapper && "partnerName" in wrapper ? wrapper.partnerName : null).toBe("Alice");
    expect(wrapper && "partnerID" in wrapper ? wrapper.partnerID : null).toBe("987654");
    expect(wrapper && "receiptID" in wrapper ? wrapper.receiptID : null).toBe("receipt-1");
    expect(wrapper && "itemCount" in wrapper ? wrapper.itemCount : null).toBe(2);
    expect(concreteTransactions).toHaveLength(2);
    expect(concreteTransactions.every((transaction) => transaction.groupID === "trade-123")).toBe(true);
  });

  it("imports artifact museum exchanges with required quantities", () => {
    const result = buildTransactionsFromParsedLogs([], [
      {
        type: "SET_CONVERT",
        setType: "senet-game",
        times: 2,
        pointsEarned: 4000,
        sourceType: "museum",
      },
    ]);

    const concreteTransactions = result.filter(
      (transaction): transaction is Transaction => !transaction.isWrapper && "itemID" in transaction,
    );

    const board = concreteTransactions.find((transaction) => transaction.itemName === "senet board");
    const whitePawn = concreteTransactions.find((transaction) => transaction.itemName === "white senet pawn");
    const blackPawn = concreteTransactions.find((transaction) => transaction.itemName === "black senet pawn");
    const points = concreteTransactions.find((transaction) => transaction.itemName === "points");

    expect(board?.amount).toBe(-2);
    expect(whitePawn?.amount).toBe(-10);
    expect(blackPawn?.amount).toBe(-10);
    expect(points?.amount).toBe(4000);
  });
});
