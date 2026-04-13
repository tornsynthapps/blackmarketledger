import { Context } from 'hono';
import { Env } from '../types';
import { getSupabaseClient } from '../services/supabase';
import { generateSecretToken, generateVerificationToken, getRandomWord } from '../utils/random';
import { hashToken } from '../utils/crypto';
import { Logger } from '../utils/logger';

const VERIFICATION_EXPIRY_MINUTES = 30;

export const resetTokenHandler = async (c: Context<{ Bindings: Env }>) => {
  const logger = new Logger(c.env.DEBUG === 'true');
  const supabase = getSupabaseClient(c.env);

  try {
    const { mode, userId, verificationToken } = await c.req.json();

    if (mode === 'initiate') {
      if (!userId) return c.json({ error: 'Missing userId' }, 400);
      const numericUserId = parseInt(userId, 10);
      
      const { data: existingUser } = await supabase
        .from('user_tokens')
        .select('id')
        .eq('torn_user_id', numericUserId)
        .maybeSingle();

      if (!existingUser) return c.json({ error: 'Account not found. Please sign up.' }, 404);

      const message = `${getRandomWord()}-${getRandomWord()}`;
      const token = generateVerificationToken();
      const expiresAt = new Date(Date.now() + VERIFICATION_EXPIRY_MINUTES * 60 * 1000).toISOString();

      await supabase.from('token_verification_temp').insert({
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

      const { data: tempRecord, error: tempError } = await supabase
        .from('token_verification_temp')
        .select('*')
        .eq('verification_token', verificationToken)
        .maybeSingle();

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
      await supabase.from('token_verification_temp').delete().eq('verification_token', verificationToken);

      const newSecretToken = generateSecretToken();
      const newTokenHash = hashToken(newSecretToken);

      await supabase
        .from('user_tokens')
        .update({
          secret_token_hash: newTokenHash,
          failed_attempts: 0,
          is_blocked: false,
          updated_at: new Date().toISOString(),
        })
        .eq('torn_user_id', userId);

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
