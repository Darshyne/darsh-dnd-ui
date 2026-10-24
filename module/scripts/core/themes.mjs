/**
 * Thèmes de couleurs du HUD (SPEC §45) : pur, testable hors du jeu.
 *
 * Toute couleur du CSS passe par une variable `--ddu-<clé>` (styles/darsh-dnd-ui.css) ; un thème donne une valeur à tout ou
 * partie de ces clés, le reste garde sa valeur par défaut — celle du CSS, l'aspect BG3. Les transparences dérivées (puits,
 * ombres, reflets dorés) sont tirées des couleurs de base par `color-mix` dans le CSS : changer `well` assombrit tous les puits.
 *
 * Une couleur se stocke en chaîne CSS : `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb()` ou `rgba()`.
 */

/** Les groupes de l'éditeur, dans l'ordre. */
export const GROUPS = Object.freeze(["frames", "text", "economy", "health", "sides", "buttons", "states", "roll"]);

/**
 * Les couleurs du HUD : clé (`--ddu-<clé>`), groupe, valeur par défaut (celle du CSS : `tests/themes.test.mjs` le vérifie),
 * et `main` pour celles que l'éditeur montre d'emblée (les autres sous « Avancé »).
 */
export const TOKENS = Object.freeze([
  // Cadres et fonds
  { key: "bg", group: "frames", default: "rgba(18, 12, 10, 0.88)", main: true },
  { key: "panel-top", group: "frames", default: "rgba(40, 18, 16, 0.94)", main: true },
  { key: "panel-bottom", group: "frames", default: "rgba(22, 10, 9, 0.96)", main: true },
  { key: "grid", group: "frames", default: "rgba(12, 6, 5, 0.82)", main: true },
  { key: "gold", group: "frames", default: "#c9a45c", main: true },
  { key: "gold-dim", group: "frames", default: "#7d6538", main: true },
  { key: "well", group: "frames", default: "#000" },
  { key: "shade", group: "frames", default: "#000" },
  { key: "glint", group: "frames", default: "#fff" },
  { key: "chip", group: "frames", default: "rgba(20, 14, 8, 0.85)" },
  { key: "toggle", group: "frames", default: "rgba(10, 8, 6, 0.75)" },
  // Texte
  { key: "text", group: "text", default: "#f2e8d5", main: true },
  { key: "text-strong", group: "text", default: "#fff" },
  { key: "text-on-image", group: "text", default: "#f2e8d5" },
  { key: "icon", group: "text", default: "#e8e2d6" },
  { key: "reason", group: "text", default: "#ff7a6e" },
  { key: "magic-text", group: "text", default: "#cf9bff" },
  // Économie d'action
  { key: "action", group: "economy", default: "#3fae4a", main: true },
  { key: "bonus", group: "economy", default: "#e5822a", main: true },
  { key: "reaction", group: "economy", default: "#d9569b", main: true },
  { key: "slot", group: "economy", default: "#8f5bd6", main: true },
  { key: "pact", group: "economy", default: "#6a3aa8" },
  { key: "cantrip", group: "economy", default: "#34c6c9", main: true },
  { key: "movement", group: "economy", default: "#e0b43c", main: true },
  // Santé
  { key: "hurt", group: "health", default: "rgba(170, 16, 24, 0.58)", main: true },
  { key: "heal", group: "health", default: "rgba(70, 200, 90, 0.55)", main: true },
  { key: "temp", group: "health", default: "#4ea3e0", main: true },
  { key: "flash-damage", group: "health", default: "rgba(220, 20, 30, 0.6)" },
  { key: "hostile-bg", group: "health", default: "#3a0a0d" },
  { key: "ward-edge", group: "health", default: "#bfe3ff" },
  { key: "ward-hi", group: "health", default: "#6cc2ff" },
  { key: "ward-lo", group: "health", default: "#1d5f9e" },
  { key: "ward-glow", group: "health", default: "rgba(80, 170, 255, 0.8)" },
  // Camps et tour
  { key: "side-friendly", group: "sides", default: "#d8d4cc", main: true },
  { key: "side-neutral", group: "sides", default: "#d9c46a", main: true },
  { key: "side-hostile", group: "sides", default: "#b3232b", main: true },
  { key: "side-secret", group: "sides", default: "#8a5bbd", main: true },
  { key: "active", group: "sides", default: "#36c9d6", main: true },
  { key: "hand", group: "sides", default: "#f0d060" },
  // Boutons, onglets, séparateurs
  { key: "button", group: "buttons", default: "#1a120c", main: true },
  { key: "button-hover", group: "buttons", default: "#2b1d12" },
  { key: "button-danger", group: "buttons", default: "#300" },
  { key: "separator", group: "buttons", default: "#9b1c1c", main: true },
  { key: "separator-dark", group: "buttons", default: "#5a0c0c" },
  { key: "tab-hi", group: "buttons", default: "#3a2618" },
  { key: "tab-lo", group: "buttons", default: "#1c120b" },
  { key: "tab-default-hi", group: "buttons", default: "#a3262a" },
  { key: "tab-default-lo", group: "buttons", default: "#4a0b0d" },
  { key: "end-hi", group: "buttons", default: "#2f5f78", main: true },
  { key: "end-lo", group: "buttons", default: "#0d2330" },
  { key: "rest-hi", group: "buttons", default: "#5a3a1c" },
  { key: "rest-lo", group: "buttons", default: "#21130a" },
  { key: "d20-hi", group: "buttons", default: "#2a3a52" },
  { key: "d20-lo", group: "buttons", default: "#101820" },
  // États et effets
  { key: "concentration", group: "states", default: "#9fd8ff", main: true },
  { key: "magic", group: "states", default: "#b25cff", main: true },
  { key: "flame", group: "states", default: "#ffb347" },
  { key: "lit-edge", group: "states", default: "rgba(255, 170, 60, 0.9)" },
  { key: "lit-glow", group: "states", default: "rgba(255, 150, 40, 0.6)" },
  { key: "light-bright", group: "states", default: "#ffd65a" },
  { key: "light-dim", group: "states", default: "#c8b98a" },
  { key: "light-dark", group: "states", default: "#7f95c9" },
  { key: "gm-heal", group: "states", default: "#6fd27a" },
  { key: "gm-kill", group: "states", default: "#e05050" },
  // §54 : la fenêtre de jet à la BG3 (jets demandés par le MJ)
  { key: "roll-veil", group: "roll", default: "rgba(4, 3, 6, 0.9)", main: true },
  { key: "roll-panel-hi", group: "roll", default: "#2b3149", main: true },
  { key: "roll-panel-lo", group: "roll", default: "#0b0d15" },
  { key: "roll-die", group: "roll", default: "#4a5170", main: true },
  { key: "roll-die-face", group: "roll", default: "#b9bfd6" },
  { key: "roll-die-edge", group: "roll", default: "#f4f1ff" },
  { key: "roll-die-text", group: "roll", default: "#1b1d2b" },
  { key: "roll-tile-hi", group: "roll", default: "#1d1a2a" },
  { key: "roll-tile-lo", group: "roll", default: "#0e0c16" },
  { key: "roll-success", group: "roll", default: "#5fd38a", main: true },
  { key: "roll-failure", group: "roll", default: "#e0715f", main: true }
]);

export const TOKEN_KEYS = Object.freeze(TOKENS.map(t => t.key));
const KEYS = new Set(TOKEN_KEYS);

/**
 * Les thèmes livrés. Noms libres de droits (décision utilisateur, 2026-10-13) : aucun nom de produit. Un thème ne donne que ce
 * qu'il change ; BG3 ne change rien (les valeurs par défaut du CSS).
 *   gothic          inspiré des journaux d'un module d'horreur gothique : noir, puis fuchsia, puis vert fluo
 *   parchment       inspiré d'un manuel du joueur en version claire : parchemin, rouge sombre, or saturé
 *   parchment-dark  le même en version d'ombre : gris bleuté, or pâle, bordeaux
 */
export const PRESETS = Object.freeze({
  bg3: Object.freeze({}),
  // Hiérarchie de la DA (décision utilisateur, 2026-10-13) : noir > fuchsia > vert fluo. Le noir pour les fonds, le fuchsia pour les
  // cadres et ce qui est magique, le vert fluo en accent (tour en cours, action, déplacement, soin, concentration). Bonus, emplacements
  // et hostiles gardent leur teinte de jeu.
  gothic: Object.freeze({
    "bg": "rgba(8, 6, 8, 0.92)", "panel-top": "rgba(22, 12, 18, 0.95)", "panel-bottom": "rgba(6, 4, 6, 0.97)",
    "grid": "rgba(6, 4, 6, 0.86)", "chip": "rgba(10, 6, 9, 0.88)", "toggle": "rgba(8, 5, 7, 0.82)",
    "gold": "#d6249a", "gold-dim": "#6e1450", "glint": "#ff4fc0",
    "text": "#ece6ea", "icon": "#ece6ea", "reason": "#ff6f8c", "magic-text": "#ff8ad6",
    "action": "#7dff3a", "bonus": "#ff7a1a", "reaction": "#ff4fc0", "slot": "#9b30d9", "pact": "#5a1680",
    "cantrip": "#3affc8", "movement": "#7dff3a",
    "hurt": "rgba(235, 39, 43, 0.55)", "heal": "rgba(125, 255, 58, 0.45)", "temp": "#5aa0ff",
    "flash-damage": "rgba(235, 39, 43, 0.6)", "hostile-bg": "#2a0610",
    "ward-edge": "#d8ffc0", "ward-hi": "#9dff6a", "ward-lo": "#2f7a12", "ward-glow": "rgba(125, 255, 58, 0.7)",
    "side-friendly": "#ece6ea", "side-neutral": "#d9c46a", "side-hostile": "#eb272b", "side-secret": "#d6249a",
    "active": "#7dff3a", "hand": "#ff4fc0",
    "button": "#0e0a0d", "button-hover": "#24101c", "button-danger": "#3a0618",
    "separator": "#d6249a", "separator-dark": "#4a0d36",
    "tab-hi": "#1e1219", "tab-lo": "#0a0609", "tab-default-hi": "#d6249a", "tab-default-lo": "#5e0f44",
    "end-hi": "#2a1020", "end-lo": "#0a0508", "rest-hi": "#2a1020", "rest-lo": "#0a0508", "d20-hi": "#2a1020", "d20-lo": "#0a0508",
    "concentration": "#7dff3a", "magic": "#d6249a", "flame": "#ff7a1a", "lit-edge": "rgba(255, 122, 26, 0.9)",
    "lit-glow": "rgba(255, 122, 26, 0.55)"
  }),
  parchment: Object.freeze({
    "bg": "rgba(241, 234, 215, 0.95)", "panel-top": "rgba(241, 234, 215, 0.97)", "panel-bottom": "rgba(229, 214, 186, 0.97)",
    "grid": "rgba(235, 219, 205, 0.92)", "chip": "rgba(237, 219, 185, 0.94)", "toggle": "rgba(229, 214, 186, 0.9)",
    "gold": "#a8812f", "gold-dim": "#c9a96a", "well": "#8a6a3a", "shade": "#2b1d14", "glint": "#5a0507",
    "text": "#2b1d14", "text-strong": "#fffaf0", "text-on-image": "#fffaf0", "icon": "#5a0507", "reason": "#a3262a", "magic-text": "#6a3aa8",
    "action": "#2f8a38", "bonus": "#c9651a", "reaction": "#b0306f", "slot": "#6a3aa8", "pact": "#4a2a7a",
    "cantrip": "#1f8c8f", "movement": "#a8812f",
    "hurt": "rgba(90, 5, 7, 0.5)", "heal": "rgba(47, 138, 56, 0.45)", "temp": "#2f6fb0",
    "flash-damage": "rgba(160, 20, 24, 0.55)", "hostile-bg": "#5a0507",
    "side-friendly": "#6a5a48", "side-neutral": "#a8812f", "side-hostile": "#5a0507", "side-secret": "#6a3aa8",
    "active": "#1f8c8f", "hand": "#a8812f",
    "button": "#e5d6ba", "button-hover": "#d9c49c", "button-danger": "#5a0507",
    "separator": "#5a0507", "separator-dark": "#8a1a1d",
    "tab-hi": "#eddbb9", "tab-lo": "#d8c39a", "tab-default-hi": "#8a1a1d", "tab-default-lo": "#5a0507",
    "end-hi": "#4f7f96", "end-lo": "#2b5468", "rest-hi": "#a8812f", "rest-lo": "#6a4a1c", "d20-hi": "#5d7591", "d20-lo": "#33475e",
    "concentration": "#2f6fb0", "magic": "#6a3aa8", "flame": "#c9651a",
    "light-bright": "#c99a1a", "light-dim": "#8a7a4a", "light-dark": "#4a5f8a", "gm-heal": "#2f8a38", "gm-kill": "#a3262a"
  }),
  "parchment-dark": Object.freeze({
    "bg": "rgba(13, 11, 11, 0.9)", "panel-top": "rgba(36, 39, 49, 0.95)", "panel-bottom": "rgba(13, 11, 11, 0.97)",
    "grid": "rgba(37, 40, 48, 0.86)", "chip": "rgba(36, 39, 49, 0.9)", "toggle": "rgba(13, 11, 11, 0.8)",
    "gold": "#e3ce9e", "gold-dim": "#9f9275",
    "text": "#f1ebe8", "icon": "#e3ce9e", "hand": "#e6bd6b", "movement": "#e6bd6b",
    "hurt": "rgba(116, 27, 43, 0.6)", "flash-damage": "rgba(237, 28, 36, 0.55)", "hostile-bg": "#44191a",
    "side-hostile": "#c0303a",
    "button": "#1c1e26", "button-hover": "#2c2f3a", "button-danger": "#44191a",
    "separator": "#741b2b", "separator-dark": "#44191a",
    "tab-hi": "#2c2f3a", "tab-lo": "#16181f", "tab-default-hi": "#741b2b", "tab-default-lo": "#44191a",
    "end-hi": "#3d4a63", "end-lo": "#181c26", "rest-hi": "#4b4a44", "rest-lo": "#1e1d1a", "d20-hi": "#3d4a63", "d20-lo": "#181c26"
  })
});

export const PRESET_IDS = Object.freeze(Object.keys(PRESETS));

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(0|1|0?\.\d+|1\.0+))?\s*\)$/i;

/** Une couleur que le thème accepte (pas de nom CSS, pas d'expression : rien d'autre ne peut entrer dans le style). */
export function isColor(value) {
  if ( typeof value !== "string" ) return false;
  const v = value.trim();
  if ( HEX.test(v) ) return true;
  const m = v.match(RGB);
  return !!m && [m[1], m[2], m[3]].every(n => Number(n) <= 255);
}

/** `[r, g, b, a]` (0–255, alpha 0–1) d'une couleur acceptée. */
export function parseColor(value) {
  const v = String(value).trim();
  if ( HEX.test(v) ) {
    let h = v.slice(1);
    if ( h.length <= 4 ) h = [...h].map(c => c + c).join("");
    const n = i => parseInt(h.slice(i, i + 2), 16);
    return [n(0), n(2), n(4), (h.length === 8) ? Math.round((n(6) / 255) * 100) / 100 : 1];
  }
  const m = v.match(RGB);
  if ( !m ) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3]), (m[4] === undefined) ? 1 : Number(m[4])];
}

/** Pour l'éditeur : `{ hex: "#rrggbb", alpha: 0–100 }`. */
export function splitColor(value) {
  const [r, g, b, a] = parseColor(value) ?? [0, 0, 0, 1];
  const hex = `#${[r, g, b].map(n => n.toString(16).padStart(2, "0")).join("")}`;
  return { hex, alpha: Math.round(a * 100) };
}

/** L'inverse : `#rrggbb`, ou `rgba()` si la couleur est translucide. */
export function joinColor(hex, alpha=100) {
  const [r, g, b] = parseColor(hex) ?? [0, 0, 0];
  const a = Math.min(100, Math.max(0, Number(alpha) || 0));
  if ( a >= 100 ) return `#${[r, g, b].map(n => n.toString(16).padStart(2, "0")).join("")}`;
  return `rgba(${r}, ${g}, ${b}, ${a / 100})`;
}

/** Les couleurs d'un thème, nettoyées : clés connues, valeurs acceptées. Rend `{ colors, rejected }`. */
export function cleanColors(colors) {
  const out = {};
  const rejected = [];
  for ( const [key, value] of Object.entries(colors ?? {}) ) {
    if ( KEYS.has(key) && isColor(value) ) out[key] = String(value).trim();
    else rejected.push(key);
  }
  return { colors: out, rejected };
}

/** Toutes les couleurs d'un thème : défauts, puis celles du thème. */
export function fullColors(colors={}) {
  return Object.fromEntries(TOKENS.map(t => [t.key, colors[t.key] ?? t.default]));
}

/** Les couleurs qui diffèrent des défauts (ce qu'on enregistre). */
export function diffColors(colors={}) {
  const defaults = Object.fromEntries(TOKENS.map(t => [t.key, t.default]));
  return Object.fromEntries(Object.entries(colors).filter(([k, v]) => KEYS.has(k) && (normalize(v) !== normalize(defaults[k]))));
}

const normalize = v => JSON.stringify(parseColor(v));

/* -------------------------------------------- */
/*  Export / import                              */
/* -------------------------------------------- */

export const EXPORT_FORMAT = "darsh-dnd-ui-theme";

/** Le fichier d'export d'un thème. */
export function exportTheme({ name, colors }) {
  return { format: EXPORT_FORMAT, version: 1, name: String(name ?? "").trim() || "Theme", colors: diffColors(colors) };
}

/**
 * Lit un fichier de thème (objet déjà analysé). Rend `{ name, colors, rejected }`, ou lève une Error en anglais si ce n'est pas
 * un thème de ce module.
 */
export function importTheme(data) {
  if ( !data || (typeof data !== "object") || (data.format !== EXPORT_FORMAT) ) throw new Error("not a darsh-dnd-ui theme file");
  if ( data.version !== 1 ) throw new Error(`unsupported theme version: ${data.version}`);
  const { colors, rejected } = cleanColors(data.colors);
  return { name: String(data.name ?? "").trim().slice(0, 60) || "Theme", colors, rejected };
}

/* -------------------------------------------- */
/*  Choix du thème en vigueur                    */
/* -------------------------------------------- */

/**
 * Le thème en vigueur pour un utilisateur. `choice` (réglage utilisateur) : "" = celui de la table, un id de thème livré,
 * `custom:<id>` = un thème personnel, `custom:world:<id>` = un thème de la table. `worldChoice` : le thème de la table (id
 * livré, ou `custom:<id>` d'un thème de la bibliothèque de la table). Rend `{ id, colors }` ; un choix inconnu retombe sur
 * celui de la table, puis sur BG3.
 * @param {{ choice: string, worldChoice: string, library: object[], worldLibrary: object[] }} state
 */
export function activeTheme({ choice="", worldChoice="bg3", library=[], worldLibrary=[] }={}) {
  const pick = (id, libraries) => {
    if ( PRESETS[id] ) return { id, colors: { ...PRESETS[id] } };
    const [, world, key] = String(id ?? "").match(/^custom:(world:)?(.+)$/) ?? [];
    for ( const lib of (world ? [worldLibrary] : libraries) ) {
      const found = key && lib.find(t => t?.id === key);
      if ( found ) return { id, colors: cleanColors(found.colors).colors };
    }
    return null;
  };
  return (choice && pick(choice, [library, worldLibrary])) || pick(worldChoice, [worldLibrary]) || { id: "bg3", colors: {} };
}
