import { describe, expect, it } from "vitest";
import { PoseInterpolator, identityPose } from "../pose.ts";

describe("PoseInterpolator", () => {
  it("interpolates between two samples", () => {
    const buf = new PoseInterpolator(0, 8);
    const mk = (t: number, x: number) => ({
      playerId: "bob",
      t,
      head: { position: { x, y: 0, z: 0 }, rotation: identityPose.rotation },
      leftHand: identityPose,
      rightHand: identityPose,
    });
    buf.push(mk(0, 0));
    buf.push(mk(100, 10));
    const mid = buf.sample(50);
    expect(mid?.head.position.x).toBeCloseTo(5, 1);
  });
});
