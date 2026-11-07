import { describe, it, expect } from "vitest";
import { BAR_TABS, rememberedTab, rememberTab } from "../module/scripts/core/bar-tab.mjs";

describe("onglet retenu de la Barre (§62, issue #9)", () => {
  it("connaît les six onglets", () => {
    expect(BAR_TABS).toEqual(["default", "common", "class", "items", "passives", "custom"]);
  });
  it("rend l'onglet retenu pour ce personnage", () => {
    expect(rememberedTab({ a: "class", b: "custom" }, "a", true)).toEqual({ tab: "class", stale: false });
    expect(rememberedTab({ a: "class", b: "custom" }, "b", true)).toEqual({ tab: "custom", stale: false });
  });
  it("vue par défaut pour un personnage jamais vu, sans clé ou sans mémoire", () => {
    expect(rememberedTab({ a: "class" }, "z", true)).toEqual({ tab: "default", stale: false });
    expect(rememberedTab({ a: "class" }, null, true)).toEqual({ tab: "default", stale: false });
    expect(rememberedTab(undefined, "a", true)).toEqual({ tab: "default", stale: false });
  });
  it("réglage coupé : toujours la vue par défaut, sans rien oublier", () => {
    expect(rememberedTab({ a: "class" }, "a", false)).toEqual({ tab: "default", stale: false });
  });
  it("un onglet qui n'existe plus : vue par défaut, valeur à oublier", () => {
    expect(rememberedTab({ a: "tab_spells" }, "a", true)).toEqual({ tab: "default", stale: true });
  });
  it("retenir écrit l'onglet ; la vue par défaut ou un onglet inconnu retire la clé", () => {
    const m = { a: "class" };
    expect(rememberTab(m, "b", "items")).toEqual({ a: "class", b: "items" });
    expect(rememberTab(m, "a", "default")).toEqual({});
    expect(rememberTab(m, "a", "nope")).toEqual({});
    expect(m).toEqual({ a: "class" });
    expect(rememberTab(m, null, "items")).toEqual({ a: "class" });
  });
});
