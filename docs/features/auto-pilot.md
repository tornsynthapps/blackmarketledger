# Auto-Pilot Guide

**Auto-Pilot** is BML's automated logging system. It eliminates the need for manual data entry by syncing your transactions directly from the Torn API.

## 🚀 How it Works

Auto-Pilot fetches your recent activity logs and intelligently parses them into ledger transactions. It handles:

- **Item Market**: Buys and Sells.
- **Bazaar**: Item sales.
- **Mug Logs**: Automatic tracking of money lost to muggings.
- **Trades**: Seamlessly reconciled with Weav3r receipts.

## 🛠️ Setup

1. **API Key**: Ensure you have a **Full Access** Torn API key saved in the **ServiceRail**.
2. **Starting Point**: When you first enable Auto-Pilot, you'll be asked to pick a starting date. BML will sync logs from that moment forward.
3. **Sync Button**: Auto-Pilot is manual-trigger. Click **Sync Now** to fetch the latest logs.

## 🤝 Weav3r Integration

BML works best with **Weav3r**.

- When Auto-Pilot detects a completed trade log, it automatically looks for a matching Weav3r receipt.
- It compares the items in the Torn log with the items in the Weav3r receipt to ensure perfect accuracy.

## ⚠️ Discrepancy Handling

If Auto-Pilot finds a mismatch (e.g., a trade price doesn't match the receipt, or an item is missing), it will **pause** the sync process.

1. A modal will appear showing the discrepancy.
2. You can review the difference and choose to **Accept**, **Modify**, or **Skip** the transaction.
3. Once resolved, the sync resumes.

## 💡 Best Practices

- **Sync Regularly**: Sync after a large trading session to keep your dashboard up-to-date.
- **Verify Trades**: Always use Weav3r for complex trades to ensure your cost basis is calculated correctly.
- **Check Mug Logs**: Auto-Pilot ensures every mug is accounted for, giving you a true "Net Total Profit."
