# Supported Log Formats

Blackmarket Ledger (BML) is designed to be highly compatible with standard Torn and Weav3r log formats. This guide details the supported formats for manual terminal entry.

## 🛍️ Bazaar Logs
Used for tracking items sold through your bazaar.
- **Format**: `[Timestamp] [Item Name] sold for $[Price] to [User]`
- **BML Parsing**: Automatically extracts item name, quantity (usually 1), and price.

## 🏪 Item Market Logs
Used for tracking purchases and sales on the open market.
- **Format**: `[Timestamp] You bought [Quantity]x [Item Name] for $[Price] each`
- **BML Parsing**: Correctly handles bulk purchases and sales.

## 🤝 Trade Logs
Trade logs are complex and often involve multiple items.
- **Format**: `[Timestamp] Trade with [User] completed. You gave [Items], you received [Items].`
- **BML Best Practice**: Instead of pasting raw trade logs, paste a **Weav3r Receipt URL** for 100% accuracy.
- [Learn more about Auto-Pilot & Trades](./features/auto-pilot)

## ✈️ Abroad Logs
Purchases made while traveling.
- **Format**: `[Timestamp] You bought [Quantity]x [Item Name] from [Country] for $[Price] each.`
- **BML Usage**: Mark these as **Abroad** to isolate travel profit.
- [Learn more about Abroad & Self-Sell](./features/abroad-self-sell)

## 🥊 Mug Logs
Track losses to mugging.
- **Format**: `[Timestamp] You were mugged for $[Amount] by [User]` or `[Timestamp] [User] mugged you for $[Amount]`
- **BML Sync**: Auto-Pilot handles these automatically from your Torn logs.

---

> [!TIP]
> Use the **Terminal** to test any custom log strings. BML will show a real-time preview of how the log will be parsed into your ledger.

## Manual Entry Shorthand

- `b;<item>;<qty>;<price>`: Buy an item using unit price. Example: `b;Xanax;100;830000`
- `b;<item>;<qty>;;<total>`: Buy an item using total cost. Example: `b;Xanax;100;;83000000`
- `s;<item>;<qty>;<price>`: Sell an item. Example: `s;Xanax;50;845000`
- `m;<amount>`: Record mug loss. Example: `m;500000`
- `c;<flushies_per_10_points>;<times>`: Convert flushies to points. Example: `c;13;120`
- `cf;<times>`: Convert flower sets into points. Example: `cf;5`
- `cp;<times>`: Convert plushie sets into points. Example: `cp;10`
