import { LedgerError } from "./errors.ts";
import type { Club, ClubMember, ClubRole, ClubTableConfig } from "./types.ts";

const DEFAULT_RAKE = 0.05;
const DEFAULT_RAKE_CAP = 300;

export class ClubRegistry {
  private readonly clubs = new Map<string, Club>();
  private readonly members = new Map<string, ClubMember[]>();

  createClub(
    ownerUserId: string,
    name: string,
    settings: Partial<Pick<Club, "rakePercent" | "rakeCap" | "noFlopNoRake" | "minBuyIn" | "maxBuyIn">> = {},
  ): Club {
    const id = `club-${crypto.randomUUID()}`;
    const club: Club = {
      id,
      name,
      ownerUserId,
      rakePercent: settings.rakePercent ?? DEFAULT_RAKE,
      rakeCap: settings.rakeCap ?? DEFAULT_RAKE_CAP,
      noFlopNoRake: settings.noFlopNoRake ?? true,
      minBuyIn: settings.minBuyIn ?? 4_000,
      maxBuyIn: settings.maxBuyIn ?? 20_000,
      createdAt: new Date().toISOString(),
    };
    this.clubs.set(id, club);
    this.members.set(id, [
      { clubId: id, userId: ownerUserId, role: "owner", joinedAt: club.createdAt },
    ]);
    return club;
  }

  getClub(clubId: string): Club {
    const club = this.clubs.get(clubId);
    if (!club) throw new LedgerError("club not found");
    return club;
  }

  listClubsForUser(userId: string): Club[] {
    const clubIds = new Set<string>();
    for (const [clubId, mems] of this.members) {
      if (mems.some((m) => m.userId === userId)) clubIds.add(clubId);
    }
    return [...clubIds].map((id) => this.getClub(id));
  }

  updateClub(
    clubId: string,
    actorUserId: string,
    patch: Partial<Pick<Club, "name" | "rakePercent" | "rakeCap" | "noFlopNoRake" | "minBuyIn" | "maxBuyIn">>,
  ): Club {
    const club = this.getClub(clubId);
    this.requireRole(clubId, actorUserId, ["owner", "admin"]);
    if (patch.rakePercent !== undefined && (patch.rakePercent < 0 || patch.rakePercent > 0.2)) {
      throw new LedgerError("rakePercent must be between 0 and 0.2");
    }
    Object.assign(club, patch);
    return club;
  }

  deleteClub(clubId: string, actorUserId: string): void {
    const club = this.getClub(clubId);
    if (club.ownerUserId !== actorUserId) throw new LedgerError("only owner may delete club");
    this.clubs.delete(clubId);
    this.members.delete(clubId);
  }

  addMember(clubId: string, actorUserId: string, userId: string, role: ClubRole = "member"): ClubMember {
    this.requireRole(clubId, actorUserId, ["owner", "admin"]);
    if (role === "owner") throw new LedgerError("cannot add another owner");
    const mems = this.memberList(clubId);
    if (mems.some((m) => m.userId === userId)) throw new LedgerError("already a member");
    const member: ClubMember = {
      clubId,
      userId,
      role,
      joinedAt: new Date().toISOString(),
    };
    mems.push(member);
    return member;
  }

  removeMember(clubId: string, actorUserId: string, targetUserId: string): void {
    const club = this.getClub(clubId);
    if (targetUserId === club.ownerUserId) throw new LedgerError("cannot remove owner");
    this.requireRole(clubId, actorUserId, ["owner", "admin"]);
    const mems = this.memberList(clubId);
    const idx = mems.findIndex((m) => m.userId === targetUserId);
    if (idx < 0) throw new LedgerError("member not found");
    mems.splice(idx, 1);
  }

  listMembers(clubId: string): ClubMember[] {
    return [...this.memberList(clubId)];
  }

  tableConfigForClub(clubId: string): ClubTableConfig {
    const club = this.getClub(clubId);
    return {
      clubId: club.id,
      rakePercent: club.rakePercent,
      rakeCap: club.rakeCap,
      noFlopNoRake: club.noFlopNoRake,
      minBuyIn: club.minBuyIn,
      maxBuyIn: club.maxBuyIn,
    };
  }

  private memberList(clubId: string): ClubMember[] {
    if (!this.members.has(clubId)) this.members.set(clubId, []);
    return this.members.get(clubId)!;
  }

  private requireRole(clubId: string, userId: string, roles: ClubRole[]): void {
    const mem = this.memberList(clubId).find((m) => m.userId === userId);
    if (!mem || !roles.includes(mem.role)) throw new LedgerError("forbidden");
  }
}
