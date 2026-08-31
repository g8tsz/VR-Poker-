import { PokerError, Table } from "@vr-poker/core";
import type { ChipLedgerPort } from "../ledger-port.ts";
import { leaveTable, sitAtTable, startTableHand, type TableOpsCtx } from "../table-ops.ts";

export const DEFAULT_HOLDEM_ROOM = "holdem3";

export class CasinoHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "CasinoHttpError";
  }
}

export class CasinoRuntime {
  readonly rooms = new Map<string, string>();
  readonly ready = new Map<string, Set<string>>();
  readonly pins = new Map<string, string>();
  readonly passwords = new Map<string, string>();
  private userSeq = 1000;

  constructor(
    readonly ctx: TableOpsCtx,
    readonly broadcast: (tableId: string) => void,
  ) {}

  get ledger(): ChipLedgerPort {
    return this.ctx.ledger;
  }

  notify(tableId: string): void {
    const table = this.ctx.tables.get(tableId);
    table?.finalizeHandIfComplete();
    this.broadcast(tableId);
  }

  tableOrThrow(id: string): Table {
    const t = this.ctx.tables.get(id);
    if (!t) throw new PokerError("table not found");
    return t;
  }

  listTables(): { id: string; type: string; name: string; seats: number; taken: number }[] {
    return [...this.ctx.tables.values()].map((t) => {
      const snap = t.snapshot();
      return {
        id: t.tableId,
        type: "holdem3",
        name: t.tableId === DEFAULT_HOLDEM_ROOM ? "texas holdem (no limit)" : t.tableId,
        seats: t.config.seats,
        taken: snap.players.filter((p) => p.playerId).length,
      };
    });
  }

  async ensureAccount(playerId: string, name?: string, password?: string): Promise<void> {
    await this.ctx.ensureAccount(playerId, name);
    if (password && !this.passwords.has(playerId)) this.passwords.set(playerId, password);
    if (!this.pins.has(playerId)) this.pins.set(playerId, randomPin());
  }

  async fastSignup(): Promise<{ uid: string; passwd: string }> {
    this.userSeq += 1;
    const uid = `u${this.userSeq}`;
    const passwd = randomPin();
    await this.ensureAccount(uid, uid, passwd);
    return { uid, passwd };
  }

  async signup(uid: string, passwd: string, name: string): Promise<void> {
    if (!uid || uid.length < 3) throw new PokerError("invalid uid, must be >=3 letters");
    if (this.passwords.has(uid)) throw new CasinoHttpError(409, `user id ${uid} exists`);
    await this.ensureAccount(uid, name || uid, passwd);
  }

  async login(uid: string, passwd: string): Promise<{ pin: string; name: string; coins: number }> {
    await this.ensureAccount(uid, uid);
    const stored = this.passwords.get(uid);
    if (stored && stored !== passwd) throw new CasinoHttpError(403, "invalid user id or password");
    if (!stored && passwd) this.passwords.set(uid, passwd);
    const pin = randomPin();
    this.pins.set(uid, pin);
    return { pin, name: this.ctx.names.get(uid) ?? uid, coins: await this.ledger.balance(uid) };
  }

  checkPin(uid: string, pin: string): void {
    if (!uid || this.pins.get(uid) !== pin) {
      throw new CasinoHttpError(403, "invalid uid or pin, need login first");
    }
  }

  enterRoom(uid: string, tableId: string): void {
    this.tableOrThrow(tableId);
    this.rooms.set(uid, tableId);
  }

  leaveRoom(uid: string): void {
    this.rooms.delete(uid);
  }

  async sit(tableId: string, playerId: string, name: string, buyIn: number, seat?: number): Promise<void> {
    this.rooms.set(playerId, tableId);
    await sitAtTable(this.ctx, tableId, playerId, name, buyIn, seat);
    this.notify(tableId);
  }

  async leaveSeat(tableId: string, playerId: string): Promise<number> {
    this.ready.get(tableId)?.delete(playerId);
    const chips = await leaveTable(this.ctx, tableId, playerId);
    this.notify(tableId);
    return chips;
  }

  markReady(tableId: string, playerId: string): void {
    const table = this.tableOrThrow(tableId);
    const snap = table.snapshot(playerId);
    if (!snap.players.some((p) => p.playerId === playerId)) {
      throw new PokerError("you must take a seat to play");
    }
    if (snap.street !== "waiting") throw new PokerError("game already started, wait next round");
    const set = this.ready.get(tableId) ?? new Set();
    set.add(playerId);
    this.ready.set(tableId, set);
    const seated = snap.players.filter((p) => p.playerId);
    const readyCount = seated.filter((p) => set.has(p.playerId)).length;
    if (readyCount >= 2 && readyCount === seated.length) {
      this.ready.get(tableId)?.clear();
      startTableHand(this.ctx, tableId);
      this.notify(tableId);
    }
  }
}

function randomPin(): string {
  return Math.random().toString(16).slice(2, 10);
}
