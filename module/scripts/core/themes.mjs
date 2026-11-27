/**
 * HUD colour themes (SPEC §45): pure, testable outside the game.
 *
 * Every CSS colour goes through a `--ddu-<key>` variable (styles/darsh-dnd-ui.css); a theme gives a value to all or some of
 * these keys, the rest keep their default — the CSS one, the BG3 look. Derived transparencies (wells, shadows, golden glints)
 * are drawn from the base colours by `color-mix` in the CSS: changing `well` darkens every well.
 *
 * A colour is stored as a CSS string: `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb()` or `rgba()`.
 */

/** The editor's groups, in order. */
export const GROUPS = Object.freeze(["frames", "text", "economy", "health", "sides", "buttons", "states", "roll"]);

/**
 * The HUD colours: key (`--ddu-<key>`), group, default value (the CSS one: `tests/themes.test.mjs` checks it), and `main`
 * for those the editor shows at once (the others under « Advanced »).
 */
export const TOKENS = Object.freeze([
  // Frames and backgrounds
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
  // Text
  { key: "text", group: "text", default: "#f2e8d5", main: true },
  { key: "text-strong", group: "text", default: "#fff" },
  { key: "text-on-image", group: "text", default: "#f2e8d5" },
  { key: "icon", group: "text", default: "#e8e2d6" },
  { key: "reason", group: "text", default: "#ff7a6e" },
  { key: "magic-text", group: "text", default: "#cf9bff" },
  // Action economy
  { key: "action", group: "economy", default: "#3fae4a", main: true },
  { key: "bonus", group: "economy", default: "#e5822a", main: true },
  { key: "reaction", group: "economy", default: "#d9569b", main: true },
  { key: "slot", group: "economy", default: "#8f5bd6", main: true },
  { key: "pact", group: "economy", default: "#6a3aa8" },
  { key: "cantrip", group: "economy", default: "#34c6c9", main: true },
  { key: "movement", group: "economy", default: "#e0b43c", main: true },
  // Health
  { key: "hurt", group: "health", default: "rgba(170, 16, 24, 0.58)", main: true },
  { key: "heal", group: "health", default: "rgba(70, 200, 90, 0.55)", main: true },
  { key: "temp", group: "health", default: "#4ea3e0", main: true },
  { key: "flash-damage", group: "health", default: "rgba(220, 20, 30, 0.6)" },
  { key: "hostile-bg", group: "health", default: "#3a0a0d" },
  { key: "ward-edge", group: "health", default: "#bfe3ff" },
  { key: "ward-hi", group: "health", default: "#6cc2ff" },
  { key: "ward-lo", group: "health", default: "#1d5f9e" },
  { key: "ward-glow", group: "health", default: "rgba(80, 170, 255, 0.8)" },
  // Sides and turn
  { key: "side-friendly", group: "sides", default: "#d8d4cc", main: true },
  { key: "side-neutral", group: "sides", default: "#d9c46a", main: true },
  { key: "side-hostile", group: "sides", default: "#b3232b", main: true },
  { key: "side-secret", group: "sides", default: "#8a5bbd", main: true },
  { key: "active", group: "sides", default: "#36c9d6", main: true },
  { key: "hand", group: "sides", default: "#f0d060" },
  // Issue #35: the hourglass ring of whoever the table waits for (white, like the engine's hourglass; no pink: user's request).
  { key: "awaiting", group: "sides", default: "#ffffff" },
  // Buttons, tabs, separators
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
  // States and effects
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
  // §54: the BG3-style roll window (rolls requested by the GM)
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
 * The shipped themes. Royalty-free names (user's decision, 2026-10-13): no product name. A theme only gives what it changes;
 * BG3 changes nothing (the CSS defaults). The dnd5e system themes are added below (`SYSTEM_THEMES`).
 *   gothic          inspired by a gothic horror module's journals: black, then fuchsia, then neon green
 *   parchment       inspired by a light player's handbook: parchment, dark red, saturated gold
 *   parchment-dark  the same in a shadow version: bluish gray, pale gold, burgundy
 */
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(0|1|0?\.\d+|1\.0+))?\s*\)$/i;

const PRESETS_MUTABLE = {
  bg3: Object.freeze({}),
  // Art-direction hierarchy (user's decision, 2026-10-13): black > fuchsia > neon green. Black for backgrounds, fuchsia for frames
  // and what is magical, neon green as accent (current turn, action, movement, healing, concentration). Bonus, slots and hostiles
  // keep their game hue.
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
};

/* -------------------------------------------- */
/*  dnd5e system themes                          */
/* -------------------------------------------- */

/**
 * Themes painted with the dnd5e system's own palette (user's request, 2026-11-27). Each colour names a variable that dnd5e
 * declares on `:root` (dnd5e.css, `@layer variables`, 6.1.1 lines 21-133) and is read by the browser at runtime, so the HUD
 * follows the system if it changes its palette; the value after the name is what dnd5e 6.1.1 gives it, used as fallback
 * (system missing, editor, tests). Nothing is copied from dnd5e: names only. A colour may also be a plain value, for the few
 * HUD meanings dnd5e has no colour for (reaction, bonus action).
 *   [variable, fallback, alpha]  or  plain colour
 * `material` names the texture the CSS lays under the main surfaces (`--ddu-material`, see `MATERIALS`).
 */
const SYSTEM_DEFS = {
  "dnd5e-dark": {
    material: "denim",
    colors: {
      "bg": ["--dnd5e-color-dark-gray", "#0d0b0b", 0.9], "panel-top": ["--dnd5e-color-blue-gray-2", "#252830", 0.95],
      "panel-bottom": ["--dnd5e-color-dark-gray", "#0d0b0b", 0.96], "grid": ["--dnd5e-color-blue-gray-1", "#242731", 0.9],
      "chip": ["--dnd5e-color-blue-gray-2", "#252830", 0.92], "toggle": ["--dnd5e-color-dark-gray", "#0d0b0b", 0.82],
      "gold": ["--dnd5e-color-gold", "#9f9275"], "gold-dim": ["--dnd5e-color-blue-gray-3", "#434857"],
      "text": ["--dnd5e-color-blue-white", "#cfd2da"], "text-on-image": ["--dnd5e-color-parchment", "#f1ebe8"],
      "icon": ["--dnd5e-color-blue-white", "#cfd2da"], "reason": "#f0786e", "magic-text": "#b9a5d8",
      "slot": ["--dnd5e-color-sc-2", "#776493"], "pact": ["--dnd5e-color-sc-1", "#433754"], "movement": ["--dnd5e-color-gold", "#9f9275"],
      "hurt": ["--dnd5e-color-maroon", "#741b2b", 0.62], "heal": ["--dnd5e-color-hp-2", "#3ba55d", 0.5],
      "hostile-bg": ["--dnd5e-color-crimson", "#44191a"], "side-hostile": ["--dnd5e-color-red", "#ed1c24"],
      "side-secret": ["--dnd5e-color-sc-2", "#776493"], "hand": ["--dnd5e-color-gold", "#9f9275"],
      "button": ["--dnd5e-color-blue-gray-1", "#242731"], "button-hover": ["--dnd5e-color-blue-gray-4", "#333742"],
      "button-danger": ["--dnd5e-color-crimson", "#44191a"],
      "separator": ["--dnd5e-color-maroon", "#741b2b"], "separator-dark": ["--dnd5e-color-crimson", "#44191a"],
      "tab-hi": ["--dnd5e-color-blue-gray-4", "#333742"], "tab-lo": ["--dnd5e-color-blue-gray-1", "#242731"],
      "tab-default-hi": ["--dnd5e-color-maroon", "#741b2b"], "tab-default-lo": ["--dnd5e-color-crimson", "#44191a"],
      "end-hi": ["--dnd5e-color-blue-gray-3", "#434857"], "end-lo": ["--dnd5e-color-blue-gray-1", "#242731"],
      "rest-hi": ["--dnd5e-color-olive", "#4b4a44"], "rest-lo": ["--dnd5e-color-iron-gray", "#313131"],
      "d20-hi": ["--dnd5e-color-blue-gray-3", "#434857"], "d20-lo": ["--dnd5e-color-blue-gray-1", "#242731"],
      "concentration": ["--dnd5e-color-blue-white", "#cfd2da"], "magic": ["--dnd5e-color-purple", "#c44dff"],
      "gm-heal": ["--dnd5e-color-hp-2", "#3ba55d"], "gm-kill": ["--dnd5e-color-red", "#ed1c24"],
      "roll-panel-hi": ["--dnd5e-color-blue-gray-4", "#333742"], "roll-panel-lo": ["--dnd5e-color-dark-gray", "#0d0b0b"],
      "roll-die": ["--dnd5e-color-blue-gray-3", "#434857"], "roll-die-face": ["--dnd5e-color-blue-white", "#cfd2da"],
      "roll-tile-hi": ["--dnd5e-color-blue-gray-2", "#252830"], "roll-tile-lo": ["--dnd5e-color-blue-gray-1", "#242731"],
      "roll-success": ["--dnd5e-color-hp-2", "#3ba55d"], "roll-failure": ["--dnd5e-color-red", "#ed1c24"]
    }
  },
  "dnd5e-light": {
    material: "paper",
    colors: {
      "bg": ["--dnd5e-color-parchment", "#f1ebe8", 0.95], "panel-top": ["--dnd5e-color-card", "#f8f4f1", 0.97],
      "panel-bottom": ["--dnd5e-color-parchment", "#f1ebe8", 0.97], "grid": ["--dnd5e-color-groove", "#eeede0", 0.93],
      "chip": ["--dnd5e-color-card", "#f8f4f1", 0.95], "toggle": ["--dnd5e-color-faint", "#c9c7b8", 0.9],
      "gold": ["--dnd5e-color-gold", "#9f9275"], "gold-dim": ["--dnd5e-color-beige", "#b5b3a4"],
      "well": ["--dnd5e-color-tan", "#7a7971"], "shade": ["--dnd5e-color-dark", "#191813"], "glint": ["--dnd5e-color-maroon", "#741b2b"],
      "text": ["--dnd5e-color-dark", "#191813"], "text-strong": ["--dnd5e-color-card", "#f8f4f1"],
      "text-on-image": ["--dnd5e-color-card", "#f8f4f1"], "icon": ["--dnd5e-color-maroon", "#741b2b"],
      "reason": ["--dnd5e-color-failure", "#6e0000"], "magic-text": ["--dnd5e-color-sc-1", "#433754"],
      "action": ["--dnd5e-color-green", "#205b15"], "bonus": ["--dnd5e-color-note-warn", "#9b6903"], "reaction": "#a3306a",
      "slot": ["--dnd5e-color-sc-2", "#776493"], "pact": ["--dnd5e-color-sc-1", "#433754"],
      "cantrip": ["--dnd5e-color-application-temp", "#007f7f"], "movement": ["--dnd5e-color-gold", "#9f9275"],
      "hurt": ["--dnd5e-color-maroon", "#741b2b", 0.5], "heal": ["--dnd5e-color-hp-3", "#276d3c", 0.45],
      "temp": ["--dnd5e-color-note-info", "#5c87b9"], "flash-damage": ["--dnd5e-color-failure", "#6e0000", 0.55],
      "hostile-bg": ["--dnd5e-color-maroon", "#741b2b"],
      "side-friendly": ["--dnd5e-color-tan", "#7a7971"], "side-neutral": ["--dnd5e-color-note-warn", "#9b6903"],
      "side-hostile": ["--dnd5e-color-maroon", "#741b2b"], "side-secret": ["--dnd5e-color-sc-2", "#776493"],
      "active": ["--dnd5e-color-application-temp", "#007f7f"], "hand": ["--dnd5e-color-gold", "#9f9275"],
      "button": ["--dnd5e-color-groove", "#eeede0"], "button-hover": ["--dnd5e-color-faint", "#c9c7b8"],
      "button-danger": ["--dnd5e-color-crimson", "#44191a"],
      "separator": ["--dnd5e-color-maroon", "#741b2b"], "separator-dark": ["--dnd5e-color-crimson", "#44191a"],
      "tab-hi": ["--dnd5e-color-card", "#f8f4f1"], "tab-lo": ["--dnd5e-color-faint", "#c9c7b8"],
      "tab-default-hi": ["--dnd5e-color-maroon", "#741b2b"], "tab-default-lo": ["--dnd5e-color-crimson", "#44191a"],
      "end-hi": ["--dnd5e-color-note-info", "#5c87b9"], "end-lo": ["--dnd5e-color-blue-gray-3", "#434857"],
      "rest-hi": ["--dnd5e-color-gold", "#9f9275"], "rest-lo": ["--dnd5e-color-olive", "#4b4a44"],
      "d20-hi": ["--dnd5e-color-blue-gray-3", "#434857"], "d20-lo": ["--dnd5e-color-blue-gray-1", "#242731"],
      "concentration": ["--dnd5e-color-note-info", "#5c87b9"], "magic": ["--dnd5e-color-sc-2", "#776493"],
      "flame": ["--dnd5e-color-note-warn", "#9b6903"],
      "light-bright": ["--dnd5e-color-note-warn", "#9b6903"], "light-dim": ["--dnd5e-color-tan", "#7a7971"],
      "light-dark": ["--dnd5e-color-note-info", "#5c87b9"],
      "gm-heal": ["--dnd5e-color-application-healing", "#3c7f58"], "gm-kill": ["--dnd5e-color-application-damage", "#9c5b47"],
      "roll-veil": ["--dnd5e-color-dark", "#191813", 0.8],
      "roll-panel-hi": ["--dnd5e-color-card", "#f8f4f1"], "roll-panel-lo": ["--dnd5e-color-faint", "#c9c7b8"],
      "roll-die": ["--dnd5e-color-tan", "#7a7971"], "roll-die-face": ["--dnd5e-color-groove", "#eeede0"],
      "roll-die-edge": ["--dnd5e-color-dark", "#191813"], "roll-die-text": ["--dnd5e-color-dark", "#191813"],
      "roll-tile-hi": ["--dnd5e-color-card", "#f8f4f1"], "roll-tile-lo": ["--dnd5e-color-groove", "#eeede0"],
      "roll-success": ["--dnd5e-color-success", "#006c00"], "roll-failure": ["--dnd5e-color-failure", "#6e0000"]
    }
  }
};

/** The theme that follows Foundry's light / dark interface setting: `dnd5e-dark` or `dnd5e-light`. */
export const AUTO_THEME = "dnd5e-auto";

/** Textures of the system themes: what `--ddu-material` holds (paths resolved by the adapter, files never copied). */
export const MATERIALS = Object.freeze({
  // Foundry core's denim pattern over dnd5e's dark gray: dnd5e's `--dnd5e-background-texture-denim`.
  denim: Object.freeze([{ src: "ui/denim075.png", repeat: "repeat", position: "top left", size: "auto" }]),
  // dnd5e's gray paper, its `--dnd5e-background-texture-paper-gray` (light windows).
  paper: Object.freeze([
    { src: "systems/dnd5e/ui/texture-gray1.webp", repeat: "no-repeat", position: "top left", size: "auto" },
    { src: "systems/dnd5e/ui/texture-gray2.webp", repeat: "no-repeat", position: "bottom right", size: "auto" }
  ])
});

/** `[variable, fallback, alpha]` → the CSS value naming the dnd5e variable, and the plain fallback colour. */
function systemColor(def) {
  if ( typeof def === "string" ) return { css: def, plain: def };
  const [name, fallback, alpha=1] = def;
  const ref = `var(${name}, ${fallback})`;
  if ( alpha >= 1 ) return { css: ref, plain: fallback };
  const [r, g, b] = parseColor(fallback);
  const pct = Math.round(alpha * 100);
  return { css: `color-mix(in srgb, ${ref} ${pct}%, transparent)`, plain: `rgba(${r}, ${g}, ${b}, ${alpha})` };
}

/** The system themes, built: `{ id: { material, css: { key: "var(…)" }, colors: { key: plain colour } } }`. */
export const SYSTEM_THEMES = Object.freeze(Object.fromEntries(Object.entries(SYSTEM_DEFS).map(([id, { material, colors }]) => {
  const built = Object.entries(colors).map(([key, def]) => [key, systemColor(def)]);
  return [id, Object.freeze({
    material,
    css: Object.freeze(Object.fromEntries(built.map(([k, v]) => [k, v.css]))),
    colors: Object.freeze(Object.fromEntries(built.map(([k, v]) => [k, v.plain])))
  })];
})));

/** The dnd5e variables the system themes name (tests check each exists in the installed dnd5e). */
export const SYSTEM_VARIABLES = Object.freeze([...new Set(Object.values(SYSTEM_DEFS)
  .flatMap(t => Object.values(t.colors)).filter(Array.isArray).map(([name]) => name))]);

/** The system theme an id stands for, given Foundry's interface scheme (`"dark"` | `"light"`); null if not a system theme. */
export function systemTheme(id, scheme="dark") {
  if ( id === AUTO_THEME ) return SYSTEM_THEMES[(scheme === "light") ? "dnd5e-light" : "dnd5e-dark"];
  return SYSTEM_THEMES[id] ?? null;
}

Object.assign(PRESETS_MUTABLE, {
  "dnd5e-dark": SYSTEM_THEMES["dnd5e-dark"].colors,
  "dnd5e-light": SYSTEM_THEMES["dnd5e-light"].colors,
  [AUTO_THEME]: SYSTEM_THEMES["dnd5e-dark"].colors
});
export const PRESETS = Object.freeze(PRESETS_MUTABLE);

export const PRESET_IDS = Object.freeze(Object.keys(PRESETS));


/** A colour the theme accepts (no CSS name, no expression: nothing else can enter the style). */
export function isColor(value) {
  if ( typeof value !== "string" ) return false;
  const v = value.trim();
  if ( HEX.test(v) ) return true;
  const m = v.match(RGB);
  return !!m && [m[1], m[2], m[3]].every(n => Number(n) <= 255);
}

/** `[r, g, b, a]` (0–255, alpha 0–1) of an accepted colour. */
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

/** For the editor: `{ hex: "#rrggbb", alpha: 0–100 }`. */
export function splitColor(value) {
  const [r, g, b, a] = parseColor(value) ?? [0, 0, 0, 1];
  const hex = `#${[r, g, b].map(n => n.toString(16).padStart(2, "0")).join("")}`;
  return { hex, alpha: Math.round(a * 100) };
}

/** The reverse: `#rrggbb`, or `rgba()` if the colour is translucent. */
export function joinColor(hex, alpha=100) {
  const [r, g, b] = parseColor(hex) ?? [0, 0, 0];
  const a = Math.min(100, Math.max(0, Number(alpha) || 0));
  if ( a >= 100 ) return `#${[r, g, b].map(n => n.toString(16).padStart(2, "0")).join("")}`;
  return `rgba(${r}, ${g}, ${b}, ${a / 100})`;
}

/** A theme's colours, cleaned: known keys, accepted values. Returns `{ colors, rejected }`. */
export function cleanColors(colors) {
  const out = {};
  const rejected = [];
  for ( const [key, value] of Object.entries(colors ?? {}) ) {
    if ( KEYS.has(key) && isColor(value) ) out[key] = String(value).trim();
    else rejected.push(key);
  }
  return { colors: out, rejected };
}

/** All the colours of a theme: defaults, then the theme's. */
export function fullColors(colors={}) {
  return Object.fromEntries(TOKENS.map(t => [t.key, colors[t.key] ?? t.default]));
}

/** The colours that differ from the defaults (what is saved). */
export function diffColors(colors={}) {
  const defaults = Object.fromEntries(TOKENS.map(t => [t.key, t.default]));
  return Object.fromEntries(Object.entries(colors).filter(([k, v]) => KEYS.has(k) && (normalize(v) !== normalize(defaults[k]))));
}

const normalize = v => JSON.stringify(parseColor(v));

/* -------------------------------------------- */
/*  Export / import                              */
/* -------------------------------------------- */

export const EXPORT_FORMAT = "darsh-dnd-ui-theme";

/** A theme's export file. */
export function exportTheme({ name, colors }) {
  return { format: EXPORT_FORMAT, version: 1, name: String(name ?? "").trim() || "Theme", colors: diffColors(colors) };
}

/**
 * Reads a theme file (already parsed object). Returns `{ name, colors, rejected }`, or throws an Error if it is not a theme
 * of this module.
 */
export function importTheme(data) {
  if ( !data || (typeof data !== "object") || (data.format !== EXPORT_FORMAT) ) throw new Error("not a darsh-dnd-ui theme file");
  if ( data.version !== 1 ) throw new Error(`unsupported theme version: ${data.version}`);
  const { colors, rejected } = cleanColors(data.colors);
  return { name: String(data.name ?? "").trim().slice(0, 60) || "Theme", colors, rejected };
}

/* -------------------------------------------- */
/*  Theme in force                               */
/* -------------------------------------------- */

/**
 * A user's theme in force. `choice` (user setting): "" = the table's, a shipped theme id, `custom:<id>` = a personal theme,
 * `custom:world:<id>` = a table theme. `worldChoice`: the table's theme (shipped id, or `custom:<id>` of a theme of the table's
 * library). `scheme`: Foundry's interface scheme (`"dark"` | `"light"`), for the « dnd5e auto » theme. Returns
 * `{ id, colors, css?, material? }`; an unknown choice falls back on the table's, then on BG3.
 * @param {{ choice: string, worldChoice: string, library: object[], worldLibrary: object[], scheme: string }} state
 */
export function activeTheme({ choice="", worldChoice="bg3", library=[], worldLibrary=[], scheme="dark" }={}) {
  const pick = (id, libraries) => {
    // A dnd5e system theme also gives `css` (values naming the system's variables) and its `material`.
    const system = systemTheme(id, scheme);
    if ( system ) return { id, colors: { ...system.colors }, css: { ...system.css }, material: system.material };
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
