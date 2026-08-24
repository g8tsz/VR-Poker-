# Steam (parallel) checklist

Same game binary design as Quest. Steam is a **distribution** checklist, not a second design.

## Store page

- [ ] Steam App ID assigned (`SteamPlatformBootstrap.steamAppId`)
- [ ] Privacy policy URL on store page
- [ ] Content descriptors: Gambling (simulated), Online play
- [ ] Minimum specs: Quest Link / PC VR or native if ported

## Build & depots

- [ ] Depot layout documented (Windows VR build)
- [ ] Launch options: `-vr` / OpenXR runtime selection
- [ ] Steam Cloud: disabled until save format is stable
- [ ] Achievements: optional; no real-money milestones

## Steam Input

- [ ] Controller profile for Index / Vive / generic gamepad
- [ ] Keyboard fallback for flat test parity (dev builds)
- [ ] `STEAMWORKS` define + Steamworks.NET in production

## Compliance overlap with Quest

- [ ] Virtual-only economy messaging in store description
- [ ] Age gate equivalent on first launch
- [ ] Same server-authoritative architecture — no client-side pot logic

## QA

- [ ] `StoreComplianceRegistry` steam items satisfied on RC
- [ ] Steam overlay does not block table interaction
