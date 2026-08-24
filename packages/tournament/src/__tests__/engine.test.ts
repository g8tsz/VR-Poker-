import { describe, expect, it } from "vitest";
import { rebalanceTables } from "../balance.ts";
import { Tournament } from "../engine.ts";
import { TournamentScheduler } from "../scheduler.ts";
import type { TournamentConfig } from "../types.ts";

function cfg(overrides: Partial<TournamentConfig> = {}): TournamentConfig {
  return {
    id: "mtt-1",
    name: "Daily MTT",
    buyIn: 1000,
    startingStack: 10_000,
    seatsPerTable: 3,
    maxPlayers: 9,
    startsAt: new Date(Date.now() + 60_000).toISOString(),
    levelMinutes: 10,
    minPlayers: 2,
    ...overrides,
  };
}

describe("Tournament engine", () => {
  it("registers, starts, and pays virtual prizes", () => {
    const t = new Tournament(cfg({ seatsPerTable: 3, minPlayers: 3 }));
    t.openRegistration();
    t.register("a", "Alice");
    t.register("b", "Bob");
    t.register("c", "Carol");
    t.start();
    expect(t.snapshot().tables.length).toBeGreaterThan(0);
    t.bust("c");
    t.bust("b");
    t.complete("a");
    const snap = t.snapshot();
    expect(snap.status).toBe("completed");
    expect(snap.payouts[0]!.playerId).toBe("a");
    expect(snap.payouts.reduce((s, p) => s + p.chips, 0)).toBe(3000);
  });

  it("rebalances when a table gets short", () => {
    const tables = rebalanceTables(
      [
        { id: "t1", playerIds: ["a"] },
        { id: "t2", playerIds: ["b", "c", "d", "e"] },
      ],
      6,
    );
    expect(tables.some((t) => t.playerIds.length >= 4)).toBe(true);
  });
});

describe("TournamentScheduler", () => {
  it("fires start when startsAt passes", () => {
    const sched = new TournamentScheduler(60_000);
    let started = false;
    sched.schedule({
      id: "job-1",
      startsAt: new Date(Date.now() - 1000).toISOString(),
      start: () => {
        started = true;
      },
    });
    expect(sched.tick()).toEqual(["job-1"]);
    expect(started).toBe(true);
    sched.stop();
  });
});
