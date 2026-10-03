/**
 * Échelle et fondu de toute l'interface du module (SPEC §3) : deux variables CSS tenues à jour,
 * `--ddu-scale` (taille propre à chaque composant × adaptation à la fenêtre — posée sur la Frise, le Groupe et la Barre,
 * et sur la racine pour le reste, sans réglage) et `--ddu-fade-opacity`
 * (opacité d'un composant que la souris ne survole pas). Le fondu lui-même est dans la feuille de style.
 */
import { scaleFor, fadeOpacity } from "../core/scale.mjs";
import { MODULE_ID, SCALE_KEYS, setting } from "../shared.mjs";
import { getBar } from "./bar.mjs";
import { getFrieze } from "./frieze.mjs";
import { getParty } from "./party.mjs";

/** Classe posée sur un composant qu'un glisser survole : il reste net (le survol CSS est figé pendant un glisser). */
const AWAKE = "ddu-awake";

/**
 * Recalcule `--ddu-scale` : sur la racine (adaptation à la fenêtre seule) et sur chaque composant (sa taille × cette
 * adaptation). La feuille de style redéclare les tailles dérivées (`--ddu-cell`, portraits) sur chaque composant, pour
 * qu'elles suivent sa propre échelle. La valeur passée prime sur le réglage (appel depuis son `onChange`).
 * @param {object} [options]
 * @param {boolean} [options.auto]
 */
export function applyScale({ auto = setting("scaleAuto") } = {}) {
  const size = { auto, width: window.innerWidth, height: window.innerHeight };
  let changed = setScale(document.documentElement, scaleFor(size));
  changed = setScale(getFrieze()?.element, scaleFor({ ...size, percent: setting("scaleFrieze") })) || changed;
  const party = setScale(getParty()?.element, scaleFor({ ...size, percent: setting("scaleParty") }));
  changed = setScale(getBar()?.element, scaleFor({ ...size, percent: setting("scaleBar") })) || changed;
  if ( party || changed ) getParty()?.place();    // la colonne se centre d'après sa hauteur, qui vient de changer
}

/** Pose `--ddu-scale` sur un élément ; vrai si la valeur a changé. */
function setScale(element, scale) {
  if ( !element ) return false;
  const value = String(scale);
  if ( element.style.getPropertyValue("--ddu-scale") === value ) return false;
  element.style.setProperty("--ddu-scale", value);
  return true;
}

/**
 * 0.14.0 : l'ancien réglage unique « Taille de l'interface » devient la valeur de départ des trois réglages par
 * composant, une fois, sur ce client (aucun des trois encore enregistré).
 */
export async function migrateScale() {
  const legacy = setting("scale");
  if ( legacy === 100 ) return;
  const storage = game.settings.storage.get("client");
  if ( SCALE_KEYS.some(key => storage.getItem(`${MODULE_ID}.${key}`) !== null) ) return;
  for ( const key of SCALE_KEYS ) await game.settings.set(MODULE_ID, key, legacy);
  await game.settings.set(MODULE_ID, "scale", 100);
}

/** Recalcule `--ddu-fade-opacity` (1 = pas de fondu). */
export function applyFade(percent = setting("fadeOpacity")) {
  document.documentElement.style.setProperty("--ddu-fade-opacity", String(fadeOpacity(percent)));
}

/** Au ready, une fois les trois composants posés : suivi de la taille de la fenêtre, réveil au glisser. */
export function startDisplay() {
  window.addEventListener("resize", foundry.utils.debounce(() => applyScale(), 50));

  for ( const element of [getBar()?.element, getParty()?.element, getFrieze()?.element] ) {
    if ( !element ) continue;
    const sleep = () => element.classList.remove(AWAKE);
    element.addEventListener("dragenter", () => element.classList.add(AWAKE));
    element.addEventListener("dragleave", event => {
      if ( !element.contains(event.relatedTarget) ) sleep();
    });
    for ( const type of ["drop", "dragend", "mouseleave"] ) element.addEventListener(type, sleep);
  }
}
