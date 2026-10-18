/**
 * Rafraîchissement des portraits vivants quand leur acteur ou leur token change.
 */
import { Portrait } from "../apps/portrait.mjs";
import { route } from "./router.mjs";

/** Acteur porteur d'un effet (l'effet peut vivre sur un item de l'acteur). */
function actorOfEffect(effect) {
  const parent = effect?.parent;
  return parent?.documentName === "Item" ? parent.parent : parent;
}

export function registerPortraits() {
  route("updateActor", "portraits", actor => Portrait.refreshFor(actor));
  route("updateToken", "portraits", (token, changes) => {
    // Un token non lié garde ses PV dans son delta : c'est une vraie variation de PV.
    if ( "delta" in changes ) Portrait.refreshFor(token.actor);
    // §46 : la hauteur du grimpeur (témoin d'escalade) — le portrait d'un acteur (Barre, Groupe) n'a pas de token à lui.
    else if ( ("elevation" in changes) || ("movementAction" in changes) || changes.flags?.["dnd5e-combat"] ) Portrait.refreshFor(token.actor, { flash: false });
    else Portrait.refreshToken(token);
  });
  // Les points d'une réserve (Égide arcanique) sont les utilisations de son item.
  route("updateItem", "portraits", item => {
    if ( item.parent?.documentName === "Actor" ) Portrait.refreshFor(item.parent, { flash: false });
  });
  for ( const hook of ["createActiveEffect", "updateActiveEffect", "deleteActiveEffect"] ) {
    route(hook, "portraits", effect => {
      const actor = actorOfEffect(effect);
      if ( actor ) Portrait.refreshFor(actor, { flash: false });
    });
  }
}
