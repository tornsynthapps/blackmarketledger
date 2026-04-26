# Auto-Pilot

Automatic Torn log ingestion system for synchronizing game data with Weav3r receipts.

## Files

- `page.tsx` - Main Auto-Pilot interface with sync controls, review queue, and activity history
- `getImportSourceType.ts` - Utility function to determine transaction source types from Torn log data
- `sync.ts` - Contains `syncLogs` and `syncTrades` functions for fetching and processing Torn API data

## Features

- Automatic synchronization of Torn game data (trades, bazaar, item market, etc.)
- Dual-cursor system for tracking trade and item synchronization progress
- Integration with Google Drive for cross-device cursor persistence
- Manual review interface for unlinked trades and receipts
- Inventory snapshot initialization on first run
- Real-time status updates and error handling

## Usage

The Auto-Pilot page provides controls to:
- Initialize or continue synchronization from saved cursors
- Review unlinked trades and receipts requiring manual intervention
- View synchronization history and statistics
- Monitor sync status and error messages

The system maintains separate cursors for trade and item data to allow independent progression while ensuring consistency.