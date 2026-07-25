# domain

Directory path: `lib/domain`

## Purpose

Contains domain services, business logic handlers, and log parsers for the application.

## Subdirectories

- `test-data/`: Subdirectory containing related module files.

## Files & Contents

- **`BaseService.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Class: `BaseService`
- **`ErrorDetectionService.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Class: `ErrorDetectionService`
- **`ItemLogService.test.ts`**: Unit/integration tests for ItemLogService.
- **`ItemLogService.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Class: `ItemLogService`
- **`LogHandlers.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Function: `handleItemMarketLog()`, Function: `handleBazaarOrMarketLog()`, Function: `handleBazaarLog()`, Function: `handlePointLog()`, Function: `handleMuseumLog()`, Function: `handleMugLog()`, Function: `handleCityFindLog()`, Function: `handleShopBuyLog()`, Function: `handleItemShopSell()`, Function: `handleCrimeLog()`, Function: `handleCrimeSuccessItemGain()`, Function: `handleDumpLog()`, Function: `handleChristmasTownItems()`, Function: `handleItemUse()`, Function: `initializeDefaultHandlers()`
- **`LogParserRegistry.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Class: `LogHandlerRegistry`, Function: `pickString()`, Function: `pickNumber()`, Interface: `HandlerDependencies`, Interface: `LogHandlerMetadata`, Type: `TornItemNameMap`, Type: `LogHandlerFn`
- **`Logger.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Class: `Logger`
- **`MuseumService.test.ts`**: Unit/integration tests for MuseumService.
- **`MuseumService.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Class: `MuseumService`
- **`ReceiptService.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Class: `ReceiptService`
- **`SyncService.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Class: `SyncService`, Interface: `SyncStepStatus`, Interface: `SyncState`, Type: `SyncStepId`
- **`TornLogService.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Class: `TornLogService`
- **`TradeService.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Class: `TradeService`

