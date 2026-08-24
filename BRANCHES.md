# Workstream branches

Every section of the product has its own long-lived feature branch off `main`. Implement on the matching branch; merge via PR.

| Branch | Section | Scope |
|--------|---------|-------|
| `feat/deal-rng-service` | Deal / RNG Service | CSPRNG shuffle, commit-reveal, hand JSON, bias tests, immutable history |
| `feat/game-server` | Game Server | Table FSM, betting, side pots, evaluator, timeouts, API/WS |
| `feat/ledger-service` | Ledger Service | Accounts, clubs, membership, append-only chips, audit |
| `feat/tournament-system` | Tournament System | Scheduler, MTT state, virtual payouts, leaderboards |
| `feat/flat-test-client` | Flat Test Client | CLI/web client to play and verify a full hand |
| `feat/cosmetics-economy` | Cosmetics / Economy | SKUs, purchase → ownership, entitlement (no cash chips) |
| `feat/infra-ops` | Infra / Ops | Postgres + migrations, deploy, deal-service logging, managed auth |
| `feat/vr-client-core` | VR Client Core | Unity + Meta XR, scene, camera rig, spatial layout |
| `feat/vr-interaction` | VR Interaction | Hands/controllers, betting gestures, avatars |
| `feat/vr-netcode` | VR Netcode | Photon, server-authoritative sync, interpolation |
| `feat/vr-rendering` | VR Rendering | Cards/chips/table, deal animation, cosmetic skins |
| `feat/vr-audio` | VR Audio | Spatial voice, table/ambient sound |
| `feat/vr-platform` | VR Platform | Quest Store (and optional Steam) submission requirements |

```bash
git fetch origin
git checkout feat/deal-rng-service   # example
```

`main` stays the integration branch. Do not mix unrelated sections on one branch.
