/**
 * Branchement de la Barre sur les hooks du cœur (SPEC §4.3).
 */
import { Bar } from "../apps/bar.mjs";
import { route } from "./router.mjs";
import { setting, log } from "../shared.mjs";
import { recordDeparture, returnWeapons } from "../adapter/weapon-return.mjs";

/** @type {Bar|null} */
let bar = null;

export function getBar() {
  return bar;
}

export function startBar() {
  bar = new Bar();
  bar.attach();
  bar.render();
}

export function registerBar() {
  const redraw = () => bar?.scheduleRender();
  const mine = actor => !!bar?.actor && (actor?.id === bar.actor.id);

  for ( const hook of [
    "controlToken", "canvasReady", "createCombat", "updateCombat", "deleteCombat", "combatStart",
    "combatTurnChange", "createCombatant", "deleteCombatant"
  ] ) route(hook, "bar", redraw);

  route("updateUser", "bar", (user, changes) => {
    if ( user.isSelf && ("character" in changes) ) redraw();
  });
  route("updateActor", "bar", actor => {
    if ( mine(actor) ) redraw();
  });
  for ( const hook of ["createItem", "updateItem", "deleteItem"] ) {
    route(hook, "bar", item => {
      if ( mine(item.parent) ) redraw();
    });
  }
  // 0.19.0 : une arme d'un jeu qui quitte la fiche est notée ; ramassée, elle reprend sa place (équipée si son jeu est en main).
  // Chez le MJ actif (adapter/weapon-return.mjs).
  route("preDeleteItem", "bar", item => {
    if ( game.users.activeGM?.isSelf ) recordDeparture(item);
  });
  route("createItem", "bar", async item => {
    if ( !game.users.activeGM?.isSelf || (item.parent?.documentName !== "Actor") ) return;
    const back = await returnWeapons(item.parent);
    for ( const r of back ) log.info?.(`${item.parent.name}: ${item.name} back in weapon set ${r.set + 1}`);
  });
  for ( const hook of ["createActiveEffect", "updateActiveEffect", "deleteActiveEffect"] ) {
    route(hook, "bar", effect => {
      const actor = effect.parent?.documentName === "Item" ? effect.parent.parent : effect.parent;
      if ( mine(actor) ) redraw();
    });
  }
  // Budget du moteur (flags du combattant) et déplacement (historique du token) : pastilles et anneau.
  route("updateCombatant", "bar", combatant => {
    if ( mine(combatant.actor) ) redraw();
  });
  // Éclairage recalculé par le cœur (lumière déplacée, obscurité de la scène, ténèbres magiques) : le témoin seul.
  route("lightingRefresh", "bar", () => bar?.refreshLight());
  route("updateToken", "bar", (token, changes) => {
    // Transformation (Forme sauvage, métamorphose) : le token garde son id mais change d'acteur ; s'il est
    // contrôlé, la Barre doit suivre le nouvel acteur (aucun controlToken n'est émis).
    if ( ("actorId" in changes) && token.object?.controlled ) return redraw();
    if ( mine(token.actor) ) redraw();
  });
}

/**
 * Replier la barre de macros du cœur quand la Barre la remplace. Réglage de monde pour le MJ : garder sa
 * barre de macros, la Barre se posant au-dessus (elle est la première enfant de #ui-bottom, la barre de
 * macros suit).
 */
export function applyHotbarSetting() {
  const gmKeeps = game.user?.isGM && setting("barGMHotbar");
  document.body.classList.toggle("ddu-hide-hotbar", !!bar && setting("barHideHotbar") && !gmKeeps);
}
