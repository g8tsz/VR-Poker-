import { MemoryLedgerStore } from "./memory-store.ts";
import { createPgLedgerStore } from "./pg-store.ts";
import type { LedgerStore } from "./store.ts";

/** Shared ledger backing store: Postgres when DATABASE_URL is set, else in-memory. */
export function resolveLedgerStore(): LedgerStore {
  const url = process.env.DATABASE_URL;
  if (url) return createPgLedgerStore(url);
  return new MemoryLedgerStore();
}
