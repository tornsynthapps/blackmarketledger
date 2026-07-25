# lib

Directory path: `lib`

## Purpose

Core library utilities, helper functions, and external API integrations.

## Subdirectories

- `domain/`: Subdirectory containing related module files.
- `objects/`: Subdirectory containing related module files.
- `old/`: Subdirectory containing related module files.

## Files & Contents

- **`api.ts`**: Paced Token Bucket rate limiter implementation.
  - **Exports**: Class: `NewRateLimiter`
- **`blackbox.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Class: `Blackbox`
- **`ledger-api.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Function: `login()`, Function: `signupInitiate()`, Function: `signupVerify()`, Function: `resetTokenInitiate()`, Function: `resetTokenVerify()`, Interface: `AuthResponse`, Interface: `InitiateSignupResponse`, Interface: `ResetTokenInitiateResponse`, Interface: `ResetTokenVerifyResponse`
- **`museum-sync.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Function: `runMuseumPricelistSyncCheck()`
- **`storage.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Class: `Storage`
- **`tornAPI.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Class: `TornAPIClient`, Interface: `TornInventoryItem`, Interface: `TornInventoryResponse`
- **`tornexchange.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Class: `TornExchange`, Interface: `TornExchangeReceiptSummary`, Interface: `TornExchangeReceiptItem`, Interface: `TornExchangeReceiptMeta`, Interface: `TornExchangeReceipt`, Interface: `TornExchangePricelistItem`, Interface: `TornExchangePricelistMeta`, Interface: `TornExchangePricelist`, Interface: `TornExchangeMarketPrice`

