# Deal / RNG integrity logs

Deal-service emits **one JSON object per line** on stdout. Ship these logs to your drain and retain them as audit evidence.

## Event types

| Event | When |
|-------|------|
| `hand.open` | Commitment created, deck shuffled |
| `hand.draw` | Card or burn drawn |
| `hand.close` | Hand closed, result persisted |
| `hand.verify_ok` | Commit-reveal verification passed |
| `hand.verify_fail` | Shuffle did not match commitment |
| `hand.reject` | Invalid draw/close attempt |

## Example

```json
{"ts":"2026-08-24T05:00:00.000Z","service":"deal-rng","event":"hand.open","handId":"felt-1:1","commitment":"a3f2…"}
```

## Local

```bash
docker compose -f infra/docker-compose.yml logs -f deal-rng
```

With `DATABASE_URL` set, the same events are mirrored into `deal_audit_events` for SQL queries.

## Silence

Set `DEAL_SILENT=1` to suppress stdout (not recommended in production).
