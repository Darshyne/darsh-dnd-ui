/**
 * Le plan de la fenêtre de réglages de Combat UI (runtime/settings-window.mjs) : onglets, réglages rangés, outils. Pur.
 */

/** Le plan : chaque onglet, ses réglages (clés de ce module) et ses outils. */
export const TABS = Object.freeze([
  { id: "appearance", icon: "fa-solid fa-palette",
    keys: ["portraitImage", "scaleBar", "scaleFrieze", "scaleParty", "scaleAuto", "fadeOpacity", "enemyHealth"],
    tools: [{ id: "theme", icon: "fa-solid fa-palette", everyone: true }] },
  { id: "bar", icon: "fa-solid fa-table-cells", keys: ["bar", "barHideHotbar", "barGMHotbar", "barFullTooltips", "barLockPlayers", "weaponSets"] },
  { id: "frieze", icon: "fa-solid fa-list-ol",
    keys: ["frieze", "friezeRound", "friezeInitiativeText", "friezeAutoSelect", "friezeAutoSelectGM", "friezePrepToPlayers", "friezeEnemyInitiative", "friezeHideDefeated"] },
  { id: "party", icon: "fa-solid fa-users",
    keys: ["party", "partyPosition", "partyPlacement", "partyHideInCombat", "partyMembers", "partyConnectedOnly", "partyCompanions", "partyHealthExact"] },
  { id: "board", icon: "fa-solid fa-map", keys: ["softPath", "rulerOutOfCombat", "smoothMovement", "cameraFollow"] }
]);
