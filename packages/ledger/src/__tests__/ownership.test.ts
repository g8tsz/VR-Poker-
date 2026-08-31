import { describe, expect, it } from "vitest";
import { LedgerError, OwnershipLedger } from "../index.ts";

describe("OwnershipLedger", () => {
  it("grants and checks entitlement", () => {
    const o = new OwnershipLedger();
    o.grant("u1", "skin-neon-52", "purchase", "ledger-1");
    expect(o.owns("u1", "skin-neon-52")).toBe(true);
    expect(o.owns("u1", "other")).toBe(false);
    expect(o.ownedSkus("u1")).toEqual(["skin-neon-52"]);
  });

  it("rejects duplicate grants", () => {
    const o = new OwnershipLedger();
    o.grant("u1", "skin-neon-52", "grant");
    expect(() => o.grant("u1", "skin-neon-52", "grant")).toThrow(LedgerError);
  });
});
