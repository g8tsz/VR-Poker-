# Flat Test Client

**Branch:** `feat/flat-test-client`

Terminal or web client that hits the game server API. Long-term debug tool, not throwaway scaffolding.

## Checklist

- [ ] Terminal or web client hitting the game server API
- [ ] Enough UI / logging to play a full multi-player hand
- [ ] Verify state transitions (`waiting` → … → `payout`)
- [ ] Useful as a standing debug tool (hand dump, pot breakdown, auto-fold timers)

## Notes

- Prefer something scriptable (CLI) with an optional thin web view.
- Drive at least two seats through a complete hand without Unity.
- Log commitment hashes and revealed seeds when the deal service is wired, so fairness can be checked from this client.
