# VR netcode wire protocol

Protocol version **1**. Poker state is always server-authoritative.

| Message | Direction | Purpose |
|---------|-----------|---------|
| `welcome` | S→C | Handshake after connect |
| `state` | S→C | Full `TableSnapshot` + monotonic `seq` |
| `presence` | S→C | Map of `playerId` → head/hands pose |
| `error` | S→C | Rejected action or bad payload |
| `action` | C→S | Betting intent (`fold`, `check`, `call`, `bet`, `raise`, `all-in`) |
| `presence` | C→S | Local XR rig sample (~20 Hz) |

Presence is relayed to other seated players at the same table. Interpolate remote avatars with ~100 ms delay; snap chips/cards to server `state` events.

See [clients/vr/netcode/README.md](../../clients/vr/netcode/README.md).
