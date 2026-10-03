/**
 * Échelle de l'interface (SPEC §3) : le réglage « Taille de l'interface » multiplié, si l'adaptation
 * automatique est active, par un facteur tiré de la taille de la fenêtre.
 *
 * Le facteur vaut 1 dans une fenêtre de 1920 × 1080 (taille pour laquelle les dimensions du thème sont
 * écrites) et suit le côté le plus contraint : une fenêtre large mais basse ne grossit pas l'interface.
 */

/** Fenêtre de référence : celle où `--ddu-scale` vaut 1 sans réglage. */
export const REFERENCE = Object.freeze({ width: 1920, height: 1080 });

/** Bornes du facteur automatique : en dessous les cases deviennent illisibles, au-dessus elles mangent la scène. */
export const AUTO_MIN = 0.6;
export const AUTO_MAX = 2;

/**
 * Facteur automatique pour une fenêtre donnée.
 * @param {number} width    Largeur de la fenêtre (px CSS).
 * @param {number} height   Hauteur de la fenêtre (px CSS).
 * @returns {number}        Entre AUTO_MIN et AUTO_MAX ; 1 si la taille est inconnue.
 */
export function autoFactor(width, height) {
  const w = Number(width);
  const h = Number(height);
  if ( !(w > 0) || !(h > 0) ) return 1;
  const factor = Math.min(w / REFERENCE.width, h / REFERENCE.height);
  return Math.min(AUTO_MAX, Math.max(AUTO_MIN, factor));
}

/**
 * Valeur de `--ddu-scale`.
 * @param {object} options
 * @param {number} [options.percent=100]   Réglage « Taille de l'interface » (%).
 * @param {boolean} [options.auto=false]   Adapter à la taille de la fenêtre.
 * @param {number} [options.width]
 * @param {number} [options.height]
 * @returns {number}                       Arrondie au centième (pas de réécriture du style pour un pixel).
 */
export function scaleFor({ percent = 100, auto = false, width, height } = {}) {
  const manual = (Number(percent) || 100) / 100;
  const scale = manual * (auto ? autoFactor(width, height) : 1);
  return Math.round(scale * 100) / 100;
}

/**
 * Valeur de `--ddu-fade-opacity` pour le réglage « Opacité hors survol » (%).
 * @param {number} percent   10 à 100 ; 100 = pas de fondu.
 * @returns {number}         Entre 0.1 et 1.
 */
export function fadeOpacity(percent) {
  const p = Number(percent);
  if ( !Number.isFinite(p) ) return 1;
  return Math.min(100, Math.max(10, p)) / 100;
}
