# Architecture

## Authority

The **game server** owns table state. The **deal/RNG service** owns cards. The **ledger** owns chips and entitlements. Unity and the flat client are renderers / drivers.

```text
waiting → dealing → preflop → flop → turn → river → showdown → payout → waiting
```

Deal happens only in `dealing`: game server requests a committed shuffle, receives a commitment hash (pre-deal), then hole/board cards as the street needs them. Seed reveal is post-hand, never pre-deal.

## Data

- **Postgres** is the system of record (ledger entries, clubs, hand history pointers, cosmetics ownership).
- Deal-service logs are **append-only integrity evidence** (commitment, reveal, deck order, hand id).
- VR movement interpolates locally; card/chip/pot values never originate on the client.

## Auth

Managed provider only (Supabase / Auth0 / Firebase). Services consume JWTs. User rows in ledger map `auth_subject` → internal `user_id`.

Socket.IO casino-server `signup` / `login` are lab session pins on the game server, not product auth. See [casino-server.md](./casino-server.md).
