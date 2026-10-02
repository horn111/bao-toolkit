import { describe, expect, it } from "vitest";
import {
  addMeteorScrollImpulse,
  collideMeteors,
  launchMeteor,
  stepMeteor,
  stepMeteorScrollInertia,
  type MeteorBody,
} from "./meteor-physics";

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

describe("scroll inertia", () => {
  const bounds = { left: 0, right: 1, top: 0.1, bottom: 0.9 };

  it("lags in either scroll direction, while preserving an intentional launch", () => {
    for (const sign of [-1, 1]) {
      const meteor = body({ vx: 0.12, vy: -0.08 });
      const velocity = addMeteorScrollImpulse(0, sign * 90, 900);
      const next = stepMeteorScrollInertia(meteor, bounds, velocity, 1 / 60);
      expect(Math.sign(meteor.y - 0.5)).toBe(sign);
      expect(Math.abs(next)).toBeLessThan(Math.abs(velocity));
      expect(meteor.vx).toBe(0.12);
      expect(meteor.vy).toBe(-0.08);
    }
  });

  it("caps trackpad bursts and page jumps to a small finite velocity", () => {
    let velocity = 0;
    for (let i = 0; i < 100; i++) velocity = addMeteorScrollImpulse(velocity, 10000, 900);
    expect(velocity).toBeCloseTo(0.065);
    for (let i = 0; i < 100; i++) velocity = addMeteorScrollImpulse(velocity, -10000, 900);
    expect(velocity).toBeCloseTo(-0.065);
    expect(addMeteorScrollImpulse(velocity, Infinity, 900)).toBe(velocity);
    expect(addMeteorScrollImpulse(velocity, 50, 0)).toBe(velocity);
  });

  it("coasts to rest independently of frame rate without drifting indefinitely", () => {
    const positions = [30, 60, 120].map((fps) => {
      const meteor = body();
      let velocity = 0.065;
      for (let i = 0; i < fps * 5; i++) {
        velocity = stepMeteorScrollInertia(meteor, bounds, velocity, 1 / fps);
      }
      expect(velocity).toBe(0);
      expect(meteor.y - 0.5).toBeLessThan(0.025);
      return meteor.y;
    });
    expect(positions[0]).toBeCloseTo(positions[1], 5);
    expect(positions[1]).toBeCloseTo(positions[2], 5);
  });

  it("bounces softly at a flight boundary instead of escaping toward text", () => {
    const meteor = body({ y: 0.8999 });
    const velocity = stepMeteorScrollInertia(meteor, bounds, 0.065, 0.06);
    expect(meteor.y).toBe(bounds.bottom);
    expect(velocity).toBeLessThan(0);
    expect(Math.abs(velocity)).toBeLessThan(0.065 * 0.28);
  });
});
