import { describe, it, expect } from "vitest";
import { emptyLayout, normalize, holdSpellWeapon, releaseSpellWeapon, summonedRefs, setActiveWeapons } from "../module/scripts/core/layout.mjs";

const BLADE = "Item.spell.Activity.dnd5eactivity000";
const withSet = (main, off, active=0) => {
  const l = setActiveWeapons(emptyLayout(), active);
  l.weapons.sets[active] = [main, off];
  return l;
};
const twoHanded = ref => ref === "Item.greatsword";

describe("§70: a spell weapon in a free hand of the active weapon set", () => {
  it("takes the main hand when the set is empty", () => {
    const r = holdSpellWeapon(withSet(null, null), BLADE);
    expect(r.layout.weapons.sets[0]).toEqual([BLADE, null]);
    expect(r.slot).toEqual({ set: 0, hand: 0, previous: null });
  });

  it("takes the free off-hand beside a one-handed weapon", () => {
    const r = holdSpellWeapon(withSet("Item.sword", null), BLADE, twoHanded);
    expect(r.layout.weapons.sets[0]).toEqual(["Item.sword", BLADE]);
  });

  it("no free hand: the off-hand's object is set aside, then comes back", () => {
    const l = withSet("Item.sword", "Item.shield");
    const r = holdSpellWeapon(l, BLADE, twoHanded);
    expect(r.layout.weapons.sets[0]).toEqual(["Item.sword", BLADE]);
    expect(summonedRefs(r.layout)).toEqual([BLADE]);
    const back = releaseSpellWeapon(r.layout, BLADE, new Set(["Item.sword", "Item.shield", BLADE]));
    expect(back.layout.weapons.sets[0]).toEqual(["Item.sword", "Item.shield"]);
    expect(back.restored).toEqual(["Item.shield"]);
    expect(summonedRefs(back.layout)).toEqual([]);
  });

  it("behind a two-handed weapon: the two-handed weapon is set aside", () => {
    const r = holdSpellWeapon(withSet("Item.greatsword", null), BLADE, twoHanded);
    expect(r.layout.weapons.sets[0]).toEqual([BLADE, null]);
    const back = releaseSpellWeapon(r.layout, BLADE, new Set(["Item.greatsword"]));
    expect(back.layout.weapons.sets[0]).toEqual(["Item.greatsword", null]);
  });

  it("uses the set in hand", () => {
    const r = holdSpellWeapon(withSet(null, null, 1), BLADE);
    expect(r.layout.weapons.sets[1]).toEqual([BLADE, null]);
    expect(r.layout.weapons.sets[0]).toEqual([null, null]);
  });

  it("leaves a spell weapon the player put in a set where it is, and does not take it back", () => {
    const l = withSet(null, BLADE);
    const r = holdSpellWeapon(l, BLADE);
    expect(r.changed).toBe(false);
    expect(releaseSpellWeapon(l, BLADE, new Set()).changed).toBe(false);
  });

  it("moved by the player: still taken back; a gone or re-placed object does not come back", () => {
    let l = holdSpellWeapon(withSet("Item.sword", "Item.shield"), BLADE).layout;
    l.weapons.sets[1] = [BLADE, null];
    l.weapons.sets[0][1] = null;
    const back = releaseSpellWeapon(l, BLADE, new Set(["Item.sword"]));
    expect(back.layout.weapons.sets[1]).toEqual([null, null]);
    expect(back.layout.weapons.sets[0]).toEqual(["Item.sword", null]);
  });

  it("the note survives a read of the layout", () => {
    const l = holdSpellWeapon(withSet("Item.sword", "Item.shield"), BLADE).layout;
    const n = normalize(JSON.parse(JSON.stringify(l)));
    expect(n.weapons.summoned).toEqual([{ ref: BLADE, set: 0, hand: 1, previous: "Item.shield" }]);
    expect(normalize({ weapons: { summoned: [{ ref: 3 }, null, { ref: BLADE, set: 9, hand: 0 }] } }).weapons.summoned).toEqual([]);
  });
});
