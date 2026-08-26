import { LedgerError } from "@vr-poker/ledger";
import type { ChipLedgerPort } from "./ledger-port.ts";

export interface RemoteLedgerOptions {
  baseUrl: string;
  authHeader?: string;
}

async function postJson(
  url: string,
  body: Record<string, unknown>,
  authHeader?: string,
): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(authHeader ? { authorization: authHeader } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new LedgerError(String(data.error ?? `ledger ${res.status}`));
  }
  return data;
}

async function getJson(url: string, authHeader?: string): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    headers: authHeader ? { authorization: authHeader } : {},
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new LedgerError(String(data.error ?? `ledger ${res.status}`));
  }
  return data;
}

export function remoteChipLedgerPort(opts: RemoteLedgerOptions): ChipLedgerPort {
  const base = opts.baseUrl.replace(/\/$/, "");
  const auth = opts.authHeader;

  return {
    balance: async (playerId) => {
      const data = await getJson(`${base}/v1/accounts/${encodeURIComponent(playerId)}`, auth);
      return Number(data.balance ?? 0);
    },
    history: async (playerId) => {
      const data = await getJson(
        `${base}/v1/accounts/${encodeURIComponent(playerId)}?history=1`,
        auth,
      );
      return (data.history ?? []) as import("@vr-poker/ledger").LedgerEntry[];
    },
    ensureAccount: async (playerId, name) => {
      await postJson(
        `${base}/v1/accounts`,
        { authSubject: playerId, displayName: name ?? playerId },
        auth,
      );
    },
    buyIn: async (playerId, amount, tableId) => {
      await postJson(
        `${base}/v1/ledger/buy-in`,
        { authSubject: playerId, amount, ref: tableId },
        auth,
      );
    },
    addOn: async (playerId, amount, tableId) => {
      await postJson(
        `${base}/v1/ledger/buy-in`,
        { authSubject: playerId, amount, ref: `${tableId}:add-on` },
        auth,
      );
    },
    cashOut: async (playerId, amount, tableId) => {
      await postJson(
        `${base}/v1/ledger/cash-out`,
        { authSubject: playerId, amount, ref: tableId },
        auth,
      );
    },
  };
}
