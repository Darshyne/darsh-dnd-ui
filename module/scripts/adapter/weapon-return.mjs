/**
 * 0.19.0 : une arme d'un jeu d'armes qui quitte la fiche (lâchée, Injonction « Lâche », lancée, posée au sol) reprend sa place quand
 * elle revient (ramassée), et s'équipe si ce jeu est celui en main (Darsh Loot la déséquipe en partant).
 *
 * Darsh Loot recrée l'objet à chaque passage (au sol, puis au ramassage : un nouvel identifiant — vu le 2026-10-10) : on ne la
 * retrouve pas par sa référence. Au départ, le MJ actif note son signalement — nom, type, source de compendium — dans un drapeau à
 * part (`flags.darsh-dnd-ui.departed.<id>`), pour ne pas croiser les écritures de la disposition par la Barre ; au retour, un objet
 * de même signalement qui n'est dans aucun jeu reprend la place. Une place effacée par le nettoyage de la Barre (`weapons.lost`,
 * core/layout.mjs) comme une place restée sur l'ancienne référence (aucune Barre n'affichait ce personnage) sont traitées de même
 * (`cleanup` puis `restoreLost`).
 */
import { MODULE_ID } from "../shared.mjs";
import { layoutHost, readLayout, writeLayout } from "./forms.mjs";
import { validRefs, refOf } from "./items.mjs";
import { normalize, cleanup, restoreLost, activeWeaponRefs, LOST_MAX } from "../core/layout.mjs";

const DEPARTED = "departed";

const signature = item => ({ name: item.name, type: item.type, source: item._stats?.compendiumSource ?? null });
const idOf = ref => String(ref ?? "").split(".")[1];

/** Chez le MJ actif, avant qu'un objet ne quitte la fiche : si c'est une arme d'un jeu, son signalement est noté. */
export async function recordDeparture(item) {
  const actor = item?.parent;
  if ( actor?.documentName !== "Actor" ) return false;
  const raw = readLayout(layoutHost(actor));
  const ref = refOf(item);
  if ( !raw?.weapons?.sets?.some?.(set => set?.includes?.(ref)) ) return false;
  const departed = { ...(actor.getFlag(MODULE_ID, DEPARTED) ?? {}), [item.id]: { ...signature(item), at: Date.now() } };
  const keep = new Set(Object.entries(departed).sort((a, b) => (b[1].at ?? 0) - (a[1].at ?? 0)).slice(0, LOST_MAX).map(([id]) => id));
  await actor.setFlag(MODULE_ID, `${DEPARTED}.${item.id}`, departed[item.id]);
  for ( const id of Object.keys(departed).filter(id => !keep.has(id)) ) await actor.unsetFlag(MODULE_ID, `${DEPARTED}.${id}`);
  return true;
}

/**
 * Le rapprochement d'une place perdue avec un objet revenu : même nom, même type, même source, dans aucun jeu.
 * @returns {(lost: {ref: string}) => string|null}
 */
export function matcherFor(actor, layout) {
  const departed = actor?.getFlag(MODULE_ID, DEPARTED) ?? {};
  const placed = new Set(layout.weapons.sets.flat().filter(Boolean));
  return lost => {
    const info = departed[idOf(lost.ref)];
    if ( !info ) return null;
    const back = actor.items.find(i => !placed.has(refOf(i)) && (i.type === info.type) && (i.name === info.name)
      && ((i._stats?.compendiumSource ?? null) === (info.source ?? null)));
    return back ? refOf(back) : null;
  };
}

/** Les signalements qui ont servi s'effacent. */
async function forget(actor, restored) {
  for ( const r of restored ) {
    const id = idOf(r.from);
    if ( actor.getFlag(MODULE_ID, `${DEPARTED}.${id}`) ) await actor.unsetFlag(MODULE_ID, `${DEPARTED}.${id}`);
  }
}

/** Les armes rendues au jeu en main s'équipent. Rend le nombre d'armes équipées. */
export async function equipActive(actor, layout, restored) {
  const held = new Set(activeWeaponRefs(layout));
  const updates = restored.filter(r => held.has(r.ref)).map(r => actor.items.get(idOf(r.ref)))
    .filter(i => i && !i.system.equipped).map(i => ({ _id: i.id, "system.equipped": true }));
  if ( updates.length ) await actor.updateEmbeddedDocuments("Item", updates);
  return updates.length;
}

/**
 * Chez le MJ actif, à l'arrivée d'un objet : remet en place les armes revenues, enregistre la disposition, équipe celles du jeu en
 * main. Rend les places rendues.
 * @param {Actor} actor
 */
export async function returnWeapons(actor) {
  const host = layoutHost(actor);
  const raw = readLayout(host);
  if ( !raw ) return [];
  const valid = validRefs(actor);
  const c = cleanup(normalize(raw), valid);
  const r = restoreLost(c.layout, valid, matcherFor(actor, c.layout));
  if ( !r.restored.length ) return [];
  await writeLayout(host, r.layout);
  await equipActive(actor, r.layout, r.restored);
  await forget(actor, r.restored);
  return r.restored;
}
