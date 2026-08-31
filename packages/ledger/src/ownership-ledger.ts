import { LedgerError } from "./errors.ts";

export type OwnershipSource = "purchase" | "grant" | "tournament_reward";

export interface OwnershipEntry {
  id: number;
  at: string;
  userId: string;
  skuId: string;
  source: OwnershipSource;
  ref?: string;
}

/** Append-only cosmetic ownership log. Entitlement is derived, never stored. */
export class OwnershipLedger {
  private entries: OwnershipEntry[] = [];
  private nextId = 1;

  grant(userId: string, skuId: string, source: OwnershipSource, ref?: string): OwnershipEntry {
    if (this.owns(userId, skuId)) {
      throw new LedgerError("already owns cosmetic");
    }
    const entry: OwnershipEntry = {
      id: this.nextId++,
      at: new Date().toISOString(),
      userId,
      skuId,
      source,
      ref,
    };
    this.entries.push(entry);
    return entry;
  }

  owns(userId: string, skuId: string): boolean {
    return this.entries.some((e) => e.userId === userId && e.skuId === skuId);
  }

  ownedSkus(userId: string): string[] {
    return [...new Set(this.entries.filter((e) => e.userId === userId).map((e) => e.skuId))];
  }

  history(userId: string): OwnershipEntry[] {
    return this.entries.filter((e) => e.userId === userId);
  }

  all(): OwnershipEntry[] {
    return [...this.entries];
  }
}
