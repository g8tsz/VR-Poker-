# Tournament System

**Branch:** `feat/tournament-system`

Multi-table tournaments with **virtual** rewards only.

## Checklist

- [x] Scheduler (poll-driven auto-start; swap for cron in prod)
- [x] Multi-table tournament state tracking
- [x] Payout structure logic (harmonic shares, virtual chips)
- [x] Leaderboard / reward tracking (cosmetic / virtual, **not cash**)

## Run

```bash
npm run tournament
# http://localhost:8789/health
```

## API

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/tournaments` | Create MTT (opens registration) |
| `GET` | `/v1/tournaments` | List snapshots |
| `GET` | `/v1/tournaments/:id` | Tournament snapshot |
| `POST` | `/v1/tournaments/:id/register` | Register + ledger buy-in |
| `POST` | `/v1/tournaments/:id/start` | Manual start |
| `POST` | `/v1/tournaments/:id/bust` | Eliminate player; pays prizes on completion |
| `GET` | `/v1/leaderboard` | Global points leaderboard |

## Notes

- Tables are spun via game-server APIs; this service owns tournament lifecycle, not street-by-street betting.
- Payouts credit the ledger as virtual chips — never cash.
- Leaderboards are derived from finished tournament results, not live client scores.
