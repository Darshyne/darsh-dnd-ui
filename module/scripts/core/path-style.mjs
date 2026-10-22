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
