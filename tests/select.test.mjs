import { describe, it, expect } from "vitest";
import { autoSelectsTurn } from "../module/scripts/core/select.mjs";

const gm = (gmMode, isNPC) => autoSelectsTurn({ isGM: true, gmMode, playerOn: true, isOwner: true, isNPC });

describe("présélection du combattant actif (§48)", () => {
  it("MJ : aucun, PNJ seulement, tous — la case des joueurs ne compte pas", () => {
    expect([gm("none", true), gm("none", false)]).toEqual([false, false]);
    expect([gm("npc", true), gm("npc", false)]).toEqual([true, false]);
    expect([gm("all", true), gm("all", false)]).toEqual([true, true]);
  });
  it("joueur : sa case, ses seuls combattants", () => {
    expect(autoSelectsTurn({ isGM: false, gmMode: "all", playerOn: true, isOwner: true, isNPC: false })).toBe(true);
    expect(autoSelectsTurn({ isGM: false, gmMode: "all", playerOn: false, isOwner: true, isNPC: false })).toBe(false);
    expect(autoSelectsTurn({ isGM: false, gmMode: "all", playerOn: true, isOwner: false, isNPC: true })).toBe(false);
  });
});
