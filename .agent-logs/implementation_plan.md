# Standardize Item Names to Lowercase

The current implementation uses a custom title-casing function during parsing to store item names (e.g., `'Six-Pack of Alcohol'`), which has led to persistent mismatch bugs depending on the source formatting (Weaver vs. Bazaar logs vs. Manual spelling). To solve this conclusively, all logs will be parsed, tracked, and stored internally in strict lowercase. We will dynamically format these lowercase strings to proper Title Case exclusively during UI rendering. To ensure existing storage data doesn't break, a one-off database migration utility page will be provided.

## Lowercasing & Formatting Core Logic
#### [MODIFY] [parser.ts](file:///home/jayampatel/Codehub/projects/tornsynthapps/torninvesttracker/lib/parser.ts)
- Update `normalizeItemName` function to strip arbitrary whitespace and return strictly `.toLowerCase()`. (Alias checks for 'points' and 'flushies' will remain but return lowercase versions).
- Create and export a new formatting utility: `formatItemName(name: string): string` that correctly handles spacing, hyphens, and title-casing (which will be used whenever an item name is rendered in the UI).

## UI Rendering Updates
Any view that prints `transaction.item`, `stat.name`, or similar variables to the screen will need to funnel the string through `formatItemName()` first.
#### [MODIFY] [page.tsx](file:///home/jayampatel/Codehub/projects/tornsynthapps/torninvesttracker/app/page.tsx)
- Use `formatItemName(name)` when rendering the Dashboard Inventory & Profits table rows. (Keep the actual key maps in lowercase).
#### [MODIFY] [page.tsx](file:///home/jayampatel/Codehub/projects/tornsynthapps/torninvesttracker/app/logs/page.tsx)
- Use `formatItemName()` when rendering transaction rows in the logs table.
- Pass formatted names into the Edit/Rename prompts to avoid confusing the user with lowercase defaults.
#### [MODIFY] [page.tsx](file:///home/jayampatel/Codehub/projects/tornsynthapps/torninvesttracker/app/add/page.tsx)
- Use `formatItemName()` in the live preview panel for parsed logs.
#### [MODIFY] [Navigation.tsx](file:///home/jayampatel/Codehub/projects/tornsynthapps/torninvesttracker/components/Navigation.tsx)
- Add a new link to `/migration` temporarily.

## Data Migration Tool
#### [NEW] [page.tsx](file:///home/jayampatel/Codehub/projects/tornsynthapps/torninvesttracker/app/migration/page.tsx)
- Build a targeted utility page that loads `transactions` from the `useJournal` hook.
- Implement a `Migrate Now` button that iterates over every transaction object:
    - If `type === 'BUY'` or `SELL`: `t.item = t.item.trim().toLowerCase()`
    - If `type === 'CONVERT'`: update both `fromItem` and `toItem` to lowercase.
- Calculates and lists how many items will be affected, executes the change via `restoreData(fixedArray, false)` (overwriting existing cache), and provides a success status.

## Verification Plan

### Manual Verification
1. Navigate to `/migration`.
2. Observe the script count the number of log items that have uppercase letters.
3. Click "Migrate Database".
4. Ensure the dashboard totals merge correctly instead of duplicating items.
5. Search for "six-pack of alcohol" in dashboard table, confirming search matching works across lowercase sources.
6. Verify visually that "Six-Pack Of Alcohol" appears perfectly capitalized on screen.
