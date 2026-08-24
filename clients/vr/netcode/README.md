# VR Netcode

**Branch:** `feat/vr-netcode`

Photon + server-authoritative sync.

## Checklist

- [ ] Photon Fusion / Realtime integration
- [ ] Client-server state sync (client renders **server-authoritative** state only)
- [ ] Ownership / interpolation for smooth VR movement

## Notes

- Cards, bets, pots, and winners are never simulated as truth on the client.
- Interpolate head/hands. Snap or tween chips/cards to server events (deal, bet, collect).
- Prefer Fusion if we need predicted movement; Realtime may suffice for table-only sync — pick one on this branch and document it.
