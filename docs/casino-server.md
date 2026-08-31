# Casino-server protocol

VR Poker on `main` speaks the [floatinghotpot/casino-server](https://github.com/floatinghotpot/casino-server) Socket.IO RPC (MIT) on the **same** HTTP process as JWT-backed `/tables` and `@vr-poker/netcode` WebSocket.

The 2014 Redis cluster is not vendored. Cards, pots, and winners stay in `@vr-poker/core` plus ledger / deal-rng services.

## Transport

| Channel | Path | Role |
|---------|------|------|
| HTTP | `/accounts`, `/tables/...` | JWT (or `AUTH_DISABLED=1` locally) |
| WebSocket | `/ws` | netcode v1 snapshots / actions |
| Socket.IO | `/socket.io` | casino-server `hello` / `rpc` / `notify` / `rpc_ret` |

Port: `8787` (`npm run dev`). Default room **`holdem3`** is created at boot.

Casino `login` / `fastsignup` mint an in-memory **session pin** so the old RPC can run in a lab. Production identity remains the managed JWT provider (`feat/infra-ops` / `packages/auth`).

See game-server README for curl against `holdem3`.
