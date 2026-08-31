/** CORS origin for HTTP responses. Set CORS_ORIGIN in production; defaults to * for local dev. */
export function corsOrigin(): string {
  return process.env.CORS_ORIGIN ?? "*";
}

export function corsHeaders(
  extra: Record<string, string> = {},
): Record<string, string> {
  return {
    "access-control-allow-origin": corsOrigin(),
    "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
    ...extra,
  };
}
