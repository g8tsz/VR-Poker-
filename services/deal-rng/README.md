# Deal / RNG Service

**Branch:** `feat/deal-rng-service`

CSPRNG-seeded shuffle and the public fairness contract. Game server never shuffles.

## Checklist

- [ ] CSPRNG-seeded shuffle (Fisher-Yates)
- [ ] Commit-reveal seed scheme (hash pre-deal, reveal post-hand)
- [ ] Hand-result JSON contract (deck order, hole cards, board cards)
- [ ] Statistical / bias unit tests on the shuffle
- [ ] Hand history logging (immutable, per-hand record)

## Notes

- Use `crypto.randomBytes` (or equivalent), never a non-crypto PRNG.
- Commitment is published before any hole card is returned.
- Reveal is only allowed after showdown/payout (or a cancelled hand with a recorded reason).
- Hand history is append-only; corrections are new records, not edits.
- See [docs/fairness.md](../../docs/fairness.md).
