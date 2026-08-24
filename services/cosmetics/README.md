# Cosmetics / Economy Backend

**Branch:** `feat/cosmetics-economy`

Virtual item catalog and entitlements.

## Checklist

- [x] SKU definitions (skins, table themes, avatar items)
- [x] Purchase flow → ownership record in ledger (`OwnershipLedger` + chip debit)
- [x] Entitlement check (does this user own this cosmetic)

## Hard rule

**No real-money-to-chip conversion, ever.** Purchases may grant cosmetics (and only cosmetics / vanity). They must not mint play chips.

## Run

```bash
npm run cosmetics
# http://localhost:8790/health
```

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/catalog` | List SKUs (`?kind=card_skin`) |
| `POST` | `/v1/purchase` | Buy with virtual chips → ownership grant |
| `GET` | `/v1/users/:userId/owned` | Owned cosmetics |
| `GET` | `/v1/users/:userId/entitlement/:skuId` | Entitlement boolean |

## Notes

- VR rendering applies skins only after an entitlement check succeeds.
- Ownership lives in the append-only `OwnershipLedger`; chip spend uses `cosmetic_purchase` on `ChipLedger`.
- SKUs declare `grantsChips: 0` — enforced at store init.
