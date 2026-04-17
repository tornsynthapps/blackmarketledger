# Lib

Core library utilities and API integrations.

## Files

- `api.ts` - API utilities including `NewRateLimiter` class
    - `NewRateLimiter` - Token bucket rate limiter (1-80 requests/minute)
- `storage.ts` - LocalStorage utilities for key-value persistence
    - `Storage.getDictFromLocalStorage()` - Retrieves and parses dictionary from localStorage
    - `Storage.appendInLocalStorage()` - Adds/updates key-value pair in localStorage dictionary
- `blackbox.ts` - Logging and data persistence for blackbox entries
    - `Blackbox.getUniqueId()` - Generates unique identifier for instance
    - `Blackbox.addLog()` - Adds log entry with timestamp to logs
    - `Blackbox.save()` - Persists current logs to localStorage
- `tornexchange.ts` - [TornExchange](https://tornexchange.com) API client
    - Handles rate limiting (configurable 1-8 req/min)
    - Receipt management (`getReceipt`, `getReceipts`)
    - Pricelist management (`getPricelist`, `getMyPricelist`, `delistItems`, `updateItemPricesByPercentage`, `updateItemPricesByFixed`)
    - Global market data (`getAllPrices`)

## Subdirectories

- `old/` - Legacy code
