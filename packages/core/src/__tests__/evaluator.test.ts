import { describe, expect, it } from "vitest";
import { parseCards } from "../cards.ts";
import {
  CAT_FLUSH,
  CAT_FULL_HOUSE,
  CAT_PAIR,
  CAT_QUADS,
  CAT_STRAIGHT,
  CAT_STRAIGHT_FLUSH,
  CAT_TWO_PAIR,
  evaluateFive,
  evaluateHoldem,
  handCategory,
} from "../evaluator.ts";

function v(s: string): number {
  return evaluateFive(parseCards(s));
}

describe("5-card evaluator", () => {
  it("ranks royal above other straight flushes", () => {
    const royal = v("Ah Kh Qh Jh Th");
    const steel = v("Ah 2h 3h 4h 5h");
    const sixHigh = v("2c 3c 4c 5c 6c");
    expect(handCategory(royal)).toBe(CAT_STRAIGHT_FLUSH);
    expect(royal).toBeGreaterThan(sixHigh);
    expect(sixHigh).toBeGreaterThan(steel);
  });

  it("ranks categories in poker order", () => {
    const quads = v("Ah Ad Ac As Kh");
    const boat = v("Ah Ad Ac Kh Kd");
    const flush = v("Ah 9h 7h 4h 2h");
    const straight = v("9c 8d 7h 6s 5c");
    const trips = v("Ah Ad Ac 9s 2c");
    const two = v("Ah Ad Kh Kd 2c");
    const pair = v("Ah Ad 9c 5s 2h");
    const high = v("Ah Kd 9c 5s 2h");
    expect(handCategory(quads)).toBe(CAT_QUADS);
    expect(handCategory(boat)).toBe(CAT_FULL_HOUSE);
    expect(handCategory(flush)).toBe(CAT_FLUSH);
    expect(handCategory(straight)).toBe(CAT_STRAIGHT);
    expect(handCategory(two)).toBe(CAT_TWO_PAIR);
    expect(handCategory(pair)).toBe(CAT_PAIR);
    expect(quads).toBeGreaterThan(boat);
    expect(boat).toBeGreaterThan(flush);
    expect(flush).toBeGreaterThan(straight);
    expect(straight).toBeGreaterThan(trips);
    expect(trips).toBeGreaterThan(two);
    expect(two).toBeGreaterThan(pair);
    expect(pair).toBeGreaterThan(high);
  });

  it("uses kickers", () => {
    expect(v("Ah Ad Kc 9s 2h")).toBeGreaterThan(v("Ah Ad Qc 9s 2h"));
    expect(v("Ah Kh Qh Jh 9h")).toBeGreaterThan(v("Ah Kh Qh Jh 8h"));
  });
});

describe("hold'em 7-card", () => {
  it("picks the best five", () => {
    const board = parseCards("As Ks Qs 2d 3c");
    const nuts = parseCards("Js Ts");
    const second = parseCards("Ah Kd");
    expect(evaluateHoldem(nuts, board)).toBeGreaterThan(evaluateHoldem(second, board));
    expect(handCategory(evaluateHoldem(nuts, board))).toBe(CAT_STRAIGHT_FLUSH);
  });

  it("chops when board is the nuts", () => {
    const board = parseCards("Ah Kh Qh Jh Th");
    const a = parseCards("2c 3d");
    const b = parseCards("4c 5d");
    expect(evaluateHoldem(a, board)).toBe(evaluateHoldem(b, board));
  });
});
