/**
 * Lecture du groupe pour la colonne de portraits (SPEC §6).
 * - Invocations : le moteur marque le token (`flags["dnd5e-combat"].summonedBy` = uuid d'un effet de
 *   l'invocateur, moteur adapter/summons.mjs:76) ; dnd5e marque l'acteur invoqué
 *   (`flags.dnd5e.summon.origin` = uuid de l'objet d'invocation, documents/activity/summon.mjs:145).
 * - Inspiration héroïque : system.attributes.inspiration (data/actor/character.mjs:83).
 */
import { iconEffectsOf } from "./actor.mjs";

/**
 * Personnages du groupe.
 * @param {"assigned"|"owned"} mode  assigned : `user.character` des joueurs ; owned : en plus, tout
 *                                   personnage qu'un joueur possède.
 * @param {boolean} connectedOnly    Seulement ceux dont un joueur est connecté.
 * @returns {Actor[]}
 */
export function partyActors({ mode = "owned", connectedOnly = false } = {}) {
  const players = game.users.filter(u => !u.isGM && (!connectedOnly || u.active));
  const set = new Set();
  for ( const user of players ) if ( user.character ) set.add(user.character);
  if ( mode === "owned" ) {
    for ( const actor of game.actors ) {
      if ( actor.type !== "character" || actor.isPolymorphed ) continue;
      if ( players.some(u => actor.testUserPermission(u, "OWNER")) ) set.add(actor);
    }
  }
  // Un personnage transformé (Forme sauvage) : sa forme prend sa place dans la colonne, tant qu'elle a un token
  // sur la scène ; sinon on garde l'original (une forme restée sans token n'est qu'un reste).
  return [...set].filter(a => !a.isPolymorphed).map(a => currentFormOf(a) ?? a);
}

/** La forme actuelle d'un acteur d'origine (acteur transformé dont un token est sur la scène), ou null. */
export function currentFormOf(original) {
  const scene = canvas.scene;
  if ( !scene ) return null;
  for ( const token of scene.tokens ) {
    const actor = token.actor;
    if ( actor?.isPolymorphed && (actor.getFlag("dnd5e", "originalActor") === original.id) ) return actor;
  }
  return null;
}

/** Acteur qui a invoqué ce token (moteur ou dnd5e), ou null. */
export function summonerOf(tokenDoc) {
  const effectUuid = tokenDoc.getFlag?.("dnd5e-combat", "summonedBy");
  if ( effectUuid ) {
    const effect = fromUuidSync(effectUuid, { strict: false });
    const owner = effect?.parent?.documentName === "Item" ? effect.parent.parent : effect?.parent;
    if ( owner ) return owner;
  }
  const origin = tokenDoc.actor?.getFlag?.("dnd5e", "summon.origin");
  if ( origin ) {
    const item = fromUuidSync(origin, { strict: false });
    if ( item?.parent ) return item.parent;
  }
  return null;
}

/**
 * Compagnons d'un personnage sur la scène affichée : ses invocations, et les autres tokens que ses
 * joueurs possèdent (familier, monture…) sans être eux-mêmes des membres du groupe.
 * @param {Actor} actor
 * @param {Set<Actor>} members
 * @returns {TokenDocument[]}
 */
export function companionsOf(actor, members) {
  const scene = canvas.scene;
  if ( !scene ) return [];
  const owners = game.users.filter(u => !u.isGM && actor.testUserPermission(u, "OWNER"));
  const out = [];
  for ( const token of scene.tokens ) {
    const tActor = token.actor;
    if ( !tActor || members.has(tActor) || tActor.id === actor.id ) continue;
    const summoner = summonerOf(token);
    if ( summoner ) {
      if ( summoner.id === actor.id ) out.push(token);
      continue;
    }
    if ( tActor.type === "character" ) continue;
    if ( owners.length && owners.every(u => tActor.testUserPermission(u, "OWNER")) ) out.push(token);
  }
  return out;
}

/** Couleur du joueur qui possède ce personnage (le premier trouvé). */
export function ownerColor(actor) {
  const user = game.users.find(u => !u.isGM && u.character?.id === actor.id)
    ?? game.users.find(u => !u.isGM && actor.testUserPermission(u, "OWNER"));
  return user?.color?.css ?? user?.color ?? null;
}

/** Personnage que ce client contrôle en ce moment (celui qu'affichera la Barre). */
export function currentActor() {
  const controlled = canvas.tokens?.controlled ?? [];
  if ( controlled.length ) return controlled.at(-1).actor ?? null;
  return game.user.character ?? null;
}

/** Token de ce personnage sur la scène affichée (le premier). */
export function tokenOnScene(actor) {
  return actor?.getActiveTokens?.(false, true)?.[0] ?? null;
}

/**
 * Combattant de ce personnage dans le combat affiché, ou null.
 * Un acteur de token non lié (trois Goules d'une même fiche) porte l'id de sa fiche : on le reconnaît par son token,
 * sinon toutes les copies rendraient le combattant de la première. Un acteur lié présent plusieurs fois : celui dont
 * c'est le tour, sinon le premier.
 */
export function combatantOf(actor, combat) {
  if ( !combat || !actor ) return null;
  if ( actor.isToken ) return combat.combatants.find(c => c.tokenId === actor.token?.id) ?? null;
  const all = combat.combatants.filter(c => (c.actorId === actor.id) || (c.actor?.id === actor.id));
  const linked = all.filter(c => c.token?.actorLink);
  const pool = linked.length ? linked : all;
  return pool.find(c => c.id === combat.combatant?.id) ?? pool[0] ?? null;
}

/**
 * Effets à montrer à côté du portrait (ceux dont le token montre l'icône), la concentration marquée.
 * @returns {{id: string, name: string, img: string, concentration: boolean, duration: string}[]}
 */
export function effectsOf(actor) {
  return iconEffectsOf(actor).map(e => ({
    id: e.id,
    name: e.name,
    img: e.img,
    concentration: !!e.statuses?.has("concentrating"),
    duration: e.duration?.label ?? ""
  }));
}

export function hasInspiration(actor) {
  return !!actor?.system?.attributes?.inspiration;
}
