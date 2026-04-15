import { Context } from 'hono';
import { Env } from '../types';
import { selectMaybeSingle, updateRows } from '../services/supabase';
import { hashToken } from '../utils/crypto';
import { Logger } from '../utils/logger';

/**
 * Handle user login requests with protection against brute-force attacks.
 * 
 * @param c (Context): Hono context containing request data and environment bindings.
 * @returns (Promise<Response>): JSON response with authentication results or error.
 * @side_effects: Reads and updates 'user_tokens' and 'extension_subscriptions' tables.
 */
export const loginHandler = async (c: Context<{ Bindings: Env }>) => {
  const logger = new Logger(c.env.DEBUG === 'true');

  try {
    const { userId, secretToken } = await c.req.json();

    if (!userId || !secretToken) {
      return c.json({ error: 'Missing userId or secretToken' }, 400);
    }

    const numericUserId = parseInt(userId, 10);
    if (isNaN(numericUserId)) {
      return c.json({ error: 'Invalid userId' }, 400);
    }

    const tokenHash = hashToken(secretToken);
    logger.debug('Attempting login', { userId: numericUserId });
    logger.debug('Token hash', {
      secretToken,
      tokenHash,
    });

    const { data: existingUser, error: fetchError } = await selectMaybeSingle<{
      username: string;
      is_blocked: boolean;
      secret_token_hash: string;
      failed_attempts: number | null;
    }>(
      c.env,
      'user_tokens',
      'username, is_blocked, secret_token_hash, failed_attempts',
      { torn_user_id: numericUserId }
    );
    logger.debug('Existing user', existingUser);

    if (fetchError) {
      logger.error('Database lookup failed', fetchError);
      return c.json({ error: 'Database lookup failed' }, 500);
    }

    if (!existingUser) {
      return c.json({ error: 'No account found. Please sign up first.' }, 401);
    }

    if (existingUser.is_blocked) {
      return c.json({ error: 'Account is blocked. Contact support.' }, 403);
    }

    if (existingUser.secret_token_hash !== tokenHash) {
      // Record failed attempt and potentially block account
      const newFailedAttempts = (existingUser.failed_attempts || 0) + 1;
      const shouldBlock = newFailedAttempts >= 5;

      await updateRows(
        c.env,
        'user_tokens',
        {
          failed_attempts: newFailedAttempts,
          is_blocked: shouldBlock,
          updated_at: new Date().toISOString(),
        },
        { torn_user_id: numericUserId }
      );

      if (shouldBlock) {
        return c.json({ error: 'Account blocked due to too many failed attempts.' }, 403);
      }

      const remainingAttempts = 5 - newFailedAttempts;
      return c.json({ error: `Invalid token. ${remainingAttempts} attempt(s) remaining.` }, 401);
    }

    // Success: Reset failed attempts
    await updateRows(
      c.env,
      'user_tokens',
      {
        failed_attempts: 0,
        updated_at: new Date().toISOString(),
      },
      { torn_user_id: numericUserId }
    );

    const { data: subData } = await selectMaybeSingle<{ valid_until: string | null }>(
      c.env,
      'extension_subscriptions',
      'valid_until',
      { torn_user_id: numericUserId }
    );

    const validUntil = subData?.valid_until ?? null;
    const subscriptionValid = Boolean(
      validUntil && new Date(validUntil).getTime() > Date.now()
    );

    return c.json({
      authenticated: true,
      userId: numericUserId,
      username: existingUser.username,
      secretToken: secretToken,
      subscriptionValid,
      validUntil,
    });
  } catch (err: any) {
    logger.error('Login handler error', err);
    return c.json({ error: err.message || 'Login failed' }, 500);
  }
};
