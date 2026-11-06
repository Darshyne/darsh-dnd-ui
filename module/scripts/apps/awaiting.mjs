/**
 * Issue #35 (moteur §381) : le sablier sur les portraits du Groupe et les cases de la Frise. Posé et retiré sans redessiner le composant :
 * chaque élément porte `data-token-id` / `data-actor-id`, le badge va dans son cadre. La liste vient du moteur (`awaitingOf`), qui
 * décide ce que ce client peut voir ; ici, rien n'est calculé.
 */

import { awaitedKeys, awaitedNames } from "../core/awaiting.mjs";
import { awaitingOf } from "../adapter/engine.mjs";
import { loc } from "../shared.mjs";

const BADGE = "ddu-awaiting";

/**
 * Pose ou retire le sablier sur chaque élément de `root` qui répond à `selector`.
 * @param {HTMLElement|null} root
 * @param {string} selector             Les éléments d'une créature (`li` du Groupe, case de la Frise).
 * @param {string} [frameSelector]      Où poser le badge dans l'élément (par défaut : l'élément lui-même).
 */
export function markAwaited(root, selector, frameSelector=null) {
  if ( !root ) return;
  const keys = awaitedKeys(awaitingOf());
  for ( const el of root.querySelectorAll(selector) ) {
    const names = awaitedNames(keys, { tokenId: el.dataset.tokenId ?? null, actorId: el.dataset.actorId ?? null });
    const host = (frameSelector && el.querySelector(frameSelector)) || el;
    const badge = host.querySelector(`:scope > .${BADGE}`);
    el.classList.toggle(`${BADGE}--on`, !!names);
    if ( !names ) { badge?.remove(); continue; }
    // Juste le sablier : aucun nom (l'utilisateur, 2026-11-06).
    const tip = loc("Awaiting.Someone");
    if ( badge ) { badge.dataset.tooltip = tip; continue; }
    host.insertAdjacentHTML("beforeend", `<i class="${BADGE} fa-solid fa-hourglass-half" data-tooltip="${foundry.utils.escapeHTML(tip)}"></i>`);
  }
}
