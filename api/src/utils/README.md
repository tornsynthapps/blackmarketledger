# utils

Directory path: `api/src/utils`

## Purpose

Cloudflare Worker API service providing backend endpoints, authentication, and database access.

## Files & Contents

- **`crypto.ts`**: Generates a simple alphanumeric hash of a string token.
  - **Exports**: Function: `hashToken()`
- **`logger.ts`**: Simple logger class for Cloudflare Workers.
  - **Exports**: Class: `Logger`
- **`openapi.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Function: `openApiHandler()`, Object/Const: `openApiSpec`
- **`random.ts`**: Module file providing specific functionality for this directory.
  - **Exports**: Function: `getRandomWord()`, Function: `generateSecretToken()`, Function: `generateVerificationToken()`
- **`randomWords.ts`**: Module file providing specific functionality for this directory.

