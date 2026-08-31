# Flat Test Client

**Branch:** `feat/flat-test-client`

Debug driver for server-authoritative NLHE — local in-process engine or remote game server.

## Checklist

- [x] CLI felt (buy-in, blinds, full hand, pots, commit hash)
- [x] Remote mode against game-server HTTP API (`--remote`)
- [x] Scripted demo — 3-player smoke hand with commit-reveal (`npm run demo`)
- [x] Web debug UI (`npm run web` → :3080, talks to :8787)

## Commands

```bash
npm run play                 # local in-process engine
npm run play:remote          # CLI against http://127.0.0.1:8787
npm run demo                 # automated 3-player hand (CI smoke)
npm run web                  # browser felt on :3080
npm test -w @vr-poker/flat-test
```

Start the game server in another terminal for remote/web modes:

```bash
npm run dev                  # :8787
```

## CLI quick start

```
> account alice Alice
> sit alice Alice 5000
> sit bob Bob 5000
> as alice
> start
> check
```

Still the long-term debug tool — not throwaway scaffolding.
