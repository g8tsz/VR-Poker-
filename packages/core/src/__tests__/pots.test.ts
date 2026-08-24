import { describe, expect, it } from "vitest";
import { buildPots, returnUncalled, splitPot, type Contribution } from "../pots.ts";

describe("pots", () => {
  it("returns an uncalled bet", () => {
    const c: Contribution[] = [
      { playerId: "a", committed: 500, folded: false },
      { playerId: "b", committed: 100, folded: true },
    ];
    const back = returnUncalled(c);
    expect(back).toEqual([{ playerId: "a", amount: 400 }]);
    expect(c[0]!.committed).toBe(100);
  });

  it("builds a main pot and side pot", () => {
    const c: Contribution[] = [
      { playerId: "short", committed: 50, folded: false },
      { playerId: "b", committed: 200, folded: false },
      { playerId: "c", committed: 200, folded: false },
    ];
    const pots = buildPots(c);
    expect(pots).toEqual([
      { amount: 150, eligible: ["short", "b", "c"] },
      { amount: 300, eligible: ["b", "c"] },
    ]);
  });

  it("folded player feeds the pot but cannot win it", () => {
    const c: Contribution[] = [
      { playerId: "fold", committed: 100, folded: true },
      { playerId: "a", committed: 100, folded: false },
      { playerId: "b", committed: 100, folded: false },
    ];
    expect(buildPots(c)).toEqual([{ amount: 300, eligible: ["a", "b"] }]);
  });

  it("splits odd chip to the first winner", () => {
    expect(splitPot(101, ["a", "b"])).toEqual([
      { playerId: "a", amount: 51 },
      { playerId: "b", amount: 50 },
    ]);
  });
});
