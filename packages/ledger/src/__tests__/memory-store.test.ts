import { describe, expect, it } from "vitest";
import { MemoryLedgerStore } from "../memory-store.ts";

describe("MemoryLedgerStore", () => {
  it("seeds account and tracks buy-in / cash-out", async () => {
    const store = new MemoryLedgerStore();
    const user = await store.ensureUser("alice", "Alice");
    expect(user.balance).toBe(100_000);
    await store.buyIn("alice", 5_000, "table-1");
    expect(await store.balance("alice")).toBe(95_000);
    await store.cashOut("alice", 5_500, "table-1");
    expect(await store.balance("alice")).toBe(100_500);
  });

  it("creates club and returns table config for game-server", async () => {
    const store = new MemoryLedgerStore();
    await store.ensureUser("alice", "Alice");
    const club = await store.createClub("alice", "Friday Night", { rakePercent: 0.03 });
    const cfg = await store.tableConfig(club.id);
    expect(cfg.rakePercent).toBe(0.03);
    await store.addMember(club.id, "alice", "bob");
    const members = await store.listMembers(club.id);
    expect(members.map((m) => m.userId)).toContain("bob");
  });
});
