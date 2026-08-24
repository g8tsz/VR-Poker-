import type { LegalAction, PlayerAction } from "@vr-poker/core";

/** Passive bot: check/call when possible, otherwise fold. Good for smoke demos. */
export function pickBotAction(legal: LegalAction[]): PlayerAction {
  const types = new Set(legal.map((l) => l.type));
  if (types.has("check")) return { type: "check" };
  if (types.has("call")) return { type: "call" };
  if (types.has("bet")) {
    const bet = legal.find((l) => l.type === "bet")!;
    return { type: "bet", amount: bet.min };
  }
  return { type: "fold" };
}
