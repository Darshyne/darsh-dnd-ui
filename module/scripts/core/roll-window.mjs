/**
 * La fenêtre de jet à la manière de BG3 (SPEC §54, issue #6) : ce qui se calcule sans Foundry — la plage du bonus total
 * (« Bonus total 7~10 ») à partir des tuiles, et le nombre de d20 montrés.
 *
 * Pur : aucune dépendance à Foundry.
 */

const TERM = /([+-])\s*(\d*)d(\d+)|([+-])\s*(\d+)/gi;

/**
 * La plage d'une somme de termes signés : « +3 », « +1d4 », « -1d6 », « +2d4 ».
 * @param {string[]} values
 * @returns {{min: number, max: number}}
 */
export function bonusRange(values) {
  let min = 0;
  let max = 0;
  for ( const raw of values ?? [] ) {
    const text = /^[+-]/.test(String(raw).trim()) ? String(raw).trim() : `+${String(raw).trim()}`;
    for ( const m of text.matchAll(TERM) ) {
      if ( m[3] ) {
        const count = Number(m[2] || 1);
        const faces = Number(m[3]);
        const lo = count;
        const hi = count * faces;
        if ( m[1] === "-" ) { min -= hi; max -= lo; }
        else { min += lo; max += hi; }
      }
      else {
        const n = Number(m[5]) * (m[4] === "-" ? -1 : 1);
        min += n;
        max += n;
      }
    }
  }
  return { min, max };
}

/** « +5 », « +7~10 », « -1~2 » : la plage écrite comme BG3. */
export function rangeText({ min, max }) {
  const signed = n => (n >= 0 ? `+${n}` : `${n}`);
  return (min === max) ? signed(min) : `${signed(min)}~${max}`;
}

/** Deux d20 avec l'Avantage ou le Désavantage, un seul quand les deux s'annulent ou sans rien. */
export function diceShown({ advantage=false, disadvantage=false }) {
  return (advantage !== disadvantage) ? 2 : 1;
}

/**
 * Le mode du jet : forcé par le joueur, sinon ce que donnent le MJ (la demande), le Soutien et le système (fiche, effets, états, règles —
 * lus par le moteur) ; l'Avantage et le Désavantage ensemble s'annulent (PHB 2024).
 * @param {{request?: object, system?: {advantage?: boolean, disadvantage?: boolean}, helped?: boolean, forced?: string|null}} input
 * @returns {{mode: "advantage"|"disadvantage"|"normal", sources: {advantage: string[], disadvantage: string[]}}}  `sources` : d'où vient
 *   chacun (`gm`, `help`, `system`, `forced`).
 */
export function effectiveMode({ request={}, system={}, helped=false, forced=null }={}) {
  if ( (forced === "advantage") || (forced === "disadvantage") ) {
    return { mode: forced, sources: { advantage: forced === "advantage" ? ["forced"] : [], disadvantage: forced === "disadvantage" ? ["forced"] : [] } };
  }
  const advantage = [request.advantage && "gm", helped && "help", system.advantage && "system"].filter(Boolean);
  const disadvantage = [request.disadvantage && "gm", system.disadvantage && "system"].filter(Boolean);
  const mode = (advantage.length && !disadvantage.length) ? "advantage" : (disadvantage.length && !advantage.length) ? "disadvantage" : "normal";
  return { mode, sources: { advantage, disadvantage } };
}
