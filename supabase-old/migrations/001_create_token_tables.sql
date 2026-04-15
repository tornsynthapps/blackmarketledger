-- user_tokens table
-- Stores authenticated user tokens with failed attempt tracking

CREATE TABLE IF NOT EXISTS user_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    torn_user_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    secret_token_hash VARCHAR(64) NOT NULL,
    failed_attempts INTEGER DEFAULT 0,
    is_blocked BOOLEAN DEFAULT FALSE,
    valid_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_tokens_torn_user_id ON user_tokens(torn_user_id);
CREATE INDEX idx_user-- user_tokens table
-- Stores authenticated user tokens with failed attempt tracking

CREATE TABLE IF NOT EXISTS user_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    torn_user_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    secret_token_hash VARCHAR(64) NOT NULL,
    failed_attempts INTEGER DEFAULT 0,
    is_blocked BOOLEAN DEFAULT FALSE,
    valid_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_tokens_torn_user_id ON user_tokens(torn_user_id);
CREATE INDEX idx_user_tokens_secret_token_hash ON user_tokens(secret_token_hash);

-- token_verification_temp table
-- Temporary storage for signup verification tokens

CREATE TABLE IF NOT EXISTS token_verification_temp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    torn_user_id BIGINT NOT NULL,
    verification_token VARCHAR(64) UNIQUE NOT NULL,
    verification_type VARCHAR(20) NOT NULL CHECK (verification_type IN ('deposit', 'message')),
    amount_required INTEGER,
    message_required VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_token_verification_temp_token ON token_verification_temp(verification_token);
CREATE INDEX idx_token_verification_temp_expires ON token_verification_temp(expires_at);_tokens_secret_token_hash ON user_tokens(secret_token_hash);

-- token_verification_temp table
-- Temporary storage for signup verification tokens

CREATE TABLE IF NOT EXISTS token_verification_temp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    torn_user_id BIGINT NOT NULL,
    verification_token VARCHAR(64) UNIQUE NOT NULL,
    verification_type VARCHAR(20) NOT NULL CHECK (verification_type IN ('deposit', 'message')),
    amount_required INTEGER,
    message_required VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_token_verification_temp_token ON token_verification_temp(verification_token);
CREATE INDEX idx_token_verification_temp_expires ON token_verification_temp(expires_at);