import { describe, it, expect } from "vitest";
import { roman, matchesFilter, upcastOptions, reasonsFor } from "../module/scripts/core/cells.mjs";

const slots = [
  { key: "spell1", level: 1, value: 0, max: 4 },
  { key: "spell2", level: 2, value: 2, max: 3 },
  { key: "spell3", level: 3, value: 1, max: 2 },
  { key: "pact", level: 2, value: 1, max: 1 }
];

describe("roman", () => {
  it("I à IX", () => {
    expect(roman(1)).toBe("I");
    expect(roman(4)).toBe("IV");
    expect(roman(9)).toBe("IX");
  });
});

describe("matchesFilter", () => {
  it("coût", () => {
    expect(matchesFilter({ cost: "bonus" }, "bonus")).toBe(true);
    expect(matchesFilter({ cost: "action" }, "bonus")).toBe(false);
  });
  it("niveau : ce niveau et en dessous", () => {
    expect(matchesFilter({ spellLevel: 2 }, { level: 2 })).toBe(true);
    expect(matchesFilter({ spellLevel: 0 }, { level: 2 })).toBe(true);
    expect(matchesFilter({ spellLevel: 3 }, { level: 2 })).toBe(false);
    expect(matchesFilter({ spellLevel: null }, { level: 2 })).toBe(false);
  });
  it("sorts mineurs", () => {
    expect(matchesFilter({ spellLevel: 0 }, "cantrip")).toBe(true);
    expect(matchesFilter({ spellLevel: 1 }, "cantrip")).toBe(false);
  });
});

describe("upcastOptions", () => {
  it("emplacements restants de ce niveau et au-dessus, pacte après", () => {
    expect(upcastOptions(slots, 1).map(s => s.key)).toEqual(["spell2", "pact", "spell3"]);
    expect(upcastOptions(slots, 3).map(s => s.key)).toEqual(["spell3"]);
  });
});

describe("reasonsFor", () => {
  it("plus d'utilisation, plus d'objet, pas préparé, pas d'emplacement", () => {
    expect(reasonsFor({ uses: { value: 0, max: 2 } })).toEqual(["NoUses"]);
    expect(reasonsFor({ quantity: 0 })).toEqual(["NoQuantity"]);
    expect(reasonsFor({ unprepared: true })).toEqual(["Unprepared"]);
    expect(reasonsFor({ needsSlot: true, spellLevel: 4, slots })).toEqual(["NoSlot"]);
    expect(reasonsFor({ needsSlot: true, spellLevel: 1, slots })).toEqual([]);
  });
  it("le tour et le budget ne sont pas jugés ici (le moteur le fait)", () => {
    expect(reasonsFor({ cost: "action" })).toEqual([]);
  });
});
