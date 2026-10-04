import { describe, it, expect } from "vitest";
import { profile, segmentPlan } from "../module/scripts/core/motion.mjs";

describe("profile", () => {
  it("ajoute la moitié des rampes à la durée", () => {
    expect(profile(1000, 300).duration).toBeCloseTo(1300);
    expect(profile(1000, 300, { accel: false }).duration).toBeCloseTo(1150);
    expect(profile(1000, 300, { accel: false, decel: false }).duration).toBeCloseTo(1000);
  });
  it("part et arrive à vitesse nulle", () => {
    const p = profile(1000, 300);
    const dt = 1;
    expect(p.at(dt) / dt).toBeLessThan(0.01);
    expect((p.at(p.duration) - p.at(p.duration - dt)) / dt).toBeLessThan(0.01);
    expect(p.at(650) - p.at(649)).toBeCloseTo(1, 3);   // croisière : vitesse normale
  });
  it("est croissant et s'inverse", () => {
    const p = profile(800, 300);
    let prev = -1;
    for ( let t = 0; t <= p.duration; t += 10 ) {
      const u = p.at(t);
      expect(u).toBeGreaterThanOrEqual(prev);
      expect(p.inverse(u)).toBeCloseTo(t, 3);
      prev = u;
    }
  });
  it("chemin court : rampes raccourcies, durée doublée", () => {
    const p = profile(100, 300);
    expect(p.duration).toBeCloseTo(200);
    expect(p.at(p.duration)).toBeCloseTo(100);
  });
  it("chemin nul", () => {
    const p = profile(0, 300);
    expect(p.duration).toBe(0);
    expect(p.inverse(0)).toBe(0);
  });
});

describe("segmentPlan", () => {
  it("les durées des tronçons font la durée du profil", () => {
    const plan = segmentPlan([200, 200, 200, 200], 300);
    const total = plan.reduce((s, x) => s + x.duration, 0);
    expect(total).toBeCloseTo(profile(800, 300).duration, 3);
    expect(plan[0].duration).toBeGreaterThan(plan[1].duration);   // départ lent
    expect(plan[3].duration).toBeGreaterThan(plan[2].duration);   // arrivée lente
  });
  it("chaque courbe va de 0 à 1 sans à-coup entre tronçons", () => {
    const plan = segmentPlan([150, 150, 150], 300);
    for ( const s of plan ) {
      expect(s.easing(0)).toBeCloseTo(0, 6);
      expect(s.easing(1)).toBeCloseTo(1, 6);
    }
    // Vitesse (en ms de vitesse normale par ms) en fin du 1er tronçon = au début du 2e.
    const speed = (s, pt, len) => (s.easing(pt + 1e-4) - s.easing(pt)) * len / (1e-4 * s.duration);
    expect(speed(plan[0], 1 - 1e-4, 150)).toBeCloseTo(speed(plan[1], 0, 150), 2);
  });
  it("tronçon de longueur nulle : durée nulle", () => {
    const plan = segmentPlan([0, 300], 200);
    expect(plan[0].duration).toBe(0);
    expect(plan[0].easing(0.5)).toBe(0.5);
  });
});
