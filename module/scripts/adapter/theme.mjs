/**
 * Thèmes de couleurs (SPEC §45) : lecture et écriture des réglages, application des variables `--ddu-*` sur la racine.
 *
 * Réglages :
 *   themeWorld          (monde)       le thème de la table : un id livré, ou `custom:<id>` d'un thème de `themeWorldLibrary`
 *   themeWorldLibrary   (monde)       les thèmes que le MJ a partagés avec la table : `[{ id, name, colors }]`
 *   theme               (utilisateur) le choix de chacun : "" = celui de la table, un id livré, ou `custom:<id>`
 *   themeLibrary        (utilisateur) les thèmes personnels : `[{ id, name, colors }]`
 * Portée « user » (common/constants.mjs, SETTING_SCOPES.USER) : enregistrée sur le serveur, suit l'utilisateur d'un poste à l'autre.
 */
import { MODULE_ID } from "../shared.mjs";
import { TOKENS, activeTheme, cleanColors, diffColors } from "../core/themes.mjs";

const get = key => game.settings.get(MODULE_ID, key);
const set = (key, value) => game.settings.set(MODULE_ID, key, value);
const list = key => (Array.isArray(get(key)) ? get(key) : []);

/** Ce que l'utilisateur voit : choix, thème de la table, bibliothèques. */
export function themeState() {
  return {
    choice: get("theme") ?? "", worldChoice: get("themeWorld") || "bg3",
    library: list("themeLibrary"), worldLibrary: list("themeWorldLibrary")
  };
}

/** Le thème en vigueur pour cet utilisateur : `{ id, colors }`. */
export const currentTheme = () => activeTheme(themeState());

/** Pose ces couleurs sur la racine (les autres reprennent la valeur du CSS). Rien n'est enregistré. */
export function paintColors(colors={}) {
  const style = document.documentElement.style;
  for ( const { key } of TOKENS ) {
    const value = colors[key];
    if ( value ) style.setProperty(`--ddu-${key}`, value);
    else style.removeProperty(`--ddu-${key}`);
  }
}

/** Applique le thème en vigueur. */
export function applyTheme() {
  paintColors(currentTheme().colors);
}

/** Choisit le thème de cet utilisateur ("" : celui de la table). */
export const chooseTheme = id => set("theme", id ?? "");

/** Le MJ choisit le thème de la table. */
export const chooseWorldTheme = id => set("themeWorld", id || "bg3");

/** Enregistre un thème personnel (nouveau, ou remplacé s'il a cet id). Rend son id `custom:<id>`. */
export async function saveCustomTheme({ id=null, name, colors }, { world=false }={}) {
  const key = world ? "themeWorldLibrary" : "themeLibrary";
  const library = list(key).filter(t => t?.id !== id);
  const theme = { id: id ?? foundry.utils.randomID(), name: String(name).trim().slice(0, 60) || "Theme", colors: diffColors(cleanColors(colors).colors) };
  await set(key, [...library, theme]);
  return `custom:${theme.id}`;
}

/** Retire un thème personnel (ou de la table) ; un choix qui le désignait revient au thème de la table. */
export async function deleteCustomTheme(id, { world=false }={}) {
  const key = world ? "themeWorldLibrary" : "themeLibrary";
  await set(key, list(key).filter(t => t?.id !== id));
  if ( !world && (get("theme") === `custom:${id}`) ) await chooseTheme("");
  if ( world && (get("themeWorld") === `custom:${id}`) ) await chooseWorldTheme("bg3");
}
