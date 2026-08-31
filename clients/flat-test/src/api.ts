import type { PlayerAction, TableConfig, TableSnapshot } from "@vr-poker/core";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class GameServerClient {
  constructor(private readonly baseUrl: string) {}

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl.replace(/\/$/, "")}${path}`, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = (await res.json()) as { error?: string } & T;
    if (!res.ok) throw new ApiError(json.error ?? res.statusText, res.status);
    return json as T;
  }

  health(): Promise<{ ok: boolean; tables: number }> {
    return this.request("GET", "/health");
  }

  createAccount(playerId: string, name: string): Promise<{ playerId: string; balance: number }> {
    return this.request("POST", "/accounts", { playerId, name });
  }

  getAccount(playerId: string): Promise<{ balance: number }> {
    return this.request("GET", `/accounts/${encodeURIComponent(playerId)}`);
  }

  createTable(id: string, config?: Partial<TableConfig>): Promise<TableSnapshot> {
    return this.request("POST", "/tables", { id, config });
  }

  getTable(tableId: string, playerId?: string): Promise<TableSnapshot> {
    const q = playerId ? `?playerId=${encodeURIComponent(playerId)}` : "";
    return this.request("GET", `/tables/${encodeURIComponent(tableId)}${q}`);
  }

  sit(
    tableId: string,
    playerId: string,
    name: string,
    buyIn: number,
    seat?: number,
  ): Promise<TableSnapshot> {
    return this.request("POST", `/tables/${encodeURIComponent(tableId)}/sit`, {
      playerId,
      name,
      buyIn,
      seat,
    });
  }

  start(tableId: string): Promise<TableSnapshot> {
    return this.request("POST", `/tables/${encodeURIComponent(tableId)}/start`);
  }

  act(tableId: string, playerId: string, action: PlayerAction): Promise<TableSnapshot> {
    return this.request("POST", `/tables/${encodeURIComponent(tableId)}/act`, {
      playerId,
      type: action.type,
      amount: action.amount,
    });
  }

  addOn(tableId: string, playerId: string, amount: number): Promise<TableSnapshot> {
    return this.request("POST", `/tables/${encodeURIComponent(tableId)}/add-on`, { playerId, amount });
  }

  leave(tableId: string, playerId: string): Promise<{ cashedOut: number; balance: number }> {
    return this.request("POST", `/tables/${encodeURIComponent(tableId)}/leave`, { playerId });
  }
}
