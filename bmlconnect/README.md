# BML Connect

BML Connect syncs **cost-basis summary data** from `blackmarketledger.web.app` and displays it inside `torn.com`.

## Features

- Sign in with Torn API key via extension popup.
- API key is sent to Supabase Edge Function for subscription verification.
- Shows username/user ID even when subscription is inactive.
- Renders BML box on Torn only when subscription is active.
- User can show/hide (toggle) the BML box.
- User can drag and reposition the BML box.

## Install (Developer Mode)

1. Open `chrome://extensions` (Chrome) or `about:debugging#/runtime/this-firefox` (Firefox).
2. Enable **Developer mode**.
3. Load unpacked extension from the `bmlconnect` folder.

## Supabase setup

### 1) SQL schema

Run SQL from:

- `bmlconnect/supabase/schema.sql`

This creates `public.extension_subscriptions` with `torn_user_id` and `valid_until`.

### 2) Edge function

Source:

- `bmlconnect/supabase/functions/verify-subscription/index.ts`

Deploy with Supabase CLI, then set secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Configured function URL in extension:

- `https://yxjmnkaollkpcvymiicd.supabase.co/functions/v1/verify-subscription`

## Build Chrome + Firefox packages

```bash
npm run build:extensions
```

Outputs:

- `bmlconnect/dist/bmlconnect-chrome.zip`
- `bmlconnect/dist/bmlconnect-firefox.zip`
