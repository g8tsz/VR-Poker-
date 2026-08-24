# VR Client Core

**Branch:** `feat/vr-client-core`

Unity project foundation and Quest presence.

## Checklist

- [ ] Unity project setup + Meta XR SDK / Quest integration
- [ ] Scene / table environment
- [ ] Camera rig
- [ ] Spatial layout (seats, table, chip trays)

## Notes

- This branch owns the Unity project root (`clients/vr/` when the project is created).
- Other VR branches add packages/scenes on top of this setup — do not fork a second Unity project.
- Comfort: seated-first table; locomotion defaults should not induce snap-turn nausea in review builds.
