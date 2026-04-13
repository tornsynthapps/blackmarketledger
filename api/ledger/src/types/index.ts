export type Env = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  TORN_API_KEY: string;
  DEBUG: string;
};

export type TornBasicResponse = {
  profile?: {
    id?: number;
    name?: string;
    username?: string;
  };
};

export type AuthResponse = {
  authenticated: boolean;
  userId?: number;
  username?: string;
  secretToken?: string;
  subscriptionValid?: boolean;
  validUntil?: string | null;
  error?: string;
};

export type SignupMode = 'initiate-message' | 'initiate-money' | 'verify';

export type SignupRequest = {
  userId?: string;
  verificationToken?: string;
  mode: SignupMode;
};
