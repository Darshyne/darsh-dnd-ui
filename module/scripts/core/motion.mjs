/**
 * Déplacement adouci des tokens : un seul profil de vitesse pour tout le chemin.
 *
 * Le cœur V14 anime un déplacement tronçon par tronçon, chacun à vitesse constante
 * (client/canvas/placeables/token.mjs:4215, une animation enchaînée par point du chemin). Une courbe
 * appliquée à chaque tronçon ferait freiner le token à chaque case ; on calcule donc une courbe pour
 * le chemin entier, puis on en donne à chaque tronçon sa durée et le morceau de courbe qui lui revient.
 *
 * Profil « trapèze adouci » : la vitesse monte de 0 à la vitesse normale en `ramp` ms (demi-cosinus),
 * reste à la vitesse normale, puis redescend de même. Le token garde donc sa vitesse habituelle en
 * croisière ; le chemin entier ne dure que `(montée + descente) / 2` ms de plus.
 */

/** Distance parcourue (en ms de vitesse normale) au temps `t` d'une montée de durée `a`. */
function rampDistance(t, a) {
  if ( a <= 0 ) return 0;
  return (t / 2) - ((a / (2 * Math.PI)) * Math.sin(Math.PI * t / a));
}

/**
 * @param {number} linear     Durée du chemin à vitesse constante (ms).
 * @param {number} ramp       Durée voulue de la montée et de la descente (ms).
 * @param {{accel?: boolean, decel?: boolean}} [options]  Sans montée : le token roule déjà (suite
 *                            d'un déplacement) ; sans descente : un autre tronçon va suivre.
 * @returns {{duration: number, at: (t: number) => number, inverse: (u: number) => number}}
 *   `at(t)` : distance parcourue (en ms de vitesse normale) au temps réel `t` ; `inverse` : l'inverse.
 */
export function profile(linear, ramp, { accel = true, decel = true } = {}) {
  let a1 = accel ? Math.max(ramp, 0) : 0;
  let a2 = decel ? Math.max(ramp, 0) : 0;
  // Chemin trop court pour atteindre la vitesse normale : les rampes se raccourcissent ensemble.
  if ( (a1 + a2) / 2 > linear ) {
    const k = (a1 + a2) > 0 ? (2 * linear) / (a1 + a2) : 0;
    a1 *= k;
    a2 *= k;
  }
  const duration = linear + ((a1 + a2) / 2);
  const at = t => {
    if ( t <= 0 ) return 0;
    if ( t >= duration ) return linear;
    if ( t < a1 ) return rampDistance(t, a1);
    if ( t <= duration - a2 ) return (a1 / 2) + (t - a1);
    return linear - rampDistance(duration - t, a2);
  };
  const inverse = u => {
    if ( u <= 0 ) return 0;
    if ( u >= linear ) return duration;
    let lo = 0;
    let hi = duration;
    for ( let n = 0; n < 40; n++ ) {
      const mid = (lo + hi) / 2;
      if ( at(mid) < u ) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };
  return { duration, at, inverse };
}

/**
 * Découpe un profil sur les tronçons d'un chemin.
 * @param {number[]} lengths   Durée de chaque tronçon à vitesse constante (ms).
 * @param {number} ramp        Durée de la montée et de la descente (ms).
 * @param {{accel?: boolean, decel?: boolean}} [options]
 * @returns {{duration: number, easing: (pt: number) => number}[]}  Par tronçon : sa durée réelle et
 *   la fonction qui convertit la part de temps écoulée en part de tronçon parcourue.
 */
export function segmentPlan(lengths, ramp, options) {
  const linear = lengths.reduce((s, l) => s + l, 0);
  const p = profile(linear, ramp, options);
  const plan = [];
  let u0 = 0;
  let t0 = 0;
  for ( const length of lengths ) {
    const u1 = u0 + length;
    const t1 = p.inverse(u1);
    const span = t1 - t0;
    const start = t0;
    const from = u0;
    plan.push({
      duration: span,
      easing: (length > 0) && (span > 0)
        ? pt => Math.min(Math.max((p.at(start + (pt * span)) - from) / length, 0), 1)
        : pt => pt
    });
    u0 = u1;
    t0 = t1;
  }
  return plan;
}
