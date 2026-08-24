import { Table, type PlayerAction, type TableConfig, type TableSnapshot } from "@vr-poker/core";
import { CsprngDealSource } from "@vr-poker/deal";
import { ChipLedger } from "@vr-poker/ledger";
import { GameServerClient } from "./api.ts";

export interface FlatSession {
  readonly mode: "local" | "remote";
  readonly tableId: string;
  balance(playerId: string): Promise<number>;
  ensureAccount(playerId: string, name?: string): Promise<void>;
  sit(playerId: string, name: string, buyIn: number, seat?: number): Promise<TableSnapshot>;
  start(): Promise<TableSnapshot>;
  act(playerId: string, action: PlayerAction): Promise<TableSnapshot>;
  snapshot(viewerId?: string): Promise<TableSnapshot>;
  addOn(playerId: string, amount: number): Promise<TableSnapshot>;
  leave(playerId: string): Promise<number>;
}

const DEFAULT_CONFIG: Partial<TableConfig> = {
  seats: 6,
  smallBlind: 50,
  bigBlind: 100,
  minBuyIn: 4_000,
  maxBuyIn: 20_000,
  rakePercent: 0.05,
  rakeCap: 300,
  noFlopNoRake: true,
  actionTimeoutMs: 60_000,
};

export function createLocalSession(tableId = "felt-1"): FlatSession {
  const ledger = new ChipLedger();
  const table = new Table(tableId, new CsprngDealSource(), DEFAULT_CONFIG);

  return {
    mode: "local",
    tableId,
    async balance(playerId) {
      return ledger.balance(playerId);
    },
    async ensureAccount(playerId) {
      if (ledger.history(playerId).length === 0) ledger.append(playerId, 100_000, "seed");
    },
    async sit(playerId, name, buyIn, seat) {
      await this.ensureAccount(playerId);
      ledger.buyIn(playerId, buyIn, table.tableId);
      try {
        table.sit(playerId, name, buyIn, seat);
      } catch (err) {
        ledger.cashOut(playerId, buyIn, table.tableId);
        throw err;
      }
      return table.snapshot(playerId);
    },
    async start() {
      table.startHand();
      return table.snapshot();
    },
    async act(playerId, action) {
      table.act(playerId, action);
      return table.snapshot(playerId);
    },
    async snapshot(viewerId) {
      return table.snapshot(viewerId);
    },
    async addOn(playerId, amount) {
      ledger.addOn(playerId, amount, table.tableId);
      table.addOn(playerId, amount);
      return table.snapshot(playerId);
    },
    async leave(playerId) {
      const chips = table.cashOut(playerId);
      if (chips) ledger.cashOut(playerId, chips, table.tableId);
      return chips;
    },
  };
}

export async function createRemoteSession(baseUrl: string, tableId = "felt-remote"): FlatSession {
  const api = new GameServerClient(baseUrl);
  await api.health();
  try {
    await api.getTable(tableId);
  } catch {
    await api.createTable(tableId, DEFAULT_CONFIG);
  }

  return {
    mode: "remote",
    tableId,
    async balance(playerId) {
      const acct = await api.getAccount(playerId);
      return acct.balance;
    },
    async ensureAccount(playerId, name) {
      await api.createAccount(playerId, name ?? playerId);
    },
    async sit(playerId, name, buyIn, seat) {
      await this.ensureAccount(playerId, name);
      return api.sit(tableId, playerId, name, buyIn, seat);
    },
    async start() {
      return api.start(tableId);
    },
    async act(playerId, action) {
      return api.act(tableId, playerId, action);
    },
    async snapshot(viewerId) {
      return api.getTable(tableId, viewerId);
    },
    async addOn(playerId, amount) {
      return api.addOn(tableId, playerId, amount);
    },
    async leave(playerId) {
      const res = await api.leave(tableId, playerId);
      return res.cashedOut;
    },
  };
}
