export type LedgerReason =
  | "seed"
  | "buy_in"
  | "add_on"
  | "cash_out"
  | "rake"
  | "cosmetic_purchase"
  | "tournament_buy_in"
  | "tournament_prize";

export interface LedgerEntry {
  id: number;
  at: string;
  userId: string;
  amount: number;
  reason: LedgerReason;
  ref?: string;
}

export class LedgerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LedgerError";
  }
}

/** Append-only chip ledger. Balance is always derived, never stored. */
export class ChipLedger {
  private entries: LedgerEntry[] = [];
  private nextId = 1;

  append(userId: string, amount: number, reason: LedgerReason, ref?: string): LedgerEntry {
    if (!Number.isInteger(amount) || amount === 0) {
      throw new LedgerError("amount must be a non-zero integer");
    }
    if (amount < 0 && this.balance(userId) + amount < 0) {
      throw new LedgerError("insufficient chips");
    }
    if (reason === "seed" && amount < 0) throw new LedgerError("seed must credit");
    const entry: LedgerEntry = {
      id: this.nextId++,
      at: new Date().toISOString(),
      userId,
      amount,
      reason,
      ref,
    };
    this.entries.push(entry);
    return entry;
  }

  balance(userId: string): number {
    return this.entries.filter((e) => e.userId === userId).reduce((s, e) => s + e.amount, 0);
  }

  history(userId: string): LedgerEntry[] {
    return this.entries.filter((e) => e.userId === userId);
  }

  all(): LedgerEntry[] {
    return [...this.entries];
  }

  buyIn(userId: string, amount: number, tableId: string): LedgerEntry {
    return this.append(userId, -amount, "buy_in", tableId);
  }

  addOn(userId: string, amount: number, tableId: string): LedgerEntry {
    return this.append(userId, -amount, "add_on", tableId);
  }

  cashOut(userId: string, amount: number, tableId: string): LedgerEntry {
    return this.append(userId, amount, "cash_out", tableId);
  }

  tournamentBuyIn(userId: string, amount: number, tournamentId: string): LedgerEntry {
    return this.append(userId, -amount, "tournament_buy_in", tournamentId);
  }

  tournamentPrize(userId: string, amount: number, tournamentId: string): LedgerEntry {
    return this.append(userId, amount, "tournament_prize", tournamentId);
  }

  cosmeticPurchase(userId: string, amount: number, skuId: string): LedgerEntry {
    if (amount <= 0) throw new LedgerError("cosmetic purchase amount must be positive");
    return this.append(userId, -amount, "cosmetic_purchase", skuId);
  }
}

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
