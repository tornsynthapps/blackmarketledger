Here are solutions to the most common questions and issues users experience with Torn Ledger and the extension.

## General App Questions

### How is Average Cost Basis calculated?

Average Cost Basis is calculated dynamically based on your current inventory. It is the total cost of all the units of that item you currently hold, divided by the number of units in stock. When you sell an item, the system uses this average cost to calculate your Realized Profit for that specific sale.

### How do I correct a mistake in a logged transaction?

If you logged an item with a typo in the name, you can easily fix it. Go to the Main Dashboard, find the item in the Inventory table, hover over its row, and click the **Edit (Pencil) Icon** on the right side. You can enter the correct name. If the new name matches another existing item, the app will automatically merge their logs together.

### Why is my Net Total Profit negative?

Net Total Profit subtracts your Total Mug Loss from your Realized Profit. If you have been mugged for more money than you have made trading, your net profit will be negative. Unsold inventory is NOT factored into Net Total Profit (it is held as Current Inventory Value).

---

## Extension# FAQ & Troubleshooting

## ❓ Frequently Asked Questions

### How do I differentiate between travel profit and trading profit?

Use the [Self-Sell](./features/abroad-self-sell) workflow. When you return from abroad, "sell" the items to yourself at market value, then "buy" them back at that same price. This separates the sourcing margin from the trading margin.

### Why is Auto-Pilot paused?

Auto-Pilot pauses if it detects a discrepancy between your Torn logs and your Weav3r receipts. This ensures your cost basis remains 100% accurate. Review the modal that appears to resolve the issue.

### Is my Torn API Key safe?

Yes. Your API key is stored locally in your browser's IndexedDB/LocalStorage. It is only used to fetch data from the official Torn and Weav3r APIs.

### What is "Net Total Profit"?

Net Total Profit is your Realized Profit (money made from sales) minus your Total Mug Loss. It gives you a realistic view of how much you are actually taking home.

## 🛠️ Troubleshooting

### Auto-Pilot isn't syncing logs

1. Check your **Torn API Key** in the ServiceRail. Ensure it has **Full Access**.
2. Verify your internet connection.
3. Check if Torn API is currently down or experiencing lag.

### Inventory values seem incorrect

- BML uses the **FIFO** (First-In, First-Out) method. If you sold items but didn't log the purchase first, your cost basis might be skewed. Use the **Logs** page to audit your transaction history.

### Charts are empty

- Charts require historical data. If you've just started using BML, wait a few days for the Daily/Weekly trends to populate.
  cidental whitespace (spaces) at the beginning or end of the API key when pasting it into the extension popup.

### My cost basis in the Torn Ledger box is outdated

The extension relies on your latest logs. If you just made a trade, ensure you have entered the log into the Torn Ledger web application, and the extension will update the data it displays on Torn shortly after.

### How do I hide the BML Box?

You can toggle the visibility of the box directly. If you want it completely gone, you can click the extension icon and remove your API key, or disable the extension from your browser's extension management page.
