# VR interaction

Betting gestures and avatar presence. **All poker actions are intents** — the game server accepts or rejects.

## Flow

```
Hand / Controller / Action Pad
        │
        ▼
PokerActionRelay ──► WebSocketTableClient.SendAction
        ▲
        │
Server state JSON ──► LegalActionProbe ──► BettingActionPad (enabled pads)
```

## Gestures

| Input | Action |
|-------|--------|
| Chip slide (tray → pot) | `bet` or `raise` (min legal amount) |
| Poke action pad | fold / check / call / all-in |
| Keyboard 1–5 (dev fallback) | fold / check / call / bet / all-in |

## Avatars

- `LocalAvatarVisual` — mirrors tracked head/hands for local player
- `RemoteAvatarVisual` — head + hand proxies for remote seats (drive from `RemoteAvatarInterpolator`)

## Scene wiring

1. Add `PokerInteractionController` next to `VrAppBootstrap`
2. Assign `WebSocketTableClient`, `PokerActionRelay`, `BettingActionPad`, `VrCameraRig`, your `SeatAnchor`
3. Place `ActionPadButton` colliders in front of the seat; tag hand colliders via `HandInteractor`
4. Optional: `ChipSlideGesture` uses right hand + chip tray + pot center

## Hand tracking

Meta hand tracking: assign `VrCameraRig` hand transforms. When tracking is lost, `ControllerBettingMap` remains available.

See [netcode protocol](./netcode-protocol.md).
