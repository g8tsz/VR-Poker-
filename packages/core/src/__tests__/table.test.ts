import { describe, expect, it } from "vitest";
import { Table, fixedDeal, PokerError } from "../table.ts";

const DECK =
  "As Ks Qs Js Ts 9s 8s 7s 6s 5s 4s 3s 2s " +
  "Ah Kh Qh Jh Th 9h 8h 7h 6h 5h 4h 3h 2h " +
  "Ad Kd Qd Jd Td 9d 8d 7d 6d 5d 4d 3d 2d " +
  "Ac Kc Qc Jc Tc 9c 8c 7c 6c 5c 4c 3c 2c";

function hu() {
  const t = new Table("t1", fixedDeal(DECK), {
    seats: 2,
    smallBlind: 50,
    bigBlind: 100,
    minBuyIn: 1000,
    maxBuyIn: 20_000,
    rakePercent: 0,
    rakeCap: 0,
  });
  t.sit("alice", "Alice", 10_000, 0);
  t.sit("bob", "Bob", 10_000, 1);
  return t;
}

describe("buy-in", () => {
  it("enforces table-stakes min/max", () => {
    const t = new Table("t1", fixedDeal(DECK), { minBuyIn: 4000, maxBuyIn: 10_000, seats: 6 });
    expect(() => t.sit("a", "A", 3999, 0)).toThrow(PokerError);
    expect(() => t.sit("a", "A", 10_001, 0)).toThrow(PokerError);
    t.sit("a", "A", 4000, 0);
  });

  it("cashes out the stack between hands", () => {
    const t = hu();
    expect(t.cashOut("alice")).toBe(10_000);
  });
});

describe("heads-up NLHE", () => {
  it("button posts SB and acts first; fold awards the blinds", () => {
    const t = hu();
    t.startHand();
    const pre = t.snapshot("alice");
    expect(pre.street).toBe("preflop");
    expect(pre.buttonSeat).toBe(0);
    expect(pre.toActSeat).toBe(0);
    expect(pre.players.find((p) => p.playerId === "alice")!.streetCommit).toBe(50);
    expect(pre.players.find((p) => p.playerId === "bob")!.streetCommit).toBe(100);

    t.act("alice", { type: "fold" });
    const payout = t.snapshot();
    expect(payout.street).toBe("payout");
    expect(t.needsHandFinalize()).toBe(true);
    t.finalizeHandIfComplete();
    const end = t.snapshot();
    expect(end.street).toBe("waiting");
    const alice = end.players.find((p) => p.playerId === "alice")!;
    const bob = end.players.find((p) => p.playerId === "bob")!;
    expect(alice.stack).toBe(9950);
    expect(bob.stack).toBe(10_050);
  });

  it("SB can raise-to 3x, BB calls, then checks it down", () => {
    const t = hu();
    t.startHand();
    t.act("alice", { type: "raise", amount: 300 });
    t.act("bob", { type: "call" });
    expect(t.snapshot().street).toBe("flop");
    t.act("bob", { type: "check" });
    t.act("alice", { type: "check" });
    expect(t.snapshot().street).toBe("turn");
    t.act("bob", { type: "check" });
    t.act("alice", { type: "check" });
    expect(t.snapshot().street).toBe("river");
    t.act("bob", { type: "check" });
    t.act("alice", { type: "check" });
    expect(t.snapshot().street).toBe("payout");
    t.finalizeHandIfComplete();
    const end = t.snapshot();
    expect(end.street).toBe("waiting");
    expect((end.winners?.length ?? 0) >= 1).toBe(true);
    expect(end.players.find((p) => p.playerId === "alice")!.stack + end.players.find((p) => p.playerId === "bob")!.stack).toBe(
      20_000,
    );
  });
});

describe("all-in runout", () => {
  it("shoves remaining stack and runs the board", () => {
    const t = new Table("t1", fixedDeal(DECK), {
      seats: 2,
      smallBlind: 50,
      bigBlind: 100,
      minBuyIn: 1_000,
      maxBuyIn: 20_000,
      rakePercent: 0,
      rakeCap: 0,
    });
    t.sit("alice", "Alice", 1_000, 0);
    t.sit("bob", "Bob", 10_000, 1);
    t.startHand();
    t.act("alice", { type: "all-in" });
    t.act("bob", { type: "call" });
    t.finalizeHandIfComplete();
    const end = t.snapshot();
    expect(end.street).toBe("waiting");
    const a = end.players.find((p) => p.playerId === "alice")!.stack;
    const b = end.players.find((p) => p.playerId === "bob")!.stack;
    expect(a + b).toBe(11_000);
    expect(end.board).toHaveLength(5);
  });
});

describe("multiway", () => {
  it("three-handed: UTG folds, SB folds, BB wins", () => {
    const t = new Table("t1", fixedDeal(DECK), {
      seats: 3,
      smallBlind: 50,
      bigBlind: 100,
      minBuyIn: 1000,
      maxBuyIn: 20_000,
      rakePercent: 0,
      rakeCap: 0,
    });
    t.sit("a", "A", 10_000, 0);
    t.sit("b", "B", 10_000, 1);
    t.sit("c", "C", 10_000, 2);
    t.startHand();
    const s = t.snapshot();
    expect(s.buttonSeat).toBe(0);
    expect(s.toActSeat).toBe(0);
    t.act("a", { type: "fold" });
    t.act("b", { type: "fold" });
    expect(t.snapshot().street).toBe("payout");
    t.finalizeHandIfComplete();
    const end = t.snapshot();
    expect(end.players.find((p) => p.playerId === "c")!.stack).toBe(10_050);
  });
});
