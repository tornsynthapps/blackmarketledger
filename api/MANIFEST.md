# Ledger API Manifest

List of files and components added for the ledger API service:

## Core Configuration
- `api/ledger/package.json`: Project metadata and dependencies.
- `api/ledger/package-lock.json`: Dependency lock file.
- `api/ledger/wrangler.toml`: Cloudflare Workers configuration.
- `api/ledger/.gitignore`: Git exclusion rules.
- `api/ledger/README.md`: Project documentation and architecture overview.

## Source Code (`api/ledger/src/`)
- `index.ts`: Application entry point and logging middleware.
- `types/index.ts`: Centralized TypeScript type definitions.
- `services/supabase.ts`: Supabase client integration.
- `utils/logger.ts`: Conditional debug logger.
- `utils/random.ts`: Local random word and token generator.
- `utils/crypto.ts`: Token hashing utility.

## Authentication Handlers (`api/ledger/src/auth/`)
- `index.ts`: Auth router and sub-routing.
- `login.ts`: Login validation and account protection logic.
- `signup.ts`: Three-mode signup flow (initiate-message, initiate-money, verify).
- `reset-token.ts`: Secure token reset flow.

## Developer Tools (`api/ledger/tests/`)
- `login.sh`: Semi-manual login test script.
- `signup.sh`: Semi-manual signup test script.
- `reset-token.sh`: Semi-manual reset-token test script.
