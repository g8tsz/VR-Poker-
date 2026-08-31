import type { Card, DealSource, HandDeal } from "@vr-poker/core";
import { blockOn } from "@vr-poker/deal";

export class DealAuditError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DealAuditError";
  }
}

export interface AuditedDealOptions {
  baseUrl: string;
}

/** In-process deal with synchronous mirror to deal-rng (fail-closed on audit errors). */
export class AuditedDealSource implements DealSource {
  private readonly remoteHands = new Map<string, string>();

  constructor(
    private readonly inner: DealSource,
    private readonly opts: AuditedDealOptions,
  ) {}

  openHand(handId: string): HandDeal {
    const hand = this.inner.openHand(handId);
    const tableId = handId.includes(":") ? handId.slice(0, handId.lastIndexOf(":")) : undefined;
    const remoteId = blockOn(this.mirrorOpen(handId, tableId, hand.commitment));
    this.remoteHands.set(handId, remoteId);
    return this.wrapHand(handId, hand);
  }

  private wrapHand(localHandId: string, hand: HandDeal): HandDeal {
    return {
      handId: hand.handId,
      commitment: hand.commitment,
      next: () => {
        blockOn(this.mirrorDraw(localHandId, "next"));
        return hand.next();
      },
      burn: () => {
        blockOn(this.mirrorDraw(localHandId, "burn"));
        return hand.burn();
      },
      reveal: () => {
        const rev = hand.reveal();
        blockOn(this.mirrorClose(localHandId));
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
    const res = await fetch(`${this.base()}/v1/hands`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ handId, tableId }),
    });
    const data = (await res.json()) as { handId?: string; commitment?: string; error?: string };
    if (!res.ok) {
      throw new DealAuditError(data.error ?? `deal-rng open failed (${res.status})`);
    }
    if (data.commitment && data.commitment !== commitment) {
      throw new DealAuditError("deal-rng commitment mismatch");
    }
    return String(data.handId ?? handId);
  }

  private remoteId(localHandId: string): string {
    const id = this.remoteHands.get(localHandId);
    if (!id) throw new DealAuditError("deal audit hand not registered");
    return id;
  }

  private async mirrorDraw(localHandId: string, kind: "next" | "burn"): Promise<void> {
    const res = await fetch(
      `${this.base()}/v1/hands/${encodeURIComponent(this.remoteId(localHandId))}/draw`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind }),
      },
    );
    if (!res.ok) {
      const text = await res.text();
      throw new DealAuditError(`deal-rng draw failed: ${text}`);
    }
  }

  private async mirrorClose(localHandId: string): Promise<void> {
    const res = await fetch(
      `${this.base()}/v1/hands/${encodeURIComponent(this.remoteId(localHandId))}/close`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      },
    );
    if (!res.ok) {
      const text = await res.text();
      throw new DealAuditError(`deal-rng close failed: ${text}`);
    }
  }
}
