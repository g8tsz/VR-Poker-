# Infra / Ops

**Branch:** `feat/infra-ops`

Shared data plane, deploy, auth wiring, and deal-service observability.

## Checklist

- [x] Postgres schema + migrations (`infra/migrations`, `npm run migrate`)
- [x] Service deployment — Docker Compose local stack (Postgres + all services)
- [x] Logging / monitoring for **deal-rng** (structured stdout + optional `deal_audit_events` table)
- [x] Managed auth integration (`@vr-poker/auth` JWT verify — Supabase / Auth0 / Firebase JWKS)

## Quick start

```bash
cp infra/.env.example infra/.env
docker compose -f infra/docker-compose.yml up --build
```

| Service | Port |
|---------|------|
| Postgres | 5432 |
| ledger | 8786 |
| game-server | 8787 |
| deal-rng | 8788 |
| tournament | 8789 |
| cosmetics | 8790 |

Migrate only (Postgres already running):

```bash
DATABASE_URL=postgres://vrpoker:vrpoker@localhost:5432/vrpoker npm run migrate
```

## Auth (managed provider)

Local default: `AUTH_DISABLED=1` (no JWT required).

Enable JWT:

```bash
AUTH_DISABLED=0
AUTH_DEV_SECRET=your-secret        # local HS256
# or production:
AUTH_JWKS_URL=https://<project>.supabase.co/auth/v1/.well-known/jwks.json
AUTH_ISSUER=https://<project>.supabase.co/auth/v1
AUTH_AUDIENCE=authenticated
```

Mint a dev token:

```bash
node infra/scripts/dev-token.mjs alice
curl -H "Authorization: Bearer <token>" -X POST http://localhost:8787/accounts
```

Ledger stores `auth_subject` via `users.auth_subject` when services move to Postgres persistence.

## Deal audit logs

See [logging/deal-audit.md](./logging/deal-audit.md).

```bash
docker compose -f infra/docker-compose.yml logs -f deal-rng
```

With `DATABASE_URL`, events mirror to `deal_audit_events`.

## Notes

- Deal-service JSONL history: `data/hand-history.jsonl` (volume in compose).
- Coordinate schema with ledger, game-server, and cosmetics — one migration pipeline.
- Production host TBD; compose is the local contract.
