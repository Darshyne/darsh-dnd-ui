import { describe, it, expect } from "vitest";
import { bonusRange, rangeText, diceShown, effectiveMode } from "../module/scripts/core/roll-window.mjs";

describe("§54 : fenêtre de jet — bonus total", () => {
  it("additionne les fixes et la plage des dés", () => {
    expect(bonusRange(["+4", "+2", "+1d4"])).toEqual({ min: 7, max: 10 });
    expect(bonusRange(["+3", "-1d4"])).toEqual({ min: -1, max: 2 });
    expect(bonusRange(["+2d6", "-1"])).toEqual({ min: 1, max: 11 });
    expect(bonusRange(["3"])).toEqual({ min: 3, max: 3 });
    expect(bonusRange([])).toEqual({ min: 0, max: 0 });
  });
  it("s'écrit comme BG3", () => {
    expect(rangeText({ min: 7, max: 10 })).toBe("+7~10");
    expect(rangeText({ min: 5, max: 5 })).toBe("+5");
    expect(rangeText({ min: -1, max: 2 })).toBe("-1~2");
  });
  it("deux d20 avec l'Avantage ou le Désavantage, un seul quand ils s'annulent", () => {
    expect(diceShown({ advantage: true })).toBe(2);
    expect(diceShown({ disadvantage: true })).toBe(2);
    expect(diceShown({ advantage: true, disadvantage: true })).toBe(1);
    expect(diceShown({})).toBe(1);
  });
});

describe("§54 : le mode du jet", () => {
  it("le MJ, le Soutien ou le système donnent l'Avantage ; le MJ ou le système le Désavantage", () => {
    expect(effectiveMode({ request: { advantage: true } }).mode).toBe("advantage");
    expect(effectiveMode({ helped: true }).mode).toBe("advantage");
    expect(effectiveMode({ system: { disadvantage: true } })).toEqual({ mode: "disadvantage", sources: { advantage: [], disadvantage: ["system"] } });
  });
  it("les deux ensemble s'annulent", () => {
    expect(effectiveMode({ helped: true, system: { disadvantage: true } }).mode).toBe("normal");
  });
  it("forcé : l'emporte sur tout", () => {
    expect(effectiveMode({ request: { advantage: true }, forced: "disadvantage" }).mode).toBe("disadvantage");
    expect(effectiveMode({ system: { disadvantage: true }, forced: "advantage" }).mode).toBe("advantage");
  });
  it("rien : normal", () => expect(effectiveMode({}).mode).toBe("normal"));
});
