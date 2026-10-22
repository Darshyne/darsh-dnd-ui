/**
 * La présélection du combattant actif à chaque tour (runtime/frieze.mjs, SPEC §48). Pur.
 */

/** Les choix du MJ (réglage de monde `friezeAutoSelectGM`). */
export const GM_SELECT_MODES = Object.freeze(["none", "npc", "all"]);

/**
 * Le token dont c'est le tour doit-il être sélectionné sur ce client ? Le MJ suit son réglage (`none` / `npc` : seulement un
 * combattant sans joueur propriétaire / `all`) ; un joueur, sa case `friezeAutoSelect`, pour ses seuls combattants.
 * @param {{isGM: boolean, gmMode: string, playerOn: boolean, isOwner: boolean, isNPC: boolean}} state
 */
export function autoSelectsTurn({ isGM, gmMode, playerOn, isOwner, isNPC }) {
  if ( !isOwner ) return false;
  if ( isGM ) return (gmMode === "all") || ((gmMode === "npc") && isNPC);
  return !!playerOn;
}
