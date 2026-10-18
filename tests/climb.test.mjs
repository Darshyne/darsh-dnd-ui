import { describe, it, expect } from "vitest";
import { climbBadge, climbButtonShown, ringTooltip } from "../module/scripts/core/climb.mjs";

const state = over => ({
  climbing: false, onCeiling: false, height: 0, units: "ft", canClimb: false, canRun: false, canCeiling: false, canDown: false, canDrop: false,
  ...over
});

describe("§46 : témoin d'escalade du portrait", () => {
  it("rien pour qui ne grimpe pas, ni sans état du moteur", () => {
    expect(climbBadge(null)).toBe(null);
    expect(climbBadge(state({ canClimb: true }))).toBe(null);
  });

  it("au mur : la montagne et la hauteur au-dessus du sol", () => {
    expect(climbBadge(state({ climbing: true, height: 10 }))).toEqual({ kind: "wall", icon: "fa-mountain", key: "Climb.OnWall", height: 10, units: "ft" });
  });

  it("au plafond : l'araignée", () => {
    expect(climbBadge(state({ climbing: true, onCeiling: true, height: 15, units: "m" }))).toMatchObject({ kind: "ceiling", icon: "fa-spider", key: "Climb.OnCeiling", height: 15, units: "m" });
  });
});

describe("§46 : bouton « Grimper » de la Barre", () => {
  it("caché quand le menu du moteur n'aurait rien à proposer", () => {
    expect(climbButtonShown(null)).toBe(false);
    expect(climbButtonShown(state())).toBe(false);
  });

  it("montré pour grimper, courir sur le mur, gagner le plafond, descendre ou lâcher", () => {
    for ( const key of ["canClimb", "canRun", "canCeiling", "canDown", "canDrop"] ) expect(climbButtonShown(state({ [key]: true })), key).toBe(true);
  });
});

describe("§46 : infobulle de l'anneau de déplacement", () => {
  it("au sol : restant / permis", () => {
    expect(ringTooltip({ left: 20, allowed: 30, mode: "walk", multiplier: 1 }, 5)).toEqual({ key: "Bar.Movement", data: { left: 20, allowed: 30 } });
  });

  it("en escalade : le coût d'une case (×2 sans vitesse d'escalade)", () => {
    expect(ringTooltip({ left: 10, allowed: 30, mode: "climb", multiplier: 2 }, 5)).toEqual({ key: "Bar.MovementClimb", data: { left: 10, allowed: 30, cost: 10 } });
    expect(ringTooltip({ left: 10, allowed: 30, mode: "climb", multiplier: 1 }, 1.5)).toMatchObject({ data: { cost: 1.5 } });
  });

  it("un moteur plus ancien (ni mode ni multiplicateur) : l'infobulle d'avant", () => {
    expect(ringTooltip({ left: 5, allowed: 30 }, 5).key).toBe("Bar.Movement");
  });
});
