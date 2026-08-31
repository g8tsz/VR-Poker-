# Workstream branches

Every section of the product was developed on its own long-lived `feat/*` branch. **`main` now contains the integrated monorepo** — all packages, services, flat test client, and VR Unity modules.

Use feature branches for new section work; merge to `main` via PR. Every row below is **already on `main`**. The `feat/*` tips remain as historical names; unique leftover commits (casino-server protocol, older deal-rng HTTP) are folded into `main` rather than replacing the integrated tree.

| Branch | Section | Directory |
|--------|---------|-----------|
| `feat/deal-rng-service` | Deal / RNG Service | `services/deal-rng/` |
| `feat/game-server` | Game Server | `services/game-server/`, `packages/core/` |
| `feat/ledger-service` | Ledger Service | `services/ledger/`, `packages/ledger/` |
| `feat/tournament-system` | Tournament System | `services/tournament/`, `packages/tournament/` |
| `feat/cosmetics-economy` | Cosmetics / Economy | `services/cosmetics/`, `packages/cosmetics/` |
| `feat/flat-test-client` | Flat Test Client | `clients/flat-test/` |
| `feat/infra-ops` | Infra / Ops | `infra/`, `packages/auth/` |
| `feat/vr-client-core` | VR Client Core | `clients/vr/client-core/`, `clients/vr/Project/` |
| `feat/vr-netcode` | VR Netcode | `clients/vr/netcode/`, `packages/netcode/` |
| `feat/vr-interaction` | VR Interaction | `clients/vr/interaction/` |
| `feat/vr-rendering` | VR Rendering | `clients/vr/rendering/` |
| `feat/vr-audio` | VR Audio | `clients/vr/audio/` |
| `feat/vr-platform` | VR Platform | `clients/vr/platform/` |

```bash
git fetch origin
git checkout main
npm install && npm test
```

Do not mix unrelated sections on one feature branch. `main` is the integration branch.
