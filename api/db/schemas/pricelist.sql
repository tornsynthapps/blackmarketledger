-- Pricelist table for storing user price list configurations
-- Links a user to their forum thread for price list

CREATE TABLE IF NOT EXISTS pricelist (
  user_id INTEGER PRIMARY KEY,
  forum_thread_id INTEGER NOT NULL,
  likes INTEGER DEFAULT 0
);