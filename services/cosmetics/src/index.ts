import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { CosmeticStore, CosmeticsError, DEFAULT_CATALOG } from "@vr-poker/cosmetics";
import { ChipLedger, LedgerError, OwnershipLedger } from "@vr-poker/ledger";

const PORT = Number(process.env.PORT ?? 8790);
const chips = new ChipLedger();
const ownership = new OwnershipLedger();
const store = new CosmeticStore(DEFAULT_CATALOG, chips, ownership);

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

function ensureAccount(userId: string): void {
  if (chips.history(userId).length === 0) {
    chips.append(userId, 100_000, "seed", "welcome");
  }
}

function handleError(res: ServerResponse, err: unknown): void {
  if (err instanceof CosmeticsError || err instanceof LedgerError) {
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
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers": "content-type",
      });
      res.end();
      return;
    }

    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

    if (req.method === "GET" && url.pathname === "/health") {
      json(res, 200, { ok: true, service: "cosmetics", skus: store.catalog().length });
      return;
    }

    if (req.method === "GET" && url.pathname === "/v1/catalog") {
      const kind = url.searchParams.get("kind");
      let catalog = store.catalog();
      if (kind) catalog = catalog.filter((s) => s.kind === kind);
      json(res, 200, { catalog });
      return;
    }

    if (req.method === "POST" && url.pathname === "/v1/purchase") {
      const body = await readBody(req);
      const userId = String(body.userId ?? "");
      const skuId = String(body.skuId ?? "");
      if (!userId || !skuId) throw new CosmeticsError("userId and skuId required");
      ensureAccount(userId);
      const result = store.purchase(userId, skuId);
      json(res, 200, { purchase: result, balance: chips.balance(userId) });
      return;
    }

    const ownedMatch = url.pathname.match(/^\/v1\/users\/([^/]+)\/owned$/);
    if (req.method === "GET" && ownedMatch) {
      const userId = decodeURIComponent(ownedMatch[1]!);
      json(res, 200, { userId, owned: store.owned(userId) });
      return;
    }

    const entMatch = url.pathname.match(/^\/v1\/users\/([^/]+)\/entitlement\/([^/]+)$/);
    if (req.method === "GET" && entMatch) {
      const userId = decodeURIComponent(entMatch[1]!);
      const skuId = decodeURIComponent(entMatch[2]!);
      json(res, 200, { userId, skuId, entitled: store.entitled(userId, skuId) });
      return;
    }

    json(res, 404, { error: "not found" });
  } catch (err) {
    handleError(res, err);
  }
});

server.listen(PORT, () => {
  console.log(`Cosmetics service listening on http://localhost:${PORT}`);
});
