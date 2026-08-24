import { ChipLedger, LedgerError, OwnershipLedger } from "@vr-poker/ledger";
import { catalogById } from "./catalog.ts";
import { CosmeticsError } from "./errors.ts";
import type { CosmeticSku, PurchaseResult } from "./types.ts";

export class CosmeticStore {
  private readonly skus: Map<string, CosmeticSku>;

  constructor(
    catalog: CosmeticSku[],
    private readonly chips: ChipLedger,
    private readonly ownership: OwnershipLedger,
  ) {
    this.skus = catalogById(catalog);
    for (const s of this.skus.values()) {
      if (s.grantsChips !== 0) {
        throw new CosmeticsError(`SKU ${s.id} must not grant chips`);
      }
    }
  }

  catalog(): CosmeticSku[] {
    return [...this.skus.values()].sort((a, b) => a.kind.localeCompare(b.kind) || a.priceChips - b.priceChips);
  }

  getSku(skuId: string): CosmeticSku {
    const sku = this.skus.get(skuId);
    if (!sku) throw new CosmeticsError("unknown sku");
    return sku;
  }

  entitled(userId: string, skuId: string): boolean {
    this.getSku(skuId);
    return this.ownership.owns(userId, skuId);
  }

  owned(userId: string): CosmeticSku[] {
    return this.ownership
      .ownedSkus(userId)
      .map((id) => this.skus.get(id))
      .filter((s): s is CosmeticSku => Boolean(s));
  }

  purchase(userId: string, skuId: string): PurchaseResult {
    const sku = this.getSku(skuId);
    if (this.ownership.owns(userId, skuId)) {
      throw new CosmeticsError("already owned");
    }
    let ledgerEntry;
    try {
      ledgerEntry = this.chips.cosmeticPurchase(userId, sku.priceChips, skuId);
    } catch (err) {
      if (err instanceof LedgerError) throw new CosmeticsError(err.message);
      throw err;
    }
    const own = this.ownership.grant(userId, skuId, "purchase", String(ledgerEntry.id));
    return {
      skuId,
      userId,
      priceChips: sku.priceChips,
      ledgerEntryId: ledgerEntry.id,
      ownershipEntryId: own.id,
      purchasedAt: own.at,
    };
  }

  grant(userId: string, skuId: string, ref?: string): void {
    this.getSku(skuId);
    if (this.ownership.owns(userId, skuId)) return;
    this.ownership.grant(userId, skuId, "grant", ref);
  }
}
