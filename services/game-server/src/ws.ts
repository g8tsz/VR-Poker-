import { WebSocket } from "ws";
import { PokerError, Table, type PlayerAction } from "@vr-poker/core";
import {
  encodeServerMessage,
  parseClientMessage,
  type PresencePose,
} from "@vr-poker/netcode";

export interface TableSocket {
  tableId: string;
  playerId?: string;
  ws: WebSocket;
}

export class TableRoom {
  private seq = 0;
  private readonly sockets = new Set<TableSocket>();
  private readonly presence = new Map<string, PresencePose>();

  constructor(
    readonly tableId: string,
    private readonly getTable: (id: string) => Table | undefined,
    private readonly onAction: (table: Table) => void,
  ) {}

  add(client: TableSocket): void {
    this.sockets.add(client);
    client.ws.send(
      encodeServerMessage({
        type: "welcome",
        tableId: this.tableId,
        playerId: client.playerId,
        protocol: 1,
      }),
    );
    this.broadcastState();
    this.sendPresence(client);
  }

  remove(client: TableSocket): void {
    this.sockets.delete(client);
    if (client.playerId) this.presence.delete(client.playerId);
    this.broadcastPresence();
  }

  handleMessage(client: TableSocket, raw: string): void {
    const msg = parseClientMessage(raw);
    if (!msg) {
      client.ws.send(encodeServerMessage({ type: "error", message: "invalid message" }));
      return;
    }
    if (msg.type === "presence") {
      if (!client.playerId) return;
      this.presence.set(client.playerId, { ...msg.pose, playerId: client.playerId });
      this.broadcastPresence();
      return;
    }
    if (msg.type === "action") {
      if (!client.playerId) {
        client.ws.send(encodeServerMessage({ type: "error", message: "playerId required" }));
        return;
      }
      const table = this.getTable(this.tableId);
      if (!table) {
        client.ws.send(encodeServerMessage({ type: "error", message: "table not found" }));
        return;
      }
      try {
        table.act(client.playerId, msg.action as PlayerAction);
        this.onAction(table);
        this.broadcastState();
      } catch (err) {
        const message = err instanceof PokerError ? err.message : "action failed";
        client.ws.send(encodeServerMessage({ type: "error", message }));
      }
    }
  }

  broadcastState(): void {
    const table = this.getTable(this.tableId);
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
        poses: Object.fromEntries(this.presence),
      }),
    );
  }

  private broadcastPresence(): void {
    this.seq += 1;
    const poses = Object.fromEntries(this.presence);
    for (const s of this.sockets) {
      if (s.ws.readyState !== WebSocket.OPEN) continue;
      s.ws.send(encodeServerMessage({ type: "presence", seq: this.seq, poses }));
    }
  }
}

export class WsHub {
  private readonly rooms = new Map<string, TableRoom>();

  room(
    tableId: string,
    getTable: (id: string) => Table | undefined,
    onAction: (table: Table) => void,
  ): TableRoom {
    let r = this.rooms.get(tableId);
    if (!r) {
      r = new TableRoom(tableId, getTable, onAction);
      this.rooms.set(tableId, r);
    }
    return r;
  }

  broadcast(tableId: string): void {
    this.rooms.get(tableId)?.broadcastState();
  }
}
