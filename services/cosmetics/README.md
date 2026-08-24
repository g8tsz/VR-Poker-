# Cosmetics / Economy Backend

**Branch:** `feat/cosmetics-economy`

Virtual item catalog and entitlements.

## Checklist

- [ ] SKU definitions (skins, table themes, avatar items)
- [ ] Purchase flow → ownership record in ledger service
- [ ] Entitlement check (does this user own this cosmetic)

## Hard rule

**No real-money-to-chip conversion, ever.** Purchases may grant cosmetics (and only cosmetics / vanity). They must not mint play chips.

## Notes

- VR rendering applies skins only after an entitlement check succeeds.
- Ownership lives in the ledger; this service defines SKUs and orchestrates the purchase write.
