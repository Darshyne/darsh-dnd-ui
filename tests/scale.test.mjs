import { describe, it, expect } from "vitest";
import { autoFactor, scaleFor, fadeOpacity, AUTO_MIN, AUTO_MAX } from "../module/scripts/core/scale.mjs";

describe("autoFactor", () => {
  it("vaut 1 dans la fenêtre de référence", () => {
    expect(autoFactor(1920, 1080)).toBe(1);
  });
  it("suit le côté le plus contraint", () => {
    expect(autoFactor(1280, 1080)).toBeCloseTo(1280 / 1920);
    expect(autoFactor(1920, 810)).toBeCloseTo(0.75);
    expect(autoFactor(3440, 1080)).toBe(1);          // écran large : la hauteur commande
  });
  it("grossit sur un grand écran", () => {
    expect(autoFactor(2560, 1440)).toBeCloseTo(1.333, 2);
  });
  it("reste entre ses bornes", () => {
    expect(autoFactor(640, 360)).toBe(AUTO_MIN);
    expect(autoFactor(7680, 4320)).toBe(AUTO_MAX);
  });
  it("taille inconnue : 1", () => {
    expect(autoFactor(0, 0)).toBe(1);
    expect(autoFactor(undefined, 1080)).toBe(1);
    expect(autoFactor(NaN, NaN)).toBe(1);
  });
});

describe("scaleFor", () => {
  it("sans adaptation : le réglage seul, quelle que soit la fenêtre", () => {
    expect(scaleFor({ percent: 125, auto: false, width: 1280, height: 720 })).toBe(1.25);
    expect(scaleFor({ percent: 100 })).toBe(1);
  });
  it("avec adaptation : le réglage multiplie le facteur de la fenêtre", () => {
    expect(scaleFor({ percent: 100, auto: true, width: 1920, height: 1080 })).toBe(1);
    expect(scaleFor({ percent: 100, auto: true, width: 1280, height: 720 })).toBe(0.67);
    expect(scaleFor({ percent: 150, auto: true, width: 1280, height: 720 })).toBe(1);
    expect(scaleFor({ percent: 75, auto: true, width: 2560, height: 1440 })).toBe(1);
  });
  it("réglage illisible : 100 %", () => {
    expect(scaleFor({ percent: undefined, auto: false })).toBe(1);
    expect(scaleFor({ percent: "abc", auto: true, width: 1920, height: 1080 })).toBe(1);
  });
});

describe("fadeOpacity", () => {
  it("convertit le pourcentage", () => {
    expect(fadeOpacity(50)).toBe(0.5);
    expect(fadeOpacity(100)).toBe(1);
  });
  it("ne descend pas sous 10 % (interface introuvable) et ne dépasse pas 100 %", () => {
    expect(fadeOpacity(0)).toBe(0.1);
    expect(fadeOpacity(250)).toBe(1);
  });
  it("réglage illisible : pas de fondu", () => {
    expect(fadeOpacity(undefined)).toBe(1);
    expect(fadeOpacity("abc")).toBe(1);
  });
});
