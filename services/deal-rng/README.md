# Deal / RNG

**Branch:** `feat/deal-rng-service` (library lives in `packages/deal`, used by the game server)

- [x] CSPRNG-seeded shuffle (Fisher-Yates, unbiased index)
- [x] Commit-reveal (`SHA-256(seed || nonce)` pre-deal, reveal post-hand)
- [x] Hand-result JSON helper (deck order, hole cards, board)
- [x] Statistical/bias tests on first-card distribution
- [x] Immutable per-hand commitment string (engine logs it)

See `packages/deal`.
