/**
 * Règles d'affichage des cases de la Barre, pures (testées par Vitest) : filtres, emplacements pour la
 * surcharge, raisons d'une case grisée qui tiennent à la case elle-même. Aucune règle de jeu n'est décidée ici :
 * le tour, le budget et les états sont jugés par le moteur (adapter/engine.mjs `issuesOf`), et une case grisée
 * reste cliquable (SPEC §5.5).
 */

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];

export function roman(n) {
  return ROMAN[n] ?? String(n);
}

/**
 * La case passe-t-elle le filtre choisi ?
 * @param {{cost?: string, spellLevel?: number|null}} cell
 * @param {null|"action"|"bonus"|"reaction"|"cantrip"|{level: number}} filter
 *   Un niveau montre les sorts de ce niveau et en dessous (BG3), sorts mineurs compris.
 */
export function matchesFilter(cell, filter) {
  if ( !filter ) return true;
  if ( typeof filter === "object" ) {
    return Number.isInteger(cell.spellLevel) && cell.spellLevel <= filter.level;
  }
  if ( filter === "cantrip" ) return cell.spellLevel === 0;
  return cell.cost === filter;
}

/**
 * Emplacements utilisables pour lancer un sort de ce niveau (surcharge comprise), du plus bas au plus haut.
 * @param {{key: string, level: number, value: number, max: number}[]} slots
 */
export function upcastOptions(slots, level) {
  return slots.filter(s => s.level >= level && s.value > 0 && s.max > 0)
    .sort((a, b) => (a.level - b.level) || (a.key === "pact" ? 1 : -1));
}

/**
 * Raisons propres à la case pour lesquelles elle est grisée (clés de traduction DDU.Reason.*). Celles du tour (pas
 * son tour, action dépensée, Neutralisé…) viennent du moteur, déjà traduites.
 * @param {object} c
 * @param {{value: number, max: number}|null} [c.uses]
 * @param {number|null} [c.quantity]
 * @param {number|null} [c.spellLevel]
 * @param {boolean} [c.needsSlot]
 * @param {boolean} [c.unprepared]
 * @param {object[]} [c.slots]           Emplacements de l'acteur.
 * @returns {string[]}
 */
export function reasonsFor(c) {
  const out = [];
  if ( c.uses && c.uses.max > 0 && c.uses.value <= 0 ) out.push("NoUses");
  if ( (c.quantity !== null) && (c.quantity !== undefined) && (c.quantity <= 0) ) out.push("NoQuantity");
  if ( c.unprepared ) out.push("Unprepared");
  if ( c.needsSlot && (c.spellLevel > 0) && !upcastOptions(c.slots ?? [], c.spellLevel).length ) out.push("NoSlot");
  return out;
}
