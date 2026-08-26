import { describe, expect, it, afterEach } from "vitest";
import { AuthError, resolveSubject, type AuthUser } from "../index.ts";

const alice: AuthUser = { subject: "alice", claims: {} };

describe("resolveSubject", () => {
  afterEach(() => {
    delete process.env.AUTH_DISABLED;
  });

  it("uses claimed id when auth is disabled", () => {
    process.env.AUTH_DISABLED = "1";
    expect(resolveSubject(null, "bob")).toBe("bob");
  });

  it("requires bearer token when auth is enabled", () => {
    process.env.AUTH_DISABLED = "0";
    expect(() => resolveSubject(null, "bob")).toThrow(AuthError);
  });

  it("binds to JWT subject when auth is enabled", () => {
    process.env.AUTH_DISABLED = "0";
    expect(resolveSubject(alice, undefined)).toBe("alice");
    expect(resolveSubject(alice, "alice")).toBe("alice");
    expect(() => resolveSubject(alice, "bob")).toThrow(/does not match/);
  });
});
