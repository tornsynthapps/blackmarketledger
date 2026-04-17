# Ledger API Service

This is the authentication and ledger management service for the BlackMarket Ledger, designed to run as a Cloudflare Worker.

## Overview

The Ledger API provides a modular and secure way to handle user authentication, account signup with Torn verification, and token management. It integrates with Supabase for data storage and the Torn API for identity verification.

## Folder Structure

- **`db/schemas/`**: Cloudflare D1 database table schemas.
- **`src/`**: Main source code for the worker.
    - **`auth/`**: Authentication route handlers.
        - `index.ts`: Auth router configuration.
        - `login.ts`: User login logic with attack protection.
        - `signup.ts`: Multi-mode signup flow (message/money).
        - `reset-token.ts`: Secure token rotation.
    - **`services/`**: External service integrations.
        - `supabase.ts`: Supabase client initialization.
    - **`utils/`**: Shared utilities.
        - `crypto.ts`: Token hashing functions.
        - `logger.ts`: Conditional debug logging.
        - `random.ts`: Random word and token generation.
    - **`types/`**: TypeScript interface and type definitions.
    - `index.ts`: Application entry point and logging middleware.
- **`tests/`**: Semi-manual test scripts for developers.
    - `login.sh`: Script to test the login endpoint.
    - `signup.sh`: Script to test the signup flow.
    - `reset-token.sh`: Script to test token resets.
- `package.json`: Project dependencies and scripts.
- `wrangler.toml`: Cloudflare Workers configuration.

## Key Endpoints

- **POST `/auth/login`**: Authenticate an existing user.
- **POST `/auth/signup`**: Initiate or verify account creation.
- **POST `/auth/reset-token`**: Initiate or verify secret token reset.

## Development

1. **Install dependencies**: `npm install`
2. **Deploy**: `npm run deploy`
3. **Check logs**: `npx wrangler tail`

## Configuration

Required environment variables (use `wrangler secret put`):

- `SUPABASE_SERVICE_ROLE_KEY`
- `TORN_API_KEY`
- `SUPABASE_URL` (in `wrangler.toml`)
- `DEBUG` (in `wrangler.toml`)
