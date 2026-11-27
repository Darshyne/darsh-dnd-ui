/**
 * Colour themes (SPEC §45): reading and writing the settings, applying the `--ddu-*` variables on the root.
 *
 * Settings:
 *   themeWorld          (world) the table's theme: a shipped id, or `custom:<id>` of a theme of `themeWorldLibrary`
 *   themeWorldLibrary   (world) the themes the GM shared with the table: `[{ id, name, colors }]`
 *   theme               (user)  each one's choice: "" = the table's, a shipped id, or `custom:<id>`
 *   themeLibrary        (user)  personal themes: `[{ id, name, colors }]`
 * Scope « user » (common/constants.mjs, SETTING_SCOPES.USER): stored on the server, follows the user from one machine to another.
 */
import { MODULE_ID } from "../shared.mjs";
import { MATERIALS, TOKENS, activeTheme, cleanColors, diffColors } from "../core/themes.mjs";

const get = key => game.settings.get(MODULE_ID, key);
const set = (key, value) => game.settings.set(MODULE_ID, key, value);
const list = key => (Array.isArray(get(key)) ? get(key) : []);

/**
 * Foundry's light / dark scheme for the interface (where the HUD lives): the class Foundry puts on `#interface`
 * (client/game.mjs:1888-1892, from `core.uiConfig.colorScheme.interface`, else the browser's preference), then `body`.
 */
export function interfaceScheme() {
  const el = document.getElementById("interface");
  for ( const node of [el, document.body] ) {
    if ( node?.classList.contains("theme-light") ) return "light";
    if ( node?.classList.contains("theme-dark") ) return "dark";
  }
  return "dark";
}

/** What the user sees: choice, table theme, libraries, interface scheme. */
export function themeState() {
  return {
    choice: get("theme") ?? "", worldChoice: get("themeWorld") || "bg3",
    library: list("themeLibrary"), worldLibrary: list("themeWorldLibrary"), scheme: interfaceScheme()
  };
}

/** This user's theme in force: `{ id, colors, css?, material? }`. */
export const currentTheme = () => activeTheme(themeState());

/** The CSS `--ddu-material` value of a material: its images, by route (on The Forge too), files of Foundry / dnd5e. */
function materialValue(material) {
  const layers = MATERIALS[material];
  if ( !layers ) return null;
  return layers.map(l => `url("${foundry.utils.getRoute(l.src)}") ${l.position} / ${l.size} ${l.repeat}`).join(", ");
}

/**
 * Sets these colours on the root (the others go back to the CSS value). Nothing is saved.
 * `material`: a texture of `MATERIALS` laid under the main surfaces, or none.
 */
export function paintColors(colors={}, { material=null }={}) {
  const style = document.documentElement.style;
  for ( const { key } of TOKENS ) {
    const value = colors[key];
    if ( value ) style.setProperty(`--ddu-${key}`, value);
    else style.removeProperty(`--ddu-${key}`);
  }
  const texture = materialValue(material);
  if ( texture ) style.setProperty("--ddu-material", texture);
  else style.removeProperty("--ddu-material");
}

/** Paints a theme as `activeTheme` returns it: a system theme by its dnd5e variables and material. */
export const paintTheme = theme => paintColors(theme.css ?? theme.colors, { material: theme.material });

/** Applies the theme in force. */
export function applyTheme() {
  paintTheme(currentTheme());
}

/** Chooses this user's theme ("": the table's). */
export const chooseTheme = id => set("theme", id ?? "");

/** The GM chooses the table's theme. */
export const chooseWorldTheme = id => set("themeWorld", id || "bg3");

/** Saves a personal theme (new, or replaced if it has this id). Returns its id `custom:<id>`. */
export async function saveCustomTheme({ id=null, name, colors }, { world=false }={}) {
  const key = world ? "themeWorldLibrary" : "themeLibrary";
  const library = list(key).filter(t => t?.id !== id);
  const theme = { id: id ?? foundry.utils.randomID(), name: String(name).trim().slice(0, 60) || "Theme", colors: diffColors(cleanColors(colors).colors) };
  await set(key, [...library, theme]);
  return `custom:${theme.id}`;
}

/** Removes a personal (or table) theme; a choice that named it goes back to the table's theme. */
export async function deleteCustomTheme(id, { world=false }={}) {
  const key = world ? "themeWorldLibrary" : "themeLibrary";
  await set(key, list(key).filter(t => t?.id !== id));
  if ( !world && (get("theme") === `custom:${id}`) ) await chooseTheme("");
  if ( world && (get("themeWorld") === `custom:${id}`) ) await chooseWorldTheme("bg3");
}
