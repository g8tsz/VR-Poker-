import { describe, expect, it } from "vitest";
import { parseClientMessage, wsUrl } from "../protocol.ts";

describe("protocol", () => {
  it("parses action intents", () => {
    const msg = parseClientMessage(JSON.stringify({ type: "action", action: { type: "fold" } }));
    expect(msg).toEqual({ type: "action", action: { type: "fold" } });
  });

  it("builds websocket url", () => {
    expect(wsUrl("http://127.0.0.1:8787", "felt-1", "alice")).toBe(
      "ws://127.0.0.1:8787/ws?tableId=felt-1&playerId=alice",
    );
  });
});
