import { ChipLedger } from "./chip-ledger.ts";
import type { LedgerEntry } from "./entries.ts";
import { ClubRegistry } from "./clubs.ts";
import type { LedgerStore } from "./store.ts";
import type { Club, ClubMember, ClubRole, ClubTableConfig, UserAccount } from "./types.ts";

const WELCOME_SEED = 100_000;

export class MemoryLedgerStore implements LedgerStore {
  private readonly chips = new ChipLedger();
  private readonly clubs = new ClubRegistry();
  private readonly names = new Map<string, string>();
  private readonly created = new Map<string, string>();

  async ensureUser(authSubject: string, displayName?: string): Promise<UserAccount> {
    if (displayName) this.names.set(authSubject, displayName);
    if (!this.created.has(authSubject)) {
      this.created.set(authSubject, new Date().toISOString());
      if (this.chips.history(authSubject).length === 0) {
        this.chips.append(authSubject, WELCOME_SEED, "seed", "welcome");
      }
    }
    return this.getUser(authSubject);
  }

  async getUser(authSubject: string): Promise<UserAccount> {
    if (!this.created.has(authSubject)) throw new LedgerError("user not found");
    return {
      authSubject,
      displayName: this.names.get(authSubject) ?? authSubject,
      balance: this.chips.balance(authSubject),
      createdAt: this.created.get(authSubject)!,
    };
  }

  async balance(authSubject: string): Promise<number> {
    return this.chips.balance(authSubject);
  }

  async history(authSubject: string): Promise<LedgerEntry[]> {
    return this.chips.history(authSubject);
  }

  async append(authSubject: string, amount: number, reason: LedgerReason, ref?: string): Promise<LedgerEntry> {
    await this.ensureUser(authSubject);
    return this.chips.append(authSubject, amount, reason, ref);
  }

  async buyIn(authSubject: string, amount: number, ref: string): Promise<LedgerEntry> {
    await this.ensureUser(authSubject);
    return this.chips.buyIn(authSubject, amount, ref);
  }

  async cashOut(authSubject: string, amount: number, ref: string): Promise<LedgerEntry> {
    return this.chips.cashOut(authSubject, amount, ref);
  }

  async createClub(
    ownerAuthSubject: string,
    name: string,
    settings?: Partial<Pick<Club, "rakePercent" | "rakeCap" | "noFlopNoRake" | "minBuyIn" | "maxBuyIn">>,
  ): Promise<Club> {
    await this.ensureUser(ownerAuthSubject);
    return this.clubs.createClub(ownerAuthSubject, name, settings);
  }

  async getClub(clubId: string): Promise<Club> {
    return this.clubs.getClub(clubId);
  }

  async listClubs(authSubject: string): Promise<Club[]> {
    await this.ensureUser(authSubject);
    return this.clubs.listClubsForUser(authSubject);
  }

  async updateClub(
    clubId: string,
    actorAuthSubject: string,
    patch: Partial<Pick<Club, "name" | "rakePercent" | "rakeCap" | "noFlopNoRake" | "minBuyIn" | "maxBuyIn">>,
  ): Promise<Club> {
    return this.clubs.updateClub(clubId, actorAuthSubject, patch);
  }

  async deleteClub(clubId: string, actorAuthSubject: string): Promise<void> {
    this.clubs.deleteClub(clubId, actorAuthSubject);
  }

  async addMember(
    clubId: string,
    actorAuthSubject: string,
    memberAuthSubject: string,
    role?: ClubRole,
  ): Promise<ClubMember> {
    await this.ensureUser(memberAuthSubject);
    return this.clubs.addMember(clubId, actorAuthSubject, memberAuthSubject, role);
  }

  async removeMember(clubId: string, actorAuthSubject: string, memberAuthSubject: string): Promise<void> {
    this.clubs.removeMember(clubId, actorAuthSubject, memberAuthSubject);
  }

  async listMembers(clubId: string): Promise<ClubMember[]> {
    return this.clubs.listMembers(clubId);
  }

  async tableConfig(clubId: string): Promise<ClubTableConfig> {
    return this.clubs.tableConfigForClub(clubId);
  }
}
