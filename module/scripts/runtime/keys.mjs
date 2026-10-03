/**
 * Raccourcis clavier (SPEC §8.4), modifiables dans « Configurer les contrôles » de Foundry.
 * Chaque raccourci ne « prend » la touche (retour true) que s'il a quelque chose à faire ; sinon la touche
 * garde son rôle dans le cœur (client/helpers/interaction/client-keybindings.mjs) :
 * - 1 – 0 : cases de l'onglet Personnalisé, avant les macros du cœur (`executeMacro`, DEFERRED, :654) ;
 *   une case vide laisse passer la macro ;
 * - T : épingle l'infobulle de la case survolée ; sinon le ciblage du cœur (`target`, :411) ;
 * - F : jeu d'armes suivant, sauf pendant une règle ou un glisser de token (`rulerWaypoint`, :647).
 * Jamais Échap ni Entrée (le moteur de combat les écoute pour sa visée). Aucune touche pour Fin du tour
 * (décision de l'utilisateur, SPEC §11).
 */
import { CUSTOM_KEYS } from "../apps/bar.mjs";
import { MODULE_ID } from "../shared.mjs";

/** Actions de base du moteur qu'on peut lier à une touche (aucune par défaut : Foundry prend déjà beaucoup de lettres). */
const BASIC_ACTIONS = ["dash", "disengage", "dodge", "hide", "search", "help", "ready", "escape"];

const KEY_CODES = {
  "1": "Digit1", "2": "Digit2", "3": "Digit3", "4": "Digit4", "5": "Digit5", "6": "Digit6",
  "7": "Digit7", "8": "Digit8", "9": "Digit9", "0": "Digit0", "-": "Minus", "=": "Equal"
};

/** @param {() => import("../apps/bar.mjs").Bar|null} getBar */
export function registerKeys(getBar) {
  const PRIORITY = CONST.KEYBINDING_PRECEDENCE.PRIORITY;

  CUSTOM_KEYS.forEach((key, i) => {
    game.keybindings.register(MODULE_ID, `customSlot${i + 1}`, {
      name: game.i18n.format("DDU.Keys.CustomSlot", { n: i + 1 }),
      hint: "DDU.Keys.CustomSlotHint",
      editable: [{ key: KEY_CODES[key] }],
      precedence: PRIORITY,
      onDown: context => !!getBar()?.useCustomSlot(i, context.event)
    });
  });

  game.keybindings.register(MODULE_ID, "pinTooltip", {
    name: "DDU.Keys.PinTooltip",
    hint: "DDU.Keys.PinTooltipHint",
    editable: [{ key: "KeyT" }],
    precedence: PRIORITY,
    onDown: () => !!getBar()?.pinHovered()
  });

  game.keybindings.register(MODULE_ID, "swapWeapons", {
    name: "DDU.Keys.SwapWeapons",
    hint: "DDU.Keys.SwapWeaponsHint",
    editable: [{ key: "KeyF" }],
    precedence: PRIORITY,
    onDown: () => {
      // Pendant une mesure ou un glisser de token, F pose un point de passage (cœur) : on laisse faire.
      if ( canvas.ready && (canvas.controls?.ruler?.active || canvas.tokens?._draggedToken) ) return false;
      return !!getBar()?.swapWeapons();
    }
  });

  for ( const action of BASIC_ACTIONS ) {
    game.keybindings.register(MODULE_ID, `basic.${action}`, {
      name: `DDU.Keys.Basic.${action}`,
      hint: "DDU.Keys.BasicHint",
      editable: [],
      onDown: context => !!getBar()?.useBasicAction(action, context.event)
    });
  }
}
