import { describe, expect, it } from "vitest";
import { ChipLedger, LedgerError } from "../index.ts";

describe("append-only ledger", () => {
  it("derives balance from entries", () => {
    const l = new ChipLedger();
    l.append("u1", 10_000, "seed");
    l.buyIn("u1", 4_000, "t1");
    expect(l.balance("u1")).toBe(6_000);
    l.cashOut("u1", 4_200, "t1");
    expect(l.balance("u1")).toBe(10_200);
  });

  it("never goes negative", () => {
    const l = new ChipLedger();
    l.append("u1", 100, "seed");
    expect(() => l.buyIn("u1", 101, "t1")).toThrow(LedgerError);
  });

  it("keeps a full audit trail", () => {
    const l = new ChipLedger();
    l.append("u1", 5000, "seed");
    l.buyIn("u1", 1000, "t1");
    expect(l.history("u1").map((e) => e.reason)).toEqual(["seed", "buy_in"]);
    expect(l.history("u1").every((e) => e.id >= 1)).toBe(true);
  });
});
