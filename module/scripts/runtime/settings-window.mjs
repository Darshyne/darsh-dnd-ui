/**
 * La fenêtre de réglages de Combat UI (2026-10-18) : la même que celle du moteur (« DAS · Core »), déclarée par son API publique
 * `api.settings.registerWindow` (moteur ≥ 0.241.0). Cinq onglets ; l'éditeur de couleurs y devient un outil ouvert à tous (chacun
 * choisit son thème). Au `setup`, quand tous les modules ont posé leur API : avec un moteur plus ancien, rien ne change — les réglages
 * restent dans la liste de Foundry, avec le bouton des couleurs.
 */
import { MODULE_ID } from "../shared.mjs";
import { route } from "./router.mjs";
import { ThemeEditor } from "../apps/theme-editor.mjs";
import { TABS } from "../core/settings-tabs.mjs";

const OPEN = Object.freeze({ theme: () => new ThemeEditor().render(true) });

export function registerSettingsWindow() {
  route("setup", "settings window", () => {
    const register = game.modules.get("dnd5e-combat")?.api?.settings?.registerWindow;
    if ( typeof register !== "function" ) return;   // moteur antérieur à 0.241.0 : la liste de Foundry
    register({
      namespace: MODULE_ID, title: "DDU.SettingsWindow.Title",
      menu: { name: "DDU.SettingsWindow.Menu.Name", label: "DDU.SettingsWindow.Menu.Label", hint: "DDU.SettingsWindow.Menu.Hint" },
      tabs: TABS.map(t => ({ ...t, label: `DDU.SettingsWindow.Tab.${t.id}`,
        tools: (t.tools ?? []).map(tool => ({ ...tool, name: `DDU.SettingsWindow.Tool.${tool.id}.Name`,
          hint: `DDU.SettingsWindow.Tool.${tool.id}.Hint`, button: `DDU.SettingsWindow.Tool.${tool.id}.Button`, open: OPEN[tool.id] })) }))
    });
    // Le bouton des couleurs passe dans la fenêtre (onglet Apparence) : il quitte la liste de Foundry.
    game.settings.menus.delete(`${MODULE_ID}.themeMenu`);
  });
}
