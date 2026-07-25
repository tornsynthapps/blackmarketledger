# Torn Ledger Version History

## beta-6.4 (2026-04-27)

- **Settings**: New settings page with theme controls and global tokens
- **UI**: Dark/light logo sets replacing single favicon; dual-theme asset pipeline
- **Pricelist**: User-specific dynamic routes (`[userID]/page.tsx`), migrated from manage page; consolidated view layer

## beta-6.3 (2026-04-26)

- **Auto-Pilot**: Enhanced Torn API integration with new TornAPIClient for inventory, market prices, and item names
- **Agents**: Added helper modules for agent operations (check_categories, read_torn_api, search_torn_api)
- **Core**: Improved Auto-Pilot sync logic and state management in useJournal hook

## beta-6.2 (2026-04-20)

- **Changelog**: Fixed parsing of beta-v versions with correct prefix.
- **Database**: Added pricelist schema with migration.
- **Build**: Introduced pnpm as package manager and refactored plans.
- **TornExchange API**: New API client with rate limiting and core methods.
- **Pricelist Management**: New dedicated pricelist management page with TornExchange integration.
- **Museum**: Enhanced museum page with pricelist integration.
- **Account**: Updated account page with integration.

## beta-6.1 (2026-04-17)

- **Dashboard**: Added grouped inventory view and line/bar chart modes to stacked profit chart.
- **Museum**: Redesigned item cards for compact and modern UI, enhanced pricelist editing with drift detection and auto-pricing, fixed profit display to only show points profit (not plushie/flower resale).
- **Auto-Pilot**: Refactored sync logic and fixed item log import order.
- **Blackbox**: New feature - logging, UI, and tracking for trade linking and item log splitting. Added to main navigation and central directory.
- **API**: Added Scalar API documentation at /docs and /docs/scalarui. Implemented modular authentication service for Cloudflare Workers.
- **Database**: Added D1 database with auth and subscriptions tables.
- **Pricelist**: New pricelist designed for sellers.
- **Userscript**: Added userscript with documentation.
- **Logs**: Rounded profit to integer and added percentage display in sell logs. Updated export backup filename to use timestamp and log count.
- **Account**: Replaced BML account with PixelGhost and added copy button.
- **Navigation**: Added Blackbox and Central Directory to main navigation.
- **Treasure Chest**: Added under construction page with production mode toggle.
- **Poo Board**: Initialized new poo board feature.
- **Central Directory**: Added privacy and terms page.
- **Refactoring**: Refactored AI related docs and files, updated folder names, converted NewRateLimiter to proper OOP class, moved files to subfolder.
- **Bug Fixes**: Fixed import errors.

## beta-5.10 (2026-04-09)

- **Set Pricelist in Museum**: Added "Set Pricelist" mode for Flower and Plushie sets in Museum page.
- **Item Grid Display**: Shows item name, stock, market price, current %, and editable new % for each item.
- **Auto Button**: Calculates offer percentage based on configurable stock thresholds (defaults: 500→101%, 1000→100%, 2000→98%, else 95%).
- **Settings Panel**: Allows customizing both stock thresholds and offer percentages (supports floating values).
- **Weav3r Integration**: Save button updates pricelist via Weav3r API.
- **Mode Toggle**: Unified mode state (overview/buy/pricelist) with mode labels next to headings.
- **Color Coding**: Green for Buy Mode, Blue for Set Pricelist mode (applied to buttons and table components).

## beta-5.9 (2026-04-09)

- **Agent Instructions Enhancement**: Added guidelines for checking unstaged changes and confirming with users before updating version history.
- **Plan Management**: New plan file for tracking agent work and task delegation.
- **Organization**: New task organization file for project management.
- **Museum Updates**: Improvements to museum page functionality.

## beta-5.8 (2026-04-08)

- **Set Conversion**: Improved set conversion logic to handle price distribution and total value. Updated trade linking to support sets.

## beta-5.7 (2026-04-06)

- **Dashboard Chart**: Fixed stats to show proper abroad profit.
- **Navigation**: Updated navigation to include link to docs, and use icons only in top navigation.

## beta-5.6 (2026-04-06)

- **Documentation Layout**: Removed global navigation and footer from documentation pages for a more focused experience.
- **Navigation Enhancements**: Integrated a new industrial-style documentation sidebar with a "Back to App" link and consolidated footer links.
- **Sidebar UX**: Redesigned documentation navigation to be fixed and non-scrollable with improved typography.
- **Code Structure**: Implemented `LayoutWrapper` for cleaner conditional UI rendering across different page types.

## beta-5.5 (2026-04-06)

- **Abroad Synchronization**: Fixed a calculation bug in `lib/chartUtils.ts` where museum items (Flowers/Plushies) were excluded from abroad totals, ensuring accurate charts on the Abroad page.
- **Account Page**: Introduced a new dedicated Account page for centralized user and service management.
- **Logs UX & Profit Tracking**: Added realized profit/loss display for SELL transactions and simplified selection with row-level clicks.
- **Data Integrity**: Fixed trade partner ID identification in Auto-Pilot and resolved over 20 TypeScript linting errors for improved stability.
- **Dashboard Enhancements**: Implemented persistent inventory sorting and simplified chart control labels.
- **Legal & Privacy**: Migrated API disclosures to Privacy page, deprecated BML Connect, and standardized full-width page layouts.

## beta-5.4 (2026-04-06)

- **Hardline Interface Overhaul**: Complete migration from Lucide to Hugeicons for a more industrial aesthetic.
- **Brand Typography**: Integrated Space Grotesk, Space Mono, and VT323 for a premium, high-contrast look.
- **System Cleanup**: Removed legacy icon dependencies and standardized icon rendering across all pages.

## beta-5.3 (2026-04-05)

- **Theme Color Tracker**: Created a centralized theme color tracker.
- **Dashboard Chart**: Updated Dashboard Charts to be more compact, repositioned items, and renamed the titles.

## beta-5.2 (2026-04-02)

- **Unsupported Trade Item Handling**: Updated trade linking not to fast-fail when unsupported item is found.

## beta-5.1 (2026-04-01)

- **Automatic Abroad Buy Tracking**: Updated Auto-Pilot to automatically fetch abroad buys from Torn API.
- **Fix**: Fixed saving Weav3r key should update weav3r userID

## beta-5.0 (2026-04-01)

- **Redesign**: Complete redesign of the application, using new shared design doc with other Synth apps.

## beta-4.12 (2026-03-31)

- **Transactions Scheme**: Updated how transactions are stored giving more flexibility and control over transaction data.
- **Transaction UI Refactor**: Updated transaction list styling, improved item canonicalization logic, and added test coverage for cross-ID item matching.
- **Transaction Wrapper**: Added a wrapper around transactions to group logs.
- **Cost-Basis in Transactions**: Added cost-basis tracking to transactions.

## beta-4.11 (2026-03-29)

- **Select and Delete**: Added support for selecting and deleting multiple transactions.

## beta-4.10 (2026-03-27)

- **Expanded Chart Data**: Updated main chart to include Museum and Abroad datasets, resolving inconsistencies between visualizations and static data.
- **LocalStorage Refactor**: Unified API key handling through a shared `LocalStorageInterface` for improved consistency and maintainability.
- **Transaction Architecture Improvements**: Added serialization/deserialization for transaction entities and refactored `TornItemLog` stock input along with `BaseTransaction` type handling.
- **Auto-Pilot Enhancements**: Rebuilt trade linking logic, added Mug log support, improved Drive cache handling, and refined sync controls with reposition options and clearer status messaging.
- **API Stability & Rate Limiting**: Introduced rate limiting for Torn and Weav3r APIs to enhance reliability and prevent request throttling.
- **Subscription System Updates**: Added trial claim functionality and improved subscription verification logic.
- **UI & Modal Updates**: Added new backend-driven modals and improved overall interaction flows.
- **Profit Chart Improvements**: Enhanced tooltip styling and simplified chart area fills for better readability.
- **Museum Dashboard Fix**: Corrected point cost calculations to use average point values.
- **Cursor & Sync Fixes**: Resolved cursor reset issues and improved dual-cursor state visibility.
- **Code Quality & Tooling**: Integrated Prettier for consistent formatting and added AI coding “skills & instructions” scaffolding.
- **Internal Cleanup**: Removed redundant status logging and improved state persistence during Auto-Pilot sync operations.

## beta-4.9 (2026-03-22)

- **Rate Limit & API Stability**: Integrated rate limiting for Torn and Weav3r API requests to prevent bans and improve overall reliability.
- **Drive Cache & Loading State Enhancements**: Improved Google Drive cache management, added reposition menus for sync controls, and added clear loading states for better feedback.
- **Auto-Pilot & Sync Fixes**: Resolved cursor reset issues and improved status visibility for dual-cursor synchronization.
- **Museum Dashboard Update**: Updated point conversion logic to use average points value for more accurate calculations.
- **Profit Chart UX**: Enhanced chart tooltip styling and simplified visualization area fills for a cleaner dashboard experience.

## beta-4.8 (2026-03-22)

- **Optional Timestamp in Auto-Pilot Fetch**: Enhanced dual-cursor trade synchronization with optional timestamp parameters.
- **Beta Warning Banner**: Added a beta disclaimer for the Auto-Pilot feature.
- **Google Drive Sync Enhancements**: Improved sync reliability and state management for Google Drive workflows.

## beta-4.7 (2026-03-22)

- **Advanced Dashboard Visualization**: Enhanced profit tracking with stacked area charts and incremental view options for more granular portfolio analysis.

## beta-4.6 (2026-03-21)

- **Dual Cursor Sync**: Implemented a dual-cursor system for more precise synchronization and log management in Auto-Pilot.

## beta-4.5 (2026-03-21)

- **Squash Merge v4.2.2 Improvements**: Optimized trade detail fetching and enhanced receipt matching logic.
- **Auto-Pilot Reset Control**: Implemented `ResetCursorPage` for managing Auto-Pilot cursor resets.
- **Torn API Wrapper**: Integrated `TornWrapper` for more robust API interactions.
- **Log Parsing Fixes**: Updated regex for item purchase logs to handle points and museum categories correctly.
- **Sync Enhancements**: Fixed paging and added missing categories (mugs, points, museum) with overall sync performance optimizations.

## beta-4.4 (2026-03-20)

- **Non-anonymous Mug Parsing**: Updated parser (v1.2) to support non-anonymous mugs and mug logs containing timestamps.

## beta-4.3 (2026-03-20)

- **Interactive Multi-Chart Dashboard**: Replaced static profit stats with dynamic Recharts-powered data visualization. Support for Area, Line, and Bar charts.
- **Museum & Abroad Analytics**: Specialized analytics views for Point Market conversions and international market trends.
- **Historical Scaling**: Smooth transition between Daily, Weekly, Monthly, and Yearly historical views with cumulative/incremental toggles to track long-term progress.

## beta-4.2 (2026-03-20)

- **Dynamic Changelog Parser**: Refactored the version history page into a dynamic Server Component. It now automatically parses version-history.md for seamless, hands-off historical tracking and rendering.

## beta-4.1 (2026-03-20)

- **Auto-Pilot UI Refactor**: Dedicated Auto-Pilot activity page with advanced filtering and historical search.
- **Points Market & Museum Integration**: Automatic fetching and parsing of Points Market sales and Museum exchanges.
- **Layout Optimizations**: Improved dashboard organization and Review Queue positioning.

## beta-4.0 (2026-03-19)

- **Auto-Pilot Feature**: Introduced automatic log fetching from Torn and Weav3r APIs.
- **Sync & Discrepancy Control**: Manual synchronization with real-time discrepancy resolution.

## beta-3.2 (2026-03-18)

- **Recharts Data Visualization**: Added interactive charts and graphs for trading analytics.
- **Points Market Event Parsing**: Enhanced log parsing for points market buy/sell events.

## beta-3.1 (2026-03-17)

- **Google Drive Integration**: Support for persistent cloud storage and cross-device sync.
- **Extension Deprecation**: Transitioned core functionality directly into the web app.
- **Advanced Log Parsing**: Expanded regex engine for complex transaction types.
- **Enhanced UI & Experience**: Improved layout stability and visual components.

## beta-3.0 (2026-03-15)

- **Shared Service Drawer**: Global active-services drawer with status indicators.
- **Workflow Refresh**: Automatic Torn user ID derivation and Terminal doc links.
- **Storage Options**: Added BML Connect database and Google Drive sync options.

## beta-2.9 (2026-03-11)

- **Documentation & Guides**: Dynamic `/docs` route with Markdown-based guides.
- **IndexedDB V2 Migration**: Upgraded local storage architecture for better performance.

## beta-2.8 (2026-03-11)

- **BML Connect UX**: Packaging update and drag movement controls for the overlay.

## beta-2.7 (2026-03-11)

- **Subscription Integration**: Supabase-backed subscription verification via Torn API key.

## beta-2.6 (2026-03-11)

- **Companion Extension**: New browser extension scaffold for cost-basis overlays.

## beta-2.5 (2026-03-08)

- **Firebase Hosting**: Migrated deployment from GitHub Pages to Firebase Hosting.

## beta-2.4 (2026-03-07)

v4.3.1
v4.3.2
v4.4.0

- **Haptic Feedback Fixes**: Fixed haptic triggers in production builds.

## beta-2.3 (2026-03-07)

- **Web Haptics Feedback**: Integrated tactile feedback for mobile users.

## beta-2.2 (2026-03-07)

- **Robust Parsing Strategy**: Updated parser for system events.
- **Syntax Highlighting**: Real-time validation for shorthand log input.
- **Rapid Paste Support**: Automatic newline appending for batch imports.

## beta-2.1 (2026-03-07)

- **UI & Theming**: Comprehensive overhaul with page-specific themes.
- **Museum Restructure**: Refactored for item set economics and assembly costs.

## beta-2.0 (2026-03-07)

- **Abroad Tracking**: New dashboard for international market purchases.
- **Pricelist Self Sells**: Instant "Self Sell" using Weav3r pricing.
- **Smart Sell Splits**: Automatic division of sales across mixed ledgers.

## beta-1.2 (2026-03-07)

- **Log Conversion**: Inline conversion for abroad logs in the Add page.

## beta-1.1 (2026-03-06)

- **Torn Abroad Logs**: Parsing support for direct abroad purchases.

## beta-1.0 (2026-03-06)

- **BlackMarket Ledger Rebrand**: Renamed from Torn Trade Tracker.
- **Banners & Support**: Community forum and donation banners.
- **Set Conversions**: Shorthand support for mass-converting sets to points.

## beta-0.4 (2026-03-06)

- **GitHub Pages**: Automated deployment via GitHub Actions.

## beta-0.3 (2026-03-06)

- **Fetch Architecture**: Moved Weav3r API fetching to client-side.

## beta-0.2 (2026-03-06)

- **Footer & Changelog**: Added global navigation and version history.

## beta-0.1 (2026-03-06)

- **Smart Logs Parsing**: RegExp engine for standard Bazaar sale strings.
- **Dashboard Sorting**: Dynamic column sorting for inventory.
- **Data Lowercasing**: Strict lowercase storage for matching parity.

## beta-0.0 (2026-03-05)

- **Initial Prototype**: Local-storage tracking and basic dashboard.
