import { PokerError, Table } from "@vr-poker/core";
import type { ChipLedger } from "@vr-poker/ledger";

export interface TableOpsCtx {
  tables: Map<string, Table>;
  ledger: ChipLedger;
  names: Map<string, string>;
  ensureAccount: (playerId: string, name?: string) => void;
  armTimeout: (table: Table) => void;
}

export function sitAtTable(
  ctx: TableOpsCtx,
  tableId: string,
  playerId: string,
  name: string,
  buyIn: number,
  seat?: number,
): Table {
  const table = ctx.tables.get(tableId);
  if (!table) throw new PokerError("table not found");
  ctx.ensureAccount(playerId, name);
  ctx.ledger.buyIn(playerId, buyIn, tableId);
  try {
    table.sit(playerId, name, buyIn, seat);
  } catch (err) {
    ctx.ledger.cashOut(playerId, buyIn, tableId);
    throw err;
  }
  return table;
}

export function leaveTable(ctx: TableOpsCtx, tableId: string, playerId: string): number {
  const table = ctx.tables.get(tableId);
  if (!table) throw new PokerError("table not found");
  const chips = table.cashOut(playerId);
  if (chips > 0) ctx.ledger.cashOut(playerId, chips, tableId);
  return chips;
}

export function startTableHand(ctx: TableOpsCtx, tableId: string): Table {
  const table = ctx.tables.get(tableId);
  if (!table) throw new PokerError("table not found");
  table.startHand();
  ctx.armTimeout(table);
  return table;
}
