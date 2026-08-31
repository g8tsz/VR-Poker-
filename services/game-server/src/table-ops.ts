import { PokerError, Table } from "@vr-poker/core";
import type { ChipLedgerPort } from "./ledger-port.ts";

export interface TableOpsCtx {
  tables: Map<string, Table>;
  ledger: ChipLedgerPort;
  names: Map<string, string>;
  ensureAccount: (playerId: string, name?: string) => Promise<void>;
  armTimeout: (table: Table) => void;
}

export async function sitAtTable(
  ctx: TableOpsCtx,
  tableId: string,
  playerId: string,
  name: string,
  buyIn: number,
  seat?: number,
): Promise<Table> {
  const table = ctx.tables.get(tableId);
  if (!table) throw new PokerError("table not found");
  await ctx.ensureAccount(playerId, name);
  await ctx.ledger.buyIn(playerId, buyIn, tableId);
  try {
    table.sit(playerId, name, buyIn, seat);
  } catch (err) {
    await ctx.ledger.cashOut(playerId, buyIn, tableId);
    throw err;
  }
  return table;
}

export async function leaveTable(
  ctx: TableOpsCtx,
  tableId: string,
  playerId: string,
): Promise<number> {
  const table = ctx.tables.get(tableId);
  if (!table) throw new PokerError("table not found");
  const chips = table.cashOut(playerId);
  if (chips > 0) await ctx.ledger.cashOut(playerId, chips, tableId);
  return chips;
}

export function startTableHand(ctx: TableOpsCtx, tableId: string): Table {
  const table = ctx.tables.get(tableId);
  if (!table) throw new PokerError("table not found");
  table.startHand();
  ctx.armTimeout(table);
  return table;
}
