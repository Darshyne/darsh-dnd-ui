/**
 * Colour themes (SPEC §45): settings, the « Interface colours » button in the module settings (open to all: everyone picks
 * their theme; the GM also picks the table's), applied on load, on each change, and when Foundry's light / dark scheme changes.
 */
import { MODULE_ID } from "../shared.mjs";
import { applyTheme } from "../adapter/theme.mjs";
import { route } from "./router.mjs";
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
  // The « dnd5e auto » theme follows Foundry's light / dark interface setting: repaint once Foundry has moved its classes.
  route("clientSettingChanged", "theme: follow the interface scheme", key => {
    if ( key === "core.uiConfig" ) requestAnimationFrame(() => applyTheme());
  });
}

/** On `ready`: the theme in force. */
export const startTheme = () => applyTheme();
