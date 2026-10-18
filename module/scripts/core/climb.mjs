/**
 * Escalade (SPEC §46) : ce que l'interface montre de l'état que le moteur publie (`api.climb.state`, son SPEC §196). Pur : aucune règle
 * ici, seulement la mise en forme — le moteur dit qui grimpe, à quelle hauteur, et ce que son menu proposerait.
 */

/**
 * Le témoin du portrait : au mur ou au plafond, avec la hauteur au-dessus du sol. null quand la créature ne grimpe pas.
 * @param {{climbing: boolean, onCeiling: boolean, height: number, units: string}|null} state
 * @returns {{kind: "wall"|"ceiling", icon: string, key: string, height: number, units: string}|null}
 */
export function climbBadge(state) {
  if ( !state?.climbing ) return null;
  const ceiling = !!state.onCeiling;
  return {
    kind: ceiling ? "ceiling" : "wall",
    icon: ceiling ? "fa-spider" : "fa-mountain",
    key: ceiling ? "Climb.OnCeiling" : "Climb.OnWall",
    height: Math.round((Number(state.height) || 0) * 10) / 10,
    units: state.units ?? ""
  };
}

/** Le bouton « Grimper » de la Barre (hors combat) a-t-il quelque chose à proposer ? */
export function climbButtonShown(state) {
  return !!state && !!(state.canClimb || state.canRun || state.canCeiling || state.canDown || state.canDrop);
}

/**
 * L'infobulle de l'anneau de déplacement : en escalade, le coût d'une case (le ×2 de dnd5e sans vitesse d'escalade) en plus.
 * Rend la clé de traduction et ses paramètres.
 * @param {{left: number, allowed: number, mode?: string|null, multiplier?: number}} move
 * @param {number} gridDistance
 */
export function ringTooltip(move, gridDistance) {
  const round = n => Math.round(n * 10) / 10;
  const base = { left: round(move.left), allowed: round(move.allowed) };
  if ( move.mode !== "climb" ) return { key: "Bar.Movement", data: base };
  return { key: "Bar.MovementClimb", data: { ...base, cost: round((Number(move.multiplier) || 1) * gridDistance) } };
}
