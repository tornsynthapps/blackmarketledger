# objects

Directory path: `lib/objects`

## Purpose

Contains domain model definitions, entities, and data structures.

## Files & Contents

- **`BaseObject.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Class: `BaseObject`, Class: `BaseObjectRegistry`, Function: `requireBaseObjectDatabaseFields()`, Function: `getDatabase()`, Interface: `BaseObjectDatabaseFields`, Interface: `BaseObjectDatabaseRecord`, Type: `BaseObjectWriteRecord`, Type: `BaseObjectSerializer`, Type: `BaseObjectHydrator`
- **`Item.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Class: `ItemList`
- **`ItemLog.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Class: `ItemLog`, Class: `ItemLogRegistry`, Function: `normalizeItemUid()`, Function: `getItemIdentityKey()`, Function: `createItemIdentity()`, Interface: `ItemLogCreateFields`, Interface: `ItemIdentity`, Interface: `ItemLogDatabaseRecord`, Type: `ItemLogCategories`
- **`ItemLogWrapper.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Class: `ItemLogWrapper`, Class: `ItemLogWrapperRegistry`, Interface: `ItemLogWrapperCreateFields`, Interface: `ItemLogWrapperDatabaseRecord`, Type: `ItemLogWrapperType`, Type: `ItemLogWrapperAutoSplitSubType`, Type: `ItemLogWrapperMuseumSubType`, Type: `ItemLogWrapperSubType`
- **`ParsedLog.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Interface: `BaseParsedLog`, Interface: `ParsedTradeLog`, Interface: `ParsedMugLog`, Interface: `ParsedConvertLog`, Interface: `ParsedSetConvertLog`, Interface: `MuseumExchangeRequirement`, Interface: `MuseumExchangeDefinition`, Type: `TransactionType`, Type: `MuseumExchangeType`, Type: `TransactionTag`, Type: `TransactionSourceType`, Type: `ParsedLog`
- **`Receipt.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Class: `Receipt`, Class: `ReceiptRegistry`, Interface: `ReceiptCreateFields`, Interface: `ReceiptDatabaseRecord`, Type: `ReceiptSource`, Type: `ReceiptSyncStatus`
- **`ReceiptItem.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Class: `ReceiptItem`, Class: `ReceiptItemRegistry`, Interface: `ReceiptItemCreateFields`, Interface: `ReceiptItemDatabaseRecord`
- **`SystemConfig.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Class: `SystemConfigRegistry`, Interface: `SystemConfigRecord`
- **`SystemLog.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Class: `SystemLog`, Class: `SystemLogRegistry`, Interface: `SystemLogCreateFields`, Interface: `SystemLogDatabaseRecord`, Type: `SystemLogLevel`
- **`TornLog.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Function: `normalizeTornLog()`, Interface: `SyncCursor`, Interface: `TornLogEntry`, Interface: `NormalizedLog`
- **`Trade.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Class: `Trade`, Class: `TradeRegistry`, Interface: `TradeCreateFields`, Interface: `TradeDatabaseRecord`, Type: `TradeType`, Type: `TradeSyncStatus`
- **`TradeItem.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Class: `TradeItem`, Class: `TradeItemRegistry`, Interface: `TradeItemCreateFields`, Interface: `TradeItemDatabaseRecord`

