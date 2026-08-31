export interface PotShare {
  playerId: string;
  amount: number;
}

export interface Pot {
  amount: number;
  eligible: string[];
}

export interface Contribution {
  playerId: string;
  committed: number;
  folded: boolean;
}

/** Return chips that were never called. Mutates committed downward. */
export function returnUncalled(contribs: Contribution[]): PotShare[] {
  if (contribs.length === 0) return [];
  const sorted = [...contribs].sort((a, b) => b.committed - a.committed);
  const top = sorted[0]!;
  const second = sorted[1]?.committed ?? 0;
  const extra = top.committed - second;
  if (extra <= 0) return [];
  top.committed -= extra;
  const original = contribs.find((c) => c.playerId === top.playerId)!;
  original.committed = top.committed;
  return [{ playerId: top.playerId, amount: extra }];
}

/**
 * Side-pot construction from remaining committed chips.
 * Folded players feed pots they put money into, but cannot win them.
 */
export function buildPots(contribs: Contribution[]): Pot[] {
  const remaining = contribs
    .filter((c) => c.committed > 0)
    .map((c) => ({ ...c }));
  const pots: Pot[] = [];

  while (remaining.some((c) => c.committed > 0)) {
    const active = remaining.filter((c) => c.committed > 0);
    const level = Math.min(...active.map((c) => c.committed));
    let amount = 0;
    const eligible: string[] = [];
    for (const c of active) {
      amount += level;
      c.committed -= level;
      if (!c.folded) eligible.push(c.playerId);
    }
    if (amount > 0 && eligible.length > 0) {
      pots.push({ amount, eligible });
    } else if (amount > 0 && eligible.length === 0) {
      pots.push({ amount, eligible: [] });
    }
  }

  return pots;
}

export function takeRake(
  potAmount: number,
  percent: number,
  cap: number,
): { net: number; rake: number } {
  if (potAmount <= 0 || percent <= 0) return { net: potAmount, rake: 0 };
  const raw = Math.floor(potAmount * percent);
  const rake = Math.min(cap, raw);
  return { net: potAmount - rake, rake };
}

/** Split `amount` evenly among winners; leftover chips go to earliest winner (seat order). */
export function splitPot(amount: number, winnerIds: string[]): PotShare[] {
  if (winnerIds.length === 0 || amount <= 0) return [];
  const share = Math.floor(amount / winnerIds.length);
  const leftover = amount - share * winnerIds.length;
  return winnerIds.map((playerId, i) => ({
    playerId,
    amount: share + (i === 0 ? leftover : 0),
  }));
}
