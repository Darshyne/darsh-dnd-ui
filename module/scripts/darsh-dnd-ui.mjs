/**
 * Darsh UI DnD5 — point d'entrée. Lire SPEC.md à la racine du dépôt.
 *
 * Couches (tests/layers.test.mjs) : core/ (pur) ← adapter/ (dnd5e, moteur) ← apps/ (composants,
 * applications) ← runtime/ (hooks) ← ce fichier. L'interface lit l'état et lance les activités par
 * `activity.use()` ; elle ne décide aucune règle.
 */
import { MODULE_ID, log } from "./shared.mjs";
import { registerSettings, registerFriezeSettings, registerPartySettings, registerBarSettings,
  registerCanvasSettings } from "./settings.mjs";
import { refreshRulers } from "./apps/canvas.mjs";
import { registerBar, startBar, getBar, applyHotbarSetting } from "./runtime/bar.mjs";
import { applyScale, applyFade, startDisplay, migrateScale } from "./runtime/display.mjs";
import { registerKeys } from "./runtime/keys.mjs";
import { registerPortraits } from "./runtime/portraits.mjs";
import { registerFrieze, startFrieze, getFrieze } from "./runtime/frieze.mjs";
import { registerParty, startParty, getParty } from "./runtime/party.mjs";
import { registerCanvas, setupCanvas } from "./runtime/canvas.mjs";
import { route, listRoutes } from "./runtime/router.mjs";
import { engineActive, engineReason } from "./adapter/engine.mjs";
import { Portrait } from "./apps/portrait.mjs";
import { PortraitPreview } from "./apps/preview.mjs";
import { registerTheme, startTheme } from "./runtime/theme.mjs";
import { registerSettingsWindow } from "./runtime/settings-window.mjs";
import { ThemeEditor } from "./apps/theme-editor.mjs";
import { currentTheme } from "./adapter/theme.mjs";

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
  registerCanvasSettings(refreshRulers);
  registerCanvas();
  registerTheme();
  registerSettingsWindow();   // la fenêtre de réglages DAS (moteur ≥ 0.241.0), déclarée au `setup`

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
    routes: listRoutes,
    /** Thèmes de couleurs (SPEC §45) : l'éditeur, et le thème en vigueur `{ id, colors }`. */
    theme: {
      open: () => new ThemeEditor().render({ force: true }),
      current: () => currentTheme()
    }
  };
  // Pour le connecteur MCP (`call-module-api`, verrou « Outils de test ») : vérifier les thèmes sans relancer le monde.
  game.modules.get(MODULE_ID).api.mcp = {
    /** Le thème en vigueur et les couleurs calculées d'éléments du HUD présents à l'écran. */
    themeProbe() {
      const root = getComputedStyle(document.documentElement);
      const vars = Object.fromEntries(["bg", "gold", "text", "grid", "well", "panel-top", "action"].map(k => [k, root.getPropertyValue(`--ddu-${k}`).trim()]));
      const look = (selector, props) => {
        const el = document.querySelector(selector);
        if ( !el ) return null;
        const cs = getComputedStyle(el);
        return Object.fromEntries(props.map(p => [p, cs.getPropertyValue(p)]));
      };
      return {
        theme: currentTheme(), vars,
        elements: {
          party: look(".ddu-party .ddu-portrait", ["border-top-color", "background-color"]),
          partyName: look(".ddu-party .ddu-portrait__name, .ddu-party__name", ["color"]),
          barGrid: look(".ddu-bar__grid", ["background-color"]),
          cell: look(".ddu-cell", ["background-color", "border-top-color"]),
          frieze: look(".ddu-frieze .ddu-portrait", ["border-top-color"])
        }
      };
    },
    /** Choisir un thème : pour soi (`choice`) ou pour la table (`world`). Rend l'ancien. */
    async themeSet({ choice, world }={}) {
      const before = { choice: game.settings.get(MODULE_ID, "theme"), world: game.settings.get(MODULE_ID, "themeWorld") };
      if ( choice !== undefined ) await game.settings.set(MODULE_ID, "theme", choice);
      if ( world !== undefined ) await game.settings.set(MODULE_ID, "themeWorld", world);
      return before;
    },
    /**
     * Le CSS du module tel qu'il est sur le disque, ajouté à chaud (le cœur V14 n'agrège le CSS des modules qu'au lancement du
     * monde : foundry-core-notes/v14-migration.md). Pour un test seulement ; `remove: true` le retire.
     */
    async freshStyles({ remove=false }={}) {
      document.getElementById("ddu-fresh-css")?.remove();
      if ( remove ) return { removed: true };
      const text = await (await fetch(`modules/${MODULE_ID}/styles/darsh-dnd-ui.css?t=${Date.now()}`)).text();
      const style = document.createElement("style");
      style.id = "ddu-fresh-css";
      style.textContent = text;
      document.head.append(style);
      return { injected: text.length };
    },
    /**
     * §52 : les jeux d'armes de la Barre de `tokenId` (pris en main), après un geste éventuel joué comme à la souris par des
     * évènements de glisser-déposer sur les vrais éléments : `drop: { itemId, set, hand, from: "sheet"|"grid" }` (depuis une fiche, ou
     * depuis une case de la grille), `remove: { set, hand }` (glissé hors de la Barre), `cycle: ±1` (flèches). Rend les emplacements
     * dessinés (grands, colonne des petits jeux), la disposition et les armes équipées.
     */
    async weapons({ tokenId, drop=null, remove=null, cycle=0, sets=null, config=null }) {
      const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
      // Le réglage client `weaponSets` de ce client (rendu dans `setsBefore` pour être remis).
      const setsBefore = game.settings.get(MODULE_ID, "weaponSets");
      if ( (sets !== null) && (sets !== setsBefore) ) { await game.settings.set(MODULE_ID, "weaponSets", sets); await pause(300); }
      const token = canvas.tokens.get(tokenId);
      if ( !token ) throw new Error(`token ${tokenId} not drawn`);
      if ( !token.controlled || (canvas.tokens.controlled.length !== 1) ) { token.control({ releaseOthers: true }); await pause(400); }
      const bar = getBar();
      const el = bar?.element;
      if ( !el || el.hidden ) throw new Error("bar hidden");
      const slotEl = (set, hand) => el.querySelector(`.ddu-weapon--big[data-weapon-set="${set}"][data-weapon-hand="${hand}"]`)
        ?? el.querySelector(`.ddu-weapon[data-weapon-set="${set}"][data-weapon-hand="${hand}"]`);
      const fire = (target, type, dataTransfer, extra={}) => target.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer, ...extra }));
      if ( drop ) {
        const target = slotEl(drop.set, drop.hand);
        if ( !target ) throw new Error(`no slot ${drop.set}/${drop.hand} on screen`);
        const dt = new DataTransfer();
        if ( drop.from === "grid" ) {
          const cell = el.querySelector(`.ddu-cell[data-ref^="Item.${drop.itemId}"]`);
          if ( !cell ) throw new Error(`no grid cell for item ${drop.itemId}`);
          fire(cell, "dragstart", dt);
          fire(target, "dragover", dt);
          fire(target, "drop", dt);
          fire(cell, "dragend", dt);
        } else {
          dt.setData("text/plain", JSON.stringify({ type: "Item", uuid: token.actor.items.get(drop.itemId)?.uuid }));
          fire(target, "dragover", dt);
          fire(target, "drop", dt);
        }
      }
      if ( remove ) {
        const source = slotEl(remove.set, remove.hand);
        const dt = new DataTransfer();
        fire(source, "dragstart", dt);
        fire(source, "dragend", dt, { clientX: 1, clientY: 1 });
      }
      if ( cycle ) bar.cycleWeapons(cycle);
      // §52 : la fenêtre de l'engrenage — `{ set, hand, itemId }` glisse l'objet de la réserve sur l'emplacement (itemId null : glisse
      // l'emplacement sur la réserve, qui le vide), `{ hold: set }` prend un jeu.
      let window = null;
      if ( config ) {
        el.querySelector('[data-action="weaponConfig"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        await pause(800);
        const app = foundry.applications.instances.get("ddu-weapon-sets");
        if ( !app?.element ) throw new Error("weapon sets window not open");
        const root = app.element;
        if ( config.hold !== undefined ) root.querySelector(`button[data-action="hold"][data-set="${config.hold}"]`)?.click();
        else {
          const tile = root.querySelector(`.ddu-weapon-sets__slot[data-set="${config.set}"][data-hand="${config.hand}"]`);
          const source = config.itemId ? root.querySelector(`.ddu-weapon-sets__item[data-item="${config.itemId}"]`) : tile;
          const target = config.itemId ? tile : root.querySelector("[data-part=pool]");
          if ( !source || !target ) throw new Error(`window: no ${source ? "target" : "source"} for ${JSON.stringify(config)}`);
          const dt = new DataTransfer();
          fire(source, "dragstart", dt);
          fire(target, "dragover", dt);
          fire(target, "drop", dt);
          fire(source, "dragend", dt);
        }
        await pause(1500);
        const rows = [...root.querySelectorAll(".ddu-weapon-sets__row")];
        window = {
          rows: rows.map(r => [...r.querySelectorAll(".ddu-weapon-sets__slot")].map(t => ({ img: t.querySelector("img")?.getAttribute("src") ?? null,
            blocked: t.classList.contains("ddu-blocked") }))),
          held: rows.findIndex(r => r.classList.contains("ddu-active")),
          pool: root.querySelectorAll(".ddu-weapon-sets__item").length
        };
        await app.close();
      }
      if ( drop || remove || cycle ) await pause(1500);
      const slot = s => s && { set: Number(s.dataset.weaponSet), hand: Number(s.dataset.weaponHand),
        classes: [...s.classList].filter(c => c.startsWith("ddu-weapon--")), tip: s.dataset.tooltip, action: s.dataset.action ?? null };
      return {
        setsBefore, window,
        big: [...el.querySelectorAll(".ddu-weapons__active .ddu-weapon")].map(slot),
        column: Object.fromEntries(["next", "prev"].map(r => {
          const s = el.querySelector(`.ddu-weapons__set--${r}`);
          return [r, (s?.dataset.weaponSet === undefined) ? null : Number(s.dataset.weaponSet)];
        })),
        arrows: el.querySelectorAll(".ddu-weapons__arrow").length,
        weapons: bar.layout.weapons,
        equipped: token.actor.items.filter(i => i.type === "weapon").map(i => ({ id: i.id, name: i.name, equipped: !!i.system.equipped }))
      };
    }
  };
});

Hooks.once("setup", setupCanvas);

Hooks.once("ready", async () => {
  await migrateScale();
  startTheme();
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
  log.info(`ready (combat engine ${engineActive() ? "active" : "missing or on standby"})`);
});
