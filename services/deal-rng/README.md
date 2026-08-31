# Deal / RNG Service

**Branch:** `feat/deal-rng-service`

Standalone fairness service. Shuffle happens here. Seed is **not** returned until the hand is closed. History is append-only JSONL — never rewritten.

```bash
npm install
npm test -w @vr-poker/deal -w @vr-poker/deal-rng
npm run deal                 # http://127.0.0.1:8788
```

## Checklist

- [x] CSPRNG-seeded shuffle (Fisher-Yates, unbiased index)
- [x] Commit-reveal (`SHA-256(seed || nonce)` pre-deal, reveal post-hand)
- [x] Hand-result JSON contract (deck order, hole cards, board cards, burns, verified)
- [x] Statistical / bias tests (position frequencies + χ²)
- [x] Hand history logging (immutable JSONL: `hand.open` then `hand.close`)
- [x] Structured integrity logs on stdout (`deal-rng` events)

## API

```bash
# 1. Commit — no cards, no seed
curl -s -X POST localhost:8788/v1/hands -H "content-type: application/json" \
  -d "{\"tableId\":\"felt-1\",\"handId\":\"h1\"}"

# 2. Draw (kind=next | burn). Repeat for hole / flop / turn / river.
curl -s -X POST localhost:8788/v1/hands/h1/draw -H "content-type: application/json" \
  -d "{\"kind\":\"next\"}"

# 3. Reveal + persist. Second close is idempotent (no extra history line).
curl -s -X POST localhost:8788/v1/hands/h1/close -H "content-type: application/json" \
  -d "{\"holeCards\":{\"0\":[\"As\",\"Kd\"],\"1\":[\"7c\",\"7d\"]},\"boardCards\":[\"2h\",\"9s\",\"Td\"]}"

curl -s localhost:8788/v1/hands/h1
```

Open response is only `{ handId, tableId, commitment, openedAt }`.

Close response is the full contract: `commitment`, `reveal.seed`, `reveal.nonce`, `deckOrder`, `draws`, `holeCards`, `boardCards`, `burnCards`, `verified`.

Anyone can re-run Fisher-Yates from the revealed seed and match `deckOrder`.

History file: `data/hand-history.jsonl` (or `DEAL_HISTORY`).

Game-server still shuffles in-process via `@vr-poker/deal` until it is pointed at this service.
