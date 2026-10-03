/**
 * Lecture du combat pour la Frise. Rien n'est copié : tout se lit sur le Combat du cœur à chaque rendu.
 * Cœur V14 lu sur place : Combat#turns / #turn / #started (client/documents/combat.mjs:70,488),
 * Combatant#visible, #isDefeated, #isOwner ; tracker natif pour les gestes (combat-tracker.mjs:555-672).
 */
import { hasPlayed } from "../core/initiative.mjs";

/** Le combat affiché par ce client (celui du tracker natif). */
export function viewedCombat() {
  return game.combats?.viewed ?? null;
}

/**
 * Doit-on montrer la Frise pour ce combat ?
 * MJ : dès qu'il y a des combattants ; joueurs : une fois le combat démarré (ou avant, si le monde le veut).
 */
export function friezeWanted(combat, { prepToPlayers = false } = {}) {
  if ( !combat || !combat.turns?.length ) return false;
  if ( combat.scene && canvas.scene && combat.scene.id !== canvas.scene.id ) return false;
  if ( game.user.isGM ) return true;
  return combat.started || prepToPlayers;
}

/**
 * Combattants à montrer, dans l'ordre du cœur.
 * @returns {{combatant: Combatant, index: number, active: boolean, played: boolean}[]}
 */
export function entriesOf(combat, { hideDefeated = false } = {}) {
  const out = [];
  combat.turns.forEach((combatant, index) => {
    if ( !combatant.visible ) return;             // caché : les joueurs ne le voient pas (le MJ, si)
    if ( hideDefeated && combatant.isDefeated && !game.user.isGM ) return;
    out.push({
      combatant,
      index,
      active: combat.started && index === combat.turn,
      played: hasPlayed(index, combat.turn, combat.started)
    });
  });
  return out;
}

/** Nom montré à ce client : celui du combattant, sauf créature du MJ au nom masqué. */
export function nameFor(combatant) {
  if ( game.user.isGM || combatant.isOwner ) return combatant.name;
  const token = combatant.token;
  const M = CONST.TOKEN_DISPLAY_MODES;
  if ( !token || [M.HOVER, M.ALWAYS].includes(token.displayName) ) return combatant.name;
  return "???";
}

/** « Niv. 5 » pour un PJ, « FP 2 » pour un PNJ (le FP seulement pour le MJ et les propriétaires). */
export function subtitleFor(combatant) {
  const actor = combatant.actor;
  if ( !actor ) return "";
  if ( actor.type === "character" ) {
    const level = actor.system.details?.level;
    return level ? game.i18n.format("DDU.Frieze.Level", { level }) : "";
  }
  if ( !(game.user.isGM || combatant.isOwner) ) return "";
  const cr = actor.system.details?.cr;
  if ( cr === null || cr === undefined ) return "";
  const label = cr === 0.125 ? "1/8" : cr === 0.25 ? "1/4" : cr === 0.5 ? "1/2" : String(cr);
  return game.i18n.format("DDU.Frieze.CR", { cr: label });
}

/** L'initiative est-elle montrée à ce client pour ce combattant ? */
export function initiativeVisible(combatant, { enemyInitiative = true } = {}) {
  if ( game.user.isGM || combatant.isOwner ) return true;
  return enemyInitiative;
}

/** Le token du combattant est-il visible sur le canevas de ce client (règle du tracker natif) ? */
export function tokenVisible(combatant) {
  const token = combatant.token?.object;
  return !!(token && canvas.ready && combatant.sceneId === canvas.scene?.id && token.visible);
}

/** Basculer « vaincu » comme le tracker natif (combat-tracker.mjs:667). */
export async function toggleDefeated(combatant) {
  const isDefeated = !combatant.isDefeated;
  await combatant.update({ defeated: isDefeated });
  await combatant.actor?.toggleStatusEffect(CONFIG.specialStatusEffects.DEFEATED, { overlay: true, active: isDefeated });
}

/**
 * Lancer l'initiative d'un combattant. Un joueur passe par le dialogue dnd5e (avantage, bonus :
 * Actor5e#rollInitiativeDialog, documents/actor/actor.mjs:1909) ; le MJ lance directement.
 */
export function rollInitiativeFor(combat, combatant, event) {
  if ( !game.user.isGM && combatant.actor ) return combatant.actor.rollInitiativeDialog({ event });
  return combat.rollInitiative([combatant.id]);
}
