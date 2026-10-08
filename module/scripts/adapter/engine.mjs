/**
 * Seul fichier qui connaît le moteur de combat `dnd5e-combat` (SPEC §4, §8.2), dont ce module dépend depuis la 0.8.0
 * (`relationships.requires`). On ne lit que ce qu'il publie : `api.active`, `api.reason` et son API d'interface
 * `api.ui` (moteur ≥ 0.146.0, son SPEC §40.1) ; jamais un import de ses fichiers, plus aucun calcul refait ici.
 * Le moteur peut être installé mais en veille (Midi-QOL, dnd5e < 6) : tout rend alors null, et l'interface se passe
 * de budget, d'anneau de déplacement et de raisons.
 */
import { log } from "../shared.mjs";

const ENGINE_ID = "dnd5e-combat";

/** Le moteur est-il actif dans ce monde (installé, activé, pas en veille à cause de Midi / dnd5e < 6) ? */
export function engineActive() {
  const mod = game.modules.get(ENGINE_ID);
  return !!(mod?.active && mod.api?.active);
}

/** Pourquoi le moteur est en veille, s'il l'est (`midi-qol`, `system`), sinon null. */
export function engineReason() {
  return game.modules.get(ENGINE_ID)?.api?.reason ?? null;
}

/** Une lecture de `api.ui` ; null si le moteur est en veille, trop ancien, ou si la lecture échoue. */
function read(name, ...args) {
  if ( !engineActive() ) return null;
  const fn = game.modules.get(ENGINE_ID).api.ui?.[name];
  if ( typeof fn !== "function" ) return null;
  try {
    return fn(...args) ?? null;
  } catch ( err ) {
    log.warn(`moteur : api.ui.${name} a échoué`, err);
    return null;
  }
}

/**
 * Lumière où se tient un token, calculée par le moteur : lumière vive / faible / ténèbres (magiques), et ce que ça
 * change.
 * @returns {{key: string, icon: string, name: string, tooltip: string, enabled: boolean}|null}
 */
export function lightOf(token) {
  return token ? read("light", token) : null;
}

/**
 * Budget du tour d'un combattant, jugé par le moteur (action encore ouverte par des attaques à donner, réaction déjà
 * prise ce tour-ci).
 * @returns {{action: boolean, bonus: boolean, reaction: boolean, attacksLeft: number}|null}
 *   null si le moteur est en veille, hors combat, ou si ce client ne doit pas voir ce budget (créature du MJ).
 */
export function budgetOf(combatant) {
  if ( !combatant || !(game.user.isGM || combatant.isOwner) ) return null;
  const b = read("budget", combatant);
  return b ? { action: b.action, bonus: b.bonus, reaction: b.reaction, attacksLeft: b.attacks.left } : null;
}

/**
 * Déplacement du tour d'un token (anneau autour de Fin du tour) : ce qui reste réellement selon le moteur (Foncer,
 * escaliers, relevé, victime traînée, tour achevé par un ordre), dans l'unité de la grille.
 * @returns {{spent: number, allowed: number, left: number, ratio: number}|null}  null hors combat ou sans moteur.
 */
export function movementOf(token) {
  const m = token ? read("movement", token) : null;
  if ( !m ) return null;
  return { spent: m.spent, allowed: m.allowance, left: m.left, ratio: m.allowance > 0 ? Math.min(1, m.left / m.allowance) : 0 };
}

/**
 * Ce qui cloche si l'activité était utilisée maintenant, selon le moteur (tour, budget, emplacement déjà lancé, Silence,
 * Rage, état Neutralisé…) : des phrases déjà traduites. null si le moteur est en veille.
 * @returns {string[]|null}
 */
export function issuesOf(activity) {
  return activity ? read("issues", activity) : null;
}

/**
 * Ce que le token en main (le seul contrôlé, à soi) peut faire de ce token : les entrées du menu contextuel du moteur
 * (clic droit sur le canevas) — suivre, se faire suivre, observer, et celles des modules voisins (« Échanger » de Darsh
 * Loot). Moteur ≥ 0.147.0 (`api.ui.tokenMenu`, son SPEC §41.4) ; vide sinon, ou sans token en main.
 * @returns {{icon: string, label: string, run: (event?: Event) => void}[]}
 */
export function tokenMenuOf(token) {
  const entries = token ? read("tokenMenu", token) : null;
  return Array.isArray(entries) ? entries : [];
}

/**
 * Une zone déplaçable déjà posée par cette activité (Rayon de lune) : l'utiliser la déplace, sans emplacement. Moteur ≥ 0.198.4
 * (`api.ui.movableZone`, son SPEC §111) ; faux sinon.
 */
export function movableZoneOf(activity) {
  return activity ? read("movableZone", activity) === true : false;
}

/**
 * Réserves actives qui absorbent les dégâts (Égide arcanique) : points restants et maximum. Moteur ≥ 0.198.1
 * (`api.ui.wards`, son SPEC §108) ; vide sinon.
 * @returns {{name: string, img: string, identifier: string, value: number, max: number}[]}
 */
export function wardsOf(actor) {
  const wards = actor ? read("wards", actor) : null;
  return Array.isArray(wards) ? wards : [];
}

/**
 * Attaques multiples ouvertes ce tour par l'acteur : uuids des items encore jouables et de ceux qui n'ont plus rien.
 * @returns {{left: Set<string>, spent: Set<string>}|null}  null sans plan ouvert.
 */
export function multiattackOf(actor) {
  const m = actor ? read("multiattackLeft", actor) : null;
  return m ? { left: new Set(m.left), spent: new Set(m.spent) } : null;
}
