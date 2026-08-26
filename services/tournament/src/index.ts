import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import {
  AuthError,
  authConfigFromEnv,
  corsHeaders,
  requireAuthHeader,
  resolveSubject,
} from "@vr-poker/auth";
import { LedgerError, resolveLedgerStore } from "@vr-poker/ledger";
import {
  Tournament,
  TournamentError,
  TournamentScheduler,
  getLeaderboard,
  recordLeaderboard,
  type TournamentConfig,
} from "@vr-poker/tournament";

const PORT = Number(process.env.PORT ?? 8789);
const ledger = resolveLedgerStore();
const tournaments = new Map<string, Tournament>();
const scheduler = new TournamentScheduler();

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

async function ensureAccount(playerId: string): Promise<void> {
  await ledger.ensureUser(playerId);
}

function tournamentOrThrow(id: string): Tournament {
  const t = tournaments.get(id);
  if (!t) throw new TournamentError("tournament not found");
  return t;
}

function wireAutoStart(t: Tournament): void {
  if (t.getStatus() !== "registering") return;
  const snap = t.snapshot();
  scheduler.schedule({
    id: snap.id,
    startsAt: snap.startsAt,
    start: () => {
      try {
        t.start();
        console.log(`[tournament] auto-started ${snap.id}`);
      } catch (err) {
        console.error(`[tournament] auto-start failed ${snap.id}`, err);
      }
    },
  });
}

async function payPrizes(t: Tournament): Promise<void> {
  const snap = t.snapshot();
  if (snap.status !== "completed") return;
  for (const row of snap.payouts) {
    if (row.chips > 0) {
      await ledger.append(row.playerId, row.chips, "tournament_prize", snap.id);
    }
  }
  recordLeaderboard(t);
}

function handleError(res: ServerResponse, err: unknown): void {
  if (err instanceof AuthError) {
    json(res, 401, { error: err.message });
    return;
  }
  if (err instanceof TournamentError || err instanceof LedgerError) {
    json(res, 400, { error: err.message });
    return;
  }
  console.error(err);
  json(res, 500, { error: "internal" });
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.writeHead(204, corsHeaders());
      res.end();
      return;
    }

    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
    const authOpts = authConfigFromEnv();

    if (req.method === "GET" && url.pathname === "/health") {
      json(res, 200, {
        ok: true,
        service: "tournament",
        tournaments: tournaments.size,
        ledger: process.env.DATABASE_URL ? "postgres" : "memory",
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/v1/leaderboard") {
      const limit = Number(url.searchParams.get("limit") ?? 50);
      json(res, 200, { leaderboard: getLeaderboard(limit) });
      return;
    }

    if (req.method === "GET" && url.pathname === "/v1/tournaments") {
      json(res, 200, { tournaments: [...tournaments.values()].map((t) => t.snapshot()) });
      return;
    }

    if (req.method === "POST" && url.pathname === "/v1/tournaments") {
      const body = await readBody(req);
      const id = (body.id as string) ?? randomUUID();
      const config: TournamentConfig = {
        id,
        name: String(body.name ?? "MTT"),
        buyIn: Number(body.buyIn ?? 1000),
        startingStack: Number(body.startingStack ?? 10_000),
        seatsPerTable: Number(body.seatsPerTable ?? 6),
        maxPlayers: Number(body.maxPlayers ?? 100),
        startsAt: String(body.startsAt ?? new Date(Date.now() + 3600_000).toISOString()),
        levelMinutes: Number(body.levelMinutes ?? 10),
        minPlayers: Number(body.minPlayers ?? 2),
      };
      const t = new Tournament(config);
      t.openRegistration();
      tournaments.set(id, t);
      wireAutoStart(t);
      json(res, 201, t.snapshot());
      return;
    }

    const m = url.pathname.match(/^\/v1\/tournaments\/([^/]+)(\/\w+)?$/);
    if (m) {
      const t = tournamentOrThrow(m[1]!);
      const action = m[2] ?? "";

      if (req.method === "GET" && !action) {
        json(res, 200, t.snapshot());
        return;
      }

      if (req.method === "POST" && action === "/register") {
        const body = await readBody(req);
        const authUser = await requireAuthHeader(req.headers.authorization, authOpts);
        const playerId = resolveSubject(authUser, String(body.playerId ?? ""));
        const name = String(body.name ?? playerId);
        await ensureAccount(playerId);
        await ledger.append(playerId, -t.snapshot().buyIn, "tournament_buy_in", t.id);
        t.register(playerId, name);
        json(res, 200, t.snapshot());
        return;
      }

      if (req.method === "POST" && action === "/start") {
        t.start();
        scheduler.unschedule(t.id);
        json(res, 200, t.snapshot());
        return;
      }

      if (req.method === "POST" && action === "/bust") {
        const body = await readBody(req);
        const authUser = await requireAuthHeader(req.headers.authorization, authOpts);
        const playerId = resolveSubject(authUser, String(body.playerId ?? ""));
        t.bust(playerId);
        await payPrizes(t);
        json(res, 200, t.snapshot());
        return;
      }
    }

    json(res, 404, { error: "not found" });
  } catch (err) {
    handleError(res, err);
  }
});

server.listen(PORT, () => {
  console.log(`Tournament service listening on http://localhost:${PORT}`);
});

process.on("SIGINT", () => {
  scheduler.stop();
  process.exit(0);
});
