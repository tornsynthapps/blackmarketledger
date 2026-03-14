# FAQ & Troubleshooting

Here are solutions to the most common questions and issues users experience with Blackmarket Ledger and the BML Connect extension.

## General App Questions

### How is Average Cost Basis calculated?
Average Cost Basis is calculated dynamically based on your current inventory. It is the total cost of all the units of that item you currently hold, divided by the number of units in stock. When you sell an item, the system uses this average cost to calculate your Realized Profit for that specific sale.

### How do I correct a mistake in a logged transaction?
If you logged an item with a typo in the name, you can easily fix it. Go to the Main Dashboard, find the item in the Inventory table, hover over its row, and click the **Edit (Pencil) Icon** on the right side. You can enter the correct name. If the new name matches another existing item, the app will automatically merge their logs together.

### Why is my Net Total Profit negative?
Net Total Profit subtracts your Total Mug Loss from your Realized Profit. If you have been mugged for more money than you have made trading, your net profit will be negative. Unsold inventory is NOT factored into Net Total Profit (it is held as Current Inventory Value).

---

## Extension Troubleshooting

### The BML Box isn't showing up on Torn
First, verify your subscription status:
1. Click the BML Connect extension icon in your browser toolbar.
2. Check if it says your subscription is active. If your subscription is missing or expired, the box will not render.

If your subscription is active, ensure:
1. You have navigated to the Blackmarket Ledger web app at least once recently, as the extension pulls synced data from your local browser storage tied to the app.
2. You are on a supported page on Torn.

### The Extension says my API key is invalid
Ensure you have generated an API key with standard permissions on Torn. Double-check for any accidental whitespace (spaces) at the beginning or end of the API key when pasting it into the extension popup.

### My cost basis in the BML box is outdated
The extension relies on your latest logs. If you just made a trade, ensure you have entered the log into the Blackmarket Ledger web application, and the extension will update the data it displays on Torn shortly after.

### How do I hide the BML Box?
You can toggle the visibility of the box directly. If you want it completely gone, you can click the extension icon and remove your API key, or disable the extension from your browser's extension management page.
