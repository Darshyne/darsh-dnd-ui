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
    else Portrait.refreshToken(token);
  });
  for ( const hook of ["createActiveEffect", "updateActiveEffect", "deleteActiveEffect"] ) {
    route(hook, "portraits", effect => {
      const actor = actorOfEffect(effect);
      if ( actor ) Portrait.refreshFor(actor, { flash: false });
    });
  }
}
