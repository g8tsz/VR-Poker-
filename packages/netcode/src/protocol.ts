import type { PlayerAction, TableSnapshot } from "@vr-poker/core";
import type { PresencePose } from "./pose.ts";

/** Poker truth + table events — game server only. */
export type ServerMessage =
  | { type: "welcome"; tableId: string; playerId?: string; protocol: 1 }
  | { type: "state"; seq: number; state: TableSnapshot }
  | { type: "presence"; seq: number; poses: Record<string, PresencePose> }
  | { type: "error"; message: string };

/** Client → server. Actions are intents; server accepts or rejects via next state. */
export type ClientMessage =
  | { type: "action"; action: PlayerAction }
  | { type: "presence"; pose: PresencePose };

export function parseClientMessage(raw: string): ClientMessage | null {
  try {
    const msg = JSON.parse(raw) as { type?: string };
    if (msg.type === "action" && typeof msg === "object" && msg !== null && "action" in msg) {
      return msg as ClientMessage;
    }
    if (msg.type === "presence" && typeof msg === "object" && msg !== null && "pose" in msg) {
      return msg as ClientMessage;
    }
    return null;
  } catch {
    return null;
  }
}

export function encodeServerMessage(msg: ServerMessage): string {
  return JSON.stringify(msg);
}

export function parseServerMessage(raw: string): ServerMessage | null {
  try {
    const msg = JSON.parse(raw) as ServerMessage;
    if (!msg?.type) return null;
    return msg;
  } catch {
    return null;
  }
}

export function wsUrl(base: string, tableId: string, playerId: string): string {
  const u = new URL(base.replace(/^http/, "ws"));
  u.pathname = u.pathname.replace(/\/$/, "") + "/ws";
  u.searchParams.set("tableId", tableId);
  u.searchParams.set("playerId", playerId);
  return u.toString();
}
