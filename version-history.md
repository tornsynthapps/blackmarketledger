# BlackMarket Ledger Version History

## v4.3.0 (2026-03-22)
- **Advanced Dashboard Visualization**: Enhanced profit tracking with stacked area charts and incremental view options for more granular portfolio analysis.

## v4.2.3 (2026-03-21)
- **Dual Cursor Sync**: Implemented a dual-cursor system for more precise synchronization and log management in Auto-Pilot.

## v4.2.2 (2026-03-21)
- **Squash Merge v4.2.2 Improvements**: Optimized trade detail fetching and enhanced receipt matching logic.
- **Auto-Pilot Reset Control**: Implemented `ResetCursorPage` for managing Auto-Pilot cursor resets.
- **Torn API Wrapper**: Integrated `TornWrapper` for more robust API interactions.
- **Log Parsing Fixes**: Updated regex for item purchase logs to handle points and museum categories correctly.
- **Sync Enhancements**: Fixed paging and added missing categories (mugs, points, museum) with overall sync performance optimizations.

## v4.2.1 (2026-03-20)
- **Non-anonymous Mug Parsing**: Updated parser (v1.2) to support non-anonymous mugs and mug logs containing timestamps.

## v4.2.0 (2026-03-20)
- **Interactive Multi-Chart Dashboard**: Replaced static profit stats with dynamic Recharts-powered data visualization. Support for Area, Line, and Bar charts.
- **Museum & Abroad Analytics**: Specialized analytics views for Point Market conversions and international market trends.
- **Historical Scaling**: Smooth transition between Daily, Weekly, Monthly, and Yearly historical views with cumulative/incremental toggles to track long-term progress.

## v4.1.1 (2026-03-20)
- **Dynamic Changelog Parser**: Refactored the version history page into a dynamic Server Component. It now automatically parses version-history.md for seamless, hands-off historical tracking and rendering.

## v4.1.0 (2026-03-20)
- **Auto-Pilot UI Refactor**: Dedicated Auto-Pilot activity page with advanced filtering and historical search.
- **Points Market & Museum Integration**: Automatic fetching and parsing of Points Market sales and Museum exchanges.
- **Layout Optimizations**: Improved dashboard organization and Review Queue positioning.

## v4.0.0 (2026-03-19)
- **Auto-Pilot Feature**: Introduced automatic log fetching from Torn and Weav3r APIs.
- **Sync & Discrepancy Control**: Manual synchronization with real-time discrepancy resolution.

## v3.2.0 (2026-03-18)
- **Recharts Data Visualization**: Added interactive charts and graphs for trading analytics.
- **Points Market Event Parsing**: Enhanced log parsing for points market buy/sell events.

## v3.1.0 (2026-03-17)
- **Google Drive Integration**: Support for persistent cloud storage and cross-device sync.
- **Extension Deprecation**: Transitioned core functionality directly into the web app.
- **Advanced Log Parsing**: Expanded regex engine for complex transaction types.
- **Enhanced UI & Experience**: Improved layout stability and visual components.

## v3.0.0 (2026-03-15)
- **Shared Service Drawer**: Global active-services drawer with status indicators.
- **Workflow Refresh**: Automatic Torn user ID derivation and Terminal doc links.
- **Storage Options**: Added BML Connect database and Google Drive sync options.

## v2.5.0 (2026-03-11)
- **Documentation & Guides**: Dynamic `/docs` route with Markdown-based guides.
- **IndexedDB V2 Migration**: Upgraded local storage architecture for better performance.

## v2.4.1 (2026-03-11)
- **BML Connect UX**: Packaging update and drag movement controls for the overlay.

## v2.4.0 (2026-03-11)
- **Subscription Integration**: Supabase-backed subscription verification via Torn API key.

## v2.3.3 (2026-03-11)
- **Companion Extension**: New browser extension scaffold for cost-basis overlays.

## v2.3.2 (2026-03-08)
- **Firebase Hosting**: Migrated deployment from GitHub Pages to Firebase Hosting.

## v2.3.1 (2026-03-07)
- **Haptic Feedback Fixes**: Fixed haptic triggers in production builds.

## v2.3.0 (2026-03-07)
- **Web Haptics Feedback**: Integrated tactile feedback for mobile users.

## v2.2.0 (2026-03-07)
- **Robust Parsing Strategy**: Updated parser for system events.
- **Syntax Highlighting**: Real-time validation for shorthand log input.
- **Rapid Paste Support**: Automatic newline appending for batch imports.

## v2.1.0 (2026-03-07)
- **UI & Theming**: Comprehensive overhaul with page-specific themes.
- **Museum Restructure**: Refactored for item set economics and assembly costs.

## v2.0.0 (2026-03-07)
- **Abroad Tracking**: New dashboard for international market purchases.
- **Pricelist Self Sells**: Instant "Self Sell" using Weav3r pricing.
- **Smart Sell Splits**: Automatic division of sales across mixed ledgers.

## v1.1.2 (2026-03-07)
- **Log Conversion**: Inline conversion for abroad logs in the Add page.

## v1.1.1 (2026-03-06)
- **Torn Abroad Logs**: Parsing support for direct abroad purchases.

## v1.1.0 (2026-03-06)
- **BlackMarket Ledger Rebrand**: Renamed from Torn Trade Tracker.
- **Banners & Support**: Community forum and donation banners.
- **Set Conversions**: Shorthand support for mass-converting sets to points.

## v0.1.3 (2026-03-06)
- **GitHub Pages**: Automated deployment via GitHub Actions.

## v0.1.2 (2026-03-06)
- **Fetch Architecture**: Moved Weav3r API fetching to client-side.

## v0.1.1 (2026-03-06)
- **Footer & Changelog**: Added global navigation and version history.

## v0.1.0 (2026-03-06)
- **Smart Logs Parsing**: RegExp engine for standard Bazaar sale strings.
- **Dashboard Sorting**: Dynamic column sorting for inventory.
- **Data Lowercasing**: Strict lowercase storage for matching parity.

## v0.0.1 (2026-03-05)
- **Initial Prototype**: Local-storage tracking and basic dashboard.
