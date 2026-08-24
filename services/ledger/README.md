# Ledger

**Branch:** `feat/ledger-service`

Accounts, clubs, append-only chips — **no real-money-to-chip conversion**.

## Checklist

- [x] User chip accounts (`auth_subject` → balance, welcome seed)
- [x] Club CRUD
- [x] Club membership (owner / admin / member)
- [x] Append-only chip ledger + derived balance
- [x] Transaction history / audit trail
- [x] Club-level rake / table config for game-server (`GET /v1/clubs/:id/table-config`)

## Run

```bash
npm run ledger
# http://localhost:8786/health
```

With Postgres (see `infra/docker-compose.yml`):

```bash
DATABASE_URL=postgres://vrpoker:vrpoker@localhost:5432/vrpoker npm run ledger
```

## API

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/accounts` | Ensure user + seed chips |
| `GET` | `/v1/accounts/:authSubject?history=1` | Balance + optional history |
| `POST` | `/v1/ledger/buy-in` | Debit chips for table |
| `POST` | `/v1/ledger/cash-out` | Credit chips from table |
| `POST` | `/v1/clubs` | Create club |
| `GET` | `/v1/clubs/:id` | Club details |
| `PATCH` | `/v1/clubs/:id` | Update rake / stakes |
| `GET` | `/v1/clubs/:id/table-config` | Rake + buy-in limits for tables |
| `POST/DELETE` | `/v1/clubs/:id/members` | Add / remove members |

Library: `packages/ledger` (`MemoryLedgerStore`, `PgLedgerStore`).
