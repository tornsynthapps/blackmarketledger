import { Context } from 'hono';
import { Env } from '../types';
import { deleteRows, insertRow, selectMaybeSingle, updateRows } from '../services/supabase';
import { generateSecretToken, generateVerificationToken, getRandomWord } from '../utils/random';
import { hashToken } from '../utils/crypto';
import { Logger } from '../utils/logger';

const VERIFICATION_EXPIRY_MINUTES = 30;

/**
 * Handle secret token reset requests.
 * Supports 'initiate' (request verification message) and 'verify' (check message and issue new token) modes.
 * 
 * @param c (Context): Hono context with request data and env bindings.
 * @returns (Promise<Response>): Verification requirements or success status with new token.
 * @side_effects: Reads/writes 'user_tokens' and 'token_verification_temp'.
 */
export const resetTokenHandler = async (c: Context<{ Bindings: Env }>) => {
  const logger = new Logger(c.env.DEBUG === 'true');

  try {
    const { mode, userId, verificationToken } = await c.req.json();

    if (mode === 'initiate') {
      // Create a temporary verification requirement (message sender verification)
      if (!userId) return c.json({ error: 'Missing userId' }, 400);
      const numericUserId = parseInt(userId, 10);
      
      const { data: existingUser } = await selectMaybeSingle<{ id: number }>(
        c.env,
        'user_tokens',
        'id',
        { torn_user_id: numericUserId }
      );

      if (!existingUser) return c.json({ error: 'Account not found. Please sign up.' }, 404);

      const message = `${getRandomWord()}-${getRandomWord()}`;
      const token = generateVerificationToken();
      const expiresAt = new Date(Date.now() + VERIFICATION_EXPIRY_MINUTES * 60 * 1000).toISOString();

      await insertRow(c.env, 'token_verification_temp', {
        torn_user_id: numericUserId,
        verification_token: token,
        verification_type: 'message',
        message_required: message,
        expires_at: expiresAt,
      });

      return c.json({ message, verificationToken: token });
    }

    if (mode === 'verify') {
      if (!verificationToken) return c.json({ error: 'Missing verificationToken' }, 400);

      const { data: tempRecord, error: tempError } = await selectMaybeSingle<{
        torn_user_id: number;
        message_required: string;
      }>(
        c.env,
        'token_verification_temp',
        'torn_user_id, message_required',
        { verification_token: verificationToken }
      );

      if (tempError || !tempRecord) {
        return c.json({ error: 'Invalid or expired verification token.' }, 400);
      }

      const tornApiKey = c.env.TORN_API_KEY;
      const fromTimestamp = Math.floor((Date.now() - 10 * 60 * 1000) / 1000);
      const userId = tempRecord.torn_user_id;

      const logsRes = await fetch(
        `https://api.torn.com/v2/user/log?target=${userId}&limit=100&from=${fromTimestamp}&striptags=true`,
        { headers: { Authorization: `ApiKey ${tornApiKey}`, accept: 'application/json' } }
      );

      const logsData = await logsRes.json() as any;
      const accountLogs = logsData.logs || [];
      let verified = false;

      for (const log of accountLogs) {
        if (log.data?.sender === userId && log.data?.message === tempRecord.message_required) {
          verified = true;
          break;
        }
      }

      if (!verified) {
        return c.json({ error: 'Verification not found.' }, 400);
      }

      // Cleanup
      await deleteRows(c.env, 'token_verification_temp', { verification_token: verificationToken });

      const newSecretToken = generateSecretToken();
      const newTokenHash = hashToken(newSecretToken);

      await updateRows(
        c.env,
        'user_tokens',
        {
          secret_token_hash: newTokenHash,
          failed_attempts: 0,
          is_blocked: false,
          updated_at: new Date().toISOString(),
        },
        { torn_user_id: userId }
      );

      return c.json({
        success: true,
        userId: userId,
        secretToken: newSecretToken,
      });
    }

    return c.json({ error: 'Invalid mode' }, 400);
  } catch (err: any) {
    logger.error('Reset token handler error', err);
    return c.json({ error: err.message || 'Reset failed' }, 500);
  }
};
