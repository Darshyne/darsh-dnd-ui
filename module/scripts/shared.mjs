export const MODULE_ID = "darsh-dnd-ui";

/** Réglages de taille, un par composant (Frise, Groupe, Barre). */
export const SCALE_KEYS = Object.freeze(["scaleFrieze", "scaleParty", "scaleBar"]);

export const log = {
  info: (...a) => console.log(`${MODULE_ID} |`, ...a),
  warn: (...a) => console.warn(`${MODULE_ID} |`, ...a),
  error: (...a) => console.error(`${MODULE_ID} |`, ...a)
};

/** Traduction d'une clé du module (`DDU.x` → `DDU.x`). */
export function loc(key, data) {
  const full = `DDU.${key}`;
  return data ? game.i18n.format(full, data) : game.i18n.localize(full);
}

export function setting(key) {
  return game.settings.get(MODULE_ID, key);
}
