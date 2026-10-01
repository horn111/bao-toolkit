import { describe, expect, it } from "vitest";
import { collideMeteors, launchMeteor, stepMeteor, type MeteorBody } from "./meteor-physics";

const body = (extra: Partial<MeteorBody> = {}): MeteorBody => ({
  x: 0.5,
  y: 0.5,
  vx: 0,
  vy: 0,
  radius: 0.05,
  ...extra,
});

describe("interactive meteor motion", () => {
  it("launches in the chosen direction with a capped speed at every aspect ratio", () => {
    for (const aspect of [0.6, 1, 2.5]) {
      const meteor = body();
      expect(launchMeteor(meteor, -100, 50, aspect)).toBe(true);
      expect(meteor.vx).toBeLessThan(0);
      expect(meteor.vy).toBeGreaterThan(0);
      expect(Math.hypot(meteor.vx * aspect, meteor.vy)).toBeCloseTo(0.58);
      expect(meteor.vx / meteor.vy).toBeCloseTo(-2);
    }
  });

  it("reflects at the movement boundary without crossing into page content", () => {
    const meteor = body({ x: 0.89, vx: 0.5, y: 0.21, vy: -0.5 });
    stepMeteor(meteor, { left: 0.6, right: 0.9, top: 0.2, bottom: 0.6 }, 1);
    expect(meteor.x).toBe(0.9);
    expect(meteor.y).toBe(0.2);
    expect(meteor.vx).toBeLessThan(0);
    expect(meteor.vy).toBeGreaterThan(0);
  });

  it("transfers a launch impulse to an overlapping fragment", () => {
    const a = body({ x: 0.5, vx: 0.2 });
    const b = body({ x: 0.54 });
    collideMeteors(a, b, 2);
    expect((b.x - a.x) * 2).toBeCloseTo(0.094);
    expect(b.vx).toBeGreaterThan(0);
    expect(a.vx).toBeLessThan(0.2);
  });

  it("leaves resting fragments still and rejects an empty launch", () => {
    const meteor = body();
    expect(launchMeteor(meteor, 0, 0, 1)).toBe(false);
    stepMeteor(meteor, { left: 0, right: 1, top: 0, bottom: 1 }, 0.02);
    expect(meteor).toEqual(body());
  });
});
