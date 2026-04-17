-- Subscriptions table for user subscription tracking
-- Records subscription start dates, token allocations, and full subscription status

CREATE TABLE IF NOT EXISTS subscriptions (
  user_id INTEGER PRIMARY KEY,
  created_at INTEGER NOT NULL,
  tokens_available INTEGER DEFAULT 0,
  full_sub INTEGER
);