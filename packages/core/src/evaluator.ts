import type { Card } from "./cards.ts";

/** Higher is better. Category in the top nibble-group, then kickers. */
export const CAT_HIGH = 0;
export const CAT_PAIR = 1;
export const CAT_TWO_PAIR = 2;
export const CAT_TRIPS = 3;
export const CAT_STRAIGHT = 4;
export const CAT_FLUSH = 5;
export const CAT_FULL_HOUSE = 6;
export const CAT_QUADS = 7;
export const CAT_STRAIGHT_FLUSH = 8;

const CATEGORY_NAME = [
  "high card",
  "pair",
  "two pair",
  "three of a kind",
  "straight",
  "flush",
  "full house",
  "four of a kind",
  "straight flush",
] as const;

export function handCategory(value: number): number {
  return (value >>> 20) & 0xf;
}

export function categoryName(value: number): string {
  return CATEGORY_NAME[handCategory(value)] ?? "unknown";
}

function pack(category: number, kickers: number[]): number {
  let v = (category & 0xf) << 20;
  const padded = [...kickers];
  while (padded.length < 5) padded.push(0);
  for (let i = 0; i < 5; i++) {
    v |= (padded[i]! & 0xf) << (16 - i * 4);
  }
  return v;
}

function uniqueSortedDesc(ranks: number[]): number[] {
  return [...new Set(ranks)].sort((a, b) => b - a);
}

function straightHigh(ranksDescUnique: number[]): number | null {
  if (ranksDescUnique.length < 5) return null;
  for (let i = 0; i <= ranksDescUnique.length - 5; i++) {
    const hi = ranksDescUnique[i]!;
    if (
      ranksDescUnique[i + 1] === hi - 1 &&
      ranksDescUnique[i + 2] === hi - 2 &&
      ranksDescUnique[i + 3] === hi - 3 &&
      ranksDescUnique[i + 4] === hi - 4
    ) {
      return hi;
    }
  }
  const set = new Set(ranksDescUnique);
  if (set.has(12) && set.has(0) && set.has(1) && set.has(2) && set.has(3)) {
    return 3;
  }
  return null;
}

export function evaluateFive(cards: Card[]): number {
  if (cards.length !== 5) throw new Error("evaluateFive requires 5 cards");
  const ranks = cards.map((c) => c.rank);
  const flush = cards.every((c) => c.suit === cards[0]!.suit);
  const counts = new Array<number>(13).fill(0);
  for (const r of ranks) counts[r]! += 1;

  const groups: { rank: number; n: number }[] = [];
  for (let rank = 12; rank >= 0; rank--) {
    if (counts[rank]!) groups.push({ rank, n: counts[rank]! });
  }
  groups.sort((a, b) => b.n - a.n || b.rank - a.rank);

  const uniq = uniqueSortedDesc(ranks);
  const sHigh = straightHigh(uniq);

  if (flush && sHigh !== null) return pack(CAT_STRAIGHT_FLUSH, [sHigh]);
  if (groups[0]?.n === 4) return pack(CAT_QUADS, [groups[0].rank, groups[1]!.rank]);
  if (groups[0]?.n === 3 && groups[1]?.n === 2) {
    return pack(CAT_FULL_HOUSE, [groups[0].rank, groups[1].rank]);
  }
  if (flush) return pack(CAT_FLUSH, uniqueSortedDesc(ranks));
  if (sHigh !== null) return pack(CAT_STRAIGHT, [sHigh]);
  if (groups[0]?.n === 3) {
    const kickers = groups.filter((g) => g.n === 1).map((g) => g.rank);
    return pack(CAT_TRIPS, [groups[0].rank, ...kickers]);
  }
  if (groups[0]?.n === 2 && groups[1]?.n === 2) {
    const pairs = [groups[0].rank, groups[1].rank].sort((a, b) => b - a);
    const kicker = groups.find((g) => g.n === 1)!.rank;
    return pack(CAT_TWO_PAIR, [...pairs, kicker]);
  }
  if (groups[0]?.n === 2) {
    const kickers = groups.filter((g) => g.n === 1).map((g) => g.rank);
    return pack(CAT_PAIR, [groups[0].rank, ...kickers]);
  }
  return pack(CAT_HIGH, uniqueSortedDesc(ranks));
}

const COMBOS_7: number[][] = [];
for (let a = 0; a < 7; a++) {
  for (let b = a + 1; b < 7; b++) {
    for (let c = b + 1; c < 7; c++) {
      for (let d = c + 1; d < 7; d++) {
        for (let e = d + 1; e < 7; e++) {
          COMBOS_7.push([a, b, c, d, e]);
        }
      }
    }
  }
}

export function evaluateSeven(cards: Card[]): number {
  if (cards.length !== 7) throw new Error("evaluateSeven requires 7 cards");
  let best = 0;
  for (const idx of COMBOS_7) {
    const five = [cards[idx[0]!], cards[idx[1]!], cards[idx[2]!], cards[idx[3]!], cards[idx[4]!]] as Card[];
    const v = evaluateFive(five);
    if (v > best) best = v;
  }
  return best;
}

export function evaluateHoldem(hole: Card[], board: Card[]): number {
  if (hole.length !== 2) throw new Error("hold'em hole must be 2 cards");
  if (board.length !== 5) throw new Error("hold'em board must be 5 cards");
  return evaluateSeven([...hole, ...board]);
}

export function compareHoldem(a: Card[], b: Card[], board: Card[]): number {
  const va = evaluateHoldem(a, board);
  const vb = evaluateHoldem(b, board);
  return va === vb ? 0 : va > vb ? 1 : -1;
}
