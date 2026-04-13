import { Hono } from 'hono';
import { Logger } from './utils/logger';
import { authRouter } from './auth';
import { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

// Debug logging middleware
app.use('*', async (c, next) => {
  const logger = new Logger(c.env.DEBUG === 'true');
  logger.info(`${c.req.method} ${c.req.url}`);
  logger.debug('Request headers', c.req.header());
  
  // Clone request to avoid consuming body if we want to log it
  // (Hono's req.json() consumes it, so we use a cloned request if needed)
  if (c.req.method === 'POST' || c.req.method === 'PUT') {
    try {
      const clone = c.req.raw.clone();
      const body = await clone.json();
      logger.debug('Request body', body);
    } catch (e) {
      logger.debug('Could not parse request body for logging');
    }
  }

  await next();
  
  logger.info(`Response status: ${c.res.status}`);
});

app.route('/auth', authRouter);

app.onError((err, c) => {
  const logger = new Logger(c.env.DEBUG === 'true');
  logger.error('Unhandled error', err);
  return c.json({ error: err.message || 'Internal Server Error' }, 500);
});

export default app;
