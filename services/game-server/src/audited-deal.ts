import type { Card, DealSource, HandDeal } from "@vr-poker/core";

export interface AuditedDealOptions {
  baseUrl: string;
}

/** In-process deal with async mirror to deal-rng for Postgres / JSONL audit trail. */
export class AuditedDealSource implements DealSource {
  private readonly remoteHands = new Map<string, string>();

  constructor(
    private readonly inner: DealSource,
    private readonly opts: AuditedDealOptions,
  ) {}

  openHand(handId: string): HandDeal {
    const hand = this.inner.openHand(handId);
    const tableId = handId.includes(":") ? handId.slice(0, handId.lastIndexOf(":")) : undefined;
    void this.mirrorOpen(handId, tableId, hand.commitment).then((remoteId) => {
      this.remoteHands.set(handId, remoteId);
    });
    return this.wrapHand(handId, hand);
  }

  private wrapHand(localHandId: string, hand: HandDeal): HandDeal {
    return {
      handId: hand.handId,
      commitment: hand.commitment,
      next: () => {
        const card = hand.next();
        void this.mirrorDraw(localHandId, "next");
        return card;
      },
      burn: () => {
        const card = hand.burn();
        void this.mirrorDraw(localHandId, "burn");
        return card;
      },
      reveal: () => {
        const rev = hand.reveal();
        void this.mirrorClose(localHandId, rev, hand.deckOrder());
        return rev;
      },
      deckOrder: () => hand.deckOrder(),
    };
  }

  private base(): string {
    return this.opts.baseUrl.replace(/\/$/, "");
  }

  private async mirrorOpen(
    handId: string,
    tableId: string | undefined,
    commitment: string,
  ): Promise<string> {
    try {
      const res = await fetch(`${this.base()}/v1/hands`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ handId, tableId }),
      });
      const data = (await res.json()) as { handId?: string; commitment?: string };
      if (!res.ok) {
        console.error("deal-rng mirror open failed", data);
        return handId;
      }
      if (data.commitment && data.commitment !== commitment) {
        console.warn("deal-rng commitment mismatch", { local: commitment, remote: data.commitment });
      }
      return String(data.handId ?? handId);
    } catch (err) {
      console.error("deal-rng mirror open error", err);
      return handId;
    }
  }

  private remoteId(localHandId: string): string {
    return this.remoteHands.get(localHandId) ?? localHandId;
  }

  private async mirrorDraw(localHandId: string, kind: "next" | "burn"): Promise<void> {
    try {
      const res = await fetch(
        `${this.base()}/v1/hands/${encodeURIComponent(this.remoteId(localHandId))}/draw`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ kind }),
        },
      );
      if (!res.ok) {
        console.error("deal-rng mirror draw failed", await res.text());
      }
    } catch (err) {
      console.error("deal-rng mirror draw error", err);
    }
  }

  private async mirrorClose(
    localHandId: string,
    _reveal: { seed: string; nonce: string },
    _deck: Card[],
  ): Promise<void> {
    try {
      const res = await fetch(
        `${this.base()}/v1/hands/${encodeURIComponent(this.remoteId(localHandId))}/close`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        },
      );
      if (!res.ok) {
        console.error("deal-rng mirror close failed", await res.text());
      }
    } catch (err) {
      console.error("deal-rng mirror close error", err);
    }
  }
}
