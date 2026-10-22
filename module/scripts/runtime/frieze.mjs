/**
 * Branchement de la Frise sur les hooks du cœur (SPEC §4.3).
 */
import { Frieze } from "../apps/frieze.mjs";
import { route } from "./router.mjs";
import { setting } from "../shared.mjs";
import { autoSelectsTurn } from "../core/select.mjs";

/** @type {Frieze|null} */
let frieze = null;

export function getFrieze() {
  return frieze;
}

/** Au ready : crée la Frise. */
export function startFrieze() {
  frieze = new Frieze();
  frieze.attach();
  frieze.render();
}

/**
 * « Sélectionner le combattant actif » : à chaque changement de tour (`combatTurnChange`, émis sur tous les clients au début du
 * combat comme à chaque tour, client/documents/combat.mjs:888), le token dont c'est le tour est contrôlé et la vue recentrée sur
 * lui (`Canvas#animatePan`, comme un clic sur son portrait). Un joueur : sa case `friezeAutoSelect`, seulement le sien. Le MJ
 * (§48) : réglage de monde `friezeAutoSelectGM` — aucun, PNJ seulement (`Combatant#isNPC` du cœur : sans joueur propriétaire,
 * client/documents/combatant.mjs:64), tous. Rien si le token n'est pas sur la scène affichée.
 * @param {Combat} combat
 */
function selectCurrent(combat) {
  if ( combat !== game.combat ) return;
  const combatant = combat.combatant;
  const token = combatant?.token?.object;
  if ( !token || (token.document.parent !== canvas.scene) ) return;
  if ( !autoSelectsTurn({ isGM: game.user.isGM, gmMode: setting("friezeAutoSelectGM"), playerOn: setting("friezeAutoSelect"),
    isOwner: combatant.isOwner, isNPC: combatant.isNPC }) ) return;
  if ( !token.controlled || (canvas.tokens.controlled.length > 1) ) token.control({ releaseOthers: true });
  canvas.animatePan({ x: token.center.x, y: token.center.y });
}

export function registerFrieze() {
  const redraw = () => frieze?.scheduleRender();
  for ( const hook of [
    "createCombat", "updateCombat", "deleteCombat", "combatStart", "combatTurnChange",
    "createCombatant", "updateCombatant", "deleteCombatant", "canvasReady"
  ] ) route(hook, "frieze", redraw);

  // Nom, image, disposition d'un token ; effets (pastille d'état) : redessin léger.
  route("updateToken", "frieze", (token, changes) => {
    if ( ["name", "texture", "disposition", "displayName", "hidden"].some(k => k in changes) ) redraw();
  });
  for ( const hook of ["createActiveEffect", "deleteActiveEffect", "updateActiveEffect"] ) {
    route(hook, "frieze", redraw);
  }

  route("combatStart", "frieze-initiative", combat => frieze?.announceInitiative(combat));
  route("combatTurnChange", "frieze-select", selectCurrent);
  route("hoverToken", "frieze", (token, hovered) => frieze?.onTokenHover(token, hovered));
}
