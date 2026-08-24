import { describe, expect, it } from "vitest";
import { computePayouts, paidPlaces, payoutShares } from "../payouts.ts";

describe("payouts", () => {
  it("pays top 3 for a 9-player field", () => {
    expect(paidPlaces(9)).toBe(3);
    const shares = payoutShares(3);
    expect(shares.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
  });

  it("splits prize pool across finish order", () => {
    const order = ["alice", "bob", "carol", "dave", "eve", "frank"];
    const paid = computePayouts(6000, order);
    expect(paid).toHaveLength(paidPlaces(6));
    expect(paid[0]!.playerId).toBe("alice");
    expect(paid.reduce((s, p) => s + p.chips, 0)).toBe(6000);
    expect(paid[0]!.leaderboardPoints).toBeGreaterThan(paid[1]!.leaderboardPoints);
  });
});
