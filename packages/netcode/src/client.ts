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

  constructor(private readonly opts: TableClientOptions) {}

  connect(handlers: {
    onState?: (s: TableSnapshot) => void;
    onPresence?: (playerId: string, pose: PresencePose | null) => void;
    onError?: (message: string) => void;
  }): void {
    this.onState = handlers.onState;
    this.onPresence = handlers.onPresence;
    this.onError = handlers.onError;
    const url = wsUrl(this.opts.httpBase, this.opts.tableId, this.opts.playerId);
    this.ws = new WebSocket(url);
    this.ws.on("message", (data) => this.handleMessage(String(data)));
    this.ws.on("error", () => this.onError?.("websocket error"));
  }

  close(): void {
    this.ws?.close();
    this.ws = null;
  }

  getState(): TableSnapshot | null {
    return this.snapshot;
  }

  sendAction(action: PlayerAction): void {
    this.send({ type: "action", action });
  }

  sendPresence(pose: PresencePose): void {
    this.send({ type: "presence", pose: { ...pose, playerId: this.opts.playerId } });
  }

  /** Sample interpolated remote pose for rendering avatars. */
  remotePose(playerId: string, now = Date.now()): PresencePose | null {
    return this.remotePoses.get(playerId)?.sample(now) ?? null;
  }

  private send(msg: object): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(msg));
  }

  private handleMessage(raw: string): void {
    const msg = parseServerMessage(raw);
    if (!msg) return;
    switch (msg.type) {
      case "welcome":
        break;
      case "state":
        if (msg.seq >= this.seq) {
          this.seq = msg.seq;
          this.snapshot = msg.state;
          this.onState?.(msg.state);
        }
        break;
      case "presence":
        for (const [pid, pose] of Object.entries(msg.poses)) {
          if (pid === this.opts.playerId) continue;
          let buf = this.remotePoses.get(pid);
          if (!buf) {
            buf = new PoseInterpolator(this.opts.presenceDelayMs ?? 100);
            this.remotePoses.set(pid, buf);
          }
          buf.push(pose);
          this.onPresence?.(pid, buf.sample(Date.now()));
        }
        break;
      case "error":
        this.onError?.(msg.message);
        break;
    }
  }
}

export type { ServerMessage };
