/**
 * §58 (issue #8) : saisie du tiroir des PV de la Barre. Pur : aucune API Foundry.
 *
 * Le champ accepte un nombre (« 7 »), ou un nombre signé (« -7 » : dégâts, « +5 » : soin). Un signe l'emporte sur le
 * bouton par défaut d'Entrée ; un bouton cliqué (dégâts, soin, PV temporaires) l'emporte sur le signe.
 */

/** Lit le champ : `{ value, sign }` (`sign` -1, +1, ou 0 sans signe), ou null si ce n'est pas un entier positif. */
export function parseAmount(text) {
  const m = /^\s*([+-]?)\s*(\d+)\s*$/.exec(String(text ?? ""));
  if ( !m ) return null;
  const value = Number(m[2]);
  if ( !Number.isSafeInteger(value) || (value <= 0) ) return null;
  return { value, sign: m[1] === "-" ? -1 : (m[1] === "+" ? 1 : 0) };
}

/**
 * Ce qu'il faut faire : `{ kind: "damage" | "heal" | "temp", value }`, ou null. `kind` : le bouton cliqué ; absent
 * (Entrée), le signe décide, et sans signe ce sont des dégâts.
 */
export function planOf(text, kind=null) {
  const amount = parseAmount(text);
  if ( !amount ) return null;
  const chosen = ["damage", "heal", "temp"].includes(kind) ? kind : (amount.sign > 0 ? "heal" : "damage");
  return { kind: chosen, value: amount.value };
}
