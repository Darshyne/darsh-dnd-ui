/**
 * Ordre du tour, pur (testé par Vitest). La Frise ne garde aucun ordre à elle : elle réécrit des valeurs
 * d'initiative et laisse le cœur retrier (Combat#setupTurns, tri décroissant, égalité départagée par id).
 */

/** Pas de départage quand deux voisins ont la même valeur. */
export const STEP = 0.1;

const round1 = n => Math.round(n * 10) / 10;
const rolled = v => typeof v === "number" && Number.isFinite(v);

/**
 * Valeur à donner à un combattant posé entre deux voisins.
 * @param {number|null} above   Initiative de celui qui jouera juste avant (null : il sera premier).
 * @param {number|null} below   Initiative de celui qui jouera juste après (null : il sera dernier).
 * @returns {number|null}       null quand il n'y a aucun repère (personne n'a d'initiative).
 */
export function valueBetween(above, below) {
  const a = rolled(above) ? above : null;
  const b = rolled(below) ? below : null;
  if ( a === null && b === null ) return null;
  if ( a === null ) return Math.floor(b) + 1;
  if ( b === null ) return Math.ceil(a) - 1;
  if ( a <= b ) return a; // pas de place : on s'aligne sur le précédent, reorder repousse la suite
  const mid = Math.floor((a + b) / 2);
  if ( mid > b && mid < a ) return mid;       // un entier tient entre les deux
  const half = round1((a + b) / 2);
  if ( half > b && half < a ) return half;    // sinon une décimale
  return (a + b) / 2;
}

/**
 * Déplace un combattant dans l'ordre du tour.
 * @param {{id: string, initiative: number|null}[]} order   Ordre actuel (celui de combat.turns).
 * @param {string} id                                       Combattant déplacé.
 * @param {number} toIndex                                  Sa place voulue dans le nouvel ordre.
 * @returns {{id: string, initiative: number}[]}            Mises à jour minimales (vide : rien à faire).
 */
export function reorder(order, id, toIndex) {
  const from = order.findIndex(c => c.id === id);
  if ( from < 0 ) return [];
  const list = order.map(c => ({ ...c }));
  const [moved] = list.splice(from, 1);
  const to = Math.max(0, Math.min(toIndex, list.length));
  if ( to === from ) return [];
  list.splice(to, 0, moved);

  const value = valueBetween(list[to - 1]?.initiative ?? null, nextRolled(list, to + 1));
  if ( value === null ) return [];
  const updates = new Map();
  if ( value !== moved.initiative ) updates.set(moved.id, value);
  moved.initiative = value;

  // Ceux d'après doivent rester strictement en dessous (le cœur départagerait une égalité par id).
  for ( let i = to + 1; i < list.length; i++ ) {
    const c = list[i];
    if ( !rolled(c.initiative) ) break;
    const prev = list[i - 1].initiative;
    if ( c.initiative < prev ) break;
    c.initiative = round1(prev - STEP);
    updates.set(c.id, c.initiative);
  }
  return [...updates].map(([cid, initiative]) => ({ id: cid, initiative }));
}

function nextRolled(list, index) {
  const v = list[index]?.initiative;
  return rolled(v) ? v : null;
}

/**
 * A-t-il déjà joué ce round ? (combat démarré, placé avant le combattant actif).
 * @param {number} index        Sa place dans combat.turns.
 * @param {number|null} turn    combat.turn.
 * @param {boolean} started     combat.started.
 */
export function hasPlayed(index, turn, started) {
  return !!started && turn !== null && index < turn;
}
