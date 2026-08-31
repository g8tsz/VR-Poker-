import type { LegalAction, TableSnapshot } from "@vr-poker/core";

/** casino-server prompt types: true | array | "range,min,max" | object | null */
export type CasinoCmd = true | unknown[] | string | Record<string, unknown> | null;

export type CasinoCmds = Record<string, CasinoCmd>;

export function cmdsFromLegal(legal: LegalAction[]): CasinoCmds {
  const cmds: CasinoCmds = {
    fold: null,
    check: null,
    call: null,
    raise: null,
    all_in: null,
    bet: null,
  };
  for (const a of legal) {
    switch (a.type) {
      case "fold":
        cmds.fold = true;
        break;
      case "check":
        cmds.check = true;
        break;
      case "call":
        cmds.call = true;
        break;
      case "all-in":
        cmds.all_in = true;
        break;
      case "bet":
        cmds.bet = a.min != null && a.max != null ? `range,${a.min},${a.max}` : true;
        break;
      case "raise":
        cmds.raise = a.min != null && a.max != null ? `range,${a.min},${a.max}` : true;
        break;
      default:
        break;
    }
  }
  return cmds;
}

export function raiseIncrementRange(currentBet: number, legal: LegalAction[]): { min: number; max: number } | null {
  const spec = legal.find((l) => l.type === "raise");
  if (!spec || spec.min == null || spec.max == null) return null;
  return { min: spec.min - currentBet, max: spec.max - currentBet };
}

export function cmdsForActor(snap: TableSnapshot): CasinoCmds {
  const cmds = cmdsFromLegal(snap.legal);
  const range = raiseIncrementRange(snap.currentBet, snap.legal);
  if (range) cmds.raise = `range,${range.min},${range.max}`;
  if (snap.street === "waiting") {
    cmds.ready = true;
    cmds.fold = null;
    cmds.check = null;
    cmds.call = null;
    cmds.raise = null;
    cmds.all_in = null;
    cmds.bet = null;
  }
  return cmds;
}

export function roomDetails(snap: TableSnapshot, viewerId?: string): Record<string, unknown> {
  const seats = snap.players.map((p) => (p.playerId ? p.playerId : null));
  const gamers: Record<string, unknown> = {};
  for (const p of snap.players) {
    if (!p.playerId) continue;
    gamers[p.playerId] = {
      uid: p.playerId,
      name: p.name,
      seat: p.seat,
      coins: p.stack,
      chips: p.streetCommit,
      is_ingame: !p.folded && snap.street !== "waiting",
      is_allin: p.allIn,
      cards: p.playerId === viewerId || snap.street === "showdown" || snap.street === "payout" ? p.hole ?? [] : [],
    };
  }
  return {
    id: snap.tableId,
    type: "holdem3",
    name: snap.tableId,
    seats,
    seats_taken: snap.players.filter((p) => p.playerId).length,
    dealer_seat: snap.buttonSeat,
    shared_cards: snap.board,
    pot: snap.pot,
    max_chip: snap.currentBet,
    last_raise: Math.max(0, snap.minRaiseTo - snap.currentBet),
    street: snap.street,
    handId: snap.handId,
    toActSeat: snap.toActSeat,
    commitment: snap.commitment,
    gamers,
    winners: snap.winners,
    lastEvents: snap.lastEvents,
  };
}

export function hallGames(): Record<string, unknown>[] {
  return [
    {
      id: "holdem3",
      name: "texas holdem",
      desc: "texas holdem, rule: no limit (VR Poker NLHE engine)",
    },
  ];
}
