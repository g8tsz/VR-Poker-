import pg from "pg";
import type { IntegrityEvent } from "./log.ts";

let pool: pg.Pool | null = null;

export function initDealAuditDb(): void {
  const url = process.env.DATABASE_URL;
  if (!url) return;
  pool = new pg.Pool({ connectionString: url, max: 4 });
}

export function mirrorDealAudit(
  event: IntegrityEvent,
  fields: Record<string, string | number | boolean | undefined>,
): void {
  if (!pool) return;
  const handKey = String(fields.handId ?? fields.hand_key ?? "unknown");
  const payload = { event, ...fields };
  void pool
    .query("INSERT INTO deal_audit_events (hand_key, event_type, payload) VALUES ($1, $2, $3::jsonb)", [
      handKey,
      event,
      JSON.stringify(payload),
    ])
    .catch((err) => console.error("deal audit db write failed", err));
}

export async function closeDealAuditDb(): Promise<void> {
  if (pool) await pool.end();
  pool = null;
}
