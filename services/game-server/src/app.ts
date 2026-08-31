import { createServer, type IncomingMessage, type ServerResponse, type Server } from "node:http";
import {
  AuthError,
  authConfigFromEnv,
  corsHeaders,
  requireAuthHeader,
  resolveSubject,
  verifyWsAuth,
} from "@vr-poker/auth";
import { PokerError, Table, type DealSource, type PlayerAction, type TableConfig } from "@vr-poker/core";
import { CsprngDealSource } from "@vr-poker/deal";
import { LedgerError } from "@vr-poker/ledger";
import { WebSocketServer } from "ws";
import { AuditedDealSource, DealAuditError } from "./audited-deal.ts";
import { type ChipLedgerPort, localChipLedgerPort } from "./ledger-port.ts";
import { currentAuthHeader, runWithAuthHeader } from "./request-context.ts";
import { remoteChipLedgerPort } from "./remote-ledger.ts";
import { attachCasinoGateway } from "./casino/gateway.ts";
import { CasinoRuntime, DEFAULT_HOLDEM_ROOM } from "./casino/runtime.ts";
import { leaveTable, sitAtTable, startTableHand } from "./table-ops.ts";
import { WsHub } from "./ws.ts";

export interface GameServerOptions {
  port?: number;
  deal?: DealSource;
  ledger?: ChipLedgerPort;
}

export interface GameServerHandle {
  server: Server;
  port: number;
  close: () => Promise<void>;
}

function resolveDealSource(): DealSource {
  const inner = new CsprngDealSource();
  const dealUrl = process.env.DEAL_RNG_URL;
  if (dealUrl) return new AuditedDealSource(inner, { baseUrl: dealUrl });
  return inner;
}

function resolveLedgerPort(): ChipLedgerPort {
  const ledgerUrl = process.env.LEDGER_URL;
  if (ledgerUrl) {
    return remoteChipLedgerPort({
      baseUrl: ledgerUrl,
      getAuthHeader: () => currentAuthHeader(),
    });
  }
  return localChipLedgerPort();
}

export function createGameServer(opts: GameServerOptions = {}): GameServerHandle {
  const deal = opts.deal ?? resolveDealSource();
  const ledger = opts.ledger ?? resolveLedgerPort();
  const tables = new Map<string, Table>();
  const names = new Map<string, string>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const wsHub = new WsHub();

  async function ensureAccount(playerId: string, name?: string): Promise<void> {
    if (name) names.set(playerId, name);
    await ledger.ensureAccount(playerId, name);
  }

  const tableOpsCtx = {
    tables,
    ledger,
    names,
    ensureAccount,
    armTimeout,
  };

  function broadcastTable(tableId: string): void {
    wsHub.broadcast(tableId);
    const table = tables.get(tableId);
    if (table?.finalizeHandIfComplete()) {
      wsHub.broadcast(tableId);
    }
  }

  function broadcast(tableId: string): void {
    broadcastTable(tableId);
  }

  if (!tables.has(DEFAULT_HOLDEM_ROOM)) {
    tables.set(DEFAULT_HOLDEM_ROOM, new Table(DEFAULT_HOLDEM_ROOM, deal, { actionTimeoutMs: 30_000 }));
  }
  const casino = new CasinoRuntime(tableOpsCtx, broadcast);

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

  function tableOrThrow(id: string): Table {
    const t = tables.get(id);
    if (!t) throw new PokerError("table not found");
    return t;
  }

  const server = createServer((req, res) => {
    void runWithAuthHeader(req.headers.authorization, async () => {
      try {
        await handleHttp(req, res);
      } catch (err) {
        handleError(res, err);
      }
    });
  });

  async function handleHttp(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method === "OPTIONS") {
      res.writeHead(204, corsHeaders());
      res.end();
      return;
    }
    const port = (server.address() as { port: number } | null)?.port ?? opts.port ?? 8787;
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
    const path = url.pathname;
    const authOpts = authConfigFromEnv();

    if (req.method === "GET" && path === "/health") {
      json(res, 200, {
        ok: true,
        tables: tables.size,
        ledger: process.env.LEDGER_URL ? "remote" : "local",
        deal: process.env.DEAL_RNG_URL ? "audited-remote" : "local",
        auth: process.env.AUTH_DISABLED === "1" ? "disabled" : "required",
        protocol: "casino-server+http",
      });
      return;
    }

    if (req.method === "POST" && path === "/accounts") {
      const body = await readBody(req);
      const authUser = await requireAuthHeader(req.headers.authorization, authOpts);
      const playerId = resolveSubject(authUser, String(body.playerId ?? ""));
      const name = String(body.name ?? authUser?.email ?? playerId);
      await ensureAccount(playerId, name);
      json(res, 200, {
        playerId,
        name,
        balance: await ledger.balance(playerId),
        authSubject: authUser?.subject ?? null,
      });
      return;
    }

    if (req.method === "GET" && path.startsWith("/accounts/")) {
      const claimed = decodeURIComponent(path.slice("/accounts/".length));
      const authUser = await requireAuthHeader(req.headers.authorization, authOpts);
      const playerId = resolveSubject(authUser, claimed);
      json(res, 200, {
        playerId,
        name: names.get(playerId) ?? playerId,
        balance: await ledger.balance(playerId),
        history: await ledger.history(playerId),
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
      const tableId = sit[1]!;
      const body = await readBody(req);
      const authUser = await requireAuthHeader(req.headers.authorization, authOpts);
      const playerId = resolveSubject(authUser, String(body.playerId ?? ""));
      const name = String(body.name ?? playerId);
      const buyIn = Number(body.buyIn);
      const seat = body.seat === undefined ? undefined : Number(body.seat);
      await sitAtTable(tableOpsCtx, tableId, playerId, name, buyIn, seat);
      broadcast(tableId);
      json(res, 200, tableOrThrow(tableId).snapshot(playerId));
      return;
    }

    const addon = path.match(/^\/tables\/([^/]+)\/add-on$/);
    if (req.method === "POST" && addon) {
      const table = tableOrThrow(addon[1]!);
      const body = await readBody(req);
      const authUser = await requireAuthHeader(req.headers.authorization, authOpts);
      const playerId = resolveSubject(authUser, String(body.playerId ?? ""));
      const amount = Number(body.amount);
      await ledger.addOn(playerId, amount, table.tableId);
      try {
        table.addOn(playerId, amount);
      } catch (err) {
        await ledger.cashOut(playerId, amount, table.tableId);
        throw err;
      }
      json(res, 200, table.snapshot(playerId));
      return;
    }

    const leave = path.match(/^\/tables\/([^/]+)\/leave$/);
    if (req.method === "POST" && leave) {
      const tableId = leave[1]!;
      const body = await readBody(req);
      const authUser = await requireAuthHeader(req.headers.authorization, authOpts);
      const playerId = resolveSubject(authUser, String(body.playerId ?? ""));
      const chips = await leaveTable(tableOpsCtx, tableId, playerId);
      broadcast(tableId);
      json(res, 200, { playerId, cashedOut: chips, balance: await ledger.balance(playerId) });
      return;
    }

    const start = path.match(/^\/tables\/([^/]+)\/start$/);
    if (req.method === "POST" && start) {
      const tableId = start[1]!;
      await requireAuthHeader(req.headers.authorization, authOpts);
      startTableHand(tableOpsCtx, tableId);
      broadcast(tableId);
      json(res, 200, tableOrThrow(tableId).snapshot());
      return;
    }

    const act = path.match(/^\/tables\/([^/]+)\/act$/);
    if (req.method === "POST" && act) {
      const table = tableOrThrow(act[1]!);
      const body = await readBody(req);
      const authUser = await requireAuthHeader(req.headers.authorization, authOpts);
      const playerId = resolveSubject(authUser, String(body.playerId ?? ""));
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
      const authUser = await requireAuthHeader(req.headers.authorization, authOpts);
      const claimed = url.searchParams.get("playerId") ?? undefined;
      const playerId = claimed ? resolveSubject(authUser, claimed) : undefined;
      json(res, 200, table.snapshot(playerId));
      return;
    }

    json(res, 404, { error: "not found" });
  }

  const wss = new WebSocketServer({ server, path: "/ws" });
  wss.on("connection", (ws, req) => {
    void (async () => {
      const port = (server.address() as { port: number } | null)?.port ?? opts.port ?? 8787;
      const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
      const tableId = url.searchParams.get("tableId") ?? "";
      let playerId: string | undefined;
      try {
        const authUser = await verifyWsAuth(url, req.headers);
        playerId = resolveSubject(authUser, url.searchParams.get("playerId") ?? undefined);
      } catch (err) {
        const message = err instanceof AuthError ? err.message : "auth failed";
        ws.close(4401, message);
        return;
      }

      const authHeader =
        url.searchParams.get("token") != null
          ? `Bearer ${url.searchParams.get("token")}`
          : req.headers.authorization;

      runWithAuthHeader(authHeader, () => {
        const client = { tableId, playerId, ws };
        const room = wsHub.room(tableId, {
          getTable: (id) => tables.get(id),
          onAction: (table) => armTimeout(table),
          onBroadcast: broadcastTable,
          tableOps: tableOpsCtx,
        });
        room.add(client);
        ws.on("message", (data) => {
          void room.handleMessage(client, String(data));
        });
        ws.on("close", () => room.remove(client));
      });
    })();
  });

  const listenPort = opts.port ?? Number(process.env.PORT ?? 8787);
  const io = attachCasinoGateway(server, casino);
  server.listen(listenPort);

  return {
    server,
    get port() {
      const addr = server.address();
      if (addr && typeof addr === "object") return addr.port;
      return listenPort;
    },
    close: () =>
      new Promise<void>((resolve, reject) => {
        wss.close((err) => {
          if (err) {
            reject(err);
            return;
          }
          void io.close((err2) => {
            if (err2) reject(err2);
            else resolve();
          });
        });
      }),
  };
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json", ...corsHeaders() });
  res.end(JSON.stringify(body, null, 2));
}

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw) as Record<string, unknown>;
}

function handleError(res: ServerResponse, err: unknown): void {
  if (err instanceof AuthError) {
    json(res, 401, { error: err.message });
    return;
  }
  if (err instanceof PokerError || err instanceof LedgerError || err instanceof DealAuditError) {
    json(res, 400, { error: err.message });
    return;
  }
  console.error(err);
  json(res, 500, { error: "internal" });
}
