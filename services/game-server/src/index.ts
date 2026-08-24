import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { AuthError, authConfigFromEnv, requireAuthHeader } from "@vr-poker/auth";
import { PokerError, Table, type PlayerAction, type TableConfig } from "@vr-poker/core";
import { CsprngDealSource } from "@vr-poker/deal";
import { ChipLedger, LedgerError } from "@vr-poker/ledger";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT ?? 8787);
const deal = new CsprngDealSource();
const ledger = new ChipLedger();
const tables = new Map<string, Table>();
const names = new Map<string, string>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const sockets = new Set<{ tableId: string; playerId?: string; send: (s: string) => void }>();

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json", "access-control-allow-origin": "*" });
  res.end(JSON.stringify(body, null, 2));
}

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw) as Record<string, unknown>;
}

function ensureAccount(playerId: string, name?: string): void {
  if (name) names.set(playerId, name);
  if (ledger.history(playerId).length === 0) {
    ledger.append(playerId, 100_000, "seed", "welcome");
  }
}

function tableOrThrow(id: string): Table {
  const t = tables.get(id);
  if (!t) throw new PokerError("table not found");
  return t;
}

function broadcast(tableId: string): void {
  const t = tables.get(tableId);
  if (!t) return;
  for (const s of sockets) {
    if (s.tableId !== tableId) continue;
    s.send(JSON.stringify({ type: "state", state: t.snapshot(s.playerId) }));
  }
}

function armTimeout(table: Table): void {
  const existing = timers.get(table.tableId);
  if (existing) clearTimeout(existing);
  const snap = table.snapshot();
  if (snap.toActSeat === null) return;
  const actor = snap.players.find((p) => p.seat === snap.toActSeat);
  if (!actor?.playerId) return;
  const t = setTimeout(() => {
    try {
      table.act(actor.playerId, { type: "fold" });
      broadcast(table.tableId);
      armTimeout(table);
    } catch {
      /* hand may have ended */
    }
  }, table.config.actionTimeoutMs);
  timers.set(table.tableId, t);
}

function handleError(res: ServerResponse, err: unknown): void {
  if (err instanceof AuthError) {
    json(res, 401, { error: err.message });
    return;
  }
  if (err instanceof PokerError || err instanceof LedgerError) {
    json(res, 400, { error: err.message });
    return;
  }
  console.error(err);
  json(res, 500, { error: "internal" });
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET,POST,OPTIONS",
        "access-control-allow-headers": "content-type, authorization",
      });
      res.end();
      return;
    }
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
    const path = url.pathname;

    if (req.method === "GET" && path === "/health") {
      json(res, 200, { ok: true, tables: tables.size });
      return;
    }

    if (req.method === "POST" && path === "/accounts") {
      const body = await readBody(req);
      const authUser = await requireAuthHeader(req.headers.authorization, authConfigFromEnv());
      const playerId = authUser?.subject ?? String(body.playerId ?? "");
      const name = String(body.name ?? authUser?.email ?? playerId);
      if (!playerId) throw new PokerError("playerId required");
      ensureAccount(playerId, name);
      json(res, 200, { playerId, name, balance: ledger.balance(playerId), authSubject: authUser?.subject ?? null });
      return;
    }

    if (req.method === "GET" && path.startsWith("/accounts/")) {
      const playerId = decodeURIComponent(path.slice("/accounts/".length));
      json(res, 200, {
        playerId,
        name: names.get(playerId) ?? playerId,
        balance: ledger.balance(playerId),
        history: ledger.history(playerId),
      });
      return;
    }

    if (req.method === "POST" && path === "/tables") {
      const body = await readBody(req);
      const id = String(body.id ?? `table-${tables.size + 1}`);
      const config = (body.config ?? {}) as Partial<TableConfig>;
      const table = new Table(id, deal, {
        actionTimeoutMs: 30_000,
        ...config,
      });
      tables.set(id, table);
      json(res, 201, table.snapshot());
      return;
    }

    const sit = path.match(/^\/tables\/([^/]+)\/sit$/);
    if (req.method === "POST" && sit) {
      const table = tableOrThrow(sit[1]!);
      const body = await readBody(req);
      const playerId = String(body.playerId ?? "");
      const name = String(body.name ?? playerId);
      const buyIn = Number(body.buyIn);
      const seat = body.seat === undefined ? undefined : Number(body.seat);
      ensureAccount(playerId, name);
      ledger.buyIn(playerId, buyIn, table.tableId);
      try {
        table.sit(playerId, name, buyIn, seat);
      } catch (err) {
        ledger.cashOut(playerId, buyIn, table.tableId);
        throw err;
      }
      broadcast(table.tableId);
      json(res, 200, table.snapshot(playerId));
      return;
    }

    const addon = path.match(/^\/tables\/([^/]+)\/add-on$/);
    if (req.method === "POST" && addon) {
      const table = tableOrThrow(addon[1]!);
      const body = await readBody(req);
      const playerId = String(body.playerId ?? "");
      const amount = Number(body.amount);
      ledger.addOn(playerId, amount, table.tableId);
      try {
        table.addOn(playerId, amount);
      } catch (err) {
        ledger.cashOut(playerId, amount, table.tableId);
        throw err;
      }
      json(res, 200, table.snapshot(playerId));
      return;
    }

    const leave = path.match(/^\/tables\/([^/]+)\/leave$/);
    if (req.method === "POST" && leave) {
      const table = tableOrThrow(leave[1]!);
      const body = await readBody(req);
      const playerId = String(body.playerId ?? "");
      const chips = table.cashOut(playerId);
      if (chips > 0) ledger.cashOut(playerId, chips, table.tableId);
      json(res, 200, { playerId, cashedOut: chips, balance: ledger.balance(playerId) });
      return;
    }

    const start = path.match(/^\/tables\/([^/]+)\/start$/);
    if (req.method === "POST" && start) {
      const table = tableOrThrow(start[1]!);
      table.startHand();
      armTimeout(table);
      broadcast(table.tableId);
      json(res, 200, table.snapshot());
      return;
    }

    const act = path.match(/^\/tables\/([^/]+)\/act$/);
    if (req.method === "POST" && act) {
      const table = tableOrThrow(act[1]!);
      const body = await readBody(req);
      const playerId = String(body.playerId ?? "");
      const action: PlayerAction = {
        type: body.type as PlayerAction["type"],
        amount: body.amount === undefined ? undefined : Number(body.amount),
      };
      table.act(playerId, action);
      armTimeout(table);
      broadcast(table.tableId);
      json(res, 200, table.snapshot(playerId));
      return;
    }

    const getTable = path.match(/^\/tables\/([^/]+)$/);
    if (req.method === "GET" && getTable) {
      const table = tableOrThrow(getTable[1]!);
      const playerId = url.searchParams.get("playerId") ?? undefined;
      json(res, 200, table.snapshot(playerId ?? undefined));
      return;
    }

    json(res, 404, { error: "not found" });
  } catch (err) {
    handleError(res, err);
  }
});

const wss = new WebSocketServer({ server, path: "/ws" });
wss.on("connection", (ws, req) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  const tableId = url.searchParams.get("tableId") ?? "";
  const playerId = url.searchParams.get("playerId") ?? undefined;
  const client = {
    tableId,
    playerId,
    send: (s: string) => {
      if (ws.readyState === ws.OPEN) ws.send(s);
    },
  };
  sockets.add(client);
  const t = tables.get(tableId);
  if (t) client.send(JSON.stringify({ type: "state", state: t.snapshot(playerId) }));
  ws.on("close", () => sockets.delete(client));
});

server.listen(PORT, () => {
  console.log(`VR Poker game server http://127.0.0.1:${PORT}`);
  console.log("POST /accounts  POST /tables  POST /tables/:id/sit|start|act|leave");
});
