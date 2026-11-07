/**
 * §62 (issue #9) : l'onglet de la Barre retenu par personnage, sur ce client. Pur : la mémoire est un objet
 * `{ [clé du personnage]: onglet }` gardé dans le réglage client caché `barTabs`.
 */
import { TABS } from "./layout.mjs";

/** Tous les onglets de la Barre : la vue par défaut, les onglets générés, Personnalisé. */
export const BAR_TABS = Object.freeze(["default", ...TABS, "custom"]);

/**
 * L'onglet à montrer quand la Barre passe à ce personnage.
 * @param {object} memory     Le réglage `barTabs`.
 * @param {string|null} key   La clé du personnage (id de l'acteur qui porte la disposition).
 * @param {boolean} enabled   Le réglage « Se souvenir de l'onglet choisi ».
 * @returns {{tab: string, stale: boolean}}  stale : la valeur retenue n'est plus un onglet (à oublier).
 */
export function rememberedTab(memory, key, enabled) {
  if ( !enabled || !key ) return { tab: "default", stale: false };
  const saved = memory?.[key];
  if ( saved === undefined || saved === null ) return { tab: "default", stale: false };
  if ( !BAR_TABS.includes(saved) ) return { tab: "default", stale: true };
  return { tab: saved, stale: false };
}

/**
 * La mémoire après un choix d'onglet. La vue par défaut n'est pas écrite (elle est l'absence de choix) : la clé est retirée.
 * @returns {object}  Un nouvel objet ; la mémoire reçue n'est pas modifiée.
 */
export function rememberTab(memory, key, tab) {
  const next = { ...(memory ?? {}) };
  if ( !key ) return next;
  if ( (tab === "default") || !BAR_TABS.includes(tab) ) delete next[key];
  else next[key] = tab;
  return next;
}
