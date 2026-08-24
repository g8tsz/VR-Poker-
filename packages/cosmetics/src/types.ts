export type CosmeticKind = "card_skin" | "table_theme" | "avatar_item";

export interface CosmeticSku {
  id: string;
  kind: CosmeticKind;
  name: string;
  description: string;
  /** Virtual chip price. Never mints play chips — spend only. */
  priceChips: number;
  /** Cosmetic-only grant. Must never include chip credits. */
  grantsChips: 0;
  tags: string[];
}

export interface PurchaseResult {
  skuId: string;
  userId: string;
  priceChips: number;
  ledgerEntryId: number;
  ownershipEntryId: number;
  purchasedAt: string;
}
