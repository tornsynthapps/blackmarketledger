# Plan: Auto-Pilot (Automatic Log Fetching via Torn + Weav3r APIs)

## Overview

Auto-Pilot replaces manual log entry with a deterministic, idempotent ingestion pipeline using:

* **Torn API (`/user/log`)** → source of truth for events
* **Weav3r API (`/trades`)** → source of truth for trade itemization

The system is designed to be:

* **Idempotent** (no duplicates)
* **Deterministic** (stable ordering)
* **Interrupt-safe** (resumable sync)
* **Strict on discrepancies** (pause + user review)

---

# Core Architecture

## Data Flow

```
Torn API → Normalize → Filter (cursor) → Route:
    ├── Non-trade → Parser → Transactions
    └── Trade → Weav3r → Compare → Transactions / Pause
```

---

# 1. Cursor & Pagination (CRITICAL)

## Problem

Torn logs are not safely iterable using timestamp alone.

## Solution: Compound Cursor

```ts
type SyncCursor = {
  lastTimestamp: number
  lastLogId: number
}
```

## Filtering Rule

```ts
if (
  log.timestamp > cursor.lastTimestamp ||
  (log.timestamp === cursor.lastTimestamp && log.id > cursor.lastLogId)
)
```

## Ordering (MANDATORY)

```ts
logs.sort((a, b) => {
  if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp
  return a.id - b.id
})
```

## Sync Loop

```ts
while (true) {
  const logs = await fetchLogs({ from: cursor.lastTimestamp, limit: 100 })

  const filtered = applyCursorFilter(logs, cursor)

  if (!filtered.length) break

  processLogsSequentially(filtered)

  cursor = extractCursorFromLast(filtered)

  persistCursor(cursor)

  if (logs.length < 100) break
}
```

---

# 2. Normalization Layer

## Input (Torn API)

```json
{
  "id": 123,
  "timestamp": 123456,
  "details": {
    "id": 1001,
    "title": "Bazaar sell",
    "category": "Bazaars"
  },
  "data": { ... }
}
```

## Normalized Form

```ts
type NormalizedLog = {
  id: number
  timestamp: number
  category: string
  typeId: number
  title: string
  data: Record<string, any>
}
```

## Rule

```ts
const normalized = {
  id: entry.id,
  timestamp: entry.timestamp,
  category: entry.details?.category,
  typeId: entry.details?.id,
  title: entry.details?.title,
  data: entry.data || {}
}
```

---

# 3. Item Resolution (REQUIRED)

Torn logs provide **item IDs, not names**.

## Resolver

```ts
function resolveItemName(itemId: number): string {
  return ITEM_MAP[itemId] || `item_${itemId}`
}
```

## Extraction

```ts
const items = data.items || []

items.map(i => ({
  item: resolveItemName(i.id),
  amount: i.qty
}))
```

---

# 4. Parsing Strategy

## Non-Trade Logs

Handled via parser:

* Bazaar buy/sell
* Item market
* Points
* Mugging
* Conversions

### Rule

Parser consumes **normalized logs**, not raw API.

---

## Trade Logs (SPECIAL PIPELINE)

### Detection

```ts
if (normalized.typeId === 4430) // Trade completed
```

---

# 5. Trade Pipeline

## Step 1: Fetch Receipt

```ts
GET /trades/{userId}?from=t-5min&to=t+5min
```

---

## Step 2: Match Receipt

### Primary

```ts
receipt.id === tornLog.id
```

### Fallback

* timestamp proximity (±5s)
* total value similarity

---

## Step 3: Compare

```ts
compare:
- item ids
- quantities
- total value
```

---

## Step 4: Decision

| Case           | Action           |
| -------------- | ---------------- |
| Perfect match  | Auto-import      |
| Minor mismatch | Flag discrepancy |
| No receipt     | Pause            |

---

## Step 5: Pause Flow

```ts
setPaused(true)
setPendingDiscrepancy({
  tornLog,
  receipt,
  differences
})
```

---

# 6. Discrepancy Handling

## Behavior (User-defined)

* System **pauses ALL ingestion**
* User must review discrepancy
* After resolution → resume

## UI Requirements

* Side-by-side comparison
* Confirm / Override / Skip

---

# 7. Transaction Model Updates

## Add Fields

```ts
tornLogId: number
weav3rReceiptId?: string
tradeGroupId?: string
```

## Multi-item Handling

### Strategy (current)

Split into multiple transactions:

```ts
items.map(item => ({
  item,
  amount,
  price,
  tradeGroupId
}))
```

---

# 8. Idempotency (MANDATORY)

Before inserting:

```ts
if (exists(tornLogId)) return
```

Must be enforced at:

* store layer (not UI)

---

# 9. API Layer Contract

## `/lib/torn-api.ts`

```ts
getNewLogs(cursor: SyncCursor): Promise<{
  logs: NormalizedLog[]
  nextCursor: SyncCursor
}>
```

### Responsibilities

* fetch
* normalize
* sort
* filter (cursor-safe)

---

# 10. Sync Flow (Auto-Pilot)

## Manual Trigger Only

User clicks:

```
[ Sync Now ]
```

---

## Execution

```ts
if (paused) return

runSyncTask(async () => {
  const { logs, nextCursor } = await getNewLogs(cursor)

  for (log of logs) {
    if (isTrade(log)) {
      await handleTrade(log)
    } else {
      parseAndInsert(log)
    }

    updateCursor(log)
  }
})
```

---

# 11. Initial Sync (Backfill)

## User selects start date

### Strategy

```ts
cursor = { timestamp: startDate, id: 0 }

loop:
  fetch batch
  process
  persist cursor
```

### Requirement

* persist after EVERY batch
* allow resume after crash

---

# 12. Rate Limiting

## Limits

* Torn: 100/min
* Weav3r: 100/min

## Implementation

```ts
maxRequestsPerMinute = 80
```

Use queue / delay if needed.

---

# 13. UI: Auto-Pilot Page

## Route

```
/auto
```

## Components

* Sync Now button
* Last sync timestamp
* Starting date picker
* Pause state indicator
* Discrepancy modal
* Recent logs list (with Torn + Weav3r IDs)
* Toggle → Terminal

---

# 14. Error Handling

## Cases

* API failure → retry (exponential backoff)
* Rate limit → delay + retry
* Parser failure → skip + log
* Missing receipt → pause

---

# 15. Final Design Decisions

| Area           | Decision           |
| -------------- | ------------------ |
| Logger name    | Auto-Pilot         |
| Sync mode      | Manual             |
| Page           | `/auto`            |
| Trade handling | Weav3r-driven      |
| Discrepancy    | Blocking           |
| Cursor         | timestamp + id     |
| Multi-item     | split transactions |

---

# Final Notes

This design ensures:

* No duplicate logs
* No missed logs
* Deterministic ingestion
* Correct trade reconstruction
* Safe recovery from interruptions

The system is now **production-safe**, not just functional.

