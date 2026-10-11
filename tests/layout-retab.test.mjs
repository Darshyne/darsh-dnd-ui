import { describe, it, expect } from "vitest";
import { retab, populateTab } from "../module/scripts/core/layout.mjs";

describe("0.20.2 : retab", () => {
  it("un objet rangé dans un onglet qui n'est plus le sien en sort et redevient nouveau pour le bon", () => {
    const base = { cells: { tab_common: [], tab_class: [], tab_items: [], tab_passives: ["Item.vow", "Item.lucky"] },
      tabKnown: { tab_common: [], tab_class: ["Item.vow"], tab_items: [], tab_passives: ["Item.vow", "Item.lucky"] } };
    const tabs = { "Item.vow": "class", "Item.lucky": "passives" };
    const { layout, changed } = retab(base, ref => tabs[ref] ?? null);
    expect(changed).toBe(true);
    expect(layout.cells.tab_passives).toEqual([null, "Item.lucky"]);
    expect(layout.tabKnown.tab_class).toEqual([]);
    expect(base.cells.tab_passives).toEqual(["Item.vow", "Item.lucky"]);   // pas modifié en place
    const filled = populateTab(layout, "class", ["Item.vow"]);
    expect(filled.layout.cells.tab_class).toEqual(["Item.vow"]);
  });
  it("rien ne bouge quand tout est à sa place, ni pour un objet disparu", () => {
    const base = { cells: { tab_common: [], tab_class: ["Item.a"], tab_items: [], tab_passives: ["Item.gone"] }, tabKnown: {} };
    expect(retab(base, ref => (ref === "Item.a" ? "class" : null)).changed).toBe(false);
  });
});
