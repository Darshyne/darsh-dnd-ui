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
import { cellStateOf, movableZoneOf, carriedLightOf } from "./engine.mjs";

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
 * 0.20.2 : sans type d'activation, une activité qui dépense les utilisations d'un AUTRE objet (une option d'une réserve commune) se
 * déclenche quand même — Vœu d'hostilité (2024 : « quand vous entreprenez l'action Attaque », sans coût propre) dépense le Conduit
 * divin et restait dans les Passifs, impossible à utiliser. Une aptitude qui ne dépense que ses propres utilisations (Acharnement,
 * Chanceux : le moteur les joue) reste passive.
 */
function spendsUses(activity) {
  const own = activity?.item?.id;
  return (activity?.consumption?.targets ?? []).some(t => (t.type === "itemUses") && t.target && (t.target !== own));
}

function isActiveActivity(activity) {
  const type = activity?.activation?.type;
  if ( !type || (type === "none") ) return spendsUses(activity);
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
  // 0.20.2 : la copie d'un sort que dnd5e garde pour une activité « cast » (Ennemi juré → Marque du chasseur, objet magique) — la
  // fiche de dnd5e la cache ; la Barre en faisait une seconde case « non préparé ».
  if ( item?.getFlag?.("dnd5e", "cachedFor") ) return null;
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
    // Une arme naturelle (Attaque à mains nues du Moine, griffes…) n'est jamais « équipée » : elle ne se tient pas en main.
    // Vu en jeu le 2026-10-10 : le Moine n'avait aucune attaque dans sa Barre.
    if ( item.type === "weapon" && !item.system.equipped && (item.system.type?.value !== "natural") ) continue;
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
  if ( item.getFlag?.("dnd5e", "cachedFor") ) return null;   // 0.20.2 : copie de sort d'une activité « cast » (voir tabOf)
  const activity = r.activity ?? item.system.activities?.contents?.[0] ?? null;
  const type = activity?.activation?.type ?? null;
  // 0.19.2 : le coût que le moteur fera payer (Observateur : Chercher par une action Bonus), sinon l'activation de la donnée.
  // 0.25.3 : avec les raisons, en un seul calcul du moteur (`cellStateOf`).
  const engineState = cellStateOf(activity);
  const engineCost = engineState.cost;
  const cost = TIMED.includes(engineCost) ? engineCost : TIMED.includes(type) ? type : (type ? "other" : null);
  const isSpell = item.type === "spell";
  const spellLevel = isSpell ? item.system.level : null;
  // 0.16.5 : une zone déjà posée à déplacer (Rayon de lune) ne dépense pas d'emplacement — ni grisée, ni tiroir des niveaux.
  const moves = movableZoneOf(activity);
  // 0.19.1 : comme dnd5e (`requiresSpellSlot && consumption.spellSlot`), une activité qui ne dépense pas d'emplacement n'en
  // demande pas — l'« Incantation gratuite (1/jour) » d'Initié à la magie grisait le sort chez un Moine sans emplacement. Une
  // case d'objet n'est grisée que si aucune de ses activités ne se lance sans emplacement (utilisations comprises).
  const leveled = !moves && isSpell && spellLevel > 0;
  const acts = item.system.activities?.contents ?? [];
  // L'activité « forward » que dnd5e crée pour une incantation gratuite (SpellConfigurationData#applySpellChanges) relance le sort
  // sans emplacement (ForwardActivity#use : `spellSlot: false`) et dépense les utilisations de l'objet.
  const slotted = a => !!(a?.requiresSpellSlot && a.consumption?.spellSlot) && (a.type !== "forward");
  const spent = u => (u?.max > 0) && (u.value <= 0);
  const itemSpent = a => (a?.consumption?.targets ?? []).some(t => t.type === "itemUses" && !t.target) && spent(usesOf(item));
  const free = a => !slotted(a) && !spent(usesOf(a)) && !itemSpent(a);
  // 0.20.2 : une incantation gratuite, c'est une activité qui LANCE le sort sans emplacement — la « forward » de dnd5e, ou une activité
  // à utilisations limitées (les siennes ou celles de l'objet). Les activités sans emplacement d'un sort en cours (« Dégâts bonus de
  // marque », « Déplacer la marque » de Marque du chasseur) n'en sont pas : elles laissaient la case active sans emplacement, et le clic
  // ne faisait rien (dnd5e refusait le lancement).
  const limited = a => (usesOf(a)?.max > 0) || (a?.consumption?.targets ?? []).some(t => (t.type === "itemUses") && !t.target);
  const freeCast = a => free(a) && ((a.type === "forward") || limited(a));
  // Le sort déjà en cours (concentration sur lui) : ses activités sans emplacement servent (déplacer la marque).
  // Lancé par un autre objet (Ennemi juré), la concentration porte sur la copie du sort que dnd5e crée : même identifiant.
  const running = isSpell && Array.from(item.actor?.concentration?.items ?? []).some(i => (i === item)
    || (!!item.system.identifier && (i.system?.identifier === item.system.identifier)));
  // 0.20.0 : un sort que le moteur lancera en rituel d'office (hors combat, sans emplacement — même non préparé avec Savoir rituel,
  // moteur §139) n'est grisé ni « non préparé » ni « pas d'emplacement », et n'ouvre pas le tiroir des niveaux.
  const ritualCast = isSpell && !!activity && (game.modules.get("dnd5e-combat")?.api?.ui?.ritual?.(r.activity ?? activity) === "ritual");
  const needsSlot = !ritualCast && !running && leveled && (r.activity ? slotted(r.activity)
    : acts.length ? (acts.some(slotted) && !acts.some(freeCast)) : !!CONFIG.DND5E.spellcasting[item.system.method]?.slots);
  const castsWithSlot = leveled && (r.activity ? slotted(r.activity) : acts.some(slotted));
  const uses = usesOf(r.activity) ?? usesOf(item) ?? (r.activity ? null : usesOf(activity));
  // 0.20.1 : une arme compte aussi (javelines, dagues) — lancée ou lâchée par darsh-loot, la dernière reste sur la fiche à 0 et la case
  // la lançait encore. Pas une arme naturelle (Attaque à mains nues, griffes).
  const counted = (item.type === "consumable") || ((item.type === "weapon") && (item.system.type?.value !== "natural"));
  const quantity = counted ? (item.system.quantity ?? null) : null;
  const unprepared = isSpell && !ritualCast && !isSpellReady(item);
  const view = {
    ref, kind: r.activity ? "activity" : "item", item, activity: r.activity ?? null, primary: activity,
    name: r.activity ? `${item.name} : ${r.activity.name}` : item.name,
    img: r.activity?.img || item.img,
    cost, spellLevel, needsSlot, uses, quantity, unprepared, moves,
    // §50 : une incantation gratuite reste (Fidèle destrier : Appel de destrier 1/repos long) — le clic passe par le choix d'activité
    // de dnd5e, où le moteur la prend (son §230), au lieu du tiroir des niveaux qui dépense un emplacement.
    freeCast: leveled && !running && !r.activity && acts.some(freeCast),
    canUpcast: !ritualCast && castsWithSlot && !!item.system.canScale,
    ritualCast,
    concentration: !!(item.system.properties?.has?.("concentration") || activity?.duration?.concentration),
    ritual: !!item.system.properties?.has?.("ritual"),
    equipped: item.system.equipped ?? null,
    basic: isBasicAction(item),
    enchantments: enchantmentsOf(item),
    // 0.18.0 : torche, lampe, lanterne, bougie — allumée ou non, temps restant (moteur, SPEC §121).
    light: carriedLightOf(item)
  };
  view.reasons = reasonsFor({ ...view, slots: ctx.slots });
  view.issues = engineState.issues ?? [];
  // Attaques multiples ouvertes par le moteur ce tour : ce qui reste à jouer, ce qui n'a plus rien.
  view.multi = ctx.multi?.left.has(item.uuid) ? "left" : ctx.multi?.spent.has(item.uuid) ? "spent" : null;
  view.upcast = view.canUpcast ? upcastOptions(ctx.slots, spellLevel) : [];
  return view;
}

/* -------------------------------------------- */
/*  Armes                                       */
/* -------------------------------------------- */

/**
 * 0.20.3 : le mode « main secondaire » de l'arme selon dnd5e (une arme Légère : « offhand », « thrown-offhand » pour une arme de
 * lancer), ou null — une arme sans ce mode ne fait pas d'attaque de main secondaire.
 */
export function offhandMode(item) {
  const modes = (item?.system?.attackModes ?? []).map(m => m.value);
  return modes.includes("offhand") ? "offhand" : modes.includes("thrown-offhand") ? "thrown-offhand" : null;
}

/** Armes de l'acteur pour le premier remplissage des jeux d'armes. */
export function weaponsOf(actor) {
  return (actor?.items ?? []).filter(i => i.type === "weapon").map(i => ({
    ref: `Item.${i.id}`,
    equipped: !!i.system.equipped,
    ranged: ["simpleR", "martialR"].includes(i.system.type?.value) || !!i.system.range?.long
  }));
}

/**
 * Passer d'un jeu d'armes à l'autre : équipe les objets du jeu choisi, déséquipe ceux des autres jeux
 * (seulement eux : le reste de l'équipement n'est pas touché). Une seule mise à jour groupée.
 * §52 : N jeux ; `released` — des références sorties du jeu actif (retirées, remplacées) : déséquipées aussi.
 */
export async function equipWeaponSet(actor, sets, active, { released=[] }={}) {
  const idOf = r => r.split(".")[1];
  const want = new Set((sets[active] ?? []).filter(Boolean).map(idOf));
  const other = new Set([...sets.flatMap((set, s) => ((s === active) ? [] : set)), ...released].filter(Boolean).map(idOf));
  const updates = [];
  for ( const id of new Set([...want, ...other]) ) {
    const item = actor.items.get(id);
    if ( !item || !("equipped" in (item.system ?? {})) ) continue;
    const equipped = want.has(id);
    if ( item.system.equipped !== equipped ) updates.push({ _id: id, "system.equipped": equipped });
  }
  if ( updates.length ) await actor.updateEmbeddedDocuments("Item", updates);
}

/** §52 : une arme à deux mains (propriété « two » de dnd5e) — elle prend les deux mains d'un jeu. */
export function isTwoHanded(item) {
  return (item?.type === "weapon") && (item.system.properties?.has?.("two") === true);
}

/**
 * §52 : ce qu'on peut mettre dans un jeu d'armes, pour la fenêtre de configuration : les armes (sans l'attaque à mains nues ni les
 * actions de base que le moteur pose) et les boucliers ; `extra(item)` en ajoute d'autres (une source de lumière portée). Par nom.
 */
export function weaponSetCandidates(actor, extra=() => false) {
  return (actor?.items?.contents ?? Array.from(actor?.items ?? []))
    .filter(i => ((i.type === "weapon") && (i.system.identifier !== "unarmed-strike") && !i.getFlag?.("dnd5e-combat", "basicAction"))
      || ((i.type === "equipment") && (i.system.type?.value === "shield")) || extra(i))
    .sort((a, b) => a.name.localeCompare(b.name));
}
