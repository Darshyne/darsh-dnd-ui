/**
 * Thèmes de couleurs (SPEC §45) : réglages, bouton « Couleurs de l'interface » dans les réglages du module (ouvert à tous :
 * chacun choisit son thème ; le MJ choisit en plus celui de la table), application au chargement et à chaque changement.
 */
import { MODULE_ID } from "../shared.mjs";
import { applyTheme } from "../adapter/theme.mjs";
import { ThemeEditor } from "../apps/theme-editor.mjs";

export function registerTheme() {
  const hidden = (key, scope, type, def) => game.settings.register(MODULE_ID, key, {
    scope, config: false, type, default: def, onChange: () => applyTheme()
  });
  hidden("themeWorld", "world", String, "bg3");
  hidden("themeWorldLibrary", "world", Array, []);
  hidden("theme", "user", String, "");
  hidden("themeLibrary", "user", Array, []);
  game.settings.registerMenu(MODULE_ID, "themeMenu", {
    name: "DDU.Theme.Menu.Name", label: "DDU.Theme.Menu.Label", hint: "DDU.Theme.Menu.Hint",
    icon: "fa-solid fa-palette", type: ThemeEditor, restricted: false
  });
}

/** Au `ready` : le thème en vigueur. */
export const startTheme = () => applyTheme();
