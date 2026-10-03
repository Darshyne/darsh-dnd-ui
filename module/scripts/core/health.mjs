/**
 * Lecture des points de vie, pure : aucune référence à Foundry ni à dnd5e (testée par Vitest).
 * Donne la hauteur du voile rouge d'un portrait (SPEC §7.3) selon ce que le spectateur a le droit de voir.
 */

/** Paliers de santé, du meilleur au pire. « bloodied » = « en sang », terme de règle 2024. */
export const TIERS = ["unhurt", "hurt", "bloodied", "critical", "down"];

/** Seuil (en % des PV max) sous lequel on est « critique ». */
export const CRITICAL_PCT = 25;

/** Hauteur de voile montrée pour chaque palier quand on ne doit pas donner les PV exacts. */
export const TIER_VEIL = { unhurt: 0, hurt: 0.25, bloodied: 0.6, critical: 0.85, down: 1 };

/** Politiques d'affichage des PV d'une créature qu'on ne possède pas (réglage de monde). */
export const POLICIES = ["exact", "tiers", "none"];

/**
 * Normalise des PV bruts.
 * @param {{value?: number, max?: number, temp?: number, bloodied?: number}} hp
 *   `max` = PV max effectifs ; `bloodied` = seuil « en sang » en % (dnd5e : 50 par défaut).
 */
export function readHealth(hp = {}) {
  const max = Math.max(0, Number(hp.max) || 0);
  const value = Math.min(Math.max(0, Number(hp.value) || 0), max || Infinity);
  const temp = Math.max(0, Number(hp.temp) || 0);
  const bloodied = Number.isFinite(Number(hp.bloodied)) ? Number(hp.bloodied) : 50;
  const pct = max > 0 ? (value / max) * 100 : 100;
  return { value, max, temp, bloodied, pct, lost: max > 0 ? 1 - value / max : 0 };
}

/** Palier d'une santé normalisée. Une créature sans PV max n'est jamais blessée. */
export function tierOf(health) {
  if ( health.max <= 0 ) return "unhurt";
  if ( health.value <= 0 ) return "down";
  if ( health.pct <= CRITICAL_PCT ) return "critical";
  if ( health.pct <= health.bloodied ) return "bloodied";
  if ( health.pct < 100 ) return "hurt";
  return "unhurt";
}

/**
 * Ce que le portrait montre.
 * @param {object} health   Retour de readHealth.
 * @param {"exact"|"tiers"|"none"} policy
 * @returns {{tier: string, veil: number, numbers: boolean}}
 *   `veil` ∈ [0, 1] : part du portrait couverte de rouge, depuis le bas.
 */
export function veilFor(health, policy = "exact") {
  const tier = tierOf(health);
  if ( policy === "exact" ) return { tier, veil: clamp01(health.lost), numbers: true };
  if ( policy === "tiers" ) return { tier, veil: TIER_VEIL[tier], numbers: false };
  return { tier: tier === "down" ? "down" : "unhurt", veil: tier === "down" ? 1 : 0, numbers: false };
}

/**
 * Sens d'un changement de PV, pour le flash du portrait : "damage", "heal" ou null.
 * Les PV temporaires comptent : en perdre, c'est encaisser.
 */
export function changeOf(before, after) {
  if ( !before || !after ) return null;
  const a = before.value + before.temp;
  const b = after.value + after.temp;
  if ( b < a ) return "damage";
  if ( after.value > before.value ) return "heal";
  return null;
}

function clamp01(n) {
  return Math.min(1, Math.max(0, n));
}
