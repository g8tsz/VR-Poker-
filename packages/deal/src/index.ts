import { createHash, randomBytes } from "node:crypto";
import {
  cardFromId,
  standardDeck,
  type Card,
  type DealSource,
  type HandDeal,
} from "@vr-poker/core";

function sha256(parts: Buffer[]): Buffer {
  const h = createHash("sha256");
  for (const p of parts) h.update(p);
  return h.digest();
}

function hmacCounter(seed: Buffer, nonce: Buffer, counter: number): Buffer {
  return sha256([seed, nonce, Buffer.from([counter >> 24, counter >> 16, counter >> 8, counter])]);
}

/** Unbiased 0..n-1 from a SHA-256 stream (commit-reveal verifiable). */
function streamInt(seed: Buffer, nonce: Buffer, n: number, state: { c: number }): number {
  const limit = 0x1_0000_0000 - (0x1_0000_0000 % n);
  for (;;) {
    const block = hmacCounter(seed, nonce, state.c++);
    const x = block.readUInt32BE(0);
    if (x < limit) return x % n;
  }
}

export function fisherYates(ids: number[], seed: Buffer, nonce: Buffer): number[] {
  const out = [...ids];
  const state = { c: 0 };
  for (let i = out.length - 1; i > 0; i--) {
    const j = streamInt(seed, nonce, i + 1, state);
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

export function commitSeed(seed: Buffer, nonce: Buffer): string {
  return sha256([seed, nonce]).toString("hex");
}

export function verifyShuffle(seedHex: string, nonceHex: string, commitment: string, deck: Card[]): boolean {
  const seed = Buffer.from(seedHex, "hex");
  const nonce = Buffer.from(nonceHex, "hex");
  if (commitSeed(seed, nonce) !== commitment) return false;
  const ids = fisherYates(
    standardDeck().map((_, i) => i),
    seed,
    nonce,
  );
  return ids.every((id, i) => deck[i] && id === deck[i]!.rank * 4 + deck[i]!.suit);
}

export class CsprngDealSource implements DealSource {
  openHand(handId: string): HandDeal {
    const seed = randomBytes(32);
    const nonce = randomBytes(32);
    const commitment = commitSeed(seed, nonce);
    const order = fisherYates(
      [...Array(52).keys()],
      seed,
      nonce,
    );
    const deck = order.map(cardFromId);
    let i = 0;
    const take = (): Card => {
      const c = deck[i++];
      if (!c) throw new Error("deck exhausted");
      return c;
    };
    const reveal = (): { seed: string; nonce: string } => ({
      seed: seed.toString("hex"),
      nonce: nonce.toString("hex"),
    });
    return {
      handId,
      commitment,
      next: take,
      burn: take,
      reveal,
      deckOrder: () => [...deck],
    };
  }
}

export function handResultJson(input: {
  handId: string;
  commitment: string;
  seed: string;
  nonce: string;
  deck: Card[];
  holes: Record<string, Card[]>;
  board: Card[];
}): string {
  const fmt = (c: Card) => `${"23456789TJQKA"[c.rank]}${"cdhs"[c.suit]}`;
  return JSON.stringify(
    {
      handId: input.handId,
      commitment: input.commitment,
      reveal: { seed: input.seed, nonce: input.nonce },
      deckOrder: input.deck.map(fmt),
      holeCards: Object.fromEntries(
        Object.entries(input.holes).map(([k, v]) => [k, v.map(fmt)]),
      ),
      boardCards: input.board.map(fmt),
    },
    null,
    2,
  );
}

export { blockOn } from "./block-promise.ts";
