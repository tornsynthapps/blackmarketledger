-- Migration: Update pricelist table schema
-- - Rename forum_link to forum_thread_id (INTEGER)
-- - Remove dislikes column
-- - Add likes column if not exists
-- Run this migration to update existing pricelist tables

-- SQLite D1 doesn't support DROP COLUMN or RENAME COLUMN directly
-- Recreate the table with new schema

CREATE TABLE IF NOT EXISTS pricelist_new (
  user_id INTEGER PRIMARY KEY,
  forum_thread_id INTEGER NOT NULL,
  likes INTEGER DEFAULT 0
);

-- Copy data from old table, converting forum_link to integer if needed
INSERT INTO pricelist_new (user_id, forum_thread_id, likes)
SELECT 
  user_id,
  CAST(forum_link AS INTEGER) as forum_thread_id,
  COALESCE(likes, 0) as likes
FROM pricelist;

DROP TABLE pricelist;
ALTER TABLE pricelist_new RENAME TO pricelist;