import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AppendOnlyHistory } from "../history.ts";
import { DealRngError, DealRngService } from "../service.ts";

function makeService() {
  const dir = mkdtempSync(join(tmpdir(), "deal-rng-"));
  const file = join(dir, "hand-history.jsonl");
  const history = new AppendOnlyHistory(file);
  return { service: new DealRngService(history), file, history };
}

describe("DealRngService", () => {
  it("publishes a commitment with no seed before cards", () => {
    const { service } = makeService();
    const opened = service.open({ tableId: "felt-1" });
    expect(opened.commitment).toHaveLength(64);
    expect(JSON.stringify(opened)).not.toMatch(/seed/);
    expect(JSON.stringify(opened)).not.toMatch(/nonce/);
    const pub = service.peekPublic(opened.handId);
    expect(pub.closed).toBe(false);
    expect(pub.result).toBeUndefined();
  });

  it("draws cards then reveals a verifiable hand-result contract", () => {
    const { service } = makeService();
    const { handId } = service.open({ handId: "h-1", tableId: "t1" });
    const holeA = [service.draw(handId, "next").card, service.draw(handId, "next").card];
    const holeB = [service.draw(handId, "next").card, service.draw(handId, "next").card];
    service.draw(handId, "burn");
    const board = [
      service.draw(handId, "next").card,
      service.draw(handId, "next").card,
      service.draw(handId, "next").card,
    ];
    const result = service.close(handId, {
      holeCards: { "0": holeA, "1": holeB },
      boardCards: board,
    });
    expect(result.version).toBe(1);
    expect(result.verified).toBe(true);
    expect(result.deckOrder).toHaveLength(52);
    expect(result.reveal.seed).toHaveLength(64);
    expect(result.holeCards?.["0"]).toEqual(holeA);
    expect(result.boardCards).toEqual(board);
    expect(result.burnCards).toHaveLength(1);
    expect(new Set(result.deckOrder).size).toBe(52);
  });

  it("appends open+close and never rewrites on a second close", () => {
    const { service, file, history } = makeService();
    const { handId } = service.open({ handId: "h-dup" });
    service.draw(handId, "next");
    const a = service.close(handId);
    const b = service.close(handId);
    expect(b).toEqual(a);
    const raw = readFileSync(file, "utf8").trim().split("\n");
    expect(raw).toHaveLength(2);
    expect(history.readAll().map((e) => e.type)).toEqual(["hand.open", "hand.close"]);
    expect(() => {
      history.append({
        type: "hand.open",
        at: new Date().toISOString(),
        handId: "h-dup",
        commitment: a.commitment,
      });
    }).not.toThrow();
    expect(history.readAll()).toHaveLength(3);
    expect(history.readAll()[1]).toEqual(history.readAll()[1]);
  });

  it("rejects drawing after close and duplicate hand ids", () => {
    const { service } = makeService();
    const { handId } = service.open({ handId: "h-2" });
    service.close(handId);
    expect(() => service.draw(handId, "next")).toThrow(DealRngError);
    expect(() => service.open({ handId: "h-2" })).toThrow(DealRngError);
  });
});
