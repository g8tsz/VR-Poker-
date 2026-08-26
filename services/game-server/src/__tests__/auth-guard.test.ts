import { SignJWT } from "jose";
import { afterEach, describe, expect, it } from "vitest";
import { createGameServer } from "../app.ts";
import { localChipLedgerPort } from "../ledger-port.ts";

const secret = "auth-guard-test-secret";
const issuer = "vr-poker-test";
const audience = "vr-poker-api";

async function mint(sub: string): Promise<string> {
  const key = new TextEncoder().encode(secret);
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setExpirationTime("1h")
    .sign(key);
}

function waitListen(handle: ReturnType<typeof createGameServer>): Promise<number> {
  return new Promise((resolve) => {
    if (handle.server.listening) resolve(handle.port);
    else handle.server.once("listening", () => resolve(handle.port));
  });
}

describe("auth guards", () => {
  afterEach(() => {
    process.env.AUTH_DISABLED = "1";
    delete process.env.AUTH_DEV_SECRET;
    delete process.env.AUTH_ISSUER;
    delete process.env.AUTH_AUDIENCE;
  });

  it("rejects /act without token when auth enabled", async () => {
    process.env.AUTH_DISABLED = "0";
    process.env.AUTH_DEV_SECRET = secret;
    process.env.AUTH_ISSUER = issuer;
    process.env.AUTH_AUDIENCE = audience;

    const handle = createGameServer({ port: 0, ledger: localChipLedgerPort() });
    const port = await waitListen(handle);
    const base = `http://127.0.0.1:${port}`;

    try {
      await fetch(`${base}/tables`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: "auth-table" }),
      });

      const res = await fetch(`${base}/tables/auth-table/act`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ playerId: "alice", type: "fold" }),
      });
      expect(res.status).toBe(401);
    } finally {
      await handle.close();
    }
  });

  it("rejects mismatched playerId in token", async () => {
    process.env.AUTH_DISABLED = "0";
    process.env.AUTH_DEV_SECRET = secret;
    process.env.AUTH_ISSUER = issuer;
    process.env.AUTH_AUDIENCE = audience;

    const handle = createGameServer({ port: 0, ledger: localChipLedgerPort() });
    const port = await waitListen(handle);
    const base = `http://127.0.0.1:${port}`;
    const token = await mint("alice");

    try {
      const res = await fetch(`${base}/tables`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: "auth-table-2" }),
      });
      expect(res.status).toBe(201);

      const sit = await fetch(`${base}/tables/auth-table-2/sit`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ playerId: "bob", name: "Bob", buyIn: 1000 }),
      });
      expect(sit.status).toBe(401);
    } finally {
      await handle.close();
    }
  });
});
