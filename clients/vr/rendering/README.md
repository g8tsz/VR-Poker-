# VR Rendering

**Branch:** `feat/vr-rendering`

Table visuals, deal/chip animation, cosmetic skins.

## Checklist

- [x] Card / chip / table rendering scaffold (`CardVisual`, `ChipStackRenderer`, `BoardRenderer`)
- [x] Deal animation + chip flight (`DealAnimationDirector`, `ChipFlightAnimator`)
- [x] Cosmetic skin application from entitlement (`CosmeticSkinApplier`, `CosmeticSkinCatalog`)

## Unity scripts

`clients/vr/rendering/unity/` — namespace `VRPoker.Rendering`

| Script | Purpose |
|--------|---------|
| `TableRenderer` | Applies server snapshots to board/holes/chips |
| `BoardRenderer` | Community card layout |
| `HoleCardRenderer` | Per-seat hole cards (hidden until showdown) |
| `ChipStackRenderer` | Pot + street commit stacks |
| `DealAnimationDirector` | Card deal flight (presentation) |
| `ChipFlightAnimator` | Bet chip flight to pot |
| `CosmeticSkinApplier` | Entitlement-gated materials |
| `RenderingBootstrap` | Scene wiring |

See [docs/vr-rendering.md](../../../docs/vr-rendering.md).

## Notes

- Skins apply only when cosmetics service reports ownership.
- Animation does not change server outcomes.
- Keep draw calls low — pool cards via `CardPool`.
