export type Street =
  | "waiting"
  | "dealing"
  | "preflop"
  | "flop"
  | "turn"
  | "river"
  | "showdown"
  | "payout";

export type ActionType = "fold" | "check" | "call" | "bet" | "raise" | "all-in";

export interface TableConfig {
  seats: number;
  smallBlind: number;
  bigBlind: number;
  minBuyIn: number;
  maxBuyIn: number;
  rakePercent: number;
  rakeCap: number;
  noFlopNoRake: boolean;
  actionTimeoutMs: number;
}

export const DEFAULT_TABLE: TableConfig = {
  seats: 9,
  smallBlind: 50,
  bigBlind: 100,
  minBuyIn: 4_000,
  maxBuyIn: 10_000,
  rakePercent: 0.05,
  rakeCap: 300,
  noFlopNoRake: true,
  actionTimeoutMs: 20_000,
};

export interface PlayerAction {
  type: ActionType;
  /** For bet: chips this street. For raise: raise-*to* total this street. */
  amount?: number;
}

export interface LegalAction {
  type: ActionType;
  min?: number;
  max?: number;
}

export interface PublicPlayer {
  playerId: string;
  name: string;
  seat: number;
  stack: number;
  streetCommit: number;
  handCommit: number;
  folded: boolean;
  allIn: boolean;
  sittingOut: boolean;
  hole?: string[];
}

export interface TableSnapshot {
  tableId: string;
  street: Street;
  handId: number;
  buttonSeat: number | null;
  toActSeat: number | null;
  currentBet: number;
  minRaiseTo: number;
  pot: number;
  board: string[];
  burns: string[];
  commitment: string | null;
  reveal: { seed: string; nonce: string } | null;
  players: PublicPlayer[];
  legal: LegalAction[];
  lastEvents: string[];
  winners?: { playerId: string; amount: number; hand?: string }[];
}
