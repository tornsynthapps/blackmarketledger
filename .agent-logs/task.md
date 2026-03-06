# Task Checklist

- [x] Update `normalizeItemName` in `lib/parser.ts` to return item names strictly in lowercase.
- [x] Implement a title-case formatting utility function (`toTitleCase` or similar) in `lib/parser.ts` to convert lowercase strings into Title Case for UI presentation.
- [x] Apply the formatting utility across the entire app where item names are displayed, primarily affecting:
    - `app/page.tsx` (Inventory Table)
    - `app/add/page.tsx` (Live Preview)
    - `app/logs/page.tsx` (Logs Table)
- [x] Create a new page `app/migration/page.tsx` that queries the `torn_invest_tracker_logs` local storage.
- [x] Build a one-click migration script in the new page that runs over all stored logs, converts their `item` names to strict lowercase, and saves the sanitized array back to local storage.
