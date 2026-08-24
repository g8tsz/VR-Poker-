import { describe, expect, it } from "vitest";
import { ChipLedger } from "@vr-poker/ledger";
import { OwnershipLedger } from "@vr-poker/ledger";
import { CosmeticStore, CosmeticsError, DEFAULT_CATALOG } from "../index.ts";

function store(): CosmeticStore {
  const chips = new ChipLedger();
  const ownership = new OwnershipLedger();
  return new CosmeticStore(DEFAULT_CATALOG, chips, ownership);
}

describe("CosmeticStore", () => {
  it("lists catalog SKUs", () => {
    const s = store();
    expect(s.catalog().length).toBe(DEFAULT_CATALOG.length);
    expect(s.catalog().every((sku) => sku.grantsChips === 0)).toBe(true);
  });

  it("purchases with chip debit and grants ownership", () => {
    const s = store();
    const chips = new ChipLedger();
    chips.append("u1", 10_000, "seed");
    const owned = new OwnershipLedger();
    const shop = new CosmeticStore(DEFAULT_CATALOG, chips, owned);
    const sku = DEFAULT_CATALOG[0]!;
    const result = shop.purchase("u1", sku.id);
    expect(result.priceChips).toBe(sku.priceChips);
    expect(chips.balance("u1")).toBe(10_000 - sku.priceChips);
    expect(shop.entitled("u1", sku.id)).toBe(true);
    expect(chips.history("u1").some((e) => e.reason === "cosmetic_purchase")).toBe(true);
    expect(s.catalog()).toBeDefined();
  });

  it("rejects double purchase and insufficient chips", () => {
    const chips = new ChipLedger();
    chips.append("u1", 100, "seed");
    const owned = new OwnershipLedger();
    const shop = new CosmeticStore(DEFAULT_CATALOG, chips, owned);
    const sku = DEFAULT_CATALOG.find((s) => s.priceChips > 100)!;
    expect(() => shop.purchase("u1", sku.id)).toThrow(CosmeticsError);
    chips.append("u1", 50_000, "seed");
    shop.purchase("u1", sku.id);
    expect(() => shop.purchase("u1", sku.id)).toThrow(CosmeticsError);
  });

  it("never mints chips via catalog", () => {
    expect(DEFAULT_CATALOG.every((s) => s.grantsChips === 0)).toBe(true);
  });
});
