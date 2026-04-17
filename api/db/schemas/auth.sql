-- Auth table for user authentication and account protection
-- Stores auth secrets and account status (blocked/banned)

CREATE TABLE IF NOT EXISTS auth (
  user_id INTEGER PRIMARY KEY,
  auth_secret TEXT NOT NULL,
  is_blocked INTEGER DEFAULT 0,
  is_banned INTEGER DEFAULT 0,
  failed_attempts INTEGER DEFAULT 0
);

-- Index for faster auth_secret lookups
CREATE INDEX IF NOT EXISTS idx_auth_secret ON auth(auth_secret);