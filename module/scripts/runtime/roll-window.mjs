/**
 * §54 (issue #6) : quand le MJ demande un jet (moteur ≥ 0.262.0, son SPEC §242), la fenêtre à la manière de BG3 prend la demande
 * chez celui qui lance — réglage client `rollWindow` (settings.mjs, actif par défaut) ; coupé, le moteur ouvre la fenêtre de dnd5e.
 *
 * Dice So Nice, s'il est installé, lance les dés de ce jet comme d'habitude — mais chacun ne voit que son propre jet : sur les autres postes, le
 * hook `diceSoNiceMessagePreProcess` (prévu par Dice So Nice pour qu'un module change sa décision d'animer, son main.js 6.4.4) l'éteint.
 */
import { MODULE_ID } from "../shared.mjs";
import { route } from "./router.mjs";
import { RollWindow, OPEN_WINDOWS } from "../apps/roll-window.mjs";
import { GROUP_ROLL_PROMPT_HOOK, isGroupRollResult } from "../adapter/engine.mjs";

export function registerRollWindow() {
  // Une fenêtre à la fois : une demande qui arrive pendant qu'une autre est ouverte attend sa fermeture (vu en jeu : deux demandes au même
  // personnage se superposaient). Si son délai passe pendant l'attente, le moteur lance et elle ne s'ouvre pas.
  let queue = Promise.resolve();
  route(GROUP_ROLL_PROMPT_HOOK, "BG3 roll window", prompt => {
    if ( prompt.result || !game.settings.get(MODULE_ID, "rollWindow") ) return;
    prompt.result = queue = queue.then(() => (prompt.signal?.aborted ? null : new RollWindow(prompt).run()));
  });
  // Un effet posé, changé ou retiré sur le personnage d'une fenêtre ouverte : ses tuiles et son mode se relisent (au tour suivant de la
  // boucle : l'acteur a alors préparé ses nouvelles données).
  const onEffect = effect => {
    const actor = (effect?.parent instanceof Actor) ? effect.parent : effect?.parent?.actor;
    if ( !actor ) return;
    for ( const w of OPEN_WINDOWS ) if ( w.actor?.uuid === actor.uuid ) setTimeout(() => w.refreshFromActor(), 0);
  };
  for ( const hook of ["createActiveEffect", "updateActiveEffect", "deleteActiveEffect"] ) route(hook, "BG3 roll window: effects", onEffect);
  route("diceSoNiceMessagePreProcess", "requested rolls: only one's own 3D dice", (messageId, interception) => {
    const message = game.messages.get(messageId);
    if ( isGroupRollResult(message) && !message.author?.isSelf ) interception.willTrigger3DRoll = false;
  });
}
