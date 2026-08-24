import type { TournamentTable } from "./types.ts";

/** Assign players round-robin into tables (max seatsPerTable per table). */
export function buildTables(playerIds: string[], seatsPerTable: number, prefix: string): TournamentTable[] {
  if (playerIds.length === 0) return [];
  const tableCount = Math.ceil(playerIds.length / seatsPerTable);
  const tables: TournamentTable[] = Array.from({ length: tableCount }, (_, i) => ({
    id: `${prefix}-t${i + 1}`,
    playerIds: [],
  }));
  playerIds.forEach((pid, i) => {
    tables[i % tableCount]!.playerIds.push(pid);
  });
  return tables;
}

/**
 * Merge undersized tables when total players fit on one table, or balance 2-player tables.
 * Returns new table layout; does not mutate input.
 */
export function rebalanceTables(tables: TournamentTable[], seatsPerTable: number): TournamentTable[] {
  const live = tables
    .map((t) => ({ ...t, playerIds: [...t.playerIds] }))
    .filter((t) => t.playerIds.length > 0);
  const total = live.reduce((s, t) => s + t.playerIds.length, 0);
  if (total <= seatsPerTable) {
    const all = live.flatMap((t) => t.playerIds);
    return [{ id: live[0]?.id ?? "final", playerIds: all }];
  }
  const small = live.filter((t) => t.playerIds.length <= 2);
  const big = live.filter((t) => t.playerIds.length > 2);
  if (small.length === 0 || big.length === 0) return live;
  for (const s of small) {
    const donor = big.find((b) => b.playerIds.length < seatsPerTable);
    if (!donor || s.playerIds.length === 0) continue;
    while (s.playerIds.length > 0 && donor.playerIds.length < seatsPerTable) {
      donor.playerIds.push(s.playerIds.shift()!);
    }
  }
  return [...big, ...small].filter((t) => t.playerIds.length > 0);
}
