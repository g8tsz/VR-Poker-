import type { Card } from "./cards.ts";

export interface HandDeal {
  handId: string;
  commitment: string;
  next(): Card;
  burn(): Card;
  reveal(): { seed: string; nonce: string };
  deckOrder(): Card[];
}

export interface DealSource {
  openHand(handId: string): HandDeal;
}
