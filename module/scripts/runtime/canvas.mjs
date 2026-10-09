/**
 * Plateau : branchement du tracé adouci, du déplacement adouci et de la caméra qui suit (apps/canvas.mjs).
 */
import { installRuler, installMotion, followToken, quietCorePan, refreshRulers, stopCameraFollow } from "../apps/canvas.mjs";
import { route } from "./router.mjs";

/** À l'`init` : le cœur gèle ensuite les actions de déplacement (client/game.mjs:812). */
export function registerCanvas() {
  installMotion();
  for ( const hook of ["combatStart", "updateCombat", "deleteCombat", "createCombatant", "deleteCombatant"] ) {
    route(hook, "token ruler: combat or not", refreshRulers);
  }
  route("moveToken", "camera: follow own token", (document, movement, operation, user) =>
    followToken(document, movement, user));
  route("preUpdateToken", "camera: skip the core quick pan", quietCorePan);
  route("canvasTearDown", "camera: stop following", stopCameraFollow);
}

/** Au `setup` : classe de règle déjà posée par le système, plateau pas encore dessiné. */
export function setupCanvas() {
  installRuler();
}
