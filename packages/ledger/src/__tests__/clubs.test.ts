import { describe, expect, it } from "vitest";
import { ClubRegistry } from "../clubs.ts";
import { LedgerError } from "../errors.ts";

describe("ClubRegistry", () => {
  it("creates club with owner and table config", () => {
    const clubs = new ClubRegistry();
    const club = clubs.createClub("alice", "High Rollers", { rakePercent: 0.04, rakeCap: 200 });
    expect(club.ownerUserId).toBe("alice");
    const cfg = clubs.tableConfigForClub(club.id);
    expect(cfg.rakePercent).toBe(0.04);
    expect(cfg.rakeCap).toBe(200);
    expect(cfg.minBuyIn).toBeGreaterThan(0);
  });

  it("manages membership and enforces roles", () => {
    const clubs = new ClubRegistry();
    const club = clubs.createClub("alice", "Table 1");
    clubs.addMember(club.id, "alice", "bob");
    expect(clubs.listMembers(club.id)).toHaveLength(2);
    clubs.removeMember(club.id, "alice", "bob");
    expect(() => clubs.removeMember(club.id, "bob", "alice")).toThrow(LedgerError);
  });

  it("rejects invalid rake", () => {
    const clubs = new ClubRegistry();
    const club = clubs.createClub("alice", "X");
    expect(() => clubs.updateClub(club.id, "alice", { rakePercent: 0.5 })).toThrow(LedgerError);
  });
});
