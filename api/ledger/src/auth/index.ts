import { Hono } from 'hono';
import { Env } from '../types';
import { loginHandler } from './login';
import { signupHandler } from './signup';
import { resetTokenHandler } from './reset-token';

export const authRouter = new Hono<{ Bindings: Env }>();

authRouter.post('/login', loginHandler);
authRouter.post('/signup', signupHandler);
authRouter.post('/reset-token', resetTokenHandler);
