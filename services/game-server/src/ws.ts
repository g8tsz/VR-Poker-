import { WebSocket } from "ws";
import { PokerError, Table, type PlayerAction } from "@vr-poker/core";
import {
  encodeServerMessage,
  parseClientMessage,
  type PresencePose,
} from "@vr-poker/netcode";
import type { TableOpsCtx } from "./table-ops.ts";
import { leaveTable, sitAtTable, startTableHand } from "./table-ops.ts";

export interface TableSocket {
  tableId: string;
  playerId?: string;
  ws: WebSocket;
}

export interface TableRoomDeps {
  getTable: (id: string) => Table | undefined;
  onAction: (table: Table) => void;
  onBroadcast: (tableId: string) => void;
  tableOps?: TableOpsCtx;
}

const MAX_PRESENCE_HZ = 30;

export class TableRoom {
  private seq = 0;
  private readonly sockets = new Set<TableSocket>();
  private readonly socketsByPlayer = new Map<string, Set<TableSocket>>();
  private readonly presence = new Map<string, PresencePose>();
  private readonly presenceLastAt = new Map<string, number>();

  constructor(
    readonly tableId: string,
    private readonly deps: TableRoomDeps,
  ) {}

  add(client: TableSocket): void {
    this.sockets.add(client);
    if (client.playerId) {
      let set = this.socketsByPlayer.get(client.playerId);
      if (!set) {
        set = new Set();
        this.socketsByPlayer.set(client.playerId, set);
      }
      set.add(client);
    }
    const serverTime = Date.now();
    client.ws.send(
      encodeServerMessage({
        type: "welcome",
        tableId: this.tableId,
        playerId: client.playerId,
        protocol: 1,
        serverTime,
      }),
    );
    this.broadcastState();
    this.sendPresence(client);
  }

  remove(client: TableSocket): void {
    this.sockets.delete(client);
    if (client.playerId) {
      const set = this.socketsByPlayer.get(client.playerId);
      if (set) {
        set.delete(client);
        if (set.size === 0) {
          this.socketsByPlayer.delete(client.playerId);
          this.presence.delete(client.playerId);
          this.presenceLastAt.delete(client.playerId);
          this.broadcastPresence();
        }
      }
    }
  }

  handleMessage(client: TableSocket, raw: string): void {
    const msg = parseClientMessage(raw);
    if (!msg) {
      client.ws.send(encodeServerMessage({ type: "error", message: "invalid message" }));
      return;
    }

    if (msg.type === "ping") {
      client.ws.send(encodeServerMessage({ type: "pong", serverTime: Date.now() }));
      return;
    }

    if (msg.type === "presence") {
      if (!client.playerId) return;
      const now = Date.now();
      const last = this.presenceLastAt.get(client.playerId) ?? 0;
      if (now - last < 1000 / MAX_PRESENCE_HZ) return;
      this.presenceLastAt.set(client.playerId, now);
      const { head, leftHand, rightHand } = msg.pose;
      this.presence.set(client.playerId, {
        playerId: client.playerId,
        t: now,
        head,
        leftHand,
        rightHand,
      });
      this.broadcastPresence();
      return;
    }

    if (msg.type === "sit") {
      if (!client.playerId) {
        client.ws.send(encodeServerMessage({ type: "error", message: "playerId required" }));
        return;
      }
      if (!this.deps.tableOps) {
        client.ws.send(encodeServerMessage({ type: "error", message: "sit not available" }));
        return;
      }
      try {
        sitAtTable(
          this.deps.tableOps,
          this.tableId,
          client.playerId,
          msg.name,
          msg.buyIn,
          msg.seat,
        );
        this.deps.onBroadcast(this.tableId);
      } catch (err) {
        const message = err instanceof PokerError ? err.message : "sit failed";
        client.ws.send(encodeServerMessage({ type: "error", message }));
      }
      return;
    }

    if (msg.type === "leave") {
      if (!client.playerId) {
        client.ws.send(encodeServerMessage({ type: "error", message: "playerId required" }));
        return;
      }
      if (!this.deps.tableOps) {
        client.ws.send(encodeServerMessage({ type: "error", message: "leave not available" }));
        return;
      }
      try {
        const cashedOut = leaveTable(this.deps.tableOps, this.tableId, client.playerId);
        this.presence.delete(client.playerId);
        this.presenceLastAt.delete(client.playerId);
        this.broadcastPresence();
        this.deps.onBroadcast(this.tableId);
        client.ws.send(
          encodeServerMessage({
            type: "left",
            playerId: client.playerId,
            cashedOut,
          }),
        );
      } catch (err) {
        const message = err instanceof PokerError ? err.message : "leave failed";
        client.ws.send(encodeServerMessage({ type: "error", message }));
      }
      return;
    }

    if (msg.type === "start") {
      if (!this.deps.tableOps) {
        client.ws.send(encodeServerMessage({ type: "error", message: "start not available" }));
        return;
      }
      try {
        startTableHand(this.deps.tableOps, this.tableId);
        this.deps.onBroadcast(this.tableId);
      } catch (err) {
        const message = err instanceof PokerError ? err.message : "start failed";
        client.ws.send(encodeServerMessage({ type: "error", message }));
      }
      return;
    }

    if (msg.type === "action") {
      if (!client.playerId) {
        client.ws.send(encodeServerMessage({ type: "error", message: "playerId required" }));
        return;
      }
      const table = this.deps.getTable(this.tableId);
      if (!table) {
        client.ws.send(encodeServerMessage({ type: "error", message: "table not found" }));
        return;
      }
      try {
        table.act(client.playerId, msg.action as PlayerAction);
        this.deps.onAction(table);
        this.deps.onBroadcast(this.tableId);
      } catch (err) {
        const message = err instanceof PokerError ? err.message : "action failed";
        client.ws.send(encodeServerMessage({ type: "error", message }));
      }
    }
  }

  broadcastState(): void {
    const table = this.deps.getTable(this.tableId);
    if (!table) return;
    this.seq += 1;
    const seq = this.seq;
    for (const s of this.sockets) {
      if (s.ws.readyState !== WebSocket.OPEN) continue;
      s.ws.send(
        encodeServerMessage({
          type: "state",
          seq,
          state: table.snapshot(s.playerId),
        }),
      );
    }
  }

  private sendPresence(client: TableSocket): void {
    if (client.ws.readyState !== client.ws.OPEN) return;
    client.ws.send(
      encodeServerMessage({
        type: "presence",
        seq: this.seq,
        serverTime: Date.now(),
        poses: Object.fromEntries(this.presence),
      }),
    );
  }

  private broadcastPresence(): void {
    this.seq += 1;
    const poses = Object.fromEntries(this.presence);
    const serverTime = Date.now();
    for (const s of this.sockets) {
      if (s.ws.readyState !== WebSocket.OPEN) continue;
      s.ws.send(
        encodeServerMessage({ type: "presence", seq: this.seq, serverTime, poses }),
      );
    }
  }
}

export class WsHub {
  private readonly rooms = new Map<string, TableRoom>();

  room(tableId: string, deps: TableRoomDeps): TableRoom {
    let r = this.rooms.get(tableId);
    if (!r) {
      r = new TableRoom(tableId, deps);
      this.rooms.set(tableId, r);
    }
    return r;
  }

  broadcast(tableId: string): void {
    this.rooms.get(tableId)?.broadcastState();
  }
}
