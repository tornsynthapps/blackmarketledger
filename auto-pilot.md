# Plan: Automatic Log Fetching via Torn and Weav3r APIs

## Context

Currently, BlackMarket Ledger provides a terminal interface for manually entering Torn transaction logs. The user wants to add automatic log fetching via Torn API (full access key) and Weav3r API to fetch logs and trades automatically. The system should:

1. Fetch logs from Torn API using `from` parameter to avoid duplicates
2. Process logs for bazaar/item-market sell/buy, points conversion/buy/sell
3. For trade logs: fetch trades from Weav3r API if not already fetched, compare items, show discrepancies to user, pause logging until confirmation
4. Store Torn log ID and Weav3r receipt ID in logs
5. Create a new page for automatic logger with a toggle button to switch between terminal and automatic logger
6. UI should match existing design, include funny name for logger
7. User should input full access API key in ServiceRail (right-side drawer)
8. User should pick starting date when first using automatic logger

## Design Decisions (User Confirmed)

Based on user input:

1. **Logger Name**: "Auto-Pilot"
2. **Sync Mechanism**: Manual only (user clicks "Sync Now" button each time)
3. **Page Structure**: Separate page at `/auto` with toggle button to switch to terminal
4. **Discrepancy Handling**: Pause all logging until user reviews each discrepancy
5. **Starting Date**: User selects starting date when first using automatic logger (not implemented yet in questions, but based on requirement #8)

## Existing Codebase Analysis

### Key Files
- `/app/add/page.tsx` - Terminal page with real-time parsing, validation, Weav3r receipt integration
- `/lib/parser.ts` - Parsing logic for various log formats
- `/store/useJournal.ts` - State management, API key storage (`weav3rApiKey`, `driveApiKey`)
- `/components/ServiceRail.tsx` - API key configuration panel
- `/components/Navigation.tsx` - Navigation with 6 items (Dashboard, Museum, Abroad, Logs, Terminal, BML Connect)
- `/app/layout.tsx` - Layout with ServiceRail on right side

### Current API Key Storage
- Weav3r API key stored as `weav3rApiKey` in useJournal store (actually Torn API key)
- Drive API key stored separately
- Keys persisted to IndexedDB/localStorage via `saveWeaverConfig()`
- User ID resolved from Torn API key via Torn API endpoint

### Current Weav3r Integration
- In terminal page, detects Weav3r receipt URLs and fetches trade data
- Endpoint: `https://weav3r.dev/api/trades/${weav3rUserId}/${receiptId}?apiKey=${weav3rApiKey}`
- Converts fetched items to shorthand format

## API Schema Analysis

### Torn API (`/user/log` endpoint)
**Response Schema**: `UserLogsResponse` with `log` array of `UserLog` objects:
- `id`: Log ID (string/number)
- `timestamp`: Unix timestamp (integer)
- `details`: Object with `id` (log type ID), `title`, `category`
- `data`: Dynamic key-value pairs related to the log (contains item details, quantities, prices, etc.)
- `params`: Dynamic key-value pairs (additional parameters)

**Key Fields for Parsing**:
- `details.category`: Identifies log category (e.g., "Trade", "Bazaar", "Item Market", "Points")
- `data`: Contains transaction-specific data (items, quantities, prices, total values)
- Need to map Torn log categories to existing parser transaction types

**Pagination Parameters**:
- `from`: Unix timestamp, fetch logs newer than this
- `to`: Unix timestamp, fetch logs older than this
- `limit`: Max 100 logs per request (default 20)

### Weav3r API (Trade Receipts)
**Endpoints**:
- `GET /trades/{userID}`: List recent trades (receipts) with pagination via `from`/`to` timestamps
- `GET /trades/{userID}/{receiptId}`: Get detailed trade receipt

**Trade Detail Response**:
- `id`: Weav3r receipt ID (string)
- `trade_id`: External/game trade ID (string) - likely matches Torn trade log ID
- `buyer_name`: Name of buyer
- `total_value`: Total trade value
- `item_count`: Number of items
- `created_at`, `updated_at`: Unix timestamps
- `items`: Array of `TradeDetailItem` objects:
  - `item_id`: Torn item ID (integer)
  - `item_name`: Item name (string)
  - `quantity`: Quantity (integer)
  - `price_used`: Price per item (integer)
  - `total_value`: Total value for this item (integer)
  - `market_price_at_time`: Market price at trade time (integer)

**Matching Torn Logs with Weav3r Receipts**:
- Match using `trade_id` from Weav3r receipt with Torn log `id` or `data.trade_id`
- Timestamp alignment for verification

## Requirements

### Functional Requirements
1. New page `/auto` (or `/automatic`) for automatic logger
2. Page should have:
   - Button to start/stop automatic logging
   - Display of last sync time and status
   - Configuration for sync frequency (maybe later)
   - Option to pick starting date for initial sync
   - List of recently fetched logs with Torn log ID and Weav3r receipt ID
   - Toggle button to switch between terminal and automatic logger (use last used page as default)
3. Torn API integration:
   - Use `/user/log` endpoint with `from` parameter (timestamp)
   - Support pagination (`limit`, `to` parameters)
   - Store last fetched timestamp to avoid duplicates
   - Parse logs using existing parser (`parseLogLine`)
4. Weav3r API integration for trades:
   - When trade log detected, fetch trades from Weav3r API if not already fetched
   - Compare items between Torn log and Weav3r receipt
   - Show discrepancies to user in a modal/panel
   - Pause automatic logging until user confirms
   - Option to continue logging trades directly if no discrepancies
5. Data storage:
   - Store Torn log ID in transaction metadata
   - Store Weav3r receipt ID when available
   - Store last sync timestamp
6. UI/UX:
   - Funny name for logger (e.g., "Auto-Pilot Logger", "Log Goblin", "Sync Squirrel")
   - Match existing Tailwind CSS design
   - Integrate with ServiceRail for API key input (need new field for Torn full access key)

### Non-functional Requirements
1. Fail-proof: handle API errors, rate limits, network issues
2. Respect rate limits (Torn API: 100 calls/min, Weav3r API: 100 calls/min)
3. Persistent storage of sync state
4. Clear user feedback on sync progress and errors

## Design Questions
1. Should we reuse existing `weav3rApiKey` field or add separate `tornApiKeyFull`?
2. How to structure the toggle between terminal and automatic logger? Perhaps a dropdown in navigation?
3. How to handle pause/resume of automatic logging when discrepancies found?
4. Should we implement background sync (service worker) or manual trigger?

## Approach

### 1. API Key Management
**Decision**: Add separate `tornApiKeyFull` field rather than reusing `weav3rApiKey`
- **Reason**: Torn API v2 `/user/log` endpoint requires full access key, while Weav3r uses basic key for user ID resolution
- **Implementation**: Extend existing config storage in `useJournal` store with new field
- **UI**: Add input in ServiceRail component alongside existing Weav3r and Drive API keys
- **Validation**: Call Torn API `/user/?selections=basic` to validate key

### 2. Logger Name and Page Structure
**Logger Name**: "Auto-Pilot" (user selected)
**Page Structure**: Separate page at `/auto` with toggle button to switch to terminal
- **Implementation**: Create `/app/auto/page.tsx` dedicated to automatic logging
- **Navigation**: Add to main navigation as "Auto-Pilot"
- **Toggle**: Button on page to switch to Terminal mode, using localStorage to remember last used page
- **Starting Date**: Date picker for user to select starting date for initial sync

### 3. Sync Mechanism
**Decision**: Manual "Sync Now" button only (user selected)
- **Implementation**: User-initiated sync with visual feedback, no background sync
- **State**: Track last sync timestamp and last processed log ID to avoid duplicates
- **Pagination**: Handle large log history by paginating through Torn API results

### 4. Discrepancy Handling
**Decision**: Pause all logging until user reviews each discrepancy (user selected)
- **Flow**:
  1. Detect mismatches between Torn logs and Weav3r receipts
  2. Pause all logging (including non-trade logs), show modal with comparison
  3. User confirms/rejects each discrepancy
  4. Resume processing based on user decisions
- **Storage**: Temporary React state (not persisted to database)

### 5. Architecture Overview
1. **Data Model Extensions**: Add `tornLogId` and `weav3rReceiptId` to transaction interfaces
2. **API Service Layer**: Create `/lib/torn-api.ts` for Torn and Weav3r API integration
3. **State Management**: Extend `useJournal` store with sync state and actions
4. **UI Layer**: New Auto-Pilot page with sync controls, discrepancy modal
5. **Integration**: Connect to existing parser and transaction storage

### 6. Clustering and Pausing Logic
**Clustering Approach**:
- Process logs in time-based clusters (e.g., 1-hour windows) to manage memory and user interaction
- Each cluster contains logs fetched within a specific time range
- Insert logs cluster-by-cluster, allowing user review before moving to next cluster

**Trade Detection and Pausing**:
- Within each cluster, identify "trade complete" logs (category "Trade" with completed status)
- For each trade log, fetch matching Weav3r receipt using `trade_id` matching
- Compare Torn log items with Weav3r receipt items for discrepancies
- If discrepancies found OR if trade requires verification, pause cluster processing
- Show discrepancy modal with item comparisons and ask user to confirm/reject each discrepancy
- User can opt to continue logging trades directly if no discrepancies (skip verification for future trades)

**Resume Flow**:
1. Pause automatic logging when trade discrepancy detected
2. Present modal with Torn log vs Weav3r receipt comparison
3. User reviews discrepancies, confirms or adjusts values
4. User clicks "Continue" to resume processing current cluster
5. After cluster completed, move to next time cluster

**Implementation Details**:
- Maintain `currentCluster` state with logs to be inserted
- Track `pausedAtTradeId` when pausing for user input
- Use `pendingDiscrepancies` array in store to hold items needing review
- Resume processing from paused point after user confirmation

## Implementation Phases

### Phase 1: Extend Data Models
**Goal**: Add support for external IDs in transaction system

**Files to modify:**
- `/home/jayampatel/Codehub/projects/tornsynthapps/blackmarketledger/lib/parser.ts`
  - Add optional `tornLogId?: string` and `weav3rReceiptId?: string` to `BaseTransaction` interface
  - Update all transaction interfaces to inherit these fields
  - Create `ParsedLogWithMetadata` type extending `ParsedLog` with metadata fields

- `/home/jayampatel/Codehub/projects/tornsynthapps/blackmarketledger/lib/transactionBuilder.ts`
  - Modify `buildTransactionsWithLogs` to preserve metadata fields when creating transactions
  - Add duplicate detection using `tornLogId` to prevent re-importing same logs

### Phase 2: Store and Configuration Extensions
**Goal**: Add Torn API key management and sync state

**Files to modify:**
- `/home/jayampatel/Codehub/projects/tornsynthapps/blackmarketledger/store/useJournal.ts`
  - Add `tornApiKeyFull: string` state variable
  - Add `saveTornApiKeyFull` method for persisting full access key
  - Add `lastSyncTimestamp: number` and `lastProcessedLogId: string` for incremental fetching
  - Add `pendingDiscrepancies` state and methods for managing trade mismatches
  - Extend config persistence to include new Torn API key

- `/home/jayampatel/Codehub/projects/tornsynthapps/blackmarketledger/components/ServiceRail.tsx`
  - Add new input field for "Torn API Full Access Key"
  - Add save handler calling `saveTornApiKeyFull`
  - Update service status display to include automatic logging capability

### Phase 3: API Service Layer
**Goal**: Create services for Torn and Weav3r API integration

**New files:**
- `/home/jayampatel/Codehub/projects/tornsynthapps/blackmarketledger/lib/torn-api.ts`
  - `fetchLogs(apiKey: string, from: number, to?: number, limit?: number): Promise<TornLogEntry[]>` - Fetch logs with pagination
  - `fetchLogsByTimeClusters(apiKey: string, startTime: number, endTime: number, clusterSizeHours: number = 1): Promise<Array<{start: number, end: number, logs: TornLogEntry[]}>>` - Fetch logs in time-based clusters
  - `parseLogEntries(entries: TornLogEntry[]): ParsedLogWithMetadata[]` - Convert Torn API logs to internal format
  - `fetchWeav3rTrades(apiKey: string, userId: string, from: number, to: number): Promise<Weav3rReceipt[]>` - Fetch trades within time range
  - `fetchWeav3rReceipt(apiKey: string, userId: string, receiptId: string): Promise<Weav3rReceipt>` - Fetch single receipt
  - `matchTradeWithReceipt(parsedLog: ParsedLogWithMetadata, receipts: Weav3rReceipt[]): MatchResult` - Match Torn log with Weav3r receipt using trade_id
  - `detectDiscrepancies(parsedLog: ParsedLogWithMetadata, receipt: Weav3rReceipt): Discrepancy[]` - Compare items and detect mismatches
  - `createLogClusters(logs: TornLogEntry[], clusterSizeMs: number): Array<{start: number, end: number, logs: TornLogEntry[]}>` - Group logs into time clusters
  - `extractTradeInfoFromLog(log: TornLogEntry): TradeInfo | null` - Extract trade details from Torn log data

**Key considerations:**
- Torn API `/user/log` endpoint with `from` parameter for incremental fetching
- Weav3r API `/api/trades/{userId}` endpoint for receipt data
- Rate limiting and error handling for both APIs
- Log parsing using existing `parseLogLine` function

### Phase 4: Auto-Pilot Logger Page
**Goal**: Create user interface for automatic logging (Auto-Pilot)

**New files:**
- `/home/jayampatel/Codehub/projects/tornsynthapps/blackmarketledger/app/auto/page.tsx`
  - Toggle button showing last used page (e.g., "Terminal" or "Auto-Pilot") with arrow to switch to other mode
  - "Sync Now" button with progress indicators (manual sync only)
  - Starting date picker for initial sync
  - Discrepancy modal for reviewing trade mismatches (pauses all logging)
  - Sync history and status display with last sync timestamp
  - Torn log ID and Weav3r receipt ID display for imported logs

**Files to modify:**
- `/home/jayampatel/Codehub/projects/tornsynthapps/blackmarketledger/components/Navigation.tsx`
  - Add "Auto-Pilot" navigation item linking to `/auto` page

**UI Patterns to follow:**
- Match existing terminal page styling and layout
- Use same component library (lucide-react icons, similar panels)
- Implement haptic feedback using existing `useHapticFeedback` hook
- Follow existing toast notification patterns
- Page title: "Auto-Pilot" (as selected by user)

### Phase 5: Integration and State Management
**Goal**: Connect automatic logging to existing transaction system

**Files to modify:**
- `/home/jayampatel/Codehub/projects/tornsynthapps/blackmarketledger/store/useJournal.ts`
  - Add `syncAutomaticLogs()` method orchestrating the entire flow
  - Integrate with existing `addLogs` method for transaction creation
  - Use existing `runSyncTask` for consistent sync state management
  - Handle discrepancy resolution and user decisions

- `/home/jayampatel/Codehub/projects/tornsynthapps/blackmarketledger/app/add/page.tsx`
  - Add navigation/link to automatic logger page
  - Consider making `/add` route handle both modes via query parameter

### Phase 6: Error Handling and Polish
**Goal**: Ensure robustness and user-friendly experience

**Key considerations:**
- Handle Torn API rate limits (100 requests/minute)
- Network error recovery with exponential backoff
- Duplicate detection across sessions
- Graceful handling of parser failures
- Comprehensive logging for debugging
- User notifications for sync status and errors

## Critical Files

### Files to Modify
- `/home/jayampatel/Codehub/projects/tornsynthapps/blackmarketledger/lib/parser.ts` - Core transaction type extensions and metadata support
- `/home/jayampatel/Codehub/projects/tornsynthapps/blackmarketledger/store/useJournal.ts` - State management for API keys, sync state, and discrepancy handling
- `/home/jayampatel/Codehub/projects/tornsynthapps/blackmarketledger/components/ServiceRail.tsx` - UI for Torn API full access key input
- `/home/jayampatel/Codehub/projects/tornsynthapps/blackmarketledger/lib/transactionBuilder.ts` - Duplicate detection and metadata preservation
- `/home/jayampatel/Codehub/projects/tornsynthapps/blackmarketledger/app/add/page.tsx` - Add navigation/link to automatic logger page
- `/home/jayampatel/Codehub/projects/tornsynthapps/blackmarketledger/components/Navigation.tsx` - Add "Auto-Pilot" navigation item

### New Files to Create
- `/home/jayampatel/Codehub/projects/tornsynthapps/blackmarketledger/lib/torn-api.ts` - Torn and Weav3r API integration layer
- `/home/jayampatel/Codehub/projects/tornsynthapps/blackmarketledger/app/auto/page.tsx` - New automatic logger page with toggle functionality

## Dependencies and Sequencing

1. **Start with Phase 1** (Data models) as foundation for all other work
2. **Phase 2 and 3 can proceed in parallel** (Store extensions and API services)
3. **Phase 4 depends on Phase 3** (UI needs API services)
4. **Phase 5 integrates everything** and should come last
5. **Phase 6** (polish) can be iterative throughout development

## Verification

### Testing Strategy
1. **Torn API Integration**:
   - Test API key validation with valid/invalid keys
   - Test log fetching with mock Torn API responses
   - Test pagination and `from`/`to` parameter handling
   - Test rate limiting and error recovery

2. **Weav3r Integration**:
   - Test trade receipt fetching
   - Test discrepancy detection with sample mismatches
   - Test integration with existing Weav3r receipt URL parsing

3. **Data Integrity**:
   - Test duplicate detection using `tornLogId`
   - Test metadata preservation (`tornLogId`, `weav3rReceiptId`)
   - Test integration with existing transaction storage and inventory calculation

4. **UI/UX**:
   - Test mode toggle between terminal and automatic logger
   - Test discrepancy modal and user confirmation flow
   - Test sync progress indicators and error notifications
   - Ensure responsive design matches existing pages

5. **Edge Cases**:
   - Network failures during sync
   - API rate limit exceeded
   - Large log history requiring pagination
   - Trade logs without matching Weav3r receipts

## Decisions Summary

1. **Logger Name**: "Auto-Pilot" (selected by user)
2. **Sync Mechanism**: Manual "Sync Now" button only (selected by user)
3. **Page Structure**: Separate page at `/auto` with toggle to terminal (selected by user)
4. **Starting Date**: User selects starting date when first using automatic logger (based on requirement #8)
5. **Discrepancy Handling**: Pause all logging until user reviews each discrepancy (selected by user)

## Potential Challenges and Mitigations

1. **Torn API limitations**: Implement careful rate limiting and pagination
2. **Weav3r API availability**: Fall back to Torn-only mode with user notification
3. **Discrepancy resolution complexity**: Start with simple price/quantity comparisons
4. **Backward compatibility**: Ensure existing transactions work without external IDs
5. **State persistence**: Use IndexedDB for large sync histories
6. **Performance with large log history**: Implement efficient pagination and incremental fetching
