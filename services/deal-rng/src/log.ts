import { mirrorDealAudit } from "./audit-db.ts";

export type IntegrityEvent =
  | "hand.open"
  | "hand.draw"
  | "hand.close"
  | "hand.verify_ok"
  | "hand.verify_fail"
  | "hand.reject";

export function integrityLog(
  event: IntegrityEvent,
  fields: Record<string, string | number | boolean | undefined>,
): void {
  if (process.env.DEAL_SILENT === "1") return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    service: "deal-rng",
    event,
    ...fields,
  });
  // Integrity story: structured stdout (ship to your log drain).
  console.log(line);
  mirrorDealAudit(event, fields);
}
