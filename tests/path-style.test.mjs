import { describe, it, expect } from "vitest";
import { pathStyleOf, rulerShown } from "../module/scripts/core/path-style.mjs";

describe("tracé du chemin (§49)", () => {
  it("les trois choix se lisent tels quels", () => {
    expect(["flat", "soft", "dots"].map(pathStyleOf)).toEqual(["flat", "soft", "dots"]);
  });
  it("l'ancienne case à cocher : cochée → fondu, décochée → aplats ; inconnu → fondu (défaut)", () => {
    expect([true, "true", false, "false"].map(pathStyleOf)).toEqual(["soft", "soft", "flat", "flat"]);
    expect([undefined, null, "autre"].map(pathStyleOf)).toEqual(["soft", "soft", "soft"]);
  });
});

describe("visibilité de la règle du token", () => {
  const shown = facts => rulerShown({ base: true, always: false, inCombat: false, pathfinder: false, planned: false, ...facts });
  it("rien ne change sans module de recherche de chemin : en combat, ou avec le réglage", () => {
    expect([shown({}), shown({ inCombat: true }), shown({ always: true }), shown({ planned: true })]).toEqual([false, true, true, false]);
  });
  it("avec un module de recherche de chemin, la route planifiée se voit hors combat, le temps du glisser", () => {
    expect(shown({ pathfinder: true, planned: true })).toBe(true);
    expect(shown({ pathfinder: true, planned: false })).toBe(false);
  });
  it("jamais quand le cœur ne la montre pas", () => {
    expect(shown({ base: false, inCombat: true, always: true, pathfinder: true, planned: true })).toBe(false);
  });
});
