# Game Server

**Branch:** `feat/game-server`

No-Limit Texas Hold'em table engine, buy-in/cash-out, HTTP + WebSocket.

## Play locally

```bash
npm install
npm test                 # engine, deal fairness, ledger
npm run play             # terminal felt (two+ seats, buy-in, full hands)
npm run dev              # HTTP server on :8787
```

### CLI

```
account alice Alice
sit alice Alice 10000 0
account bob Bob
sit bob Bob 10000 1
start
as alice
raise 300
as bob
call
```

### HTTP (curl / Postman)

```bash
curl -s -X POST localhost:8787/accounts -H "content-type: application/json" -d "{\"playerId\":\"alice\",\"name\":\"Alice\"}"
curl -s -X POST localhost:8787/tables -H "content-type: application/json" -d "{\"id\":\"felt-1\"}"
curl -s -X POST localhost:8787/tables/felt-1/sit -H "content-type: application/json" -d "{\"playerId\":\"alice\",\"name\":\"Alice\",\"buyIn\":10000,\"seat\":0}"
curl -s -X POST localhost:8787/tables/felt-1/start
curl -s localhost:8787/tables/felt-1?playerId=alice
curl -s -X POST localhost:8787/tables/felt-1/act -H "content-type: application/json" -d "{\"playerId\":\"alice\",\"type\":\"fold\"}"
```

WebSocket: `ws://127.0.0.1:8787/ws?tableId=felt-1&playerId=alice` — protocol v1 (`@vr-poker/netcode`). Send `{ "type": "action", "action": { "type": "fold" } }`; receive `{ "type": "state", "seq", "state" }` and `{ "type": "presence", "poses" }`. See [docs/netcode-protocol.md](../../docs/netcode-protocol.md).

## Checklist

- [x] Table state machine (`waiting` → `dealing` → betting streets → `showdown` → `payout`)
- [x] Betting logic: check / call / raise / fold / all-in (NLHE raise-to, min-raise)
- [x] Side pot calculation (all-in edge cases)
- [x] 7-card hold'em evaluator (best 5 of 7)
- [x] Turn order / timeout / auto-fold (server timer, never auto-check)
- [x] Table config (blinds, buy-in min/max, rake, no-flop-no-rake)
- [x] API / WS layer to drive a full hand externally

## Rules (this cut)

- No-limit hold'em, 2–9 seats, integer chips, table stakes.
- Buy-in only between hands, in `[minBuyIn, maxBuyIn]`. Cash-out only between hands.
- Heads-up: button posts SB and acts first preflop; BB acts first postflop.
- Timeouts **auto-fold**.
- Rake is virtual chips to the house (no cash). Default 5% cap 300, no flop no rake.
- Cards from `@vr-poker/deal` (CSPRNG Fisher-Yates + commit-reveal).
- Buy-in/cash-out go through `@vr-poker/ledger` (append-only; balance is derived).
