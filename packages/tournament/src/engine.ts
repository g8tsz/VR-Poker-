import { rebalanceTables, buildTables } from "./balance.ts";
import { computePayouts } from "./payouts.ts";
import type {
  LeaderboardEntry,
  TournamentConfig,
  TournamentPlayer,
  TournamentSnapshot,
  TournamentStatus,
  TournamentTable,
} from "./types.ts";
import { TournamentError } from "./errors.ts";

export class Tournament {
  private status: TournamentStatus = "scheduled";
  private readonly players = new Map<string, TournamentPlayer>();
  private tables: TournamentTable[] = [];
  private startedAt: string | null = null;
  private completedAt: string | null = null;
  private level = 1;
  private finishOrder: string[] = [];
  private payouts: TournamentSnapshot["payouts"] = [];

  constructor(readonly config: TournamentConfig) {
    if (config.minPlayers < 2) throw new TournamentError("minPlayers must be >= 2");
  }

  get id(): string {
    return this.config.id;
  }

  getStatus(): TournamentStatus {
    return this.status;
  }

  openRegistration(): void {
    if (this.status !== "scheduled") throw new TournamentError("cannot open registration");
    this.status = "registering";
  }

  register(playerId: string, name: string): void {
    if (this.status !== "registering") throw new TournamentError("registration closed");
    if (this.players.has(playerId)) throw new TournamentError("already registered");
    if (this.players.size >= this.config.maxPlayers) throw new TournamentError("tournament full");
    this.players.set(playerId, {
      playerId,
      name,
      stack: this.config.startingStack,
      tableId: null,
      seat: null,
      eliminatedAt: null,
      finishPlace: null,
      prizeChips: 0,
      leaderboardPoints: 0,
    });
  }

  start(): void {
    if (this.status !== "registering") throw new TournamentError("not in registering state");
    if (this.players.size < this.config.minPlayers) {
      throw new TournamentError(`need at least ${this.config.minPlayers} players`);
    }
    this.status = "running";
    this.startedAt = new Date().toISOString();
    const ids = [...this.players.keys()].sort();
    this.tables = buildTables(ids, this.config.seatsPerTable, this.config.id);
    this.assignSeats();
  }

  bust(playerId: string): void {
    if (this.status !== "running") throw new TournamentError("tournament not running");
    const p = this.players.get(playerId);
    if (!p || p.eliminatedAt) throw new TournamentError("player not active");
    p.eliminatedAt = new Date().toISOString();
    p.stack = 0;
    const place = this.players.size - this.finishOrder.length;
    p.finishPlace = place;
    this.finishOrder.unshift(playerId);
    for (const t of this.tables) {
      t.playerIds = t.playerIds.filter((id) => id !== playerId);
    }
    this.tables = rebalanceTables(this.tables, this.config.seatsPerTable);
    this.assignSeats();
    const alive = this.alive();
    if (alive.length === 1) this.complete(alive[0]!.playerId);
  }

  complete(winnerId: string): void {
    if (this.status !== "running") return;
    const w = this.players.get(winnerId);
    if (!w) throw new TournamentError("winner not found");
    if (!w.eliminatedAt) {
      w.finishPlace = 1;
      this.finishOrder.unshift(winnerId);
    }
    this.status = "completed";
    this.completedAt = new Date().toISOString();
    const prizePool = this.players.size * this.config.buyIn;
    const paid = computePayouts(prizePool, this.finishOrder);
    this.payouts = paid.map((row) => ({
      place: row.place,
      playerId: row.playerId,
      chips: row.chips,
      points: row.leaderboardPoints,
    }));
    for (const row of paid) {
      const pl = this.players.get(row.playerId)!;
      pl.prizeChips = row.chips;
      pl.leaderboardPoints = row.leaderboardPoints;
    }
  }

  prizePool(): number {
    return this.players.size * this.config.buyIn;
  }

  snapshot(): TournamentSnapshot {
    return {
      id: this.config.id,
      name: this.config.name,
      status: this.status,
      buyIn: this.config.buyIn,
      startingStack: this.config.startingStack,
      prizePool: this.prizePool(),
      startsAt: this.config.startsAt,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      level: this.level,
      playersRemaining: this.alive().length,
      registered: this.players.size,
      tables: this.tables.map((t) => ({ id: t.id, playerIds: [...t.playerIds] })),
      players: [...this.players.values()],
      payouts: [...this.payouts],
    };
  }

  private alive(): TournamentPlayer[] {
    return [...this.players.values()].filter((p) => !p.eliminatedAt);
  }

  private assignSeats(): void {
    for (const t of this.tables) {
      t.playerIds.forEach((pid, seat) => {
        const p = this.players.get(pid);
        if (p && !p.eliminatedAt) {
          p.tableId = t.id;
          p.seat = seat;
        }
      });
    }
  }
}

const globalLeaderboard = new Map<string, LeaderboardEntry>();

export function recordLeaderboard(tournament: Tournament): void {
  for (const p of tournament.snapshot().players) {
    if (!p.leaderboardPoints) continue;
    const cur = globalLeaderboard.get(p.playerId) ?? {
      playerId: p.playerId,
      name: p.name,
      points: 0,
      tournaments: 0,
      wins: 0,
    };
    cur.points += p.leaderboardPoints;
    cur.tournaments += 1;
    if (p.finishPlace === 1) cur.wins += 1;
    globalLeaderboard.set(p.playerId, cur);
  }
}

export function getLeaderboard(limit = 50): LeaderboardEntry[] {
  return [...globalLeaderboard.values()].sort((a, b) => b.points - a.points).slice(0, limit);
}

export function resetLeaderboard(): void {
  globalLeaderboard.clear();
}
