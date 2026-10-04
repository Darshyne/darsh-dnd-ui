/**
 * Réglages du socle. Les réglages propres à la Barre, au Groupe et à la Frise arrivent avec eux
 * (SPEC §9).
 */
import { MODULE_ID, SCALE_KEYS } from "./shared.mjs";
import { POLICIES } from "./core/health.mjs";
import { Portrait } from "./apps/portrait.mjs";

const refreshAll = () => Portrait.refreshFor(null, { flash: false });

/**
 * @param {Function} rescale   Recalculer l'échelle (`{ auto }` : la valeur qui vient de changer).
 * @param {Function} refade    Recalculer l'opacité hors survol (%).
 */
export function registerSettings(rescale, refade) {
  game.settings.register(MODULE_ID, "portraitImage", {
    name: "DDU.Settings.PortraitImage.Name",
    hint: "DDU.Settings.PortraitImage.Hint",
    scope: "client",
    config: true,
    type: String,
    choices: {
      actor: "DDU.Settings.PortraitImage.Actor",
      token: "DDU.Settings.PortraitImage.Token"
    },
    default: "actor",
    onChange: refreshAll
  });

  // Ancien réglage unique, remplacé par un réglage par composant (0.14.0) ; gardé caché pour reprendre sa valeur
  // (runtime/display.mjs, `migrateScale`).
  game.settings.register(MODULE_ID, "scale", {
    scope: "client", config: false, type: Number, default: 100
  });
  for ( const key of SCALE_KEYS ) {
    game.settings.register(MODULE_ID, key, {
      name: `DDU.Settings.${key}.Name`,
      hint: `DDU.Settings.${key}.Hint`,
      scope: "client",
      config: true,
      type: Number,
      range: { min: 50, max: 150, step: 5 },
      default: 100,
      onChange: () => rescale()
    });
  }

  game.settings.register(MODULE_ID, "scaleAuto", {
    name: "DDU.Settings.ScaleAuto.Name",
    hint: "DDU.Settings.ScaleAuto.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: auto => rescale({ auto })
  });

  game.settings.register(MODULE_ID, "fadeOpacity", {
    name: "DDU.Settings.FadeOpacity.Name",
    hint: "DDU.Settings.FadeOpacity.Hint",
    scope: "client",
    config: true,
    type: Number,
    range: { min: 10, max: 100, step: 5 },
    default: 50,
    onChange: refade
  });

  game.settings.register(MODULE_ID, "enemyHealth", {
    name: "DDU.Settings.EnemyHealth.Name",
    hint: "DDU.Settings.EnemyHealth.Hint",
    scope: "world",
    config: true,
    type: String,
    choices: Object.fromEntries(POLICIES.map(p => [p, `DDU.Settings.EnemyHealth.${p}`])),
    default: "tiers",
    onChange: refreshAll
  });
}

/** Réglages de la Frise (SPEC §7, §9). `redraw` : redessiner la Frise. */
export function registerFriezeSettings(redraw) {
  const client = (key, def, extra = {}) => game.settings.register(MODULE_ID, key, {
    name: `DDU.Settings.${key}.Name`, hint: `DDU.Settings.${key}.Hint`,
    scope: "client", config: true, type: Boolean, default: def, onChange: redraw, ...extra
  });
  const world = (key, def, extra = {}) => game.settings.register(MODULE_ID, key, {
    name: `DDU.Settings.${key}.Name`, hint: `DDU.Settings.${key}.Hint`,
    scope: "world", config: true, type: Boolean, default: def, onChange: redraw, ...extra
  });
  client("frieze", true);
  client("friezeRound", true);
  client("friezeInitiativeText", true);
  client("friezeAutoSelect", false, { onChange: undefined });
  world("friezePrepToPlayers", false);
  world("friezeEnemyInitiative", true);
  world("friezeHideDefeated", false);
}

/**
 * Réglages du Groupe (SPEC §6, §9).
 * @param {Function} redraw     Redessiner le Groupe.
 * @param {Function} reattach   Le déplacer (changement de côté).
 */
export function registerPartySettings(redraw, reattach) {
  const reg = (key, scope, type, def, extra = {}) => game.settings.register(MODULE_ID, key, {
    name: `DDU.Settings.${key}.Name`, hint: `DDU.Settings.${key}.Hint`,
    scope, config: true, type, default: def, onChange: redraw, ...extra
  });
  reg("party", "client", Boolean, true);
  reg("partyPosition", "client", String, "left", {
    choices: {
      left: "DDU.Settings.partyPosition.left",
      right: "DDU.Settings.partyPosition.right",
      hidden: "DDU.Settings.partyPosition.hidden"
    },
    onChange: reattach
  });
  reg("partyPlacement", "client", String, "auto", {
    choices: {
      auto: "DDU.Settings.partyPlacement.auto",
      edge: "DDU.Settings.partyPlacement.edge",
      beside: "DDU.Settings.partyPlacement.beside"
    },
    onChange: reattach
  });
  reg("partyHideInCombat", "client", Boolean, false);
  reg("partyMembers", "world", String, "owned", {
    choices: { owned: "DDU.Settings.partyMembers.owned", assigned: "DDU.Settings.partyMembers.assigned" }
  });
  reg("partyConnectedOnly", "world", Boolean, false);
  reg("partyCompanions", "world", Boolean, true);
  reg("partyHealthExact", "world", Boolean, true);
  game.settings.register(MODULE_ID, "partyOrder", {
    scope: "world", config: false, type: Array, default: [], onChange: redraw
  });
}

/**
 * Réglages du plateau (SPEC §10, 0.15.0) : tracé du chemin, déplacement et caméra.
 * @param {Function} rulers   Redessiner les règles affichées.
 */
export function registerCanvasSettings(rulers) {
  const reg = (key, scope, def, extra = {}) => game.settings.register(MODULE_ID, key, {
    name: `DDU.Settings.${key}.Name`, hint: `DDU.Settings.${key}.Hint`,
    scope, config: true, type: Boolean, default: def, ...extra
  });
  reg("softPath", "client", true, { onChange: rulers });
  reg("rulerOutOfCombat", "client", false, { onChange: rulers });
  reg("smoothMovement", "world", true);
  reg("cameraFollow", "client", true);
}

/**
 * Réglages de la Barre (SPEC §5, §9).
 * @param {Function} redraw   Redessiner la Barre.
 * @param {Function} hotbar   Appliquer « replier la barre de macros ».
 */
export function registerBarSettings(redraw, hotbar) {
  const reg = (key, scope, def, extra = {}) => game.settings.register(MODULE_ID, key, {
    name: `DDU.Settings.${key}.Name`, hint: `DDU.Settings.${key}.Hint`,
    scope, config: true, type: Boolean, default: def, onChange: redraw, ...extra
  });
  reg("bar", "client", true);
  reg("barHideHotbar", "client", true, { onChange: hotbar });
  reg("barGMHotbar", "world", false, { onChange: hotbar });
  reg("barFullTooltips", "client", false);
  reg("barLockPlayers", "world", false);
}
