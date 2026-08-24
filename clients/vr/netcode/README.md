# VR Netcode

**Branch:** `feat/vr-netcode`

Server-authoritative poker over **game-server WebSocket**. VR head/hands over the same socket (relay + interpolation). **Photon Realtime** is optional for voice/lobby — not poker truth.

## Architecture

```text
Quest client
  ├─ TableHttpClient / TableSessionBootstrap  →  HTTP sit/start (or WS sit/start)
  ├─ WebSocketTableClient  →  game-server /ws  (state, actions, presence, reconnect)
  ├─ ServerAuthoritativeTableView  ← snapshots only (pot, street, seats)
  ├─ VrPresenceBroadcaster  →  presence @ 20 Hz (server stamps time)
  ├─ RemoteAvatarInterpolator  ← per-player avatars, server-time interpolation
  └─ PhotonRealtimePresenceRoom  (optional voice / room discovery)
```

**Rule:** cards, bets, pots, and winners always come from `type: "state"` messages. Never simulate them on the client.

## Checklist

- [x] Wire protocol (`@vr-poker/netcode`) — `state`, `presence`, `action`, `error`, `sit`, `leave`, `start`, `ping`
- [x] Bidirectional game-server WebSocket (actions + presence relay)
- [x] Server-time presence stamps + clock sync via `welcome` / `pong`
- [x] Payout snapshot broadcast before hand cleanup
- [x] Pose interpolation buffer (`PoseInterpolator`, 100 ms delay default)
- [x] Unity scripts (`clients/vr/netcode/unity/`) — main-thread dispatch, reconnect, multi-avatar
- [x] HTTP bootstrap (`TableHttpClient`, `TableSessionBootstrap`)
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
client.sendSit("Alice", 10000);
client.sendStart();
client.sendAction({ type: "fold" });
```

## WebSocket messages

**Server → client**

```json
{ "type": "welcome", "tableId": "felt-1", "playerId": "alice", "protocol": 1, "serverTime": 1730000000000 }
{ "type": "state", "seq": 12, "state": { "...": "TableSnapshot" } }
{ "type": "presence", "seq": 13, "serverTime": 1730000000000, "poses": { "bob": { "t": 1730000000000, "head": {}, "leftHand": {}, "rightHand": {} } } }
{ "type": "pong", "serverTime": 1730000000000 }
{ "type": "left", "playerId": "alice", "cashedOut": 9500 }
{ "type": "error", "message": "not your turn" }
```

**Client → server**

```json
{ "type": "action", "action": { "type": "raise", "amount": 300 } }
{ "type": "presence", "pose": { "head": {}, "leftHand": {}, "rightHand": {} } }
{ "type": "sit", "name": "Alice", "buyIn": 10000, "seat": 0 }
{ "type": "leave" }
{ "type": "start" }
{ "type": "ping" }
```

Connect: `ws://127.0.0.1:8787/ws?tableId=felt-1&playerId=alice`

## Unity setup

1. Copy `unity/*.cs` into your Quest project (`Assets/VRPoker/Netcode/`).
2. Add `WebSocketTableClient` + optional `TableHttpClient` + `TableSessionBootstrap`.
3. Call `TableSessionBootstrap.JoinAndConnect()` or HTTP sit then `WebSocketTableClient.Connect()`.
4. Hook `ServerAuthoritativeTableView` + `VrPresenceBroadcaster` + `RemoteAvatarInterpolator` (assign `_avatarPrefab` with optional `Head` / `LeftHand` / `RightHand` child transforms).
5. (Optional) Photon Voice on `PhotonRealtimePresenceRoom` for spatial chat.

## Test

```bash
npm install
npm test
npm run dev   # game server with protocol v1 WS
```
