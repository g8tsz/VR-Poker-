#!/usr/bin/env node
/**
 * Mint a dev HS256 JWT for local stack testing.
 * Usage: node infra/scripts/dev-token.mjs alice
 */
import { SignJWT } from "jose";

const subject = process.argv[2] ?? "dev-player";
const secret = process.env.AUTH_DEV_SECRET ?? "vr-poker-dev-secret-change-me";
const issuer = process.env.AUTH_ISSUER ?? "vr-poker-local";
const audience = process.env.AUTH_AUDIENCE ?? "vr-poker-api";

const key = new TextEncoder().encode(secret);
const token = await new SignJWT({ sub: subject, email: `${subject}@local.test` })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuer(issuer)
  .setAudience(audience)
  .setIssuedAt()
  .setExpirationTime("2h")
  .sign(key);

console.log(token);
