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


/** Les champs qu'un pas de marche change (`_id` est toujours là). */
// 0.25.1 : `_movementHistory` (en combat, chaque pas porte l'historique du déplacement) et `_regions` (régions traversées) sont
// des pas aussi — sans eux, chaque case d'une marche en combat redessinait toute la Barre (~55 ms avec trois rangées, mesuré le 2026-10-18).
const MOVE_KEYS = new Set(["_id", "x", "y", "elevation", "rotation", "level", "sort", "movementAction", "_movementHistory", "_regions"]);
const onlyMoved = changes => Object.keys(changes ?? {}).every(k => MOVE_KEYS.has(k));

export function registerBar() {
  const redraw = () => bar?.scheduleRender();
  const mine = actor => !!bar?.actor && (actor?.id === bar.actor.id);
  // 0.25.1 : tant que le token de la Barre marche, elle ne se redessine pas ; une seule fois, immobile depuis un demi-seconde. Une
  // marche au clic du moteur enchaîne des déplacements du cœur ; sur The Forge chaque morceau attend le serveur, et l'ancien délai fixe
  // (0,4 s) expirait en pleine marche — un redessin complet par morceau, l'animation figée. En marche : déplacement du cœur en attente ou
  // en pause, ou animation de marche en cours (V14, documents/token.mjs `movement.state`, canvas/placeables/token.mjs `animationContexts`).
  const moving = doc => ["pending", "paused"].includes(doc?.movement?.state)
    || !!doc?.object?.animationContexts?.has?.(doc.object.movementAnimationName);
  const walking = () => (bar?.actor?.getActiveTokens?.(false, true) ?? []).some(moving);
  // 0.25.2 : immobile, la Barre ne recalcule que ce qui dépend de la position (`refreshPosition` : raisons de grisé, anneau) — sauf si la
  // fiche, un objet, un effet ou le combattant a changé pendant la marche : alors un rendu complet.
  let waiting = null;
  let full = false;
  const redrawWhenStill = ({ complete=false }={}) => {
    full ||= complete;
    if ( waiting ) return;
    let still = 0;
    const check = () => {
      still = walking() ? 0 : still + 1;
      if ( still < 2 ) { waiting = setTimeout(check, 250); return; }
      waiting = null;
      const wasFull = full;
      full = false;
      if ( wasFull || !bar?.refreshPosition ) redraw();
      else bar.refreshPosition();
    };
    waiting = setTimeout(check, 250);
  };
  // Ce qui change pendant la marche (fiche, effets, budget) attend aussi la fin, et demande un rendu complet.
  const redrawMine = () => (walking() ? redrawWhenStill({ complete: true }) : redraw());

  for ( const hook of [
    "controlToken", "canvasReady", "createCombat", "updateCombat", "deleteCombat", "combatStart",
    "combatTurnChange", "createCombatant", "deleteCombatant"
  ] ) route(hook, "bar", redraw);

  route("updateUser", "bar", (user, changes) => {
    if ( user.isSelf && ("character" in changes) ) redraw();
  });
  route("updateActor", "bar", actor => {
    if ( mine(actor) ) redrawMine();
  });
  for ( const hook of ["createItem", "updateItem", "deleteItem"] ) {
    route(hook, "bar", item => {
      if ( mine(item.parent) ) redrawMine();
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
      if ( mine(actor) ) redrawMine();
    });
  }
  // Budget du moteur (flags du combattant) et déplacement (historique du token) : pastilles et anneau.
  route("updateCombatant", "bar", combatant => {
    if ( mine(combatant.actor) ) redrawMine();
  });
  // Éclairage recalculé par le cœur (lumière déplacée, obscurité de la scène, ténèbres magiques) : le témoin seul.
  route("lightingRefresh", "bar", () => bar?.refreshLight());
  // Un simple pas de marche (position, orientation, niveau) : la Barre se redessine une seule fois, le token arrêté. Une marche au clic
  // du moteur met le token à jour à chaque point de contrôle ; un redessin complet (35-45 ms pour un PJ, mesuré le 2026-10-17) par
  // case figeait l'animation — saccadé sur The Forge, où chaque morceau attend en plus le serveur.
  route("updateToken", "bar", (token, changes) => {
    // Transformation (Forme sauvage, métamorphose) : le token garde son id mais change d'acteur ; s'il est
    // contrôlé, la Barre doit suivre le nouvel acteur (aucun controlToken n'est émis).
    if ( ("actorId" in changes) && token.object?.controlled ) return redraw();
    if ( !mine(token.actor) ) return;
    if ( onlyMoved(changes) ) return redrawWhenStill();
    redrawMine();
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
