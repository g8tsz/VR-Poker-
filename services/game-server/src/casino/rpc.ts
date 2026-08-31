import type { PlayerAction } from "@vr-poker/core";
import { PokerError } from "@vr-poker/core";
import { LedgerError } from "@vr-poker/ledger";
import { cmdsForActor, hallGames, roomDetails } from "./map.ts";
import { CasinoHttpError, CasinoRuntime, DEFAULT_HOLDEM_ROOM } from "./runtime.ts";

export interface RpcReq {
  seq?: number;
  uid?: string;
  pin?: string;
  f: string;
  args?: unknown;
}

export interface RpcRet {
  seq: number;
  err: number;
  ret: unknown;
}

export interface Session {
  uid: string;
  pin: string;
}

const LOBBY_CMDS = {
  logout: true,
  games: true,
  rooms: true,
  entergame: true,
  enter: true,
  shout: true,
  fastsignup: null,
  signup: null,
  login: null,
};

export function unauthPrompt() {
  return {
    fastsignup: true,
    signup: {
      uid: "text",
      passwd: "text",
      name: "text",
      email: "email",
      phone: "text",
      uuid: "text",
    },
    login: {
      uid: "text",
      passwd: "text",
    },
  };
}

export async function handleRpc(runtime: CasinoRuntime, req: RpcReq, session: Session | null): Promise<RpcRet> {
  const seq = Number(req.seq ?? 0);
  try {
    const ret = await dispatch(runtime, req, session);
    return { seq, err: 0, ret };
  } catch (err) {
    if (err instanceof CasinoHttpError) return { seq, err: err.status, ret: err.message };
    if (err instanceof PokerError || err instanceof LedgerError) return { seq, err: 400, ret: err.message };
    console.error(err);
    return { seq, err: 500, ret: "internal" };
  }
}

async function dispatch(runtime: CasinoRuntime, req: RpcReq, session: Session | null): Promise<unknown> {
  switch (req.f) {
    case "fastsignup":
      return runtime.fastSignup();
    case "signup": {
      const args = obj(req.args);
      await runtime.signup(str(args.uid), str(args.passwd), str(args.name) || str(args.uid));
      return { uid: str(args.uid), passwd: str(args.passwd) };
    }
    case "login": {
      const args = obj(req.args);
      const uid = str(args.uid);
      const logged = await runtime.login(uid, str(args.passwd));
      return {
        token: { uid, pin: logged.pin },
        profile: {
          uid,
          name: logged.name,
          avatar: "",
          coins: logged.coins,
          score: 0,
          exp: 0,
          level: 1,
        },
        cmds: { ...LOBBY_CMDS },
      };
    }
    case "logout":
      requireSession(runtime, req, session);
      return { cmds: unauthPrompt() };
    default:
      return loggedDispatch(runtime, req, requireSession(runtime, req, session));
  }
}

async function loggedDispatch(runtime: CasinoRuntime, req: RpcReq, uid: string): Promise<unknown> {
  switch (req.f) {
    case "games":
      return hallGames();
    case "rooms":
      return runtime.listTables();
    case "entergame":
    case "enter": {
      const tableId = typeof req.args === "string" && req.args ? req.args : DEFAULT_HOLDEM_ROOM;
      runtime.enterRoom(uid, tableId);
      const snap = runtime.tableOrThrow(tableId).snapshot(uid);
      return {
        room: roomDetails(snap, uid),
        cmds: {
          leave: true,
          look: true,
          say: true,
          takeseat: true,
          unseat: null,
          ready: null,
        },
      };
    }
    case "look": {
      const tableId = roomOf(runtime, uid);
      return roomDetails(runtime.tableOrThrow(tableId).snapshot(uid), uid);
    }
    case "takeseat": {
      const tableId = roomOf(runtime, uid);
      const table = runtime.tableOrThrow(tableId);
      const seat = parseSeat(req.args);
      const bal = await runtime.ledger.balance(uid);
      const buyIn = Math.min(table.config.maxBuyIn, Math.max(table.config.minBuyIn, bal));
      if (bal < table.config.minBuyIn) {
        throw new PokerError(`no enough coins, need at least: ${table.config.minBuyIn}`);
      }
      await runtime.sit(tableId, uid, runtime.ctx.names.get(uid) ?? uid, buyIn, seat);
      const snap = table.snapshot(uid);
      return {
        where: snap.players.find((p) => p.playerId === uid)?.seat ?? 0,
        cmds: { takeseat: null, unseat: true, ready: true, leave: true, look: true },
      };
    }
    case "unseat":
    case "leave": {
      const tableId = runtime.rooms.get(uid);
      if (tableId) {
        const seated = runtime.tableOrThrow(tableId).snapshot().players.some((p) => p.playerId === uid);
        if (seated) await runtime.leaveSeat(tableId, uid);
        if (req.f === "leave") runtime.leaveRoom(uid);
      }
      return {
        cmds: {
          ...LOBBY_CMDS,
          leave: req.f === "leave" ? null : true,
          takeseat: req.f === "leave" ? null : true,
          unseat: null,
          ready: null,
        },
      };
    }
    case "ready": {
      const tableId = roomOf(runtime, uid);
      runtime.markReady(tableId, uid);
      return { cmds: { ready: null } };
    }
    case "fold":
    case "check":
    case "call":
    case "all_in":
    case "raise":
    case "bet": {
      const tableId = roomOf(runtime, uid);
      const table = runtime.tableOrThrow(tableId);
      const before = table.snapshot(uid);
      const me = before.players.find((p) => p.playerId === uid);
      const action = resolveCasinoAction(req.f, req.args, before.currentBet, me?.streetCommit ?? 0);
      table.act(uid, action);
      runtime.ctx.armTimeout(table);
      runtime.notify(tableId);
      return { cmds: cmdsForActor(table.snapshot(uid)) };
    }
    case "say":
    case "shout":
      return {};
    default:
      throw new CasinoHttpError(400, `unknown method ${req.f}`);
  }
}

export function casinoRaiseTo(currentBet: number, increment: number, streetCommit: number): PlayerAction {
  if (currentBet <= 0 && streetCommit <= 0) {
    return { type: "bet", amount: increment };
  }
  return { type: "raise", amount: currentBet + increment };
}

export function resolveCasinoAction(
  f: string,
  args: unknown,
  currentBet: number,
  streetCommit: number,
): PlayerAction {
  if (f === "raise") return casinoRaiseTo(currentBet, num(args), streetCommit);
  switch (f) {
    case "fold":
      return { type: "fold" };
    case "check":
      return { type: "check" };
    case "call":
      return { type: "call" };
    case "all_in":
      return { type: "all-in" };
    case "bet":
      return { type: "bet", amount: num(args) };
    default:
      throw new PokerError("unknown action");
  }
}

function requireSession(runtime: CasinoRuntime, req: RpcReq, session: Session | null): string {
  const uid = str(req.uid) || session?.uid || "";
  const pin = str(req.pin) || session?.pin || "";
  runtime.checkPin(uid, pin);
  return uid;
}

function roomOf(runtime: CasinoRuntime, uid: string): string {
  const id = runtime.rooms.get(uid);
  if (!id) throw new CasinoHttpError(400, "not in room");
  return id;
}

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) throw new PokerError("invalid number");
  return n;
}

function parseSeat(args: unknown): number | undefined {
  if (args === "" || args == null) return undefined;
  const n = Number(args);
  return Number.isInteger(n) ? n : undefined;
}
