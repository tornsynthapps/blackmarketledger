import { Context } from 'hono';
import { Env, TornBasicResponse } from '../types';
import { getSupabaseClient } from '../services/supabase';
import { generateSecretToken, generateVerificationToken, getRandomWord } from '../utils/random';
import { hashToken } from '../utils/crypto';
import { Logger } from '../utils/logger';

const TRIAL_DAYS = 365;
const VERIFICATION_EXPIRY_MINUTES = 10;
const DEPOSIT_MIN = 50;
const DEPOSIT_MAX = 500;

const getRandomMessage = () => `${getRandomWord()}-${getRandomWord()}-${getRandomWord()}`;
const getRandomAmount = () => Math.floor(Math.random() * (DEPOSIT_MAX - DEPOSIT_MIN + 1)) + DEPOSIT_MIN;

export const signupHandler = async (c: Context<{ Bindings: Env }>) => {
  const logger = new Logger(c.env.DEBUG === 'true');
  const supabase = getSupabaseClient(c.env);

  try {
    const { mode, userId, verificationToken } = await c.req.json();

    if (mode === 'initiate-message') {
      if (!userId) return c.json({ error: 'Missing userId' }, 400);
      const numericUserId = parseInt(userId, 10);

      const { data: existingUser } = await supabase
        .from('user_tokens')
        .select('id')
        .eq('torn_user_id', numericUserId)
        .maybeSingle();

      if (existingUser) return c.json({ error: 'Account already exists. Please sign in.' }, 400);

      const message = `${getRandomMessage()}`;
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

    if (mode === 'initiate-money') {
      if (!userId) return c.json({ error: 'Missing userId' }, 400);
      const numericUserId = parseInt(userId, 10);

      const { data: existingUser } = await supabase
        .from('user_tokens')
        .select('id')
        .eq('torn_user_id', numericUserId)
        .maybeSingle();

      if (existingUser) return c.json({ error: 'Account already exists. Please sign in.' }, 400);

      const amount = getRandomAmount();
      const token = generateVerificationToken();
      const expiresAt = new Date(Date.now() + VERIFICATION_EXPIRY_MINUTES * 60 * 1000).toISOString();

      await supabase.from('token_verification_temp').insert({
        torn_user_id: numericUserId,
        verification_token: token,
        verification_type: 'deposit',
        amount_required: amount,
        expires_at: expiresAt,
      });

      return c.json({ amount, verificationToken: token });
    }

    if (mode === 'verify') {
      if (!verificationToken) return c.json({ error: 'Missing verificationToken' }, 400);

      const { data: tempRecord, error: tempError } = await supabase
        .from('token_verification_temp')
        .select('*')
        .eq('verification_token', verificationToken)
        .maybeSingle();

      if (tempError || !tempRecord) {
        return c.json({ error: 'Invalid or expired verification token. Please start fresh.' }, 400);
      }

      if (new Date(tempRecord.expires_at).getTime() < Date.now()) {
        await supabase.from('token_verification_temp').delete().eq('verification_token', verificationToken);
        return c.json({ error: 'Verification token expired. Please start fresh.' }, 400);
      }

      const tornApiKey = c.env.TORN_API_KEY;
      if (!tornApiKey) return c.json({ error: 'Server configuration error' }, 500);

      const fromTimestamp = Math.floor((Date.now() - VERIFICATION_EXPIRY_MINUTES * 60 * 1000) / 1000);
      const userId = tempRecord.torn_user_id;

      logger.debug('Verifying signup with Torn API', { userId, type: tempRecord.verification_type });

      const logsRes = await fetch(
        `https://api.torn.com/v2/user/log?target=${userId}&limit=100&from=${fromTimestamp}&striptags=true`,
        {
          headers: { Authorization: `ApiKey ${tornApiKey}`, accept: 'application/json' },
        }
      );

      const logsData = await logsRes.json() as any;
      const accountLogs = logsData.log || [];
      let verified = false;
      logger.debug('Account logs', logsData);

      for (const log of accountLogs) {
        const sender = log.data?.sender;
        const money = log.data?.money;
        const message = log.data?.message;

        logger.debug('Account Log', { sender, money, message });

        if (sender !== userId) {
          logger.debug('Sender does not match', { sender, userId });
          continue;
        }

        if (tempRecord.verification_type === 'deposit') {
          logger.debug('Deposit verification', { money, amount_required: tempRecord.amount_required });
          if (money === tempRecord.amount_required) {
            verified = true;
            logger.debug('Deposit verified');
            break;
          }
        } else if (tempRecord.verification_type === 'message') {
          logger.debug('Message verification', { message, message_required: tempRecord.message_required });
          if (message === tempRecord.message_required) {
            verified = true;
            logger.debug('Message verified');
            break;
          }
        }
      }

      if (!verified) {
        return c.json({ error: 'Verification not found. Please ensure you sent the correct amount/message.' }, 400);
      }

      // Cleanup temp record
      await supabase.from('token_verification_temp').delete().eq('verification_token', verificationToken);

      // Get Username
      const usernameRes = await fetch(
        `https://api.torn.com/v2/user/${userId}?selections=basic&striptags=true`,
        { headers: { Authorization: `ApiKey ${tornApiKey}`, accept: 'application/json' } }
      );
      const usernameData = await usernameRes.json() as TornBasicResponse;
      const username = usernameData?.profile?.name || usernameData?.profile?.username || 'Unknown';

      const newSecretToken = generateSecretToken();
      const newTokenHash = hashToken(newSecretToken);
      const validUntil = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();

      await supabase.from('user_tokens').insert({
        torn_user_id: userId,
        username,
        secret_token_hash: newTokenHash,
        failed_attempts: 0,
        is_blocked: false,
        valid_until: validUntil,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      await supabase.from('extension_subscriptions').upsert(
        { torn_user_id: userId, username, valid_until: validUntil },
        { onConflict: 'torn_user_id' }
      );

      return c.json({
        authenticated: true,
        userId: userId,
        username,
        secretToken: newSecretToken,
        subscriptionValid: true,
        validUntil,
      });
    }

    return c.json({ error: 'Invalid mode' }, 400);
  } catch (err: any) {
    logger.error('Signup handler error', err);
    return c.json({ error: err.message || 'Signup failed' }, 500);
  }
};
