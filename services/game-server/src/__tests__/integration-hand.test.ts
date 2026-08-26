import { beforeEach, describe, expect, it } from "vitest";
import type { LegalAction, PlayerAction, TableSnapshot } from "@vr-poker/core";
import { fixedDeal } from "@vr-poker/core";
import { TableClient } from "@vr-poker/netcode";
import { createGameServer } from "../app.ts";
import { localChipLedgerPort } from "../ledger-port.ts";

const DECK =
  "As Ks Qs Js Ts 9s 8s 7s 6s 5s 4s 3s 2s " +
  "Ah Kh Qh Jh Th 9h 8h 7h 6h 5h 4h 3h 2h " +
  "Ad Kd Qd Jd Td 9d 8d 7d 6d 5d 4d 3d 2d " +
  "Ac Kc Qc Jc Tc 9c 8c 7c 6c 5c 4c 3c 2c";

function pickAction(legal: LegalAction[]): PlayerAction {
  const types = new Set(legal.map((l) => l.type));
  if (types.has("check")) return { type: "check" };
  if (types.has("call")) return { type: "call" };
  if (types.has("bet")) {
    const bet = legal.find((l) => l.type === "bet")!;
    return { type: "bet", amount: bet.min };
  }
  return { type: "fold" };
}

function waitForListen(handle: ReturnType<typeof createGameServer>): Promise<number> {
  return new Promise((resolve) => {
    if (handle.server.listening) {
      resolve(handle.port);
      return;
    }
    handle.server.once("listening", () => resolve(handle.port));
  });
}

function connectClient(
  base: string,
  tableId: string,
  playerId: string,
): Promise<{ client: TableClient; states: TableSnapshot[] }> {
  const states: TableSnapshot[] = [];
  const client = new TableClient({ httpBase: base, tableId, playerId });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("connect timeout")), 5000);
    client.connect({
      onConnected: () => {
        clearTimeout(timer);
        resolve({ client, states });
      },
      onState: (s) => states.push(s),
      onError: (m) => reject(new Error(m)),
    });
  });
}

describe("integration: two WS clients play one hand", () => {
  beforeEach(() => {
    process.env.AUTH_DISABLED = "1";
  });

  it("sit → start → bet streets → payout → waiting", async () => {
    const handle = createGameServer({
      port: 0,
      deal: fixedDeal(DECK),
      ledger: localChipLedgerPort(),
    });
    const port = await waitForListen(handle);
    const base = `http://127.0.0.1:${port}`;
    const tableId = "integration-felt";
    let alice: { client: TableClient; states: TableSnapshot[] } | undefined;
    let bob: { client: TableClient; states: TableSnapshot[] } | undefined;

    try {
      const createRes = await fetch(`${base}/tables`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: tableId,
          config: { seats: 2, smallBlind: 50, bigBlind: 100, minBuyIn: 1000, maxBuyIn: 20_000 },
        }),
      });
      expect(createRes.status).toBe(201);

      alice = await connectClient(base, tableId, "alice");
      bob = await connectClient(base, tableId, "bob");

      alice.client.sendSit("Alice", 5000, 0);
      bob.client.sendSit("Bob", 5000, 1);

      await new Promise((r) => setTimeout(r, 100));

      alice.client.sendStart();

      let steps = 0;
      const maxSteps = 120;
      while (steps < maxSteps) {
        const snap = alice.client.getState() ?? bob.client.getState();
        if (!snap) {
          await new Promise((r) => setTimeout(r, 20));
          continue;
        }
        if (snap.handId >= 1 && snap.street === "waiting" && steps > 0) break;
        if (snap.toActSeat !== null) {
          const actor = snap.players.find((p) => p.seat === snap.toActSeat);
          if (actor?.playerId) {
            const view =
              actor.playerId === "alice"
                ? alice.client.getState()!
                : bob.client.getState()!;
            const action = pickAction(view.legal);
            if (actor.playerId === "alice") alice.client.sendAction(action);
            else bob.client.sendAction(action);
          }
        }
        steps++;
        await new Promise((r) => setTimeout(r, 25));
      }

      const final = alice.client.getState() ?? bob.client.getState();
      expect(final).toBeDefined();
      expect(final!.handId).toBeGreaterThanOrEqual(1);
      expect(final!.street).toBe("waiting");
      expect(steps).toBeGreaterThan(0);
      expect(alice.states.some((s) => s.street === "payout") || bob.states.some((s) => s.street === "payout")).toBe(
        true,
      );
    } finally {
      alice?.client.close();
      bob?.client.close();
      await handle.close();
    }
  }, 15_000);
});
