# Infra / Ops

**Branch:** `feat/infra-ops`

Shared data plane, deploy, auth wiring, and deal-service observability.

## Checklist

- [ ] Postgres schema + migrations
- [ ] Service deployment (host TBD on this branch)
- [ ] Logging / monitoring for the **deal service** (fairness / integrity story)
- [ ] Managed auth provider integration (Supabase / Auth0 / Firebase — **not** building auth)

## Notes

- Deal-service logs: shuffle requests, commitments, reveals, failures. Retain them as audit evidence.
- Local default: Docker Compose (Postgres + service processes).
- Auth: verify JWTs at the gateway or per-service; ledger stores `auth_subject` only.
- Coordinate schema with ledger, game-server, and cosmetics so migrations stay one pipeline.
