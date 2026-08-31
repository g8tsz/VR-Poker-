# VR Interaction

**Branch:** `feat/vr-interaction`

Hands, controllers, betting gestures, basic avatars.

## Checklist

- [x] Hand tracking / controller interaction (`HandInteractor`, `ChipSlideGesture`, `ControllerBettingMap`)
- [x] Betting gestures — slide chips + poke pads (`BettingActionPad`, `PokerActionRelay`)
- [x] Avatar system — local + remote head/hands (`LocalAvatarVisual`, `RemoteAvatarVisual`)

## Unity scripts

`clients/vr/interaction/unity/` — namespace `VRPoker.Interaction`

| Script | Purpose |
|--------|---------|
| `PokerInteractionController` | Wires state → pads + chip slide |
| `PokerActionRelay` | Sends WS action intents |
| `BettingActionPad` | Legal-action poke buttons |
| `ChipSlideGesture` | Tray → pot slide = bet/raise |
| `ControllerBettingMap` | Keyboard / controller fallback |
| `LocalAvatarVisual` / `RemoteAvatarVisual` | Head + hands presence |

See [docs/vr-interaction.md](../../../docs/vr-interaction.md).

## Notes

- Gestures **request** actions; server accepts or rejects.
- Tag hand colliders with `HandInteractor` (`PlayerHand` tag).
- Presence is head + hands only for v1.
