export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export interface AuthVerifyOptions {
  /** Remote JWKS (Supabase / Auth0 / Firebase) */
  jwksUrl?: string;
  issuer?: string;
  audience?: string | string[];
  /** Local HS256 secret — dev only */
  secret?: string;
}

export interface AuthUser {
  subject: string;
  email?: string;
  claims: Record<string, unknown>;
}

export function authConfigFromEnv(): AuthVerifyOptions {
  return {
    jwksUrl: process.env.AUTH_JWKS_URL,
    issuer: process.env.AUTH_ISSUER,
    audience: process.env.AUTH_AUDIENCE,
    secret: process.env.AUTH_DEV_SECRET,
  };
}

export function bearerFromHeader(authorization?: string | null): string | null {
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim();
}

export async function verifyAccessToken(token: string, opts: AuthVerifyOptions): Promise<AuthUser> {
  const verifyOpts = {
    issuer: opts.issuer,
    audience: opts.audience,
  };

  let payload;
  if (opts.secret) {
    const { jwtVerify } = await import("jose");
    const key = new TextEncoder().encode(opts.secret);
    ({ payload } = await jwtVerify(token, key, verifyOpts));
  } else if (opts.jwksUrl) {
    const { createRemoteJWKSet, jwtVerify } = await import("jose");
    const jwks = createRemoteJWKSet(new URL(opts.jwksUrl));
    ({ payload } = await jwtVerify(token, jwks, verifyOpts));
  } else {
    throw new AuthError("auth not configured (set AUTH_DEV_SECRET or AUTH_JWKS_URL)");
  }

  if (!payload.sub) throw new AuthError("token missing sub");
  return {
    subject: String(payload.sub),
    email: typeof payload.email === "string" ? payload.email : undefined,
    claims: payload as Record<string, unknown>,
  };
}

export async function requireAuthHeader(
  authorization: string | undefined,
  opts: AuthVerifyOptions,
): Promise<AuthUser | null> {
  if (process.env.AUTH_DISABLED === "1") return null;
  const token = bearerFromHeader(authorization ?? null);
  if (!token) throw new AuthError("missing bearer token");
  return verifyAccessToken(token, opts);
}

export function authEnabled(): boolean {
  return process.env.AUTH_DISABLED !== "1";
}

/** When auth is on, subject comes from the JWT; claimed body/query id must match or be omitted. */
export function resolveSubject(authUser: AuthUser | null, claimed?: string): string {
  if (!authEnabled()) {
    const id = claimed?.trim();
    if (!id) throw new AuthError("playerId required");
    return id;
  }
  if (!authUser) throw new AuthError("missing bearer token");
  const claimedId = claimed?.trim();
  if (claimedId && claimedId !== authUser.subject) {
    throw new AuthError("playerId does not match token subject");
  }
  return authUser.subject;
}

/** Verify WebSocket upgrade: token via ?token= or Authorization header. */
export async function verifyWsAuth(
  url: URL,
  headers: import("node:http").IncomingHttpHeaders,
): Promise<AuthUser | null> {
  if (!authEnabled()) return null;
  const token =
    url.searchParams.get("token") ?? bearerFromHeader(headers.authorization ?? null);
  if (!token) throw new AuthError("missing bearer token");
  return verifyAccessToken(token, authConfigFromEnv());
}

export { corsOrigin, corsHeaders } from "./http.ts";
