# VR client core

Scene bootstrap, Meta XR integration scaffold, seated table layout, and camera rig for Quest.

## Components

```
VrAppBootstrap
    ├── VrClientConfig (server URL, table id, comfort)
    ├── VrCameraRig (head / hands)
    ├── MetaXrBootstrap (META_XR)
    ├── TableSpatialLayout → SeatAnchor ring
    ├── TableAnchor (board / pot)
    └── ComfortProfile (seated-first, no locomotion)
```

## Server connection

`VrAppBootstrap` configures `WebSocketTableClient` from `VrClientConfig` and connects on `Start`. Poker state is **never** simulated locally — only rendered from server snapshots.

## Comfort

- Default **seated mode** with eye height ~1.35 m and table at ~0.76 m
- No snap-turn locomotion on the table scene (`ComfortProfile`)
- Player sits within reach of action zone at their `SeatAnchor`

## Table layout

`TableSpatialLayout` places 2–9 seats on a ring facing the felt center. Chip tray and action zone hang off each `SeatAnchor` (wire in interaction branch).

## Related docs

- [Unity project setup](../Project/README.md)
- [Netcode protocol](../../../docs/netcode-protocol.md)
- [Audio wiring](../../../docs/audio.md)
