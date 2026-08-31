import { describe, expect, it } from "vitest";
import { pickBotAction } from "../bot.ts";
import { runDemo } from "../demo.ts";
import { createLocalSession } from "../session.ts";

describe("pickBotAction", () => {
  it("prefers check over fold", () => {
    expect(pickBotAction([{ type: "fold" }, { type: "check" }]).type).toBe("check");
  });
});

describe("runDemo", () => {
  it("plays a full hand locally with commit-reveal", async () => {
    const session = createLocalSession("demo-test");
    const result = await runDemo(session);
    expect(result.steps).toBeGreaterThan(0);
    expect(result.final.handId).toBe(1);
    expect(result.reveal).toBe(true);
    expect(result.final.winners?.length).toBeGreaterThan(0);
  });
});
