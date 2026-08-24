import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";

export type HistoryEvent =
  | {
      type: "hand.open";
      at: string;
      handId: string;
      tableId?: string;
      commitment: string;
    }
  | {
      type: "hand.close";
      at: string;
      handId: string;
      result: HandResult;
    };

export interface DrawnCard {
  index: number;
  kind: "next" | "burn";
  card: string;
}

export interface HandResult {
  version: 1;
  handId: string;
  tableId?: string;
  openedAt: string;
  closedAt: string;
  commitment: string;
  reveal: { seed: string; nonce: string };
  deckOrder: string[];
  draws: DrawnCard[];
  holeCards?: Record<string, string[]>;
  boardCards?: string[];
  burnCards: string[];
  verified: boolean;
}

/** Append-only JSONL. Records are never rewritten or deleted. */
export class AppendOnlyHistory {
  constructor(private readonly filePath: string) {
    mkdirSync(dirname(filePath), { recursive: true });
  }

  append(event: HistoryEvent): void {
    appendFileSync(this.filePath, `${JSON.stringify(event)}\n`, { encoding: "utf8", flag: "a" });
  }

  readAll(): HistoryEvent[] {
    if (!existsSync(this.filePath)) return [];
    return readFileSync(this.filePath, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as HistoryEvent);
  }

  latestClose(handId: string): HandResult | undefined {
    const closes = this.readAll().filter(
      (e): e is Extract<HistoryEvent, { type: "hand.close" }> =>
        e.type === "hand.close" && e.handId === handId,
    );
    return closes.at(-1)?.result;
  }

  hasClose(handId: string): boolean {
    return this.latestClose(handId) !== undefined;
  }
}
