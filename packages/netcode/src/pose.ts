export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Pose {
  position: Vec3;
  rotation: Quat;
}

export interface PresencePose {
  playerId: string;
  t: number;
  head: Pose;
  leftHand: Pose;
  rightHand: Pose;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpVec(a: Vec3, b: Vec3, t: number): Vec3 {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t) };
}

function slerp(a: Quat, b: Quat, t: number): Quat {
  let ax = a.x, ay = a.y, az = a.z, aw = a.w;
  let bx = b.x, by = b.y, bz = b.z, bw = b.w;
  let dot = ax * bx + ay * by + az * bz + aw * bw;
  if (dot < 0) {
    bx = -bx; by = -by; bz = -bz; bw = -bw;
    dot = -dot;
  }
  if (dot > 0.9995) {
    const x = lerp(ax, bx, t);
    const y = lerp(ay, by, t);
    const z = lerp(az, bz, t);
    const w = lerp(aw, bw, t);
    const mag = Math.hypot(x, y, z, w) || 1;
    return { x: x / mag, y: y / mag, z: z / mag, w: w / mag };
  }
  const theta = Math.acos(Math.min(1, dot));
  const s = Math.sin(theta);
  const wa = Math.sin((1 - t) * theta) / s;
  const wb = Math.sin(t * theta) / s;
  return {
    x: ax * wa + bx * wb,
    y: ay * wa + by * wb,
    z: az * wa + bz * wb,
    w: aw * wa + bw * wb,
  };
}

function lerpPose(a: Pose, b: Pose, t: number): Pose {
  return { position: lerpVec(a.position, b.position, t), rotation: slerp(a.rotation, b.rotation, t) };
}

/** Remote VR pose buffer — render at `now - delayMs`. Local rig does not use this. */
export class PoseInterpolator {
  readonly delayMs: number;
  private readonly maxSamples: number;
  private samples: PresencePose[] = [];

  constructor(delayMs = 100, maxSamples = 32) {
    this.delayMs = delayMs;
    this.maxSamples = maxSamples;
  }

  push(sample: PresencePose): void {
    this.samples.push(sample);
    this.samples.sort((a, b) => a.t - b.t);
    if (this.samples.length > this.maxSamples) {
      this.samples.splice(0, this.samples.length - this.maxSamples);
    }
  }

  sample(now: number): PresencePose | null {
    if (this.samples.length === 0) return null;
    const target = now - this.delayMs;
    if (this.samples.length === 1 || target <= this.samples[0]!.t) {
      return this.samples[0]!;
    }
    const last = this.samples[this.samples.length - 1]!;
    if (target >= last.t) return last;
    for (let i = 0; i < this.samples.length - 1; i++) {
      const a = this.samples[i]!;
      const b = this.samples[i + 1]!;
      if (target >= a.t && target <= b.t) {
        const t = (target - a.t) / (b.t - a.t || 1);
        return {
          playerId: a.playerId,
          t: target,
          head: lerpPose(a.head, b.head, t),
          leftHand: lerpPose(a.leftHand, b.leftHand, t),
          rightHand: lerpPose(a.rightHand, b.rightHand, t),
        };
      }
    }
    return last;
  }
}

export const identityPose: Pose = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0, w: 1 },
};
