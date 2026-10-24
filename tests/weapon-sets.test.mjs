import { describe, it, expect } from "vitest";
import {
  emptyLayout, normalize, setWeapon, setActiveWeapons, placeWeapon, cycleWeaponSet, weaponColumn, MAX_WEAPON_SETS
} from "../module/scripts/core/layout.mjs";

const twoHanded = ref => ref === "Item.greataxe";

describe("§52 : jeux d'armes", () => {
  it("la main principale d'abord : lâchée à droite sur un jeu vide, l'arme va à gauche", () => {
    const { layout, hand } = placeWeapon(emptyLayout(), 0, 1, "Item.staff", twoHanded);
    expect(hand).toBe(0);
    expect(layout.weapons.sets[0]).toEqual(["Item.staff", null]);
    const second = placeWeapon(layout, 0, 1, "Item.dagger", twoHanded);
    expect(second.layout.weapons.sets[0]).toEqual(["Item.staff", "Item.dagger"]);
  });

  it("une arme à deux mains prend la main principale et vide la secondaire ; la secondaire derrière elle est refusée", () => {
    let l = setWeapon(setWeapon(emptyLayout(), 0, 0, "Item.sword"), 0, 1, "Item.dagger");
    const placed = placeWeapon(l, 0, 1, "Item.greataxe", twoHanded);
    expect(placed.hand).toBe(0);
    expect(placed.layout.weapons.sets[0]).toEqual(["Item.greataxe", null]);
    const refused = placeWeapon(placed.layout, 0, 1, "Item.dagger", twoHanded);
    expect(refused.hand).toBe(null);
    expect(refused.layout).toBe(placed.layout);
  });

  it("déplacer l'arme principale vers la secondaire la ramène à gauche (la main principale serait vide)", () => {
    const l = setWeapon(emptyLayout(), 0, 0, "Item.staff");
    expect(placeWeapon(l, 0, 1, "Item.staff", twoHanded).layout.weapons.sets[0]).toEqual(["Item.staff", null]);
  });

  it("plus de deux jeux : ajoutés à la demande, gardés à la relecture, bornés", () => {
    let l = setWeapon(emptyLayout(), 3, 0, "Item.bow");
    expect(l.weapons.sets.length).toBe(4);
    l = setActiveWeapons(l, 3);
    const read = normalize(JSON.parse(JSON.stringify(l)));
    expect(read.weapons.sets.length).toBe(4);
    expect(read.weapons.active).toBe(3);
    expect(read.weapons.sets[3][0]).toBe("Item.bow");
    expect(normalize({ weapons: { sets: Array(10).fill([null, null]), active: 9 } }).weapons).toMatchObject({ active: 0 });
    expect(normalize({ weapons: { sets: Array(10).fill([null, null]) } }).weapons.sets.length).toBe(MAX_WEAPON_SETS);
    expect(normalize({}).weapons.sets.length).toBe(2);
  });

  it("rotation en boucle sur les jeux de ce client ; un jeu actif au-delà compte comme le dernier", () => {
    expect(cycleWeaponSet(0, 1, 2)).toBe(1);
    expect(cycleWeaponSet(1, 1, 2)).toBe(0);
    expect(cycleWeaponSet(0, -1, 4)).toBe(3);
    expect(cycleWeaponSet(5, 1, 3)).toBe(0);
  });

  it("la colonne des petits jeux : suivant au-dessus, actif au milieu, précédent en dessous", () => {
    expect(weaponColumn(0, 2)).toEqual({ next: 1, current: 0, prev: null });
    expect(weaponColumn(1, 2)).toEqual({ next: 0, current: 1, prev: null });
    expect(weaponColumn(0, 4)).toEqual({ next: 1, current: 0, prev: 3 });
    expect(weaponColumn(3, 4)).toEqual({ next: 0, current: 3, prev: 2 });
  });
});
