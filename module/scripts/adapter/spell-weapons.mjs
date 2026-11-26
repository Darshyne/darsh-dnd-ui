/**
 * §70 (engine §553): a spell weapon (Flame Blade, Produce Flame) goes into a free hand of the active weapon set while the spell lasts,
 * ready to use, and leaves it when the spell ends — what it replaced comes back. Done by the active GM (like the weapons that come back,
 * adapter/weapon-return.mjs), from the engine's list of active spell weapons: each call brings the layout in line with it.
 */
import { layoutHost, readLayout, writeLayout } from "./forms.mjs";
import { validRefs, isTwoHanded, resolveRef, equipWeaponSet, weaponsOf } from "./items.mjs";
import { spellWeaponsOf } from "./engine.mjs";
import { normalize, holdSpellWeapon, releaseSpellWeapon, summonedRefs, activeWeaponRefs, seedWeapons } from "../core/layout.mjs";

/** The layout ref of a spell weapon's attack. */
export const spellWeaponRef = weapon => `Item.${weapon.itemId}.Activity.${weapon.activityId}`;

/** Is this ref the attack of one of the actor's active spell weapons? */
export function isSpellWeaponRef(actor, ref) {
  return spellWeaponsOf(actor).some(w => spellWeaponRef(w) === ref);
}

/**
 * Brings the actor's weapon sets in line with its active spell weapons: places the new ones, takes back the ended ones. Writes the
 * layout and the equipment when something changed. Active GM.
 * @param {Actor} actor
 * @returns {Promise<{held: string[], released: string[]}>}
 */
export async function syncSpellWeapons(actor) {
  const host = layoutHost(actor);
  const raw = readLayout(host);
  const active = spellWeaponsOf(actor).map(spellWeaponRef);
  if ( !raw && !active.length ) return { held: [], released: [] };
  let layout = normalize(raw);
  // Never shown in a Bar yet: its weapons first (as the Bar's first fill would), so the blade does not stop that fill.
  if ( !raw ) layout = seedWeapons(layout, weaponsOf(actor)).layout;
  const before = activeWeaponRefs(layout);
  const held = [];
  const released = [];
  const twoHanded = ref => isTwoHanded(resolveRef(actor, ref)?.item);
  for ( const ref of summonedRefs(layout) ) {
    if ( active.includes(ref) ) continue;
    const r = releaseSpellWeapon(layout, ref, validRefs(actor));
    if ( r.changed ) { layout = r.layout; released.push(ref); }
  }
  for ( const ref of active ) {
    const r = holdSpellWeapon(layout, ref, twoHanded);
    if ( r.changed ) { layout = r.layout; held.push(ref); }
  }
  if ( !held.length && !released.length ) return { held, released };
  await writeLayout(host, layout);
  const after = activeWeaponRefs(layout);
  await equipWeaponSet(actor, layout.weapons.sets, layout.weapons.active, { released: before.filter(r => !after.includes(r)) });
  return { held, released };
}
