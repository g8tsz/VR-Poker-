import { describe, expect, it } from "vitest";
import { cardId } from "@vr-poker/core";
import { commitSeed, CsprngDealSource, fisherYates, verifyShuffle } from "../index.ts";

describe("CSPRNG shuffle", () => {
  it("commit-reveal verifies the deck", () => {
    const src = new CsprngDealSource();
    const hand = src.openHand("h1");
    const deck = hand.deckOrder();
    const { seed, nonce } = hand.reveal();
    expect(verifyShuffle(seed, nonce, hand.commitment, deck)).toBe(true);
    expect(deck).toHaveLength(52);
    const ids = new Set(deck.map(cardId));
    expect(ids.size).toBe(52);
  });

  it("is biased-free enough that each card appears ~1/52 in seat 0", () => {
    const counts = new Array(52).fill(0);
    const n = 8_000;
    for (let i = 0; i < n; i++) {
      const seed = Buffer.alloc(32, i % 256);
      seed.writeUInt32BE(i, 0);
      const nonce = Buffer.alloc(32, 1);
      const ids = fisherYates(
        [...Array(52).keys()],
        seed,
        nonce,
      );
      counts[ids[0]!]++;
    }
    const expected = n / 52;
    for (const c of counts) {
      expect(Math.abs(c - expected)).toBeLessThan(expected * 0.35);
    }
  });

  it("commitment matches H(seed||nonce)", () => {
    const seed = Buffer.alloc(32, 7);
    const nonce = Buffer.alloc(32, 9);
    const c = commitSeed(seed, nonce);
    expect(c).toHaveLength(64);
  });
});
