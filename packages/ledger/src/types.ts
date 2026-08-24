export type ClubRole = "owner" | "admin" | "member";

export interface Club {
  id: string;
  name: string;
  ownerUserId: string;
  rakePercent: number;
  rakeCap: number;
  noFlopNoRake: boolean;
  minBuyIn: number;
  maxBuyIn: number;
  createdAt: string;
}

export interface ClubMember {
  clubId: string;
  userId: string;
  role: ClubRole;
  joinedAt: string;
}

/** Table stakes + rake pulled from club settings for game-server tables. */
export interface ClubTableConfig {
  clubId: string;
  rakePercent: number;
  rakeCap: number;
  noFlopNoRake: boolean;
  minBuyIn: number;
  maxBuyIn: number;
}

export interface UserAccount {
  authSubject: string;
  displayName: string;
  balance: number;
  createdAt: string;
}
