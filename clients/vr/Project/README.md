# Unity project (Quest)

Open this folder as the Unity project root (`clients/vr/Project`).

## First-time setup

1. Install **Unity 2022.3 LTS** with Android Build Support.
2. Open `clients/vr/Project` in Unity Hub.
3. Install **Meta XR SDK** (All-in-One) from [Meta Quest Developer Center](https://developer.oculus.com/downloads/package/unity-integration/).
4. Add scripting define `META_XR` for Android standalone.
5. Symlink or copy script folders into `Assets/VRPoker/`:
   - `../client-core/unity`
   - `../netcode/unity`
   - `../interaction/unity`
   - `../audio/unity`
   - `../platform/unity`
   - `../rendering/unity`

## Scene hierarchy (recommended)

```
VrAppBootstrap
├── XR Origin (Meta OVRCameraRig or XROrigin)
│   └── VrCameraRig (head / hands assigned)
├── TableRoot
│   ├── TableAnchor
│   └── TableSpatialLayout
├── Netcode
│   ├── WebSocketTableClient
│   ├── VrPresenceBroadcaster
│   └── ServerAuthoritativeTableView
├── Interaction
│   ├── PokerInteractionController
│   ├── PokerActionRelay + BettingActionPad
│   └── LocalAvatarVisual
├── Platform
│   ├── PlatformBootstrap
│   ├── QuestPerformanceBudget + QuestComfortPolicy
│   └── Privacy / Age gates
├── Rendering
│   ├── RenderingBootstrap + TableRenderer
│   ├── BoardRenderer + HoleCardRenderer
│   └── ChipStackRenderer + CardPool
└── AudioBus + VrAudioSession + TableAudioDirector
```

## Build target

- Platform: **Android**
- Texture compression: ASTC
- Min API: Android 10+
- XR plug-in: OpenXR + Meta Quest feature group

Do not create a second Unity project on other VR branches — extend this one.
