import { describe, expect, it } from "vitest";
import { parseClientMessage, parseServerMessage, wsUrl } from "../protocol.ts";

describe("protocol", () => {
  it("parses action intents", () => {
    const msg = parseClientMessage(JSON.stringify({ type: "action", action: { type: "fold" } }));
    expect(msg).toEqual({ type: "action", action: { type: "fold" } });
  });

  it("parses lifecycle messages", () => {
    expect(parseClientMessage(JSON.stringify({ type: "sit", name: "Alice", buyIn: 5000 }))).toEqual({
      type: "sit",
      name: "Alice",
      buyIn: 5000,
    });
    expect(parseClientMessage(JSON.stringify({ type: "leave" }))).toEqual({ type: "leave" });
    expect(parseClientMessage(JSON.stringify({ type: "start" }))).toEqual({ type: "start" });
    expect(parseClientMessage(JSON.stringify({ type: "ping" }))).toEqual({ type: "ping" });
  });

  it("parses welcome with serverTime", () => {
    const msg = parseServerMessage(
      JSON.stringify({ type: "welcome", tableId: "t1", playerId: "a", protocol: 1, serverTime: 1000 }),
    );
    expect(msg?.type).toBe("welcome");
    if (msg?.type === "welcome") expect(msg.serverTime).toBe(1000);
  });

  it("builds websocket url", () => {
    expect(wsUrl("http://127.0.0.1:8787", "felt-1", "alice")).toBe(
      "ws://127.0.0.1:8787/ws?tableId=felt-1&playerId=alice",
    );
  });
});
