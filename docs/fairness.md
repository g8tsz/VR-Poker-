# Deal fairness (integrity story)

If anyone questions a hand, this is the evidence path. Owned by `feat/deal-rng-service` + deal-service logging on `feat/infra-ops`.

1. **CSPRNG shuffle** — Fisher-Yates using a cryptographically secure RNG (not `Math.random`).
2. **Commit-reveal** — `commitment = H(seed || nonce)` published **before** cards are dealt. Seed revealed **after** the hand. Anyone can re-shuffle and match the recorded deck.
3. **Hand-result contract** — JSON with deck order, hole cards per seat, board cards, hand id, commitment, reveal.
4. **Bias tests** — unit tests that the shuffle is unbiased (position frequencies, chi-square / similar).
5. **Immutable hand history** — per-hand record, append-only, never rewritten.

Monitoring on the deal service (structured logs, alerts on shuffle/commit failures) is part of the same story — not optional ops garnish.
