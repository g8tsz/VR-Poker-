# Game Server

**Branch:** `feat/game-server`

Table engine and the API/WS surface that VR and the flat client drive.

## Checklist

- [ ] Table state machine (`waiting` → `dealing` → betting rounds → `showdown` → `payout`)
- [ ] Betting logic: check / call / raise / fold
- [ ] Side pot calculation (all-in edge cases)
- [ ] Hand evaluator integration (adapt an existing open-source 7-card evaluator)
- [ ] Turn order / timeout / auto-fold handling
- [ ] Table config (blinds, buy-in limits, rake settings)
- [ ] API / WS layer to drive a full hand externally (curl / Postman / CLI)

## Notes

- Cards come from Deal/RNG. Pots and winners are computed here, then posted to Ledger.
- Rake numbers are configured here but **enforced** with Ledger club settings — do not silently disagree.
- Timeouts auto-fold; they do not auto-check except where table config explicitly allows it (document the choice).
- External API must be enough for the flat test client to play a complete multi-player hand.
