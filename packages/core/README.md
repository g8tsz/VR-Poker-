# Poker core (`packages/core`)

Server-authoritative No-Limit Texas Hold'em:

- Table stakes buy-in / add-on / cash-out
- Blinds, button, HU vs ring
- fold / check / call / bet / raise-to / all-in
- Side pots, uncalled bets, chop pots
- 7-card evaluator (best 5 of 7)
- Rake (no-flop-no-rake, cap)

Does not shuffle (see `@vr-poker/deal`) and does not own balances (see `@vr-poker/ledger`).
