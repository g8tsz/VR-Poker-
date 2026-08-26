import { describe, expect, it } from "vitest";
import { MemoryLedgerStore, OwnershipLedger } from "@vr-poker/ledger";
import { CosmeticStore, CosmeticsError, DEFAULT_CATALOG } from "../index.ts";

function store(): CosmeticStore {
  return new CosmeticStore(DEFAULT_CATALOG, new MemoryLedgerStore(), new OwnershipLedger());
}

describe("CosmeticStore", () => {
  it("lists catalog SKUs", () => {
    const s = store();
    expect(s.catalog().length).toBe(DEFAULT_CATALOG.length);
    expect(s.catalog().every((sku) => sku.grantsChips === 0)).toBe(true);
  });

  it("purchases with chip debit and grants ownership", async () => {
    const ledger = new MemoryLedgerStore();
    const owned = new OwnershipLedger();
    const shop = new CosmeticStore(DEFAULT_CATALOG, ledger, owned);
    const sku = DEFAULT_CATALOG[0]!;
    const result = await shop.purchase("u1", sku.id);
    expect(result.priceChips).toBe(sku.priceChips);
    expect(await ledger.balance("u1")).toBe(100_000 - sku.priceChips);
    expect(shop.entitled("u1", sku.id)).toBe(true);
    const history = await ledger.history("u1");
    expect(history.some((e) => e.reason === "cosmetic_purchase")).toBe(true);
  });

  it("rejects double purchase and insufficient chips", async () => {
    const ledger = new MemoryLedgerStore();
    await ledger.ensureUser("u1");
    const owned = new OwnershipLedger();
    const shop = new CosmeticStore(DEFAULT_CATALOG, ledger, owned);
    const sku = DEFAULT_CATALOG.find((s) => s.priceChips > 100)!;
    await ledger.buyIn("u1", 100_000 - 50, "table");
    await expect(shop.purchase("u1", sku.id)).rejects.toThrow(CosmeticsError);
    await ledger.append("u1", 50_000, "seed", "top-up");
    await shop.purchase("u1", sku.id);
    await expect(shop.purchase("u1", sku.id)).rejects.toThrow(CosmeticsError);
  });

  it("never mints chips via catalog", () => {
    expect(DEFAULT_CATALOG.every((s) => s.grantsChips === 0)).toBe(true);
  });
});
