/**
 * Environment bindings for Cloudflare Workers.
 */
export type Env = {
  /** Supabase project URL */
  SUPABASE_URL: string;
  /** Supabase service role key (secret) */
  SUPABASE_SERVICE_ROLE_KEY: string;
  /** Torn API key for verification (secret) */
  TORN_API_KEY: string;
  /** Flag to enable debug logging ('true'/'false') */
  DEBUG: string;
};

/**
 * Basic response structure from Torn API v2 user selection.
 */
export type TornBasicResponse = {
  profile?: {
    id?: number;
    name?: string;
    username?: string;
  };
};

/**
 * Generic authentication response payload.
 */
export type AuthResponse = {
  /** Whether the user is successfully authenticated */
  authenticated: boolean;
  /** The unique Torn user ID */
  userId?: number;
  /** The Torn username */
  username?: string;
  /** The generated secret token (only returned on login/reset) */
  secretToken?: string;
  /** Whether the user has an active extension subscription */
  subscriptionValid?: boolean;
  /** ISO timestamp of subscription expiry */
  validUntil?: string | null;
  /** Error message if authentication failed */
  error?: string;
};

export type SignupMode = 'initiate-message' | 'initiate-money' | 'verify';

export type SignupRequest = {
  userId?: string;
  verificationToken?: string;
  mode: SignupMode;
};
