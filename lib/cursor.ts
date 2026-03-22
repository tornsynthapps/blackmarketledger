import { SyncCursor } from './torn-api';

/**
 * Dual cursor system for Auto-Pilot sync:
 * - tradeCursor: Tracks the last fetched trade timestamp
 * - itemCursor: Tracks the last fetched item transaction (logs) timestamp
 */
export interface DualCursor {
  tradeCursor: SyncCursor;
  itemCursor: SyncCursor;
}

/**
 * Creates a new DualCursor with both cursors initialized to the same timestamp
 */
export function createDualCursor(timestamp: number): DualCursor {
  const cursor: SyncCursor = { lastTimestamp: timestamp, lastLogId: '' };
  return {
    tradeCursor: { ...cursor },
    itemCursor: { ...cursor },
  };
}

/**
 * Checks if the dual cursor is initialized (both cursors have valid timestamps)
 */
export function isDualCursorInitialized(cursor: DualCursor | null | undefined): boolean {
  if (!cursor) return false;
  return cursor.tradeCursor.lastTimestamp > 0 && cursor.itemCursor.lastTimestamp > 0;
}

/**
 * Checks if items need to be fetched (item cursor is behind trade cursor)
 */
export function needsItemSync(cursor: DualCursor | null | undefined): boolean {
  if (!cursor) return false;
  return cursor.tradeCursor.lastTimestamp > cursor.itemCursor.lastTimestamp;
}

/**
 * Checks if we have a cursor state mismatch (item cursor ahead of trade cursor - should not happen)
 */
export function hasCursorMismatch(cursor: DualCursor | null | undefined): boolean {
  if (!cursor) return false;
  return cursor.itemCursor.lastTimestamp > cursor.tradeCursor.lastTimestamp;
}
