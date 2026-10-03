/**
 * Darsh UI DnD5 — point d'entrée. Lire SPEC.md à la racine du dépôt.
 *
 * Couches (tests/layers.test.mjs) : core/ (pur) ← adapter/ (dnd5e, moteur) ← apps/ (composants,
 * applications) ← runtime/ (hooks) ← ce fichier. L'interface lit l'état et lance les activités par
 * `activity.use()` ; elle ne décide aucune règle.
 */
import { MODULE_ID, log } from "./shared.mjs";
import { registerSettings, registerFriezeSettings, registerPartySettings, registerBarSettings } from "./settings.mjs";
import { registerBar, startBar, getBar, applyHotbarSetting } from "./runtime/bar.mjs";
import { applyScale, applyFade, startDisplay, migrateScale } from "./runtime/display.mjs";
import { registerKeys } from "./runtime/keys.mjs";
import { registerPortraits } from "./runtime/portraits.mjs";
import { registerFrieze, startFrieze, getFrieze } from "./runtime/frieze.mjs";
import { registerParty, startParty, getParty } from "./runtime/party.mjs";
import { route, listRoutes } from "./runtime/router.mjs";
import { engineActive, engineReason } from "./adapter/engine.mjs";
import { Portrait } from "./apps/portrait.mjs";
import { PortraitPreview } from "./apps/preview.mjs";

let preview = null;

Hooks.once("init", () => {
  registerSettings(applyScale, applyFade);
  registerFriezeSettings(() => getFrieze()?.scheduleRender());
  registerPartySettings(() => getParty()?.scheduleRender(), () => getParty()?.reattach());
  registerBarSettings(() => getBar()?.scheduleRender(), applyHotbarSetting);
  registerPortraits();
  registerFrieze();
  registerParty();
  registerBar();
  registerKeys(getBar);

  game.modules.get(MODULE_ID).api = {
    /** État vu par le module (le moteur est lu à la demande : il pose son api à son propre init). */
    get state() {
      return {
        engine: engineActive(), engineReason: engineReason(), frieze: !!getFrieze(), party: !!getParty(), bar: !!getBar()
      };
    },
    Portrait,
    get frieze() {
      return getFrieze();
    },
    get party() {
      return getParty();
    },
    get bar() {
      return getBar();
    },
    /** Ouvre l'aperçu des portraits des tokens contrôlés. */
    preview() {
      preview ??= new PortraitPreview();
      return preview.render({ force: true });
    },
    routes: listRoutes
  };
});

Hooks.once("ready", async () => {
  await migrateScale();
  applyScale();   // la racine d'abord : les composants se dessinent à la bonne taille
  applyFade();
  startFrieze();
  startParty();
  startBar();
  startDisplay();
  applyScale();   // puis chaque composant, à sa propre taille
  applyHotbarSetting();
  route("controlToken", "preview", () => {
    if ( preview?.rendered ) preview.render();
  });
  log.info(`prêt (moteur de combat ${engineActive() ? "actif" : "absent ou en veille"})`);
});
