/**
 * Branchement du Groupe sur les hooks du cœur (SPEC §4.3).
 */
import { Party } from "../apps/party.mjs";
import { route } from "./router.mjs";
import { MODULE_ID } from "../shared.mjs";

/** @type {Party|null} */
let party = null;

export function getParty() {
  return party;
}

export function startParty() {
  party = new Party();
  party.attach();
  party.render();
}

export function registerParty() {
  const redraw = () => party?.scheduleRender();

  for ( const hook of [
    "canvasReady", "controlToken", "userConnected",
    "createActor", "deleteActor", "createToken", "deleteToken",
    "createCombat", "updateCombat", "deleteCombat", "combatStart", "combatTurnChange",
    "createCombatant", "deleteCombatant",
    "createActiveEffect", "updateActiveEffect", "deleteActiveEffect"
  ] ) route(hook, "party", redraw);

  // Personnage assigné, couleur du joueur.
  route("updateUser", "party", (_user, changes) => {
    if ( ("character" in changes) || ("color" in changes) ) redraw();
  });
  // Nom, image, propriété, main levée, inspiration ; les PV passent par le portrait seul.
  route("updateActor", "party", (_actor, changes) => {
    if ( ["name", "img", "ownership"].some(k => k in changes)
      || foundry.utils.hasProperty(changes, `flags.${MODULE_ID}`)
      || foundry.utils.hasProperty(changes, "system.attributes.inspiration") ) redraw();
  });
  route("updateCombatant", "party", (_c, changes) => {
    if ( foundry.utils.hasProperty(changes, "flags.dnd5e-combat") || ("initiative" in changes) ) redraw();
  });
  route("updateToken", "party", (_t, changes) => {
    // actorId : transformation (la forme remplace le personnage dans la colonne).
    if ( ["name", "texture", "actorLink", "flags", "actorId"].some(k => k in changes) ) redraw();
  });
  route("hoverToken", "party", (token, hovered) => party?.onTokenHover(token, hovered));
  // Les outils de scène changent de hauteur avec la couche active : la colonne peut passer du bord à côté d'eux.
  route("renderSceneControls", "party", () => requestAnimationFrame(() => party?.place()));
}
