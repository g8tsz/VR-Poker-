import { Table } from "@vr-poker/core";
import { CsprngDealSource } from "@vr-poker/deal";
import { describe, expect, it } from "vitest";
import { cmdsForActor, raiseIncrementRange } from "../casino/map.ts";
import { casinoRaiseTo, handleRpc } from "../casino/rpc.ts";
import { CasinoRuntime, DEFAULT_HOLDEM_ROOM } from "../casino/runtime.ts";
import { localChipLedgerPort } from "../ledger-port.ts";
import type { TableOpsCtx } from "../table-ops.ts";

function runtime(): CasinoRuntime {
  const deal = new CsprngDealSource();
  const tables = new Map<string, Table>();
  tables.set(DEFAULT_HOLDEM_ROOM, new Table(DEFAULT_HOLDEM_ROOM, deal, { actionTimeoutMs: 30_000 }));
  const names = new Map<string, string>();
  const ledger = localChipLedgerPort();
  const ctx: TableOpsCtx = {
    tables,
    ledger,
    names,
    ensureAccount: async (playerId, name) => {
      if (name) names.set(playerId, name);
      await ledger.ensureAccount(playerId, name);
    },
    armTimeout: () => {},
  };
  return new CasinoRuntime(ctx, () => {});
}

describe("casino raise mapping", () => {
  it("converts increment to raise-to when a bet is live", () => {
    expect(casinoRaiseTo(200, 100, 100)).toEqual({ type: "raise", amount: 300 });
  });

  it("converts increment to a bet when the street is open", () => {
    expect(casinoRaiseTo(0, 100, 0)).toEqual({ type: "bet", amount: 100 });
  });

  it("exposes raise as casino increment range", () => {
    const range = raiseIncrementRange(200, [{ type: "raise", min: 400, max: 1000 }]);
    expect(range).toEqual({ min: 200, max: 800 });
  });
});

describe("casino-server RPC on main table ops", () => {
  it("signs up, sits two players, starts via ready, and folds", async () => {
    const store = runtime();
    const a = await handleRpc(store, { seq: 1, f: "fastsignup" }, null);
    expect(a.err).toBe(0);
    const aliceAcc = a.ret as { uid: string; passwd: string };
    const b = await handleRpc(store, { seq: 2, f: "fastsignup" }, null);
    const bobAcc = b.ret as { uid: string; passwd: string };

    const la = await handleRpc(store, { seq: 3, f: "login", args: { uid: aliceAcc.uid, passwd: aliceAcc.passwd } }, null);
    const lb = await handleRpc(store, { seq: 4, f: "login", args: { uid: bobAcc.uid, passwd: bobAcc.passwd } }, null);
    const pinA = (la.ret as { token: { pin: string } }).token.pin;
    const pinB = (lb.ret as { token: { pin: string } }).token.pin;

    expect((await handleRpc(store, { seq: 5, uid: aliceAcc.uid, pin: pinA, f: "enter", args: DEFAULT_HOLDEM_ROOM }, null)).err).toBe(0);
    expect((await handleRpc(store, { seq: 6, uid: bobAcc.uid, pin: pinB, f: "enter", args: DEFAULT_HOLDEM_ROOM }, null)).err).toBe(0);
    expect((await handleRpc(store, { seq: 7, uid: aliceAcc.uid, pin: pinA, f: "takeseat", args: 0 }, null)).err).toBe(0);
    expect((await handleRpc(store, { seq: 8, uid: bobAcc.uid, pin: pinB, f: "takeseat", args: 1 }, null)).err).toBe(0);

    await handleRpc(store, { seq: 9, uid: aliceAcc.uid, pin: pinA, f: "ready" }, null);
    const readyB = await handleRpc(store, { seq: 10, uid: bobAcc.uid, pin: pinB, f: "ready" }, null);
    expect(readyB.err).toBe(0);

    const snap = store.tableOrThrow(DEFAULT_HOLDEM_ROOM).snapshot(aliceAcc.uid);
    expect(snap.street).toBe("preflop");

    const actorId = snap.players.find((p) => p.seat === snap.toActSeat)!.playerId;
    const pin = actorId === aliceAcc.uid ? pinA : pinB;
    const fold = await handleRpc(store, { seq: 11, uid: actorId, pin, f: "fold" }, null);
    expect(fold.err).toBe(0);
    expect(store.tableOrThrow(DEFAULT_HOLDEM_ROOM).snapshot().street).toBe("waiting");
  });

  it("rejects rpc without pin", async () => {
    const r = await handleRpc(runtime(), { seq: 1, f: "games" }, null);
    expect(r.err).toBe(403);
  });

  it("prompts ready between hands", async () => {
    const store = runtime();
    await store.ctx.ensureAccount("a", "A");
    await store.ctx.ensureAccount("b", "B");
    await store.sit(DEFAULT_HOLDEM_ROOM, "a", "A", 10_000, 0);
    await store.sit(DEFAULT_HOLDEM_ROOM, "b", "B", 10_000, 1);
    const cmds = cmdsForActor(store.tableOrThrow(DEFAULT_HOLDEM_ROOM).snapshot("a"));
    expect(cmds.ready).toBe(true);
    expect(cmds.fold).toBeNull();
  });
});
