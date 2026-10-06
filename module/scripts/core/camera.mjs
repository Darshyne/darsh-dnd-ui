/**
 * Caméra qui suit un token : ressort amorti à vitesse plafonnée (« SmoothDamp » des moteurs de jeu). La vue part en
 * douceur, ne dépasse jamais `maxSpeed` — loin du token, elle met donc le temps qu'il faut au lieu de traverser la carte
 * d'un coup — et freine sans osciller en arrivant. Pur : appelé à chaque image par apps/canvas.mjs.
 */

/**
 * Un pas d'un axe.
 * @param {number} current     Position actuelle.
 * @param {number} target      Position visée.
 * @param {number} velocity    Vitesse actuelle (unités / s).
 * @param {number} smoothTime  Temps de réponse approximatif (s) : plus il est grand, plus la vue est lente à rejoindre.
 * @param {number} maxSpeed    Vitesse maximale (unités / s).
 * @param {number} dt          Durée de l'image (s).
 * @returns {{ value: number, velocity: number }}
 */
export function smoothDamp(current, target, velocity, smoothTime, maxSpeed, dt) {
  smoothTime = Math.max(0.0001, smoothTime);
  if ( !(dt > 0) ) return { value: current, velocity };
  const omega = 2 / smoothTime;
  const x = omega * dt;
  const exp = 1 / (1 + x + (0.48 * x * x) + (0.235 * x * x * x));
  const maxChange = maxSpeed * smoothTime;
  const change = Math.min(Math.max(current - target, -maxChange), maxChange);
  const clampedTarget = current - change;
  const temp = (velocity + (omega * change)) * dt;
  let nextVelocity = (velocity - (omega * temp)) * exp;
  let value = clampedTarget + ((change + temp) * exp);
  // Pas de dépassement de la cible.
  if ( ((target - current) > 0) === (value > target) ) {
    value = target;
    nextVelocity = (value - target) / dt;
  }
  return { value, velocity: nextVelocity };
}

/**
 * Un pas en deux dimensions, la vitesse maximale s'appliquant à la norme (une diagonale n'est pas plus rapide).
 * @param {{x: number, y: number}} current
 * @param {{x: number, y: number}} target
 * @param {{x: number, y: number}} velocity
 * @returns {{ position: {x: number, y: number}, velocity: {x: number, y: number} }}
 */
export function smoothDamp2D(current, target, velocity, smoothTime, maxSpeed, dt) {
  const dx = target.x - current.x, dy = target.y - current.y;
  const length = Math.hypot(dx, dy);
  // Répartir le plafond entre les axes selon la direction.
  const sx = length ? Math.abs(dx) / length : 1, sy = length ? Math.abs(dy) / length : 1;
  const ax = smoothDamp(current.x, target.x, velocity.x, smoothTime, maxSpeed * sx, dt);
  const ay = smoothDamp(current.y, target.y, velocity.y, smoothTime, maxSpeed * sy, dt);
  return { position: { x: ax.value, y: ay.value }, velocity: { x: ax.velocity, y: ay.velocity } };
}

/** La caméra est-elle arrivée (assez près, presque immobile) ? */
export function settled(current, target, velocity, { distance=1, speed=5 }={}) {
  return (Math.hypot(target.x - current.x, target.y - current.y) <= distance) && (Math.hypot(velocity.x, velocity.y) <= speed);
}

/**
 * La vue doit-elle rester où elle est pendant ce déplacement ? Oui si elle est déjà plus près de l'arrivée que le token :
 * le token vient vers elle, la ramener sur lui serait reculer (demande de l'utilisateur, 2026-10-06).
 * @param {{x: number, y: number}} view    Centre de la vue.
 * @param {{x: number, y: number}} token   Centre du token au départ.
 * @param {{x: number, y: number}} goal    Centre du token à l'arrivée.
 */
export function viewAhead(view, token, goal) {
  return Math.hypot(goal.x - view.x, goal.y - view.y) < Math.hypot(goal.x - token.x, goal.y - token.y);
}
