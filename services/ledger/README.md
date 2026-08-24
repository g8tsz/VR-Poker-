# Ledger Service

**Branch:** `feat/ledger-service`

Accounts, clubs, and the chip source of truth.

## Checklist

- [ ] User accounts (auth integration — **not** building auth itself)
- [ ] Club CRUD (create, settings, ownership)
- [ ] Club membership (invite / join / roles / kick / ban)
- [ ] Append-only chip ledger + balance derivation
- [ ] Transaction history / audit trail
- [ ] Club-level rake / settings enforcement

## Notes

- Map managed-auth `sub` → `user_id`. No passwords in this service.
- Balance = sum of ledger entries for that account. Never `UPDATE users SET chips`.
- Club rake/settings are the policy the game server must honor.
- Cosmetic purchases write ownership/spend rows here (see cosmetics service); still no cash → chip conversion.
