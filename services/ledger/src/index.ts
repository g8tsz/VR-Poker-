import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { AuthError, authConfigFromEnv, corsHeaders, requireAuthHeader } from "@vr-poker/auth";
import {
  LedgerError,
  MemoryLedgerStore,
  createPgLedgerStore,
  type LedgerStore,
} from "@vr-poker/ledger";

const PORT = Number(process.env.PORT ?? 8786);
const store: LedgerStore = process.env.DATABASE_URL
  ? createPgLedgerStore(process.env.DATABASE_URL)
  : new MemoryLedgerStore();

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
  if (err instanceof LedgerError) {
    json(res, 400, { error: err.message });
    return;
  }
  console.error(err);
  json(res, 500, { error: "internal" });
}

async function resolveSubject(req: IncomingMessage, body: Record<string, unknown>): Promise<string> {
  const auth = await requireAuthHeader(req.headers.authorization, authConfigFromEnv());
  return auth?.subject ?? String(body.authSubject ?? body.playerId ?? "");
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.writeHead(204, corsHeaders({
        "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
      }));
      res.end();
      return;
    }

    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

    if (req.method === "GET" && url.pathname === "/health") {
      json(res, 200, { ok: true, service: "ledger", persistence: Boolean(process.env.DATABASE_URL) });
      return;
    }

    if (req.method === "POST" && url.pathname === "/v1/accounts") {
      const body = await readBody(req);
      const authSubject = await resolveSubject(req, body);
      if (!authSubject) throw new LedgerError("authSubject required");
      const account = await store.ensureUser(authSubject, String(body.displayName ?? body.name ?? authSubject));
      json(res, 200, account);
      return;
    }

    const account = url.pathname.match(/^\/v1\/accounts\/([^/]+)$/);
    if (req.method === "GET" && account) {
      const authSubject = decodeURIComponent(account[1]!);
      const user = await store.getUser(authSubject);
      const history = url.searchParams.get("history") === "1";
      json(res, 200, history ? { ...user, history: await store.history(authSubject) } : user);
      return;
    }

    if (req.method === "POST" && url.pathname === "/v1/ledger/buy-in") {
      const body = await readBody(req);
      const authSubject = await resolveSubject(req, body);
      const entry = await store.buyIn(authSubject, Number(body.amount), String(body.ref ?? "table"));
      json(res, 200, { entry, balance: await store.balance(authSubject) });
      return;
    }

    if (req.method === "POST" && url.pathname === "/v1/ledger/cash-out") {
      const body = await readBody(req);
      const authSubject = await resolveSubject(req, body);
      const entry = await store.cashOut(authSubject, Number(body.amount), String(body.ref ?? "table"));
      json(res, 200, { entry, balance: await store.balance(authSubject) });
      return;
    }

    if (req.method === "POST" && url.pathname === "/v1/clubs") {
      const body = await readBody(req);
      const owner = await resolveSubject(req, body);
      const club = await store.createClub(owner, String(body.name ?? "Club"), {
        rakePercent: body.rakePercent === undefined ? undefined : Number(body.rakePercent),
        rakeCap: body.rakeCap === undefined ? undefined : Number(body.rakeCap),
        noFlopNoRake: body.noFlopNoRake === undefined ? undefined : Boolean(body.noFlopNoRake),
        minBuyIn: body.minBuyIn === undefined ? undefined : Number(body.minBuyIn),
        maxBuyIn: body.maxBuyIn === undefined ? undefined : Number(body.maxBuyIn),
      });
      json(res, 201, club);
      return;
    }

    const clubGet = url.pathname.match(/^\/v1\/clubs\/([^/]+)$/);
    if (req.method === "GET" && clubGet) {
      json(res, 200, await store.getClub(decodeURIComponent(clubGet[1]!)));
      return;
    }

    const clubPatch = url.pathname.match(/^\/v1\/clubs\/([^/]+)$/);
    if (req.method === "PATCH" && clubPatch) {
      const body = await readBody(req);
      const actor = await resolveSubject(req, body);
      const club = await store.updateClub(decodeURIComponent(clubPatch[1]!), actor, {
        name: body.name === undefined ? undefined : String(body.name),
        rakePercent: body.rakePercent === undefined ? undefined : Number(body.rakePercent),
        rakeCap: body.rakeCap === undefined ? undefined : Number(body.rakeCap),
        noFlopNoRake: body.noFlopNoRake === undefined ? undefined : Boolean(body.noFlopNoRake),
        minBuyIn: body.minBuyIn === undefined ? undefined : Number(body.minBuyIn),
        maxBuyIn: body.maxBuyIn === undefined ? undefined : Number(body.maxBuyIn),
      });
      json(res, 200, club);
      return;
    }

    if (req.method === "DELETE" && clubGet) {
      const body = await readBody(req);
      const actor = await resolveSubject(req, body);
      await store.deleteClub(decodeURIComponent(clubGet[1]!), actor);
      json(res, 200, { ok: true });
      return;
    }

    const clubMembers = url.pathname.match(/^\/v1\/clubs\/([^/]+)\/members$/);
    if (req.method === "GET" && clubMembers) {
      json(res, 200, { members: await store.listMembers(decodeURIComponent(clubMembers[1]!)) });
      return;
    }

    if (req.method === "POST" && clubMembers) {
      const body = await readBody(req);
      const actor = await resolveSubject(req, body);
      const member = await store.addMember(
        decodeURIComponent(clubMembers[1]!),
        actor,
        String(body.memberAuthSubject ?? body.authSubject ?? ""),
        body.role as "admin" | "member" | undefined,
      );
      json(res, 200, member);
      return;
    }

    const memberDel = url.pathname.match(/^\/v1\/clubs\/([^/]+)\/members\/([^/]+)$/);
    if (req.method === "DELETE" && memberDel) {
      const body = await readBody(req);
      const actor = await resolveSubject(req, body);
      await store.removeMember(
        decodeURIComponent(memberDel[1]!),
        actor,
        decodeURIComponent(memberDel[2]!),
      );
      json(res, 200, { ok: true });
      return;
    }

    const tableCfg = url.pathname.match(/^\/v1\/clubs\/([^/]+)\/table-config$/);
    if (req.method === "GET" && tableCfg) {
      json(res, 200, await store.tableConfig(decodeURIComponent(tableCfg[1]!)));
      return;
    }

    const listClubs = url.pathname.match(/^\/v1\/users\/([^/]+)\/clubs$/);
    if (req.method === "GET" && listClubs) {
      json(res, 200, { clubs: await store.listClubs(decodeURIComponent(listClubs[1]!)) });
      return;
    }

    json(res, 404, { error: "not found" });
  } catch (err) {
    handleError(res, err);
  }
});

server.listen(PORT, () => {
  console.log(`Ledger service http://localhost:${PORT} (${process.env.DATABASE_URL ? "postgres" : "memory"})`);
});
