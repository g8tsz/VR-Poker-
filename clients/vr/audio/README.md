# VR Audio

**Branch:** `feat/vr-audio`

Spatial voice + table sound for Quest.

## Checklist

- [x] Spatial voice chat scaffold (Photon Voice 2 + `SeatVoiceAnchor`, `PHOTON_VOICE`)
- [x] Table / ambient sound (`TableAudioDirector`, `SpatialAmbientLoop`)
- [x] Mute / deafen first-class (`AudioBus`, `AudioMuteControls`)
- [x] Short betting / deal stingers (no music under voice)
- [x] Quest audio session / focus (`VrAudioSession`)

## Unity scripts

`clients/vr/audio/unity/`

| Script | Purpose |
|--------|---------|
| `AudioBus` | Volumes, mute, deafen |
| `PhotonVoiceController` | Voice transmit + seat speakers |
| `SeatVoiceAnchor` | Spatial origin per seat |
| `TableAudioDirector` | Server WS → SFX |
| `SpatialAmbientLoop` | Felt ambience |
| `VrAudioSession` | OS focus → safe mute |
| `AudioMuteControls` | UI toggles |

See [docs/audio.md](../../../docs/audio.md) for wiring.

## Depends on

- `feat/vr-netcode` — `WebSocketTableClient`, optional `PhotonRealtimePresenceRoom`
- Assign `TableAudioClips` in Inspector (no committed `.wav` assets in repo)
