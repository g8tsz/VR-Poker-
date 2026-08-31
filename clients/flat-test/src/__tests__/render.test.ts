import { describe, expect, it } from "vitest";
import type { TableSnapshot } from "@vr-poker/core";
import { formatLegal, renderTable } from "../render.ts";

const snap: TableSnapshot = {
  tableId: "t1",
  street: "preflop",
  handId: 1,
  buttonSeat: 0,
  toActSeat: 1,
  currentBet: 100,
  minRaiseTo: 200,
  pot: 150,
  board: [],
  burns: [],
  commitment: "abc123def456",
  reveal: null,
  players: [
    {
      playerId: "alice",
      name: "Alice",
      seat: 0,
      stack: 4900,
      streetCommit: 50,
      handCommit: 50,
      folded: false,
      allIn: false,
      sittingOut: false,
      hole: ["As", "Kd"],
    },
    {
      playerId: "bob",
      name: "Bob",
      seat: 1,
      stack: 4800,
      streetCommit: 100,
      handCommit: 100,
      folded: false,
      allIn: false,
      sittingOut: false,
    },
  ],
  legal: [{ type: "fold" }, { type: "call", min: 50, max: 50 }],
  lastEvents: ["hand #1 dealt"],
};

describe("render", () => {
  it("formats legal actions", () => {
    expect(formatLegal(snap)).toContain("call 50");
  });

  it("hides opponent hole cards when viewing as another player", () => {
    const out = renderTable(snap, "alice", 100_000);
    expect(out).toContain("As Kd");
    expect(out).toContain("xx xx");
    expect(out).toContain("commit abc123def456");
  });
});
