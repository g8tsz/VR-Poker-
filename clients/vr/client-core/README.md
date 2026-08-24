# VR Client Core

**Branch:** `feat/vr-client-core`

Unity project foundation and Quest presence.

## Checklist

- [x] Unity project setup + Meta XR SDK / Quest integration (`clients/vr/Project`, `MetaXrBootstrap`)
- [x] Scene / table environment (`TableAnchor`, bootstrap hierarchy doc)
- [x] Camera rig (`VrCameraRig` — head / hands for presence + interaction)
- [x] Spatial layout (`TableSpatialLayout`, `SeatAnchor` ring, chip/action hooks)

## Quick start

1. Open [`clients/vr/Project`](../Project/) in Unity 2022.3 LTS
2. Link scripts from `client-core/unity`, `netcode/unity`, `audio/unity` into `Assets/VRPoker/`
3. Add `VrAppBootstrap` to scene; assign rig + `WebSocketTableClient`
4. Build Android → Quest

See [docs/vr-client-core.md](../../../docs/vr-client-core.md) and [Project README](../Project/README.md).

## Notes

- This branch owns the Unity project root — other VR branches add scripts, not a second project.
- Comfort: seated-first table; locomotion off by default in review builds.
- `VrAppBootstrap` connects to `npm run dev` game server (`:8787`) using `VrClientConfig`.
