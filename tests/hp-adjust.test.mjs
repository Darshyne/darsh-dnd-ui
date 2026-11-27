import { describe, it, expect } from "vitest";
import { hpMenuAnchor, parseAmount, planOf } from "../module/scripts/core/hp-adjust.mjs";

describe("parseAmount", () => {
  it("lit un nombre, signé ou non", () => {
    expect(parseAmount("7")).toEqual({ value: 7, sign: 0 });
    expect(parseAmount(" -7 ")).toEqual({ value: 7, sign: -1 });
    expect(parseAmount("+ 5")).toEqual({ value: 5, sign: 1 });
  });
  it("refuse le vide, zéro, les décimales et le texte", () => {
    for ( const t of ["", "  ", "0", "-0", "2.5", "abc", "5d6", "--3", null, undefined] ) expect(parseAmount(t)).toBeNull();
  });
});

describe("planOf", () => {
  it("Entrée : dégâts sans signe ou avec -, soin avec +", () => {
    expect(planOf("7")).toEqual({ kind: "damage", value: 7 });
    expect(planOf("-7")).toEqual({ kind: "damage", value: 7 });
    expect(planOf("+5")).toEqual({ kind: "heal", value: 5 });
  });
  it("le bouton cliqué l'emporte sur le signe", () => {
    expect(planOf("-5", "heal")).toEqual({ kind: "heal", value: 5 });
    expect(planOf("+5", "damage")).toEqual({ kind: "damage", value: 5 });
    expect(planOf("8", "temp")).toEqual({ kind: "temp", value: 8 });
  });
  it("une saisie invalide ne donne rien", () => {
    expect(planOf("x", "heal")).toBeNull();
  });
});

describe("hpMenuAnchor", () => {
  const portraitWith = hp => ({ querySelector: s => (s === ".ddu-portrait__hp" ? hp : null) });
  const inside = portrait => ({ closest: s => (s === ".ddu-bar__portrait" ? portrait : null) });

  it("anywhere on the portrait opens the drawer on the HP numbers", () => {
    const hp = { hidden: false };
    expect(hpMenuAnchor(inside(portraitWith(hp)))).toBe(hp);
  });
  it("falls back to the portrait when the HP numbers are hidden or absent", () => {
    const portrait = portraitWith({ hidden: true });
    expect(hpMenuAnchor(inside(portrait))).toBe(portrait);
    const bare = portraitWith(null);
    expect(hpMenuAnchor(inside(bare))).toBe(bare);
  });
  it("outside the portrait: nothing", () => {
    expect(hpMenuAnchor(inside(null))).toBeNull();
    expect(hpMenuAnchor(null)).toBeNull();
    expect(hpMenuAnchor({})).toBeNull();
  });
});
