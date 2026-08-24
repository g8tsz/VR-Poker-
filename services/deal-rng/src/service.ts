import { randomBytes } from "node:crypto";
import { cardFromId, formatCard, type Card } from "@vr-poker/core";
import { commitSeed, fisherYates, verifyShuffle } from "@vr-poker/deal";
import { AppendOnlyHistory, type DrawnCard, type HandResult } from "./history.ts";
import { integrityLog } from "./log.ts";

export class DealRngError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DealRngError";
  }
}

interface LiveHand {
  handId: string;
  tableId?: string;
  openedAt: string;
  commitment: string;
  seed: Buffer;
  nonce: Buffer;
  deck: Card[];
  cursor: number;
  draws: DrawnCard[];
}

export class DealRngService {
  private live = new Map<string, LiveHand>();

  constructor(private readonly history: AppendOnlyHistory) {}

  open(input: { handId?: string; tableId?: string }): { handId: string; tableId?: string; commitment: string; openedAt: string } {
    const handId = input.handId ?? `hand-${randomBytes(8).toString("hex")}`;
    if (this.live.has(handId) || this.history.hasClose(handId)) {
      throw new DealRngError("handId already used");
    }
    const seed = randomBytes(32);
    const nonce = randomBytes(32);
    const commitment = commitSeed(seed, nonce);
    const order = fisherYates([...Array(52).keys()], seed, nonce);
    const deck = order.map(cardFromId);
    const openedAt = new Date().toISOString();
    this.live.set(handId, {
      handId,
      tableId: input.tableId,
      openedAt,
      commitment,
      seed,
      nonce,
      deck,
      cursor: 0,
      draws: [],
    });
    this.history.append({
      type: "hand.open",
      at: openedAt,
      handId,
      tableId: input.tableId,
      commitment,
    });
    integrityLog("hand.open", { handId, tableId: input.tableId, commitment });
    return { handId, tableId: input.tableId, commitment, openedAt };
  }

  draw(handId: string, kind: "next" | "burn"): { index: number; kind: "next" | "burn"; card: string } {
    const h = this.requireLive(handId);
    const card = h.deck[h.cursor];
    if (!card) throw new DealRngError("deck exhausted");
    const index = h.cursor;
    h.cursor += 1;
    const drawn: DrawnCard = { index, kind, card: formatCard(card) };
    h.draws.push(drawn);
    integrityLog("hand.draw", { handId, index, kind });
    return drawn;
  }

  peekPublic(handId: string): {
    handId: string;
    tableId?: string;
    commitment: string;
    openedAt: string;
    closed: boolean;
    drawCount: number;
    result?: HandResult;
  } {
    const closed = this.history.latestClose(handId);
    if (closed) {
      return {
        handId,
        tableId: closed.tableId,
        commitment: closed.commitment,
        openedAt: closed.openedAt,
        closed: true,
        drawCount: closed.draws.length,
        result: closed,
      };
    }
    const h = this.requireLive(handId);
    return {
      handId: h.handId,
      tableId: h.tableId,
      commitment: h.commitment,
      openedAt: h.openedAt,
      closed: false,
      drawCount: h.draws.length,
    };
  }

  close(
    handId: string,
    extra?: { holeCards?: Record<string, string[]>; boardCards?: string[] },
  ): HandResult {
    const existing = this.history.latestClose(handId);
    if (existing) return existing;

    const h = this.requireLive(handId);
    const seed = h.seed.toString("hex");
    const nonce = h.nonce.toString("hex");
    const deckOrder = h.deck.map(formatCard);
    const verified = verifyShuffle(seed, nonce, h.commitment, h.deck);
    if (!verified) {
      integrityLog("hand.verify_fail", { handId, commitment: h.commitment });
      throw new DealRngError("shuffle verification failed");
    }
    const closedAt = new Date().toISOString();
    const result: HandResult = {
      version: 1,
      handId: h.handId,
      tableId: h.tableId,
      openedAt: h.openedAt,
      closedAt,
      commitment: h.commitment,
      reveal: { seed, nonce },
      deckOrder,
      draws: [...h.draws],
      holeCards: extra?.holeCards,
      boardCards: extra?.boardCards,
      burnCards: h.draws.filter((d) => d.kind === "burn").map((d) => d.card),
      verified: true,
    };
    this.history.append({ type: "hand.close", at: closedAt, handId, result });
    this.live.delete(handId);
    integrityLog("hand.close", { handId, verified: true, draws: result.draws.length });
    integrityLog("hand.verify_ok", { handId, commitment: h.commitment });
    return result;
  }

  private requireLive(handId: string): LiveHand {
    const h = this.live.get(handId);
    if (!h) {
      integrityLog("hand.reject", { handId, reason: "not_live" });
      throw new DealRngError("hand not found or already closed");
    }
    return h;
  }
}
