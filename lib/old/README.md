# old

Directory path: `lib/old`

## Purpose

Core library utilities, helper functions, and external API integrations.

## Subdirectories

- `game/`: Subdirectory containing related module files.
- `interfaces/`: Subdirectory containing related module files.

## Files & Contents

- **`api-keys.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Function: `refreshApiKeysFromStorage()`, Function: `subscribeToApiKeys()`, Function: `getApiKey()`, Function: `getUserId()`, Function: `getDriveApiKey()`, Function: `getTornApiKeyFull()`, Function: `getTornApiRateLimit()`, Function: `getWeav3rApiRateLimit()`, Function: `getTEApiKey()`, Function: `getTERateLimit()`, Function: `getConnectionToken()`, Function: `setApiKey()`, Function: `setUserId()`, Function: `setDriveApiKey()`, Function: `setTornApiKeyFull()`, Function: `setTornApiRateLimit()`, Function: `setWeav3rApiRateLimit()`, Function: `setTEApiKey()`, Function: `setTERateLimit()`, Function: `setConnectionToken()`, Function: `invalidateApiKeysCache()`, Function: `getAllApiKeys()`
- **`auth.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Function: `fetchTornUserId()`, Function: `saveWeaverConfig()`
- **`bmlconnect.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Function: `sendToExtension()`, Function: `getConnectionString()`, Function: `regenerateToken()`, Function: `saveConnectionToken()`, Function: `generateConnectionString()`, Interface: `BMLExtensionRequest`, Interface: `BMLExtensionResponse`, Interface: `CostBasisPayload`, Type: `BMLExtensionMessageType`
- **`chartUtils.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Function: `getInventoryEntry()`, Function: `applyTransaction()`, Function: `getTotals()`, Type: `InventorySnapshot`, Type: `LedgerTotals`
- **`cursor.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Function: `createDualCursor()`, Function: `isDualCursorInitialized()`, Function: `needsItemSync()`, Function: `hasCursorMismatch()`, Interface: `DualCursor`
- **`debug.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Function: `mydebug()`
- **`drive-api.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Function: `initiateGoogleDriveSetup()`, Function: `completeGoogleDriveSetup()`, Function: `getGoogleDriveStatus()`, Function: `loadGoogleDriveData()`, Function: `writeGoogleDriveData()`, Function: `deleteGoogleDriveData()`, Function: `disconnectGoogleDrive()`, Type: `GoogleDriveSetupResponse`, Type: `GoogleDriveStatusResponse`
- **`idb.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Function: `get()`, Function: `set()`, Function: `del()`, Function: `getAllTransactions()`, Function: `getTransactionPage()`, Function: `saveTransactions()`, Function: `dbExists()`, Function: `deleteDatabase()`, Function: `getLegacyTransactions()`, Type: `DBName`
- **`market-prices.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Function: `getSetItems()`, Function: `calculateSetTotalMarketValue()`, Function: `calculateItemProportions()`, Function: `getItemNameById()`
- **`parser.test.ts`**: Unit/integration tests for parser.
- **`parser.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Function: `getMuseumExchangeDefinition()`, Function: `resolveMuseumExchangeType()`, Function: `normalizeItemName()`, Function: `formatItemName()`, Function: `parseLogLine()`, Function: `parseLogs()`, Function: `formatToStandardLog()`, Interface: `BaseTransaction`, Interface: `TradeTransaction`, Interface: `MugTransaction`, Interface: `ConvertTransaction`, Interface: `SetConvertTransaction`, Interface: `SetItemInfo`, Interface: `MuseumExchangeRequirement`, Interface: `MuseumExchangeDefinition`, Type: `TransactionType`, Type: `MuseumExchangeType`, Type: `TransactionTag`, Type: `TransactionSourceType`, Type: `Transaction`, Type: `ParsedTradeLog`, Type: `ParsedMugLog`, Type: `ParsedConvertLog`, Type: `ParsedSetConvertLog`, Type: `ParsedLog`, Type: `SetType`
- **`rate-limiter.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Function: `createRateLimiter()`, Function: `updateRateLimiter()`, Interface: `RateLimiter`
- **`subscription-api.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Function: `verifySubscription()`, Function: `claimTrial()`, Interface: `SubscriptionStatus`
- **`syncStatus.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Function: `setGlobalSyncStatus()`, Function: `getGlobalSyncStatus()`, Function: `subscribeToGlobalSyncStatus()`, Function: `useGlobalSyncStatus()`, Interface: `GlobalSyncStatus`
- **`theme.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Object/Const: `CATEGORY_COLORS`
- **`token-api.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Function: `signIn()`, Function: `initiateDepositSignup()`, Function: `initiateMessageSignup()`, Function: `verifySignup()`, Interface: `AuthResponse`, Interface: `InitiateDepositResponse`, Interface: `InitiateMessageResponse`
- **`token-auth.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Function: `saveAuth()`, Function: `getToken()`, Function: `getUserId()`, Function: `getUsername()`, Function: `getValidUntil()`, Function: `getStoredAuth()`, Function: `clearAuth()`, Function: `isAuthenticated()`, Function: `isSubscriptionValid()`, Function: `getLedgerApiUrl()`, Interface: `StoredAuth`
- **`torn-api.test.ts`**: Unit/integration tests for torn-api.
- **`torn-api.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Class: `LogHandlerRegistry`, Function: `refreshApiRateLimiters()`, Function: `compareLogIds()`, Function: `getTornLogs()`, Function: `buildUrl()`, Function: `normalizeTornLog()`, Function: `parseNormalizedLog()`, Function: `getNewLogs()`, Function: `getTornItems()`, Function: `getCompletedTrades()`, Function: `getTradeDetail()`, Function: `getWeav3rTrades()`, Function: `getWeav3rReceipt()`, Function: `summarizeTrade()`, Function: `compareTradeAgainstReceipt()`, Function: `findMatchingReceipt()`, Function: `createParsedLogsFromReceipt()`, Function: `createParsedLogsFromNewReceipt()`, Function: `buildImportRecord()`, Interface: `SyncCursor`, Interface: `TornLogEntry`, Interface: `NormalizedLog`, Interface: `TornTradeParticipant`, Interface: `TornTradeListItem`, Interface: `TornTradeDetailItem`, Interface: `TornTradeDetail`, Interface: `Weav3rTradeListItem`, Interface: `Weav3rReceiptItem`, Interface: `Weav3rReceipt`, Interface: `AutoPilotImportRecord`, Interface: `TradeDifference`, Interface: `PendingAutoPilotTrade`, Interface: `AutoPilotTradeLink`, Interface: `TornLogsParams`, Interface: `TornLogsResponse`, Type: `LogHandlerFn`, Type: `TornItemNameMap`
- **`torn-words.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Function: `getTornWords()`, Function: `addTornWord()`, Function: `removeTornWord()`, Function: `generateSecretToken()`, Function: `generateVerificationToken()`, Function: `hashToken()`
- **`torn-wrapper.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Class: `TronWrapper`
- **`transactionBuilder.test.ts`**: Unit/integration tests for transactionBuilder.
- **`transactionBuilder.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Function: `calculateInventory()`, Function: `buildTransactionsWithLogs()`, Function: `getLogBreakdown()`, Interface: `LogBreakdown`
- **`useAuth.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Function: `useAuth()`
- **`useHapticFeedback.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Function: `useHapticFeedback()`
- **`useProductionMode.ts`**: Returns whether the app is running in production mode.
  - **Exports**: Function: `useProductionMode()`
- **`useSettings.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Function: `useSettings()`, Interface: `LedgerSettings`

