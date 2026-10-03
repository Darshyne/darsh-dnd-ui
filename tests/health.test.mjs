import { describe, it, expect } from "vitest";
import { readHealth, tierOf, veilFor, changeOf, TIER_VEIL } from "../module/scripts/core/health.mjs";

const h = (value, max, extra = {}) => readHealth({ value, max, ...extra });

describe("readHealth", () => {
  it("borne les PV entre 0 et le max", () => {
    expect(h(-5, 10).value).toBe(0);
    expect(h(15, 10).value).toBe(10);
  });
  it("calcule la part perdue", () => {
    expect(h(6, 10).lost).toBeCloseTo(0.4);
    expect(h(10, 10).lost).toBe(0);
  });
  it("sans PV max, rien n'est perdu", () => {
    expect(h(0, 0).lost).toBe(0);
    expect(tierOf(h(0, 0))).toBe("unhurt");
  });
  it("seuil « en sang » par défaut à 50 %", () => {
    expect(h(5, 10).bloodied).toBe(50);
  });
});

describe("tierOf", () => {
  it.each([
    [10, "unhurt"], [9, "hurt"], [6, "hurt"], [5, "bloodied"], [3, "bloodied"],
    [2, "critical"], [1, "critical"], [0, "down"]
  ])("%i/10 → %s", (value, tier) => {
    expect(tierOf(h(value, 10))).toBe(tier);
  });
  it("respecte un seuil « en sang » propre à la créature", () => {
    expect(tierOf(h(7, 10, { bloodied: 75 }))).toBe("bloodied");
  });
});

describe("veilFor", () => {
  it("exact : voile = part perdue, chiffres montrés", () => {
    const v = veilFor(h(6, 10), "exact");
    expect(v.veil).toBeCloseTo(0.4);
    expect(v.numbers).toBe(true);
  });
  it("par paliers : voile arrondi, pas de chiffres", () => {
    const v = veilFor(h(4, 10), "tiers");
    expect(v.tier).toBe("bloodied");
    expect(v.veil).toBe(TIER_VEIL.bloodied);
    expect(v.numbers).toBe(false);
  });
  it("aucun : rien tant que la créature tient debout", () => {
    expect(veilFor(h(1, 10), "none")).toEqual({ tier: "unhurt", veil: 0, numbers: false });
    expect(veilFor(h(0, 10), "none")).toEqual({ tier: "down", veil: 1, numbers: false });
  });
});

describe("changeOf", () => {
  it("dégâts, soins, rien", () => {
    expect(changeOf(h(10, 10), h(6, 10))).toBe("damage");
    expect(changeOf(h(6, 10), h(8, 10))).toBe("heal");
    expect(changeOf(h(6, 10), h(6, 10))).toBe(null);
  });
  it("perdre des PV temporaires, c'est encaisser", () => {
    expect(changeOf(h(10, 10, { temp: 5 }), h(10, 10, { temp: 2 }))).toBe("damage");
  });
  it("premier affichage : pas de flash", () => {
    expect(changeOf(null, h(6, 10))).toBe(null);
  });
});
