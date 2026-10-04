/**
 * Plateau : branchement du tracé adouci, du déplacement adouci et de la caméra qui suit (apps/canvas.mjs).
 */
import { installRuler, installMotion, followToken, refreshRulers } from "../apps/canvas.mjs";
import { route } from "./router.mjs";

/** À l'`init` : le cœur gèle ensuite les actions de déplacement (client/game.mjs:812). */
export function registerCanvas() {
  installMotion();
  for ( const hook of ["combatStart", "updateCombat", "deleteCombat", "createCombatant", "deleteCombatant"] ) {
    route(hook, "règle des tokens : combat ou non", refreshRulers);
  }
  route("moveToken", "caméra : suivre son token", (document, movement, operation, user) =>
    followToken(document, movement, user));
}

/** Au `setup` : classe de règle déjà posée par le système, plateau pas encore dessiné. */
export function setupCanvas() {
  installRuler();
}
