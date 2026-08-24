import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { AuthError, verifyAccessToken } from "../index.ts";

const secret = "test-secret";
const issuer = "vr-poker-test";
const audience = "vr-poker-api";

async function mint(sub: string): Promise<string> {
  const key = new TextEncoder().encode(secret);
  return new SignJWT({ sub, email: `${sub}@test` })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setExpirationTime("1h")
    .sign(key);
}

describe("verifyAccessToken", () => {
  it("verifies HS256 dev tokens", async () => {
    const token = await mint("user-123");
    const user = await verifyAccessToken(token, { secret, issuer, audience });
    expect(user.subject).toBe("user-123");
    expect(user.email).toBe("user-123@test");
  });

  it("rejects bad signature", async () => {
    const token = await mint("user-123");
    await expect(verifyAccessToken(token, { secret: "wrong", issuer, audience })).rejects.toThrow();
  });

  it("requires configuration", async () => {
    await expect(verifyAccessToken("x.y.z", {})).rejects.toBeInstanceOf(AuthError);
  });
});
