# Database Schemas

Cloudflare D1 database schemas for the Ledger API.

## D1 Binding

- **Binding name**: `DB`
- **Database name**: `ledger`
- **Database ID**: `15c0cbef-fcb5-4b41-944d-6808574ecb03`

## Tables

### auth

User authentication and account protection.

| Column          | Type    | Constraints | Description                      |
| --------------- | ------- | ----------- | -------------------------------- |
| user_id         | INTEGER | PRIMARY KEY | User identifier                  |
| auth_secret     | TEXT    | NOT NULL    | Hashed auth secret               |
| is_blocked      | INTEGER | DEFAULT 0   | Blocked status (0=false, 1=true) |
| is_banned       | INTEGER | DEFAULT 0   | Banned status (0=false, 1=true)  |
| failed_attempts | INTEGER | DEFAULT 0   | Failed login attempt count       |

**Indexes:**

- `idx_auth_secret` on `auth_secret`

### subscriptions

User subscription tracking.

| Column           | Type    | Constraints | Description                           |
| ---------------- | ------- | ----------- | ------------------------------------- |
| user_id          | INTEGER | PRIMARY KEY | User identifier                       |
| created_at       | INTEGER | NOT NULL    | Creation timestamp (Unix epoch)       |
| tokens_available | INTEGER | DEFAULT 0   | Available token count                 |
| full_sub         | INTEGER |             | Full subscription expiry (Unix epoch) |

### pricelist

User price list configuration.

| Column          | Type    | Constraints | Description           |
| --------------- | ------- | ----------- | --------------------- |
| user_id         | INTEGER | PRIMARY KEY | User identifier       |
| forum_thread_id | INTEGER | NOT NULL    | Torn forum thread ID  |
| likes           | INTEGER | DEFAULT 0   | Thread rating (likes) |

## Deployment

Apply schemas to D1:

```bash
wrangler d1 execute ledger --file=db/schemas/auth.sql
wrangler d1 execute ledger --file=db/schemas/subscriptions.sql
wrangler d1 execute ledger --file=db/schemas/pricelist.sql
```
