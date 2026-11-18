/**
 * Le tracé des cases du chemin (réglage client `softPath`, apps/canvas.mjs, SPEC §49). Pur.
 */

/** Les choix : aplats du système, pastilles aux bords fondus, petits ronds. */
export const PATH_STYLES = Object.freeze(["flat", "soft", "dots"]);

/** Diamètre d'un petit rond, en part de la hauteur d'une case (demande de l'utilisateur, 2026-10-22). */
export const DOT_SIZE = 1 / 3;

/**
 * Le style lu dans le réglage. Avant la 0.27.0, `softPath` était une case à cocher : vraie → pastilles fondues, fausse → aplats ;
 * une valeur enregistrée alors se relit en booléen ou en texte (« true » / « false »).
 * @param {unknown} value
 * @returns {"flat"|"soft"|"dots"}
 */
export function pathStyleOf(value) {
  if ( (value === true) || (value === "true") ) return "soft";
  if ( (value === false) || (value === "false") ) return "flat";
  return PATH_STYLES.includes(value) ? value : "soft";
}

/**
 * La règle d'un token se montre-t-elle ? En combat, ou hors combat si le réglage le demande. Un module de recherche de chemin
 * (Wayfinder) ne dessine rien lui-même : sa route n'a que cette règle pour se voir, alors elle se montre aussi hors combat le
 * temps qu'un déplacement est planifié (le glisser).
 * @param {{base: boolean, always: boolean, inCombat: boolean, pathfinder: boolean, planned: boolean}} facts
 * @returns {boolean}
 */
export function rulerShown({ base, always, inCombat, pathfinder, planned }) {
  if ( !base ) return false;
  return always || inCombat || (pathfinder && planned);
}
