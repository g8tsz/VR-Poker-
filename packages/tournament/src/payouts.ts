/** How many places get paid for a given field size. */
export function paidPlaces(fieldSize: number): number {
  if (fieldSize <= 2) return 1;
  if (fieldSize <= 6) return 2;
  if (fieldSize <= 9) return 3;
  return Math.max(3, Math.floor(fieldSize * 0.15));
}

/**
 * Payout shares by finish place (1st = index 0). Harmonic weighting, sums to 1.
 * Virtual chips only — never cash.
 */
export function payoutShares(paidCount: number): number[] {
  if (paidCount <= 0) return [];
  if (paidCount === 1) return [1];
  const weights = Array.from({ length: paidCount }, (_, i) => 1 / (i + 1));
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => w / sum);
}

export interface PlacePayout {
  place: number;
  chips: number;
  leaderboardPoints: number;
}

/** Points scale: 1st gets 100, 2nd 60, 3rd 40, then decay. Cosmetic / virtual only. */
export function leaderboardPointsForPlace(place: number, fieldSize: number): number {
  if (place === 1) return 100 + Math.min(fieldSize, 100);
  if (place === 2) return 60;
  if (place === 3) return 40;
  return Math.max(5, Math.floor(30 / place));
}

export function computePayouts(
  prizePool: number,
  finishOrder: string[],
): { playerId: string; place: number; chips: number; leaderboardPoints: number }[] {
  const field = finishOrder.length;
  const places = paidPlaces(field);
  const shares = payoutShares(places);
  const out: { playerId: string; place: number; chips: number; leaderboardPoints: number }[] = [];
  let remaining = prizePool;
  for (let i = 0; i < places; i++) {
    const place = i + 1;
    const chips = i === places - 1 ? remaining : Math.floor(prizePool * shares[i]!);
    remaining -= chips;
    out.push({
      playerId: finishOrder[i]!,
      place,
      chips,
      leaderboardPoints: leaderboardPointsForPlace(place, field),
    });
  }
  return out;
}
