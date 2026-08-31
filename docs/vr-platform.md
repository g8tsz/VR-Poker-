# VR platform

Quest Store submission and parallel Steam distribution. Platform code **does not** implement poker logic.

## Architecture

```
PlatformBootstrap
├── QuestPerformanceBudget     (72 Hz, FFR)
├── QuestComfortPolicy         (seated, no locomotion)
├── PrivacyDisclosureController
├── AgeRatingGate
├── ApplicationFocusHandler    (pause / duck audio)
├── StoreComplianceRegistry    (QA checklist mirror)
└── SteamPlatformBootstrap     (parallel, optional)
        │
        ▼
VrAppBootstrap → game server URLs from PlatformEnvironmentConfig
```

## Environments

| Build | Config |
|-------|--------|
| Unity Editor | `development` → localhost |
| Development APK | `staging` |
| Release APK | `production` (auth required) |

Override via `PlatformBootstrap` serialized configs — never hard-code production URLs in client-core.

## Scene wiring

1. Add `PlatformBootstrap` next to `VrAppBootstrap`
2. Assign `QuestPerformanceBudget`, `QuestComfortPolicy`, compliance registry
3. Wire privacy + age panels to UI canvas (world-space or overlay)
4. Gate table connect: `PlatformBootstrap.CanEnterTable()` before `WebSocketTableClient.Connect()`

## Store checklists

- Quest: [quest-store-checklist.md](../clients/vr/platform/quest-store-checklist.md)
- Steam: [steam-checklist.md](../clients/vr/platform/steam-checklist.md)

## Scripting defines

| Define | Purpose |
|--------|---------|
| `META_XR` | Meta Quest SDK integration |
| `STEAMWORKS` | Steamworks.NET (PC VR parallel) |
| `UNITY_XR_MANAGEMENT` | XR loader init |

## Hard rules (review)

- No real-money chip purchase or cash-out UI
- Seated table scene is default — locomotion off
- Auth via managed provider (`@vr-poker/auth`) — no custom password store in client
