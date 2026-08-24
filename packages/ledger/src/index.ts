export type LedgerReason =
  | "seed"
  | "buy_in"
  | "add_on"
  | "cash_out"
  | "rake"
  | "cosmetic_purchase";

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
}
