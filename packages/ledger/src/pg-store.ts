import pg from "pg";
import { LedgerError } from "./errors.ts";
import type { LedgerEntry, LedgerReason } from "./entries.ts";
import type { LedgerStore } from "./store.ts";
import type { Club, ClubMember, ClubRole, ClubTableConfig, UserAccount } from "./types.ts";

const WELCOME_SEED = 100_000;

type UserRow = { id: string; auth_subject: string; display_name: string; created_at: Date };

export class PgLedgerStore implements LedgerStore {
  constructor(private readonly pool: pg.Pool) {}

  async ensureUser(authSubject: string, displayName?: string): Promise<UserAccount> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      let row = await this.findUser(client, authSubject);
      if (!row) {
        const ins = await client.query<UserRow>(
          `INSERT INTO users (auth_subject, display_name) VALUES ($1, $2) RETURNING id, auth_subject, display_name, created_at`,
          [authSubject, displayName ?? authSubject],
        );
        row = ins.rows[0]!;
        await client.query(
          `INSERT INTO ledger_entries (user_id, amount, reason, ref) VALUES ($1, $2, 'seed', 'welcome')`,
          [row.id, WELCOME_SEED],
        );
      } else if (displayName && displayName !== row.display_name) {
        await client.query(`UPDATE users SET display_name = $1 WHERE id = $2`, [displayName, row.id]);
        row.display_name = displayName;
      }
      await client.query("COMMIT");
      return this.userFromRow(row, await this.balanceForUser(client, row.id));
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async getUser(authSubject: string): Promise<UserAccount> {
    const client = await this.pool.connect();
    try {
      const row = await this.findUser(client, authSubject);
      if (!row) throw new LedgerError("user not found");
      return this.userFromRow(row, await this.balanceForUser(client, row.id));
    } finally {
      client.release();
    }
  }

  async balance(authSubject: string): Promise<number> {
    const user = await this.getUser(authSubject);
    return user.balance;
  }

  async history(authSubject: string): Promise<LedgerEntry[]> {
    const client = await this.pool.connect();
    try {
      const user = await this.requireUser(client, authSubject);
      const res = await client.query<{ id: string; at: Date; amount: number; reason: LedgerReason; ref: string | null }>(
        `SELECT id, at, amount, reason, ref FROM ledger_entries WHERE user_id = $1 ORDER BY id`,
        [user.id],
      );
      return res.rows.map((r) => ({
        id: Number(r.id),
        at: r.at.toISOString(),
        userId: authSubject,
        amount: r.amount,
        reason: r.reason,
        ref: r.ref ?? undefined,
      }));
    } finally {
      client.release();
    }
  }

  async append(authSubject: string, amount: number, reason: LedgerReason, ref?: string): Promise<LedgerEntry> {
    if (!Number.isInteger(amount) || amount === 0) throw new LedgerError("amount must be a non-zero integer");
    if (reason === "seed" && amount < 0) throw new LedgerError("seed must credit");

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const user = await this.findUser(client, authSubject);
      if (!user) throw new LedgerError("user not found");
      if (amount < 0) {
        const bal = await this.balanceForUser(client, user.id);
        if (bal + amount < 0) throw new LedgerError("insufficient chips");
      }
      const ins = await client.query<{ id: string; at: Date }>(
        `INSERT INTO ledger_entries (user_id, amount, reason, ref) VALUES ($1, $2, $3, $4) RETURNING id, at`,
        [user.id, amount, reason, ref ?? null],
      );
      await client.query("COMMIT");
      const row = ins.rows[0]!;
      return {
        id: Number(row.id),
        at: row.at.toISOString(),
        userId: authSubject,
        amount,
        reason,
        ref,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async buyIn(authSubject: string, amount: number, ref: string): Promise<LedgerEntry> {
    await this.ensureUser(authSubject);
    return this.append(authSubject, -amount, "buy_in", ref);
  }

  async cashOut(authSubject: string, amount: number, ref: string): Promise<LedgerEntry> {
    return this.append(authSubject, amount, "cash_out", ref);
  }

  async createClub(
    ownerAuthSubject: string,
    name: string,
    settings: Partial<Pick<Club, "rakePercent" | "rakeCap" | "noFlopNoRake" | "minBuyIn" | "maxBuyIn">> = {},
  ): Promise<Club> {
    await this.ensureUser(ownerAuthSubject);
    const client = await this.pool.connect();
    try {
      const owner = await this.requireUser(client, ownerAuthSubject);
      const res = await client.query<{
        id: string;
        name: string;
        owner_user_id: string;
        rake_percent: string;
        rake_cap: number;
        no_flop_no_rake: boolean;
        min_buy_in: number;
        max_buy_in: number;
        created_at: Date;
      }>(
        `INSERT INTO clubs (name, owner_user_id, rake_percent, rake_cap, no_flop_no_rake, min_buy_in, max_buy_in)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          name,
          owner.id,
          settings.rakePercent ?? 0.05,
          settings.rakeCap ?? 300,
          settings.noFlopNoRake ?? true,
          settings.minBuyIn ?? 4_000,
          settings.maxBuyIn ?? 20_000,
        ],
      );
      const club = this.clubFromRow(res.rows[0]!, ownerAuthSubject);
      await client.query(
        `INSERT INTO club_members (club_id, user_id, role) VALUES ($1, $2, 'owner')`,
        [club.id, owner.id],
      );
      return club;
    } finally {
      client.release();
    }
  }

  async getClub(clubId: string): Promise<Club> {
    const client = await this.pool.connect();
    try {
      const res = await client.query(`SELECT c.*, u.auth_subject AS owner_auth FROM clubs c JOIN users u ON u.id = c.owner_user_id WHERE c.id = $1`, [
        clubId,
      ]);
      if (!res.rows[0]) throw new LedgerError("club not found");
      return this.clubFromRow(res.rows[0], res.rows[0].owner_auth);
    } finally {
      client.release();
    }
  }

  async listClubs(authSubject: string): Promise<Club[]> {
    const client = await this.pool.connect();
    try {
      const user = await this.requireUser(client, authSubject);
      const res = await client.query(
        `SELECT c.*, u.auth_subject AS owner_auth
         FROM clubs c
         JOIN club_members m ON m.club_id = c.id
         JOIN users u ON u.id = c.owner_user_id
         WHERE m.user_id = $1`,
        [user.id],
      );
      return res.rows.map((r) => this.clubFromRow(r, r.owner_auth));
    } finally {
      client.release();
    }
  }

  async updateClub(
    clubId: string,
    actorAuthSubject: string,
    patch: Partial<Pick<Club, "name" | "rakePercent" | "rakeCap" | "noFlopNoRake" | "minBuyIn" | "maxBuyIn">>,
  ): Promise<Club> {
    await this.requireClubRole(clubId, actorAuthSubject, ["owner", "admin"]);
    if (patch.rakePercent !== undefined && (patch.rakePercent < 0 || patch.rakePercent > 0.2)) {
      throw new LedgerError("rakePercent must be between 0 and 0.2");
    }
    const client = await this.pool.connect();
    try {
      const cur = await this.getClub(clubId);
      const res = await client.query(
        `UPDATE clubs SET
          name = $2,
          rake_percent = $3,
          rake_cap = $4,
          no_flop_no_rake = $5,
          min_buy_in = $6,
          max_buy_in = $7
         WHERE id = $1 RETURNING *, (SELECT auth_subject FROM users WHERE id = owner_user_id) AS owner_auth`,
        [
          clubId,
          patch.name ?? cur.name,
          patch.rakePercent ?? cur.rakePercent,
          patch.rakeCap ?? cur.rakeCap,
          patch.noFlopNoRake ?? cur.noFlopNoRake,
          patch.minBuyIn ?? cur.minBuyIn,
          patch.maxBuyIn ?? cur.maxBuyIn,
        ],
      );
      return this.clubFromRow(res.rows[0], res.rows[0].owner_auth);
    } finally {
      client.release();
    }
  }

  async deleteClub(clubId: string, actorAuthSubject: string): Promise<void> {
    const club = await this.getClub(clubId);
    if (club.ownerUserId !== actorAuthSubject) throw new LedgerError("only owner may delete club");
    const client = await this.pool.connect();
    try {
      await client.query(`DELETE FROM clubs WHERE id = $1`, [clubId]);
    } finally {
      client.release();
    }
  }

  async addMember(
    clubId: string,
    actorAuthSubject: string,
    memberAuthSubject: string,
    role: ClubRole = "member",
  ): Promise<ClubMember> {
    if (role === "owner") throw new LedgerError("cannot add another owner");
    await this.requireClubRole(clubId, actorAuthSubject, ["owner", "admin"]);
    await this.ensureUser(memberAuthSubject);
    const client = await this.pool.connect();
    try {
      const member = await this.requireUser(client, memberAuthSubject);
      await client.query(
        `INSERT INTO club_members (club_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [clubId, member.id, role],
      );
      return { clubId, userId: memberAuthSubject, role, joinedAt: new Date().toISOString() };
    } finally {
      client.release();
    }
  }

  async removeMember(clubId: string, actorAuthSubject: string, memberAuthSubject: string): Promise<void> {
    const club = await this.getClub(clubId);
    if (memberAuthSubject === club.ownerUserId) throw new LedgerError("cannot remove owner");
    await this.requireClubRole(clubId, actorAuthSubject, ["owner", "admin"]);
    const client = await this.pool.connect();
    try {
      const member = await this.requireUser(client, memberAuthSubject);
      await client.query(`DELETE FROM club_members WHERE club_id = $1 AND user_id = $2`, [clubId, member.id]);
    } finally {
      client.release();
    }
  }

  async listMembers(clubId: string): Promise<ClubMember[]> {
    const client = await this.pool.connect();
    try {
      const res = await client.query<{ club_id: string; auth_subject: string; role: ClubRole; joined_at: Date }>(
        `SELECT m.club_id, u.auth_subject, m.role, m.joined_at
         FROM club_members m JOIN users u ON u.id = m.user_id WHERE m.club_id = $1`,
        [clubId],
      );
      return res.rows.map((r) => ({
        clubId: r.club_id,
        userId: r.auth_subject,
        role: r.role,
        joinedAt: r.joined_at.toISOString(),
      }));
    } finally {
      client.release();
    }
  }

  async tableConfig(clubId: string): Promise<ClubTableConfig> {
    const club = await this.getClub(clubId);
    return {
      clubId: club.id,
      rakePercent: club.rakePercent,
      rakeCap: club.rakeCap,
      noFlopNoRake: club.noFlopNoRake,
      minBuyIn: club.minBuyIn,
      maxBuyIn: club.maxBuyIn,
    };
  }

  private async requireClubRole(clubId: string, authSubject: string, roles: ClubRole[]): Promise<void> {
    const members = await this.listMembers(clubId);
    const mem = members.find((m) => m.userId === authSubject);
    if (!mem || !roles.includes(mem.role)) throw new LedgerError("forbidden");
  }

  private async findUser(client: pg.PoolClient, authSubject: string): Promise<UserRow | null> {
    const res = await client.query<UserRow>(`SELECT id, auth_subject, display_name, created_at FROM users WHERE auth_subject = $1`, [
      authSubject,
    ]);
    return res.rows[0] ?? null;
  }

  private async requireUser(client: pg.PoolClient, authSubject: string): Promise<UserRow> {
    const row = await this.findUser(client, authSubject);
    if (!row) throw new LedgerError("user not found");
    return row;
  }

  private async balanceForUser(client: pg.PoolClient, userId: string): Promise<number> {
    const res = await client.query<{ bal: string }>(
      `SELECT COALESCE(SUM(amount), 0)::text AS bal FROM ledger_entries WHERE user_id = $1`,
      [userId],
    );
    return Number(res.rows[0]?.bal ?? 0);
  }

  private userFromRow(row: UserRow, balance: number): UserAccount {
    return {
      authSubject: row.auth_subject,
      displayName: row.display_name,
      balance,
      createdAt: row.created_at.toISOString(),
    };
  }

  private clubFromRow(row: Record<string, unknown>, ownerAuth: string): Club {
    return {
      id: String(row.id),
      name: String(row.name),
      ownerUserId: ownerAuth,
      rakePercent: Number(row.rake_percent),
      rakeCap: Number(row.rake_cap ?? 300),
      noFlopNoRake: Boolean(row.no_flop_no_rake ?? true),
      minBuyIn: Number(row.min_buy_in ?? 4_000),
      maxBuyIn: Number(row.max_buy_in ?? 20_000),
      createdAt: (row.created_at as Date).toISOString(),
    };
  }
}

export function createPgLedgerStore(connectionString: string): PgLedgerStore {
  return new PgLedgerStore(new pg.Pool({ connectionString }));
}
