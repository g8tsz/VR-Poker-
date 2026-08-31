# VR Audio architecture

Voice and table SFX for Quest. **Photon Voice** carries spatial chat; **game-server WebSocket** remains poker truth.

## Layers

| Component | Role |
|-----------|------|
| `AudioBus` | Master / voice / SFX volumes; mute + deafen |
| `PhotonVoiceController` | Photon Voice 2 scaffold (`PHOTON_VOICE`) |
| `SeatVoiceAnchor` | Per-seat spatial voice origin |
| `TableAudioDirector` | Server snapshot → short stingers |
| `SpatialAmbientLoop` | Quiet felt ambience (ducked under voice) |
| `VrAudioSession` | OS focus / pause → auto-mute so voice does not stick on |

## Wiring

```
WebSocketTableClient.OnStateJson
        │
        ▼
TableAudioDirector ──► AudioOneShotPlayer (spatial one-shots)
        │
AudioBus ◄──── AudioMuteControls (wrist UI)
        │
        ├──► PhotonVoiceController (recorder + seat speakers)
        └──► SpatialAmbientLoop
```

1. Add `AudioBus` to bootstrap (DontDestroyOnLoad).
2. Place `TableAudioDirector` on table root; assign `WebSocketTableClient`, clip registry, `tableCenter`.
3. One `SeatVoiceAnchor` per seat; link to `PhotonVoiceController`.
4. Add `VrAudioSession` to bootstrap; forward Meta focus events if not using default `OnApplicationPause`.

## Rules

- **Voice is spatial** around seat anchors — not 2D UI mix.
- **Mute / deafen are first-class** via `AudioBus`; deafen zeros voice bus, mute stops transmit.
- **Stingers are short** (deal, street, bet, win) — no music beds under conversation.
- **Quest focus**: when the HMD loses focus (guardian, system UI), `VrAudioSession` mutes mic and deafens until focus returns.

## Photon setup

Same Photon room as `PhotonRealtimePresenceRoom` (`table-{tableId}`). Install [Photon Voice 2](https://doc.photonengine.com/voice/current/getting-started/voice-intro), add scripting define `PHOTON_VOICE`, uncomment hooks in `PhotonVoiceController.cs`.

## Clip checklist (assign in Inspector)

| Clip | Trigger |
|------|---------|
| `deal` | New `handId` |
| `flop` / `turn` / `river` | Street change |
| `chipBet` | bet / raise / blind post |
| `fold` / `check` | player action |
| `win` | pot awarded |
| `ambientLoop` | looping at table center, low volume |
