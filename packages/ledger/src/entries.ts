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
