# App User Guide

This guide provides a detailed overview of every page in the Blackmarket Ledger (BML) suite. Use the navigation links below to jump to a specific section.

## 📊 Dashboard
The Dashboard is your command center. It provides real-time insights into your overall trading health.
- **Key Stats**: Realized Profit, Inventory Value, Mug Loss, and Net Profit.
- **Interactive Charts**: Click any stat card to view Daily/Weekly/Monthly trends.
- **Inventory Overview**: Searchable and sortable list of your current stock.

[TODO] Add screenshot of the main Dashboard.
[Learn more about Stats & Charts](./features/stats-charts)

---

## 🏛️ Museum
The Museum page is for specialized collectors. It helps you track sets of items (e.g., Plushies or Flowers) that can be exchanged for Points.
- **Set Completion**: Monitor how close you are to completing a full set.
- **Cost Basis**: Tracks the average cost of every item in your collection.
- **Profit Potential**: Estimates the value of your sets if converted to points today.

[TODO] Add screenshot of the Museum page.

---

## ✈️ Abroad
The Abroad page is dedicated to travelers. It isolates your activity while flying to other countries.
- **Abroad Inventory**: See exactly what you've purchased overseas.
- **Cost per Trip**: Analyze the cost basis of items relative to the flight cost.
- **Profit Tracking**: Measures gains specifically from your "Abroad" transactions.
- **Self-Sell Button**: Quickly differentiate margins by clicking the button next to items in your abroad inventory.

[TODO] Add screenshot of the Abroad dashboard.
[Learn more about Abroad & Self-Sell](./features/abroad-self-sell)

---

## 📜 Logs
The Logs page is your exhaustive audit trail. Every transaction you've ever committed is stored here.
- **Search & Filter**: Find specific trades or items by name.
- **Edit & Delete**: Correct mistakes in past entries.
- **Chronological Order**: View your trading history as it happened.

[TODO] Add screenshot of the Logs page.

---

## 💻 Terminal
The Terminal is for high-speed manual logging and legacy data entry.
- **Shorthand Input**: Paste custom logs for rapid processing.
- **Weav3r Integration**: Paste a Weav3r receipt URL to automatically pull trade data.
- **Bazaar/Market Parser**: Automatically identifies item names and prices from standard Torn logs.

[TODO] Add screenshot of the Terminal page.

---

## 🤖 Auto-Pilot
Auto-Pilot is the modern way to use BML. It automates your logging via the Torn API.
- **Automatic Sync**: Fetches logs, market transactions, and muggings without manual input.
- **Discrepancy Checks**: Pauses for your approval if a log doesn't match your receipts.
- **Seamless Trades**: Reconciles trade logs with Weav3r receipts automatically.

[TODO] Add screenshot of the Auto-Pilot page.
[Learn more about Auto-Pilot](./features/auto-pilot)

### Museum
The Museum tool (if applicable to your trading style) helps you track sets of items (like plushie or flower sets) intended for exchanging at the Torn Museum for points. 

### Adding Data
To manually add transactions:
1. Navigate to the **Add** section.
2. Select whether it was a **Buy** or **Sell** transaction.
3. Enter the item name, quantity, and total price.
4. If it was a purchase made abroad, ensure you mark it appropriately depending on the input options.

If you need format help while importing, open the **Documentation** link from the Terminal page instead of a separate log-formats helper.

> **Tip**: For the most efficient workflow, ensure you enter your trades regularly to keep your cost basis accurate, which heavily improves the usefulness of the BML Connect extension.
