export type TournamentStatus = "scheduled" | "registering" | "running" | "completed" | "cancelled";

export interface TournamentConfig {
  id: string;
  name: string;
  buyIn: number;
  startingStack: number;
  seatsPerTable: number;
  maxPlayers: number;
  startsAt: string;
  levelMinutes: number;
  /** Smallest field that pays more than winner-take-all */
  minPlayers: number;
}

export interface TournamentPlayer {
  playerId: string;
  name: string;
  stack: number;
  tableId: string | null;
  seat: number | null;
  eliminatedAt: string | null;
  finishPlace: number | null;
  prizeChips: number;
  leaderboardPoints: number;
}

export interface TournamentTable {
  id: string;
  playerIds: string[];
}

export interface TournamentSnapshot {
  id: string;
  name: string;
  status: TournamentStatus;
  buyIn: number;
  startingStack: number;
  prizePool: number;
  startsAt: string;
  startedAt: string | null;
  completedAt: string | null;
  level: number;
  playersRemaining: number;
  registered: number;
  tables: TournamentTable[];
  players: TournamentPlayer[];
  payouts: { place: number; playerId: string; chips: number; points: number }[];
}

export interface LeaderboardEntry {
  playerId: string;
  name: string;
  points: number;
  tournaments: number;
  wins: number;
}
