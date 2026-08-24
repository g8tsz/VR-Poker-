# VR Netcode

**Branch:** `feat/vr-netcode`

Server-authoritative poker over **game-server WebSocket**. VR head/hands over the same socket (relay + interpolation). **Photon Realtime** is optional for voice/lobby — not poker truth.

## Architecture

```text
Quest client
  ├─ WebSocketTableClient  →  game-server /ws  (state, actions, presence)
  ├─ ServerAuthoritativeTableView  ← snapshots only (pot, street, seats)
  ├─ VrPresenceBroadcaster  →  presence @ 20 Hz
  ├─ RemoteAvatarInterpolator  ← buffered remote poses
  └─ PhotonRealtimePresenceRoom  (optional voice / room discovery)
```

**Rule:** cards, bets, pots, and winners always come from `type: "state"` messages. Never simulate them on the client.

## Checklist

- [x] Wire protocol (`@vr-poker/netcode`) — `state`, `presence`, `action`, `error`
- [x] Bidirectional game-server WebSocket (actions + presence relay)
- [x] Pose interpolation buffer (`PoseInterpolator`, 100 ms delay default)
- [x] Unity scripts (`clients/vr/netcode/unity/`)
- [x] Photon Realtime scaffold (voice/lobby; poker stays on our server)

**Choice:** Photon **Realtime** (not Fusion) for optional voice/lobby. Fusion is unnecessary until we need predicted full-body movement beyond seated poker.

## TypeScript client (tests / tools)

```ts
import { TableClient } from "@vr-poker/netcode";

const client = new TableClient({ httpBase: "http://127.0.0.1:8787", tableId: "felt-1", playerId: "alice" });
client.connect({
  onState: (s) => console.log(s.street, s.pot),
  onError: (m) => console.error(m),
});
client.sendAction({ type: "fold" });
```

## WebSocket messages

**Server → client**

```json
{ "type": "welcome", "tableId": "felt-1", "playerId": "alice", "protocol": 1 }
{ "type": "state", "seq": 12, "state": { "...": "TableSnapshot" } }
{ "type": "presence", "seq": 13, "poses": { "bob": { "head": {}, "leftHand": {}, "rightHand": {} } } }
{ "type": "error", "message": "not your turn" }
```

**Client → server**

```json
{ "type": "action", "action": { "type": "raise", "amount": 300 } }
{ "type": "presence", "pose": { "playerId": "alice", "t": 1730000000000, "head": {}, "leftHand": {}, "rightHand": {} } }
```

Connect: `ws://127.0.0.1:8787/ws?tableId=felt-1&playerId=alice`

## Unity setup

1. Copy `unity/*.cs` into your Quest project (`Assets/VRPoker/Netcode/`).
2. Add `WebSocketTableClient` to the table rig; set server URL, table id, player id.
3. Hook `ServerAuthoritativeTableView` + `VrPresenceBroadcaster` + `RemoteAvatarInterpolator`.
4. (Optional) Photon Voice on `PhotonRealtimePresenceRoom` for spatial chat.

## Test

```bash
npm install
npm test -w @vr-poker/netcode
npm run dev   # game server with protocol v1 WS
```
