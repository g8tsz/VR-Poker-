# VR rendering

Table visuals driven by **server state** — cards, chips, and cosmetic skins. Animation is presentation only.

## Architecture

```
WebSocketTableClient.OnStateJson
        │
        ▼
TableRenderer ──┬── BoardRenderer      (community cards)
                ├── HoleCardRenderer   (seat hole cards)
                ├── ChipStackRenderer  (pot + street commits)
                └── DealAnimationDirector (optional flight)

CosmeticSkinApplier ── GET /v1/users/{id}/owned ──► CosmeticSkinCatalog
```

## Assets (Unity project)

Place in `Assets/VRPoker/Art/`:

| Asset | Notes |
|-------|--------|
| Card prefab | `CardVisual` + thin box mesh, face/back materials |
| Chip prefab | Low-poly cylinder, instanced stacks |
| Felt material | URP Lit, ASTC 4×4 on Quest |

Procedural stacks in `ChipStackRenderer` avoid physics for Quest CPU budget.

## Cosmetic skins

SKU → material mapping in `CosmeticSkinCatalog`:

| SKU | Kind |
|-----|------|
| `skin-neon-52` | card back |
| `skin-wood-classic` | card back |
| `theme-vegas-night` | felt |
| `theme-clubhouse` | felt |

`CosmeticSkinApplier` only applies when `/v1/users/{id}/owned` includes the SKU.

## Animation rules

- `DealAnimationDirector` and `ChipFlightAnimator` are **cosmetic**
- Turbo/skip must call `SkipAll()` — never alter bets or cards locally
- Snap to server `state` on every `seq` increment

## Scene wiring

1. Add `RenderingBootstrap` under `TableRoot`
2. Assign `TableRenderer`, `BoardRenderer`, `HoleCardRenderer`, `ChipStackRenderer`, `CardPool`
3. Point `TableAnchor` board/pot transforms from client-core
4. Link `CosmeticSkinApplier` to felt renderer + card prefabs

See [Quest performance](../clients/vr/platform/quest-store-checklist.md).
