# VR Interaction

**Branch:** `feat/vr-interaction`

Hands, controllers, betting gestures, basic avatars.

## Checklist

- [ ] Hand tracking or controller-based card / chip interaction
- [ ] Betting gestures (slide chips, tap to check / call / raise / fold)
- [ ] Avatar system (basic presence — hands, head, maybe torso)

## Notes

- Gestures **request** actions; the game server accepts or rejects them.
- Keep a fallback controller map if hand tracking is unavailable.
- Presence is enough for v1 (hands + head). Full-body is out of scope until core play works.
