/**
 * Ordre du Groupe, pur (testé par Vitest). L'ordre choisi par le MJ est une liste d'ids ; les membres
 * absents de la liste viennent après, par nom ; le personnage du joueur qui regarde passe en tête.
 */

/**
 * @param {{id: string, name: string}[]} members
 * @param {string[]} saved          Ordre enregistré (ids).
 * @param {string|null} firstId     Membre à mettre en tête (le personnage du joueur), ou null.
 * @returns {{id: string, name: string}[]}
 */
export function orderMembers(members, saved = [], firstId = null) {
  const rank = new Map(saved.map((id, i) => [id, i]));
  const sorted = [...members].sort((a, b) => {
    const ra = rank.has(a.id) ? rank.get(a.id) : Infinity;
    const rb = rank.has(b.id) ? rank.get(b.id) : Infinity;
    if ( ra !== rb ) return ra - rb;
    return a.name.localeCompare(b.name);
  });
  if ( !firstId ) return sorted;
  const i = sorted.findIndex(m => m.id === firstId);
  if ( i > 0 ) sorted.unshift(...sorted.splice(i, 1));
  return sorted;
}

/**
 * Nouvel ordre enregistré après avoir déplacé un membre.
 * @param {string[]} visible   Ordre affiché (ids), tel que le MJ le voit.
 * @param {string} id          Membre déplacé.
 * @param {number} toIndex     Sa place voulue dans la liste sans lui.
 * @returns {string[]}
 */
export function moveMember(visible, id, toIndex) {
  const list = visible.filter(x => x !== id);
  if ( list.length === visible.length ) return [...visible];
  list.splice(Math.max(0, Math.min(toIndex, list.length)), 0, id);
  return list;
}

/**
 * Icônes d'effets à montrer à côté d'un portrait : la concentration d'abord, puis les autres ;
 * au-delà de `max`, le reste est compté.
 * @param {{id: string, concentration?: boolean}[]} effects
 * @returns {{shown: object[], rest: object[], more: number}}
 */
export function effectColumn(effects, max = 3) {
  const sorted = [...effects].sort((a, b) => Number(!!b.concentration) - Number(!!a.concentration));
  const rest = sorted.slice(max);
  return { shown: sorted.slice(0, max), rest, more: rest.length };
}
