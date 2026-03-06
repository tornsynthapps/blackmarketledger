# Weaver API Trade Integration Complete

I've successfully updated the tracker to support importing trade logs directly from the Weaver API. You can now easily paste a receipt URL into the logs box, and it will automatically fetch the trade items for you to review and save.

## What was Changed

### 1. API Configuration
- Added a new configuration section at the top of the **Add Data Logs** page.
- You can now prefill and save your `Weaver API Key` and `Weaver User ID`.
- The settings are persisted in your browser's local storage securely so you don't need to re-enter them constantly.

### 2. Live URL Parsing in Text Area
- Modified the main input box to listen for the specific Weaver receipt URL format (`https://weav3r.dev/receipt/RECEIPT_ID`).
- Once pasted, the application kicks off a background fetch providing a visually distinct "Fetching Trades..." loading state over the text box.

### 3. Smart Source Detection
- **Weaver Link Parsing:** The main text box automatically listens for a `https://weav3r.dev/receipt/RECEIPT_ID` link. When pasted, the background fetching process kicks in to swap the url with properly parsed trades. 
- **Torn Bazaar Logs Parsing:** You can now instantly convert direct copy-paste strings from your bazaar logs. For instance, `TequilaKing bought 4 x Six-Pack of Alcohol from your bazaar for $3,587,596.` is auto-captured via a RegExp engine directly upon pasting and automatically written back into the UI as `s;Six-Pack of Alcohol;4;;3587596`.

### 4. Interactive Dashboard Table Sorting
- The **Inventory & Profits** table on the home screen `app/page.tsx` is no longer static.
- Click any column header (`Item Name`, `Stock`, `Avg Cost Basis`, `Total Cost`, or `Realized Profit`) to dynamically sort your trade portfolio.
- Sorting indicators (`ArrowUp`/`ArrowDown`/`ArrowUpDown`) visually define current ordering and direction (Ascending / Descending).
- Returns an array of items which are auto-mapped into standard `"b;ItemName;Quantity;;TotalValue"` shorthand format.
- The script neatly replaces the original pasted URL with those generated shorthand lines directly inside the same text area.
- You'll see the Live Preview update immediately, giving you full control to adjust prices, fix quantities, branch off conversions, or delete unwanted records *before* finalizing and saving them all into the tracker.

### 5. String Strictness and Migration
- Updated `normalizeItemName` handler to force all item strings into strictly `.toLowerCase()`. This ensures absolute string matching parity across manual entry, Weaver links, and Bazaar logs without capitalizing hyphenated strings abnormally.
- Created `formatItemName` presentation utility to dynamically present these lowercase tokens nicely as `Title Case` in the App views (`Dashboard`, `Logs`, `Add`).
- Deployed a `/migration` page. This tool explicitly targets the local storage database and loops over all active logs, forces the `.item` strings strictly down to lowercase format, and automatically purges uppercase data inconsistencies.

## Validation Results
- Verified that numeric values containing commas directly from Weaver or Torn logs (e.g., `$3,587,596`) are strictly cleaned and parsed safely, overcoming native `parseInt()` truncations.
- Fixed item capitalization mismatch for hyphenated items (e.g. `Six-Pack of Alcohol`) so that logs from the bazaar correctly merge with manually typed logs.
- Added data migration tool to sanitize existing disparate casing logic.
- Re-ran the whole `npm run build` sequence; Next.js continues to build with zero type-script warnings or issues.
