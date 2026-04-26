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
- `tornAPI.ts` - Internal Torn API client utilities
    - `TornAPIClient.fetchInventory()` - Fetch user's safe inventory directly from Torn API
    - `TornAPIClient.getMarketPrices()` - Fetch current global market prices for all Torn items
    - `TornAPIClient.getItemNames()` - Fetch canonical names for all Torn items
    - `TORN_INVENTORY_CATEGORIES` - Complete list of valid Torn inventory categories

## Subdirectories

- `old/` - Legacy code
