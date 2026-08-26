import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { corsHeaders } from "@vr-poker/auth";
import { initDealAuditDb } from "./audit-db.ts";
import { DealRngError, DealRngService } from "./service.ts";
import { AppendOnlyHistory } from "./history.ts";

const PORT = Number(process.env.DEAL_PORT ?? 8788);
initDealAuditDb();

function historyPath(): string {
  if (process.env.DEAL_HISTORY) return process.env.DEAL_HISTORY;
  return join(dirname(fileURLToPath(import.meta.url)), "../../../data/hand-history.jsonl");
}

const service = new DealRngService(new AppendOnlyHistory(historyPath()));

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

const server = createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.writeHead(204, corsHeaders());
      res.end();
      return;
    }
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
    const path = url.pathname;

    if (req.method === "GET" && path === "/health") {
      json(res, 200, { ok: true, service: "deal-rng" });
      return;
    }

    if (req.method === "POST" && path === "/v1/hands") {
      const body = await readBody(req);
      const opened = service.open({
        handId: body.handId ? String(body.handId) : undefined,
        tableId: body.tableId ? String(body.tableId) : undefined,
      });
      json(res, 201, opened);
      return;
    }

    const draw = path.match(/^\/v1\/hands\/([^/]+)\/draw$/);
    if (req.method === "POST" && draw) {
      const body = await readBody(req);
      const kind = body.kind === "burn" ? "burn" : "next";
      json(res, 200, service.draw(decodeURIComponent(draw[1]!), kind));
      return;
    }

    const close = path.match(/^\/v1\/hands\/([^/]+)\/close$/);
    if (req.method === "POST" && close) {
      const body = await readBody(req);
      json(
        res,
        200,
        service.close(decodeURIComponent(close[1]!), {
          holeCards: body.holeCards as Record<string, string[]> | undefined,
          boardCards: body.boardCards as string[] | undefined,
        }),
      );
      return;
    }

    const get = path.match(/^\/v1\/hands\/([^/]+)$/);
    if (req.method === "GET" && get) {
      json(res, 200, service.peekPublic(decodeURIComponent(get[1]!)));
      return;
    }

    json(res, 404, { error: "not found" });
  } catch (err) {
    if (err instanceof DealRngError) {
      json(res, 400, { error: err.message });
      return;
    }
    console.error(err);
    json(res, 500, { error: "internal" });
  }
});

server.listen(PORT, () => {
  console.log(`deal-rng http://127.0.0.1:${PORT}  history=${historyPath()}`);
});
