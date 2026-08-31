import type { LedgerEntry } from "@vr-poker/ledger";
import { ChipLedger } from "@vr-poker/ledger";

/** Chip ledger operations used by table buy-in / cash-out. */
export interface ChipLedgerPort {
  balance(playerId: string): Promise<number>;
  history(playerId: string): Promise<LedgerEntry[]>;
  ensureAccount(playerId: string, name?: string): Promise<void>;
  buyIn(playerId: string, amount: number, tableId: string): Promise<void>;
  addOn(playerId: string, amount: number, tableId: string): Promise<void>;
  cashOut(playerId: string, amount: number, tableId: string): Promise<void>;
}

export function localChipLedgerPort(ledger = new ChipLedger()): ChipLedgerPort {
  return {
    balance: async (playerId) => ledger.balance(playerId),
    history: async (playerId) => ledger.history(playerId),
    ensureAccount: async (playerId, name) => {
      if (ledger.history(playerId).length === 0) {
        ledger.append(playerId, 100_000, "seed", name ?? "welcome");
      }
    },
    buyIn: async (playerId, amount, tableId) => {
      ledger.buyIn(playerId, amount, tableId);
    },
    addOn: async (playerId, amount, tableId) => {
      ledger.addOn(playerId, amount, tableId);
    },
    cashOut: async (playerId, amount, tableId) => {
      ledger.cashOut(playerId, amount, tableId);
    },
  };
}
