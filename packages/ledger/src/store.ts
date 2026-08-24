import type { LedgerEntry, LedgerReason } from "./entries.ts";
import type { Club, ClubMember, ClubRole, ClubTableConfig, UserAccount } from "./types.ts";

export interface LedgerStore {
  ensureUser(authSubject: string, displayName?: string): Promise<UserAccount>;
  getUser(authSubject: string): Promise<UserAccount>;
  balance(authSubject: string): Promise<number>;
  history(authSubject: string): Promise<LedgerEntry[]>;
  append(authSubject: string, amount: number, reason: LedgerReason, ref?: string): Promise<LedgerEntry>;
  buyIn(authSubject: string, amount: number, ref: string): Promise<LedgerEntry>;
  cashOut(authSubject: string, amount: number, ref: string): Promise<LedgerEntry>;

  createClub(
    ownerAuthSubject: string,
    name: string,
    settings?: Partial<Pick<Club, "rakePercent" | "rakeCap" | "noFlopNoRake" | "minBuyIn" | "maxBuyIn">>,
  ): Promise<Club>;
  getClub(clubId: string): Promise<Club>;
  listClubs(authSubject: string): Promise<Club[]>;
  updateClub(
    clubId: string,
    actorAuthSubject: string,
    patch: Partial<Pick<Club, "name" | "rakePercent" | "rakeCap" | "noFlopNoRake" | "minBuyIn" | "maxBuyIn">>,
  ): Promise<Club>;
  deleteClub(clubId: string, actorAuthSubject: string): Promise<void>;
  addMember(clubId: string, actorAuthSubject: string, memberAuthSubject: string, role?: ClubRole): Promise<ClubMember>;
  removeMember(clubId: string, actorAuthSubject: string, memberAuthSubject: string): Promise<void>;
  listMembers(clubId: string): Promise<ClubMember[]>;
  tableConfig(clubId: string): Promise<ClubTableConfig>;
}
