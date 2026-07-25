# Plan: Add Optional uid to New Domain Item Identity

  ## Summary

  Add uid as part of the item identity in the new domain ledger so stock, cost-basis, realized profit, splits, and dashboard
  aggregation no longer key only on item_id. The canonical identity becomes (item_id, uid) where uid is nullable, and uid=null is its
  own separate bucket from any explicit uid.

  ## Key Changes

  - Introduce a small shared identity model in the new domain layer, e.g. ItemIdentity = { itemId: number; uid: string | null }, plus
    helper functions for:
      - normalizing raw uid values to string | null
      - generating a stable key for maps/indexes
      - comparing identities
  - Extend ItemLog persistence to store optional uid.
      - Add uid?: string | null to ItemLogCreateFields, ItemLogDatabaseRecord, the ItemLog class, and toDatabaseRecord/fromDatabase.
      - Bump the ItemLog schema version and add compound indexes that include uid, especially for “latest totals before timestamp”
        lookups.
      - Keep old records valid by defaulting missing uid to null during hydration/migration.
  - Refactor ItemLogRegistry APIs that currently operate on item_id only so they operate on identity.
      - Replace item-only lookups like getLogsByItemId(itemId) and getLatestTotalsPerCategoryBefore(itemId, timestamp) with identity-
        aware variants.
      - Search/filter by item name stays item-name based; uid is an additional discriminator, not a replacement for item metadata.
  - Refactor ItemLogService.updateCostBasis() and all running-total maps to key by identity instead of bare item_id.
      - affectedItemIds becomes affected identities.
      - runningTotalsByItem becomes runningTotalsByIdentity.
      - Wrapper bookkeeping for trade receipts and auto-splits must include uid in their in-memory dedupe keys.
  - Preserve identity through all derived log generation.
      - Auto-split overflow logs inherit the source log’s uid.
      - Manual transfer wrapper logs inherit the source item uid; destination logs must match that same identity.
      - Trade-receipt re-evaluation must group logs by (wrapper_id, item_id, uid).
      - Museum exchange removal logs preserve each source item’s uid; generated points logs remain uid=null.
  - Update Torn log ingestion so handlers copy uid from raw Torn payloads wherever the source provides it.
      - Add one helper in LogHandlers to extract { itemId, uid } from both single-item and multi-item payload shapes.
      - If a handler source does not expose uid, store uid=null.
  - Update read models and UI aggregation in the new pages.
      - app/page.tsx inventory grouping changes from item_id to identity, so same item name can render multiple rows when uid differs.
      - app/logs/page.tsx, ActivityLogTable, and treasure-chest editor/export views should display uid and preserve it in edits/
        exports.
      - Display convention: show the normal item name plus a compact UID suffix/column; uid=null shows as blank or standard.
  - Add a one-time ledger recalculation/migration path.
      - Existing logs hydrate with uid=null.
      - After schema upgrade, cost-basis can be recomputed from the earliest affected timestamp, but old data should behave exactly as
        before because all historical records land in the uid=null bucket.

  ## Public API / Type Changes

  - ItemLog gains uid: string | null.


  - Add ItemLog object/registry tests for:
      - hydrating legacy rows with missing uid as null
      - storing and querying same item_id under two different uid values
      - latest-totals lookup returning the correct category totals per identity
      - uid=null remaining separate from explicit uid
      - auto-split preserving uid
      - trade-receipt wrapper re-evaluation not merging identities
      - museum exchange consuming only the matching identity buckets on generated removal logs
  - Add ingestion tests for handlers that can carry raw Torn uid so created ItemLogs persist it correctly.
  - Add UI/read-model tests for:
      - dashboard showing two rows for same item name when uid differs
      - logs table/edit flow preserving uid

  ## Assumptions

  - Scope is the new domain engine only; legacy useJournal remains unchanged.
  - Identity rule is strict: (item_id, null) is different from (item_id, "abc"), and different explicit uid values are different
    items.
  - If an input source does not provide uid, the log stays in the uid=null bucket; it must not merge into a specific uid bucket.
  - Points and other synthetic outputs that are not uniquely instantiated use uid=null.