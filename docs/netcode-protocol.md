# VR netcode wire protocol

Protocol version **1**. Poker state is always server-authoritative.

| Message | Direction | Purpose |
|---------|-----------|---------|
| `welcome` | S→C | Handshake; includes `serverTime` (ms) for clock sync |
| `state` | S→C | Full `TableSnapshot` + monotonic `seq` |
| `presence` | S→C | Map of `playerId` → head/hands pose + `serverTime` |
| `pong` | S→C | Heartbeat reply with `serverTime` |
| `left` | S→C | Confirms cash-out after `leave` |
| `error` | S→C | Rejected action or bad payload |
| `action` | C→S | Betting intent (`fold`, `check`, `call`, `bet`, `raise`, `all-in`) |
| `presence` | C→S | Local XR rig sample (~20 Hz); server stamps `t` |
| `sit` | C→S | Buy in and take a seat (`name`, `buyIn`, optional `seat`) |
| `leave` | C→S | Cash out and stand |
| `start` | C→S | Deal a new hand (between hands) |
| `ping` | C→S | Keep-alive; server replies with `pong` |

**Hand end:** server broadcasts `street: "payout"` (with `winners`) then `street: "waiting"` after cleanup.

**Presence:** server overwrites client `t` with `Date.now()` on relay. Interpolate using server clock (`welcome.serverTime` offset).

**Session:** connect WS with `tableId` + `playerId`, then `sit` over WS or HTTP `POST /tables/:id/sit`. See [clients/vr/netcode/README.md](../../clients/vr/netcode/README.md).
