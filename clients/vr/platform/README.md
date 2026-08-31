# VR Platform

**Branch:** `feat/vr-platform`

Store submission and device constraints.

## Checklist

- [x] Quest Store requirements — performance, comfort, privacy (`QuestPerformanceBudget`, `QuestComfortPolicy`, gates)
- [x] Steam parallel checklist (`SteamPlatformBootstrap`, `steam-checklist.md`)

## Unity scripts

`clients/vr/platform/unity/` — namespace `VRPoker.Platform`

| Script | Purpose |
|--------|---------|
| `PlatformBootstrap` | Environment URLs, gates, compliance wiring |
| `QuestPerformanceBudget` | 72 Hz target, FFR scaffold |
| `QuestComfortPolicy` | Seated-only, no locomotion |
| `PrivacyDisclosureController` | First-run data safety |
| `AgeRatingGate` | Simulated gambling age confirm |
| `ApplicationFocusHandler` | Pause / audio duck on focus loss |
| `StoreComplianceRegistry` | QA checklist mirror |
| `SteamPlatformBootstrap` | Steam Input / depot scaffold |
| `BuildVersionStamp` | Debug version overlay |

## Docs

- [docs/vr-platform.md](../../../docs/vr-platform.md)
- [quest-store-checklist.md](./quest-store-checklist.md)
- [steam-checklist.md](./steam-checklist.md)

## Notes

- Target 72 Hz, FFR on Quest; seated comfort defaults.
- Virtual chips only — compliance registry marks `virtual-only` satisfied by design.
- Steam is parallel distribution, not a second game design.
