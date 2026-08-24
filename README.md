# VR Poker

Server-authoritative Texas Hold'em for Meta Quest. Clubs, virtual chips, cosmetic economy — **never** real-money-to-chip conversion.

Work happens on **one git branch per section**. See [BRANCHES.md](./BRANCHES.md).

| Layer | Owns |
|-------|------|
| **Deal / RNG** | Shuffle integrity, commit-reveal, hand-result contract, immutable history |
| **Game server** | Table FSM, betting, pots, evaluator, timeouts, external API/WS |
| **Ledger** | Accounts, clubs, append-only chips, audit trail |
| **Tournament** | Scheduling, MTT state, virtual payouts, leaderboards |
| **Cosmetics** | SKUs, purchase → ownership, entitlement checks |
| **Flat test client** | CLI/web debug driver for a full multi-player hand |
| **VR client** | Unity + Meta XR, interaction, Photon, rendering, audio, store |

```text
  VR client (Unity / Quest)          Flat test client (CLI / web)
           │                                    │
           └──────── Photon / WS / HTTP ────────┘
                            │
              ┌─────────────┴──────────────┐
              │         Game Server        │
              │  waiting → dealing → …     │
              └──────┬──────────┬──────────┘
                     │          │
              Deal/RNG       Ledger
              (fairness)     (chips, clubs, cosmetics)
                     │
              Tournament + Infra (Postgres, auth provider, logs)
```

## Hard rules

- Game state is **server-authoritative**. Clients render; they do not decide cards, pots, or winners.
- Deal/RNG is the **integrity story**: CSPRNG Fisher-Yates, commit-reveal, immutable per-hand logs.
- Chip balances are **derived** from an append-only ledger, not mutated in place.
- Cosmetics and tournament rewards are **virtual**. No cash → chip conversion, ever.
- Auth is a **managed provider** (Supabase / Auth0 / Firebase). This repo does not build an auth system.

## Quick map

| Branch | Directory |
|--------|-----------|
| [`feat/deal-rng-service`](https://github.com/g8tsz/VR-Poker-/tree/feat/deal-rng-service) | `services/deal-rng/` |
| [`feat/game-server`](https://github.com/g8tsz/VR-Poker-/tree/feat/game-server) | `services/game-server/` |
| [`feat/ledger-service`](https://github.com/g8tsz/VR-Poker-/tree/feat/ledger-service) | `services/ledger/` |
| [`feat/tournament-system`](https://github.com/g8tsz/VR-Poker-/tree/feat/tournament-system) | `services/tournament/` |
| [`feat/cosmetics-economy`](https://github.com/g8tsz/VR-Poker-/tree/feat/cosmetics-economy) | `services/cosmetics/` |
| [`feat/flat-test-client`](https://github.com/g8tsz/VR-Poker-/tree/feat/flat-test-client) | `clients/flat-test/` |
| [`feat/infra-ops`](https://github.com/g8tsz/VR-Poker-/tree/feat/infra-ops) | `infra/` |
| [`feat/vr-client-core`](https://github.com/g8tsz/VR-Poker-/tree/feat/vr-client-core) | `clients/vr/client-core/` |
| [`feat/vr-interaction`](https://github.com/g8tsz/VR-Poker-/tree/feat/vr-interaction) | `clients/vr/interaction/` |
| [`feat/vr-netcode`](https://github.com/g8tsz/VR-Poker-/tree/feat/vr-netcode) | `clients/vr/netcode/` |
| [`feat/vr-rendering`](https://github.com/g8tsz/VR-Poker-/tree/feat/vr-rendering) | `clients/vr/rendering/` |
| [`feat/vr-audio`](https://github.com/g8tsz/VR-Poker-/tree/feat/vr-audio) | `clients/vr/audio/` |
| [`feat/vr-platform`](https://github.com/g8tsz/VR-Poker-/tree/feat/vr-platform) | `clients/vr/platform/` |

Checkout a section, implement against its README checklist, open a PR into `main`.

## Run (NLHE, buy-in, multi-seat)

```bash
npm install
npm test                 # engine, deal fairness, ledger
npm run play             # terminal felt
npm run dev              # HTTP + WS on :8787
```

## Stack (intended)

**Backend:** TypeScript services, Postgres, managed auth  
**VR:** Unity + Meta XR SDK (Quest) + Photon Fusion / Realtime + Photon Voice  
**Ops:** Docker Compose locally; deal-service logs treated as audit evidence
