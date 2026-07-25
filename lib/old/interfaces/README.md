# interfaces

Directory path: `lib/old/interfaces`

## Purpose

Core library utilities, helper functions, and external API integrations.

## Files & Contents

- **`db.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Class: `DBInterface`, Interface: `StandardLog`, Type: `TransactionType`, Type: `TransactionData`
- **`localstorage.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Class: `KeyNotFoundError`, Class: `LocalStorageInterface`, Type: `StorageType`
- **`metadata.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Class: `MetadataInterface`
- **`transactions.test.ts`**: Unit/integration tests for transactions.
- **`transactions.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Class: `BaseTransaction`, Class: `Transaction`, Class: `WrapperTransaction`, Class: `MugTransaction`, Class: `TransactionBuilder`, Function: `getTrackedItemName()`, Function: `isMugTransaction()`, Function: `migrateLegacyTransactions()`, Function: `buildTransactionsFromParsedLogs()`, Function: `calculateInventoryFromTransactions()`, Interface: `LegacyMigrationIssue`, Interface: `LegacyMigrationResult`, Interface: `InventoryItemStats`, Interface: `TransactionInput`, Interface: `SetConvertInput`, Interface: `TradeTransactionInput`, Interface: `MugTransactionInput`, Interface: `TransactionBuildResult`, Type: `TransactionStockType`, Type: `TransactionSource`, Type: `WrapperTransactionType`, Type: `AnyTrackedTransaction`, Type: `ItemIDResolver`

