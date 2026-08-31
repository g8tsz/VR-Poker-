# Quest end-to-end playtest

Play a full hand on device against the local Docker stack.

## 1. Link Unity scripts

```powershell
.\scripts\link-vr-unity.ps1
```

## 2. Start backend

```bash
cp infra/.env.example infra/.env
npm run stack
```

Game server: `http://<your-pc-lan-ip>:8787`  
Web felt (second player): `npm run web` → `http://localhost:3080`

## 3. Unity project

1. Open `clients/vr/Project/` in **Unity 2022.3 LTS**
2. Install **Meta XR SDK** (Quest)
3. Scene: add `VrAppBootstrap` + assign `WebSocketTableClient`
4. Set `VrClientConfig` server URL to your PC LAN IP (`8787`)

## 4. Validate

| Step | Quest | Web / 2nd Quest |
|------|-------|-----------------|
| Sit | WS `sit` or HTTP `/sit` | Same table id |
| Deal | WS `start` | — |
| Bet | Gestures / action pads | Click actions |
| Showdown | Server state only | Same |
| Payout | `street: payout` snapshot | Same |
| Next hand | `waiting` → `start` again | — |

## Service integration (stack)

With `npm run stack`, game-server uses:

- `LEDGER_URL=http://ledger:8786` — buy-in / cash-out via ledger service + Postgres
- `DEAL_RNG_URL=http://deal-rng:8788` — commit-reveal mirrored to audit log

Local `npm run dev` (no compose) keeps in-process ledger/deal for fast iteration.

## Auth (optional)

```bash
AUTH_DISABLED=0
node infra/scripts/dev-token.mjs alice
```

Pass `Authorization: Bearer <token>` on `/accounts` and `/sit`.
