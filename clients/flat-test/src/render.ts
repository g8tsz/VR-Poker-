import type { TableSnapshot } from "@vr-poker/core";

export function formatLegal(snap: TableSnapshot): string {
  if (!snap.legal.length) return "";
  return snap.legal
    .map((a) =>
      a.min != null
        ? `${a.type} ${a.min}${a.max != null && a.max !== a.min ? "–" + a.max : ""}`
        : a.type,
    )
    .join(" · ");
}

export function renderTable(snap: TableSnapshot, viewAs: string | null, bankroll?: number): string {
  const lines: string[] = [];
  lines.push("────────────────────────────────────────");
  lines.push(`table ${snap.tableId}  street=${snap.street}  hand=#${snap.handId}  pot=${snap.pot}`);
  lines.push(
    `board ${snap.board.join(" ") || "—"}   button=${snap.buttonSeat ?? "—"}  toAct=${snap.toActSeat ?? "—"}`,
  );
  if (snap.commitment) lines.push(`commit ${snap.commitment.slice(0, 24)}…`);
  if (snap.reveal) lines.push(`reveal seed=${snap.reveal.seed.slice(0, 16)}… nonce=${snap.reveal.nonce}`);
  for (const p of snap.players) {
    if (!p.playerId) continue;
    const tags = [
      p.seat === snap.buttonSeat ? "BTN" : "",
      p.folded ? "FOLD" : "",
      p.allIn ? "ALL-IN" : "",
      p.seat === snap.toActSeat ? "<<" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const hideHole = viewAs && p.playerId !== viewAs && snap.street !== "showdown" && snap.street !== "payout";
    const hole = hideHole ? "xx xx" : (p.hole?.join(" ") ?? "");
    lines.push(
      `  seat ${p.seat}  ${p.name.padEnd(12)}  stack ${String(p.stack).padStart(6)}  in ${p.streetCommit}  ${hole}  ${tags}`,
    );
  }
  const legal = formatLegal(snap);
  if (legal) lines.push(`legal: ${legal}`);
  if (snap.winners?.length) {
    lines.push(`winners: ${snap.winners.map((w) => `${w.playerId} +${w.amount} ${w.hand ?? ""}`).join(" | ")}`);
  }
  for (const e of snap.lastEvents) lines.push(`  · ${e}`);
  if (viewAs && bankroll !== undefined) lines.push(`viewing as ${viewAs}  bankroll ${bankroll}`);
  return lines.join("\n");
}
