export const RANK_CHARS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"] as const;
export const SUIT_CHARS = ["c", "d", "h", "s"] as const;
export const SUIT_NAMES = ["clubs", "diamonds", "hearts", "spades"] as const;

export type Rank = number;
export type Suit = number;

export interface Card {
  rank: Rank;
  suit: Suit;
}

export function card(rank: Rank, suit: Suit): Card {
  if (rank < 0 || rank > 12 || suit < 0 || suit > 3) {
    throw new Error(`invalid card rank=${rank} suit=${suit}`);
  }
  return { rank, suit };
}

export function parseCard(text: string): Card {
  const raw = text.trim();
  if (raw.length !== 2) throw new Error(`invalid card "${text}"`);
  const rank = RANK_CHARS.indexOf(raw[0]!.toUpperCase() as (typeof RANK_CHARS)[number]);
  const suit = SUIT_CHARS.indexOf(raw[1]!.toLowerCase() as (typeof SUIT_CHARS)[number]);
  if (rank < 0 || suit < 0) throw new Error(`invalid card "${text}"`);
  return card(rank, suit);
}

export function parseCards(text: string): Card[] {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(parseCard);
}

export function formatCard(c: Card): string {
  return `${RANK_CHARS[c.rank]}${SUIT_CHARS[c.suit]}`;
}

export function formatCards(cards: Card[]): string {
  return cards.map(formatCard).join(" ");
}

export function cardId(c: Card): number {
  return c.rank * 4 + c.suit;
}

export function cardFromId(id: number): Card {
  if (id < 0 || id > 51) throw new Error(`invalid card id ${id}`);
  return card(Math.floor(id / 4), id % 4);
}

export function standardDeck(): Card[] {
  const deck: Card[] = [];
  for (let rank = 0; rank < 13; rank++) {
    for (let suit = 0; suit < 4; suit++) {
      deck.push(card(rank, suit));
    }
  }
  return deck;
}

export function sameCard(a: Card, b: Card): boolean {
  return a.rank === b.rank && a.suit === b.suit;
}
