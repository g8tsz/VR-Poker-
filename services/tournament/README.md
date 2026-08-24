# Tournament System

**Branch:** `feat/tournament-system`

Multi-table tournaments with **virtual** rewards only.

## Checklist

- [ ] Scheduler (cron-driven table spin-up)
- [ ] Multi-table tournament state tracking
- [ ] Payout structure logic
- [ ] Leaderboard / reward tracking (cosmetic / virtual, **not cash**)

## Notes

- Tables are spun via game-server APIs; this service owns tournament lifecycle, not street-by-street betting.
- Payouts credit the ledger as virtual chips or cosmetic grants — never cash.
- Leaderboards are derived from finished tournament results, not live client scores.
