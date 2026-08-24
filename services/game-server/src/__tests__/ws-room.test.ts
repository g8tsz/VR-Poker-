import { describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import { Table, fixedDeal } from "@vr-poker/core";
import { ChipLedger } from "@vr-poker/ledger";
import { parseServerMessage } from "@vr-poker/netcode";
import { TableRoom } from "../ws.ts";

const DECK =
  "As Ks Qs Js Ts 9s 8s 7s 6s 5s 4s 3s 2s " +
  "Ah Kh Qh Jh Th 9h 8h 7h 6h 5h 4h 3h 2h " +
  "Ad Kd Qd Jd Td 9d 8d 7d 6d 5d 4d 3d 2d " +
  "Ac Kc Qc Jc Tc 9c 8c 7c 6c 5c 4c 3c 2c";

function mockSocket(): { ws: WebSocket; sent: string[] } {
  const sent: string[] = [];
  const ws = {
    readyState: WebSocket.OPEN,
    send: (data: string) => sent.push(data),
  } as WebSocket;
  return { ws, sent };
}

function makeRoom(tableId = "t1") {
  const tables = new Map<string, Table>();
  const ledger = new ChipLedger();
  const names = new Map<string, string>();
  const table = new Table(tableId, fixedDeal(DECK), {
    seats: 2,
    smallBlind: 50,
    bigBlind: 100,
    minBuyIn: 1000,
    maxBuyIn: 20_000,
    rakePercent: 0,
    rakeCap: 0,
  });
  tables.set(tableId, table);
  ledger.append("alice", 100_000, "seed");
  ledger.append("bob", 100_000, "seed");
  ledger.buyIn("alice", 10_000, tableId);
  ledger.buyIn("bob", 10_000, tableId);
  table.sit("alice", "Alice", 10_000, 0);
  table.sit("bob", "Bob", 10_000, 1);

  const broadcasts: number[] = [];
  const room = new TableRoom(tableId, {
    getTable: (id) => tables.get(id),
    onAction: () => {},
    onBroadcast: (id) => {
      broadcasts.push(1);
      room.broadcastState();
      const t = tables.get(id);
      if (t?.finalizeHandIfComplete()) {
        broadcasts.push(2);
        room.broadcastState();
      }
    },
    tableOps: {
      tables,
      ledger,
      names,
      ensureAccount: (pid, name) => {
        if (name) names.set(pid, name);
        if (ledger.history(pid).length === 0) ledger.append(pid, 100_000, "seed");
      },
      armTimeout: () => {},
    },
  });

  return { room, table, broadcasts };
}

describe("TableRoom", () => {
  it("stamps server time on presence relay", () => {
    const { room } = makeRoom();
    const alice = mockSocket();
    const bob = mockSocket();
    room.add({ tableId: "t1", playerId: "alice", ws: alice.ws });
    room.add({ tableId: "t1", playerId: "bob", ws: bob.ws });

    room.handleMessage(
      { tableId: "t1", playerId: "alice", ws: alice.ws },
      JSON.stringify({
        type: "presence",
        pose: {
          head: { position: { x: 1, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } },
          leftHand: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } },
          rightHand: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } },
          t: 42,
        },
      }),
    );

    const presence = bob.sent.find((s) => s.includes('"type":"presence"'));
    expect(presence).toBeDefined();
    const msg = parseServerMessage(presence!);
    expect(msg?.type).toBe("presence");
    if (msg?.type === "presence") {
      expect(msg.poses.alice.t).toBeGreaterThan(0);
      expect(msg.poses.alice.t).not.toBe(42);
      expect(msg.serverTime).toBeGreaterThan(0);
    }
  });

  it("keeps presence when duplicate player socket disconnects", () => {
    const { room } = makeRoom();
    const a1 = mockSocket();
    const a2 = mockSocket();
    const bob = mockSocket();
    room.add({ tableId: "t1", playerId: "alice", ws: a1.ws });
    room.add({ tableId: "t1", playerId: "alice", ws: a2.ws });
    room.add({ tableId: "t1", playerId: "bob", ws: bob.ws });

    room.handleMessage(
      { tableId: "t1", playerId: "alice", ws: a1.ws },
      JSON.stringify({
        type: "presence",
        pose: {
          head: { position: { x: 1, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } },
          leftHand: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } },
          rightHand: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } },
        },
      }),
    );

    room.remove({ tableId: "t1", playerId: "alice", ws: a1.ws });

    room.handleMessage(
      { tableId: "t1", playerId: "bob", ws: bob.ws },
      JSON.stringify({
        type: "presence",
        pose: {
          head: { position: { x: 2, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } },
          leftHand: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } },
          rightHand: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } },
        },
      }),
    );

    const lastPresence = bob.sent.filter((s) => s.includes('"type":"presence"')).pop();
    const msg = parseServerMessage(lastPresence!);
    if (msg?.type === "presence") {
      expect(msg.poses.alice).toBeDefined();
    }
  });

  it("broadcasts payout before finalize on hand end", () => {
    const { room, table, broadcasts } = makeRoom();
    const alice = mockSocket();
    room.add({ tableId: "t1", playerId: "alice", ws: alice.ws });
    table.startHand();

    room.handleMessage(
      { tableId: "t1", playerId: "alice", ws: alice.ws },
      JSON.stringify({ type: "action", action: { type: "fold" } }),
    );

    expect(broadcasts).toEqual([1, 2]);
    const states = alice.sent
      .map((s) => parseServerMessage(s))
      .filter((m) => m?.type === "state") as Array<{ type: "state"; state: { street: string } }>;
    expect(states.some((m) => m.state.street === "payout")).toBe(true);
    expect(states[states.length - 1]?.state.street).toBe("waiting");
  });
});
