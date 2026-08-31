import type { PlayerAction, TableSnapshot } from "@vr-poker/core";
import WebSocket from "ws";
import { parseServerMessage, type ServerMessage, wsUrl } from "./protocol.ts";
import type { PresencePose } from "./pose.ts";
import { PoseInterpolator } from "./pose.ts";

export interface TableClientOptions {
  httpBase: string;
  tableId: string;
  playerId: string;
  presenceDelayMs?: number;
  reconnectMs?: number;
  pingIntervalMs?: number;
}

/**
 * Server-authoritative table client. Renders snapshots from the server;
 * never simulates cards, pots, or winners locally.
 */
export class TableClient {
  private ws: WebSocket | null = null;
  private seq = 0;
  private snapshot: TableSnapshot | null = null;
  private readonly remotePoses = new Map<string, PoseInterpolator>();
  private onState?: (s: TableSnapshot) => void;
  private onPresence?: (playerId: string, pose: PresencePose | null) => void;
  private onError?: (message: string) => void;
  private onConnected?: () => void;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private closed = false;
  private serverTimeOffsetMs = 0;

  constructor(private readonly opts: TableClientOptions) {}

  connect(handlers: {
    onState?: (s: TableSnapshot) => void;
    onPresence?: (playerId: string, pose: PresencePose | null) => void;
    onError?: (message: string) => void;
    onConnected?: () => void;
  }): void {
    this.onState = handlers.onState;
    this.onPresence = handlers.onPresence;
    this.onError = handlers.onError;
    this.onConnected = handlers.onConnected;
    this.closed = false;
    this.openSocket();
  }

  close(): void {
    this.closed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.ws?.close();
    this.ws = null;
  }

  getState(): TableSnapshot | null {
    return this.snapshot;
  }

  /** Server clock estimate for interpolating remote presence poses. */
  serverNow(): number {
    return Date.now() + this.serverTimeOffsetMs;
  }

  sendAction(action: PlayerAction): void {
    this.send({ type: "action", action });
  }

  sendPresence(pose: Omit<PresencePose, "playerId" | "t">): void {
    this.send({ type: "presence", pose });
  }

  sendSit(name: string, buyIn: number, seat?: number): void {
    this.send({ type: "sit", name, buyIn, seat });
  }

  sendLeave(): void {
    this.send({ type: "leave" });
  }

  sendStart(): void {
    this.send({ type: "start" });
  }

  /** Sample interpolated remote pose for rendering avatars. */
  remotePose(playerId: string, now = this.serverNow()): PresencePose | null {
    return this.remotePoses.get(playerId)?.sample(now) ?? null;
  }

  private openSocket(): void {
    const url = wsUrl(this.opts.httpBase, this.opts.tableId, this.opts.playerId);
    this.ws = new WebSocket(url);
    this.ws.on("open", () => {
      this.onConnected?.();
      this.startPing();
    });
    this.ws.on("message", (data) => this.handleMessage(String(data)));
    this.ws.on("error", () => this.onError?.("websocket error"));
    this.ws.on("close", () => {
      this.stopPing();
      if (!this.closed) this.scheduleReconnect();
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    const delay = this.opts.reconnectMs ?? 2000;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.closed) this.openSocket();
    }, delay);
  }

  private startPing(): void {
    this.stopPing();
    const interval = this.opts.pingIntervalMs ?? 15_000;
    this.pingTimer = setInterval(() => this.send({ type: "ping" }), interval);
  }

  private stopPing(): void {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
  }

  private send(msg: object): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.onError?.("not connected");
      return;
    }
    this.ws.send(JSON.stringify(msg));
  }

  private syncServerTime(serverTime: number): void {
    this.serverTimeOffsetMs = serverTime - Date.now();
  }

  private handleMessage(raw: string): void {
    const msg = parseServerMessage(raw);
    if (!msg) return;
    switch (msg.type) {
      case "welcome":
        this.syncServerTime(msg.serverTime);
        break;
      case "pong":
        this.syncServerTime(msg.serverTime);
        break;
      case "state":
        if (msg.seq >= this.seq) {
          this.seq = msg.seq;
          this.snapshot = msg.state;
          this.onState?.(msg.state);
        }
        break;
      case "presence":
        if (msg.serverTime) this.syncServerTime(msg.serverTime);
        const now = this.serverNow();
        for (const [pid, pose] of Object.entries(msg.poses)) {
          if (pid === this.opts.playerId) continue;
          let buf = this.remotePoses.get(pid);
          if (!buf) {
            buf = new PoseInterpolator(this.opts.presenceDelayMs ?? 100);
            this.remotePoses.set(pid, buf);
          }
          buf.push(pose);
          this.onPresence?.(pid, buf.sample(now));
        }
        break;
      case "left":
        break;
      case "error":
        this.onError?.(msg.message);
        break;
    }
  }
}

export type { ServerMessage };
