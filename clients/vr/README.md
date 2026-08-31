# VR client

Unity / Meta Quest client. **Project root:** [`Project/`](./Project/) (open in Unity Hub).

All modules live on `main` under `clients/vr/`:

| Folder | Module |
|--------|--------|
| [client-core/](./client-core/) + [Project/](./Project/) | Scene bootstrap, spatial layout, Meta XR |
| [netcode/](./netcode/) | WebSocket table client, presence interpolation |
| [interaction/](./interaction/) | Betting gestures, action pads, avatars |
| [rendering/](./rendering/) | Cards, chips, deal animation, cosmetic skins |
| [audio/](./audio/) | Spatial audio, table stingers, Photon Voice scaffold |
| [platform/](./platform/) | Quest store compliance, privacy/age gates |

Wire all `*/unity` script folders into one Unity project — see [Project/README.md](./Project/README.md).
