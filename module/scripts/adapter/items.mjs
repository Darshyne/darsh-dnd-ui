/**
 * Lecture dnd5e 6 des objets d'un acteur pour la Barre. Champs vérifiés dans la source vendorée
 * (Foundry dnd5e-automation/references/dnd5e-6/src/module) :
 * - activités : item.system.activities (collection), activity.activation.type (config.mjs:998),
 *   activity.requiresSpellSlot, activity.img (data/activity/base-activity.mjs:57) ;
 * - utilisations : { spent, max, value, recovery[].period } (data/shared/uses-field.mjs:20) ;
 * - sorts : system.level, system.method, system.prepared (0 non préparé, 1 préparé, 2 toujours ;
 *   data/item/spell.mjs:52, config.mjs:3235), canPrepare (spell.mjs:193) ;
 * - emplacements : actor.system.spells.<spell1…spell9|pact>.{value, max, level}
 *   (data/actor/templates/creature.mjs:104-139) ;
 * - surcharge : usageConfig.spell.slot = clé d'emplacement (documents/activity/mixin.mjs:487-495).
 * Actions de base du moteur : items portant flags["dnd5e-combat"].basicAction (SPEC §4.1).
 */
import { reasonsFor, upcastOptions } from "../core/cells.mjs";
import { issuesOf } from "./engine.mjs";

const TIMED = ["action", "bonus", "reaction"];

/* -------------------------------------------- */
/*  Références                                  */
/* -------------------------------------------- */

/** Référence stockée dans la disposition, relative à l'acteur (ou au monde pour une macro). */
export function refOf(doc) {
  if ( !doc ) return null;
  if ( doc.documentName === "Macro" ) return `Macro.${doc.id}`;
  if ( doc.documentName === "Item" ) return `Item.${doc.id}`;
  if ( doc.documentName === "Activity" || doc.item ) return `Item.${doc.item.id}.Activity.${doc.id}`;
  return null;
}

/** @returns {{item?: Item, activity?: object, macro?: Macro}|null} */
export function resolveRef(actor, ref) {
  if ( !ref ) return null;
  const parts = ref.split(".");
  if ( parts[0] === "Macro" ) {
    const macro = game.macros.get(parts[1]);
    return macro ? { macro } : null;
  }
  const item = actor?.items.get(parts[1]);
  if ( !item ) return null;
  if ( parts[2] === "Activity" ) {
    const activity = item.system.activities?.get(parts[3]);
    return activity ? { item, activity } : null;
  }
  return { item };
}

/** Toutes les références valides de l'acteur (objets et leurs activités). */
export function validRefs(actor) {
  const set = new Set();
  for ( const item of actor?.items ?? [] ) {
    set.add(`Item.${item.id}`);
    for ( const a of item.system.activities ?? [] ) set.add(`Item.${item.id}.Activity.${a.id}`);
  }
  return set;
}

/* -------------------------------------------- */
/*  Catégories et onglets                       */
/* -------------------------------------------- */

export function isBasicAction(item) {
  return !!item.getFlag?.("dnd5e-combat", "basicAction");
}

function hasActivities(item) {
  return (item.system.activities?.size ?? 0) > 0;
}

/**
 * Activité qu'on déclenche soi-même. Est passive une activité sans type d'activation (dnd5e 6 en donne une à beaucoup
 * d'aptitudes passives : Régénération, Affinité élémentaire…) ou d'un type que dnd5e marque `passive` (repos, début
 * et fin de tour, rencontre ; config.mjs:1031-1096, lu de même par la fiche PNJ, applications/actor/npc-sheet.mjs:514).
 * Sauf « Spécial », marqué passif lui aussi mais porté par des aptitudes qu'on clique (Fougue, Frappe brutale).
 */
function isActiveActivity(activity) {
  const type = activity?.activation?.type;
  if ( !type || (type === "none") ) return false;
  if ( type === "special" ) return true;
  return !CONFIG.DND5E.activityActivationTypes[type]?.passive;
}

/** Objet qui a au moins une activité qu'on déclenche soi-même. */
export function isActiveItem(item) {
  return (item.system.activities ?? []).some(isActiveActivity);
}

/** Sort utilisable sans préparation, ou préparé. */
export function isSpellReady(item) {
  if ( item.type !== "spell" ) return true;
  if ( item.system.level === 0 ) return true;
  return !item.system.canPrepare || (item.system.prepared ?? 0) > 0;
}

/**
 * Onglet où va un objet : "common" (actions de base, armes), "class" (sorts, aptitudes),
 * "items" (consommables et autres objets à activité), "passives" (aptitude sans activité qu'on déclenche) ou null.
 */
export function tabOf(item) {
  if ( isBasicAction(item) ) return "common";
  if ( !hasActivities(item) ) return ["feat", "spell"].includes(item.type) ? "passives" : null;
  if ( item.type === "weapon" ) return "common";
  if ( item.type === "spell" ) return "class";
  // Aptitude dont aucune activité ne se déclenche : rien à cliquer dans la Barre (demande du 2026-10-03). Les objets
  // ne sont pas concernés : une lampe porte une activité sans type d'activation et doit rester.
  if ( (item.type === "feat") && !isActiveItem(item) ) return "passives";
  if ( item.type === "spell" || item.type === "feat" ) return "class";
  return "items";
}

/**
 * Entrées à placer automatiquement dans la vue par défaut (SPEC §5.6) : actions de base, armes
 * équipées, sorts prêts, aptitudes à activité, consommables.
 * @returns {{ref: string, container: string}[]}
 */
export function autoEntries(actor) {
  const out = [];
  const items = [...(actor?.items ?? [])].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  for ( const item of items ) {
    const tab = tabOf(item);
    if ( !tab || tab === "passives" ) continue;
    if ( item.type === "weapon" && !item.system.equipped ) continue;
    if ( item.type === "spell" && !isSpellReady(item) ) continue;
    out.push({ ref: `Item.${item.id}`, container: tab });
  }
  // Sorts par niveau, puis nom : la Classe se lit comme un grimoire.
  return out.sort((a, b) => spellOrder(actor, a.ref) - spellOrder(actor, b.ref));
}

function spellOrder(actor, ref) {
  const item = actor.items.get(ref.split(".")[1]);
  return item?.type === "spell" ? 1 + item.system.level : 0;
}

/** Références (objets et activités) de ce qui n'a pas sa place dans la vue par défaut (aptitudes passives). */
export function inactiveRefs(actor) {
  const set = new Set();
  for ( const item of actor?.items ?? [] ) {
    if ( ["common", "class", "items"].includes(tabOf(item)) ) continue;
    set.add(`Item.${item.id}`);
    for ( const a of item.system.activities ?? [] ) set.add(`Item.${item.id}.Activity.${a.id}`);
  }
  return set;
}

/** Références d'un onglet généré (tout ce qui s'y range, prêt ou non). */
export function tabRefs(actor, tab) {
  const items = [...(actor?.items ?? [])].filter(i => tabOf(i) === tab);
  items.sort((a, b) => {
    const la = a.type === "spell" ? a.system.level : -1;
    const lb = b.type === "spell" ? b.system.level : -1;
    return (la - lb) || a.name.localeCompare(b.name);
  });
  return items.map(i => `Item.${i.id}`);
}

/**
 * Nom de l'onglet Classe : les classes de l'acteur (« Clerc », « Clerc / Guerrier »). En forme animale, le
 * nom de la forme (dnd5e nomme l'acteur « Druide (Loup) » et lui donne une « Temporary Class »).
 */
export function classLabel(actor) {
  if ( actor?.isPolymorphed ) {
    const form = actor.name.match(/\(([^()]+)\)\s*$/)?.[1];
    if ( form ) return form;
  }
  const names = actor?.items.filter(i => i.type === "class").map(i => i.name) ?? [];
  return names.join(" / ");
}

/* -------------------------------------------- */
/*  Ressources                                  */
/* -------------------------------------------- */

/** Emplacements de sorts de l'acteur (ceux qu'il a). */
export function slotsOf(actor) {
  const spells = actor?.system?.spells ?? {};
  const out = [];
  for ( const [key, s] of Object.entries(spells) ) {
    if ( !(s?.max > 0) ) continue;
    const level = key === "pact" ? (s.level ?? 0) : Number(key.replace("spell", ""));
    if ( !(level > 0) ) continue;
    out.push({ key, level, value: s.value ?? 0, max: s.max, pact: key === "pact" });
  }
  return out.sort((a, b) => (a.level - b.level) || (a.pact ? 1 : -1));
}

/** L'acteur a-t-il des sorts mineurs ? (pour afficher le filtre) */
export function hasCantrips(actor) {
  return !!actor?.items.some(i => i.type === "spell" && i.system.level === 0);
}

function usesOf(doc) {
  const u = doc?.system?.uses ?? doc?.uses;
  const max = Number(u?.max) || 0;
  if ( !max ) return null;
  const value = Number.isFinite(u.value) ? u.value : max - (u.spent ?? 0);
  return { value, max, period: u.recovery?.[0]?.period ?? null };
}

/**
 * Ressources de classe : aptitudes à utilisations limitées qui se récupèrent au repos (Conduit divin,
 * Ki, Inspiration bardique…). Déduites des objets, pas d'une liste en dur (SPEC §5.4).
 */
export function classResources(actor) {
  const out = [];
  for ( const item of actor?.items ?? [] ) {
    if ( item.type !== "feat" || isBasicAction(item) ) continue;
    const uses = usesOf(item);
    if ( !uses || !["sr", "lr", "day", "dawn", "dusk"].includes(uses.period) ) continue;
    out.push({ item, ...uses });
  }
  return out;
}

/* -------------------------------------------- */
/*  Case                                        */
/* -------------------------------------------- */

/**
 * Enchantements appliqués à un objet (Arme élémentaire, Arme magique, Pacte de la lame…) : effets de type
 * « enchantment » posés sur l'objet (`ActiveEffect5e#isAppliedEnchantment`, documents/active-effect.mjs:163 ;
 * `EnchantmentData#isApplied` = `transfer` sur un objet, data/active-effect/enchantment.mjs:50).
 * @returns {string[]}  Noms des enchantements actifs.
 */
export function enchantmentsOf(item) {
  return (item?.effects ?? []).filter(e => e.isAppliedEnchantment && !e.disabled && !e.isSuppressed).map(e => e.name);
}

/**
 * Modèle d'affichage d'une case.
 * @param {Actor} actor
 * @param {string} ref
 * @param {object} ctx   { slots, multi }
 *   `reasons` : clés DDU.Reason.* propres à la case ; `issues` : phrases du moteur (tour, budget, états), déjà traduites.
 */
export function cellView(actor, ref, ctx) {
  const r = resolveRef(actor, ref);
  if ( !r ) return null;
  if ( r.macro ) {
    return { ref, kind: "macro", name: r.macro.name, img: r.macro.img, cost: null, reasons: [], issues: [], spellLevel: null };
  }
  const { item } = r;
  const activity = r.activity ?? item.system.activities?.contents?.[0] ?? null;
  const type = activity?.activation?.type ?? null;
  const cost = TIMED.includes(type) ? type : (type ? "other" : null);
  const isSpell = item.type === "spell";
  const spellLevel = isSpell ? item.system.level : null;
  const needsSlot = isSpell && spellLevel > 0 && (activity?.requiresSpellSlot
    ?? !!CONFIG.DND5E.spellcasting[item.system.method]?.slots);
  const uses = usesOf(r.activity) ?? usesOf(item) ?? (r.activity ? null : usesOf(activity));
  const quantity = item.type === "consumable" ? (item.system.quantity ?? null) : null;
  const unprepared = isSpell && !isSpellReady(item);
  const view = {
    ref, kind: r.activity ? "activity" : "item", item, activity: r.activity ?? null, primary: activity,
    name: r.activity ? `${item.name} : ${r.activity.name}` : item.name,
    img: r.activity?.img || item.img,
    cost, spellLevel, needsSlot, uses, quantity, unprepared,
    canUpcast: needsSlot && !!item.system.canScale,
    concentration: !!(item.system.properties?.has?.("concentration") || activity?.duration?.concentration),
    ritual: !!item.system.properties?.has?.("ritual"),
    equipped: item.system.equipped ?? null,
    basic: isBasicAction(item),
    enchantments: enchantmentsOf(item)
  };
  view.reasons = reasonsFor({ ...view, slots: ctx.slots });
  view.issues = issuesOf(activity) ?? [];
  // Attaques multiples ouvertes par le moteur ce tour : ce qui reste à jouer, ce qui n'a plus rien.
  view.multi = ctx.multi?.left.has(item.uuid) ? "left" : ctx.multi?.spent.has(item.uuid) ? "spent" : null;
  view.upcast = view.canUpcast ? upcastOptions(ctx.slots, spellLevel) : [];
  return view;
}

/* -------------------------------------------- */
/*  Armes                                       */
/* -------------------------------------------- */

/** Armes de l'acteur pour le premier remplissage des jeux d'armes. */
export function weaponsOf(actor) {
  return (actor?.items ?? []).filter(i => i.type === "weapon").map(i => ({
    ref: `Item.${i.id}`,
    equipped: !!i.system.equipped,
    ranged: ["simpleR", "martialR"].includes(i.system.type?.value) || !!i.system.range?.long
  }));
}

/**
 * Passer d'un jeu d'armes à l'autre : équipe les objets du jeu choisi, déséquipe ceux de l'autre jeu
 * (seulement eux : le reste de l'équipement n'est pas touché). Une seule mise à jour groupée.
 */
export async function equipWeaponSet(actor, sets, active) {
  const want = new Set(sets[active].filter(Boolean).map(r => r.split(".")[1]));
  const other = new Set(sets[1 - active].filter(Boolean).map(r => r.split(".")[1]));
  const updates = [];
  for ( const id of new Set([...want, ...other]) ) {
    const item = actor.items.get(id);
    if ( !item || !("equipped" in (item.system ?? {})) ) continue;
    const equipped = want.has(id);
    if ( item.system.equipped !== equipped ) updates.push({ _id: id, "system.equipped": equipped });
  }
  if ( updates.length ) await actor.updateEmbeddedDocuments("Item", updates);
}
