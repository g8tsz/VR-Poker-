# VR Poker

Server-authoritative Texas Hold'em for Meta Quest. Clubs, virtual chips, cosmetic economy — **never** real-money-to-chip conversion.

`main` integrates all workstreams (backend services, flat test client, Unity VR modules). Historical feature branches remain for reference; develop on `main` or open section PRs from `feat/*` as described in [BRANCHES.md](./BRANCHES.md).

| Layer | Owns |
|-------|------|
| **Deal / RNG** | Shuffle integrity, commit-reveal, hand-result contract, immutable history |
| **Game server** | Table FSM, betting, pots, evaluator, timeouts, HTTP / WS / casino-server Socket.IO |
| **Ledger** | Accounts, clubs, append-only chips, audit trail |
| **Tournament** | Scheduling, MTT state, virtual payouts, leaderboards |
| **Cosmetics** | SKUs, purchase → ownership, entitlement checks |
| **Flat test client** | CLI/web debug driver for a full multi-player hand |
| **VR client** | Unity + Meta XR, interaction, netcode, rendering, audio, platform |

```text
  VR client (Unity / Quest)          Flat test client (CLI / web)
           │                                    │
           └──── Photon (presence) / HTTP / WS / Socket.IO ────┘
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
- Auth is a **managed provider** (Supabase / Auth0 / Firebase). This repo does not build an auth system. Casino-server Socket.IO `login` is a lab session pin only.

## Quick start

```bash
git clone https://github.com/g8tsz/VR-Poker-.git
cd VR-Poker-
npm install
npm test                 # 50+ unit tests across packages and services
npm run demo             # smoke: two bots play one hand against game-server
```

### Local game server (minimal)

```bash
npm run dev              # game-server HTTP + WS + Socket.IO on :8787
npm run play             # terminal felt (another terminal)
npm run web              # browser UI on :3080
```

### Full stack (Docker)

```bash
cp infra/.env.example infra/.env
npm run stack            # Postgres + all services
npm run migrate          # apply SQL migrations
```

| Service | Port | npm script |
|---------|------|------------|
| ledger | 8786 | `npm run ledger` |
| game-server | 8787 | `npm run dev` |
| deal-rng | 8788 | `npm run deal` |
| tournament | 8789 | `npm run tournament` |
| cosmetics | 8790 | `npm run cosmetics` |
| flat-test web | 3080 | `npm run web` |

See [infra/README.md](./infra/README.md) for auth, migrations, and deal audit logging.

Casino-server RPC (compat with [floatinghotpot/casino-server](https://github.com/floatinghotpot/casino-server)): [docs/casino-server.md](./docs/casino-server.md).

## VR client (Unity / Quest)

Open [`clients/vr/Project/`](./clients/vr/Project/) in Unity Hub (2022.3 LTS + Android + Meta XR SDK).

Symlink or copy into `Assets/VRPoker/`:

| Folder | Module |
|--------|--------|
| `clients/vr/client-core/unity` | Scene bootstrap, table layout |
| `clients/vr/netcode/unity` | WebSocket client, presence |
| `clients/vr/interaction/unity` | Betting gestures, avatars |
| `clients/vr/rendering/unity` | Cards, chips, cosmetic skins |
| `clients/vr/audio/unity` | Spatial audio, table stingers |
| `clients/vr/platform/unity` | Quest store compliance |

Docs: [vr-client-core](./docs/vr-client-core.md) · [netcode](./docs/netcode-protocol.md) · [interaction](./docs/vr-interaction.md) · [rendering](./docs/vr-rendering.md) · [audio](./docs/audio.md) · [platform](./docs/vr-platform.md)

## Monorepo map

| Path | Package / service |
|------|-------------------|
| `packages/core` | NLHE engine, evaluator, pots |
| `packages/deal` | CSPRNG shuffle |
| `packages/ledger` | Append-only chips, clubs, ownership |
| `packages/tournament` | MTT engine, payouts |
| `packages/cosmetics` | SKU catalog, store |
| `packages/auth` | JWT verify (managed provider) |
| `packages/netcode` | WS protocol client (TS) |
| `services/game-server` | Table FSM, HTTP/WS API |
| `services/deal-rng` | Commit-reveal deal service |
| `services/ledger` | Ledger HTTP API |
| `services/tournament` | Tournament HTTP API |
| `services/cosmetics` | Cosmetics HTTP API |
| `clients/flat-test` | CLI + web debug client |
| `clients/vr/*` | Unity C# modules (Quest) |
| `infra` | Docker Compose, migrations, auth scripts |

## Stack

**Backend:** TypeScript services, Postgres, managed auth  
**VR:** Unity + Meta XR SDK (Quest) + Photon Realtime / Voice (optional)  
**Ops:** Docker Compose locally; deal-service logs treated as audit evidence
