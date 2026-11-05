/**
 * Lecture dnd5e 6 d'un acteur pour les portraits. Champs vérifiés dans la source dnd5e 6 vendorée
 * (Foundry dnd5e-automation/references/dnd5e-6/src) :
 * - PV : system.attributes.hp.{value, effectiveMax, temp, bloodied} (canvas/token.mjs:188,
 *   data/actor/character.mjs:60 — `bloodied` = seuil en %, non persisté) ;
 * - jets contre la mort : system.attributes.death.{success, failure}
 *   (data/actor/templates/attributes.mjs:664).
 */
import { readHealth } from "../core/health.mjs";

/** Santé normalisée d'un acteur (null s'il n'a pas de PV : véhicule sans PV, groupe…). */
export function healthOf(actor) {
  const hp = actor?.system?.attributes?.hp;
  if ( !hp ) return null;
  return readHealth({ value: hp.value, max: hp.effectiveMax ?? hp.max, temp: hp.temp, bloodied: hp.bloodied });
}

/** Jets contre la mort, seulement pour un personnage à 0 PV et pas mort. */
export function deathSavesOf(actor) {
  if ( actor?.type !== "character" ) return null;
  if ( (actor.system.attributes.hp?.value ?? 1) > 0 || isDead(actor) ) return null;
  const death = actor.system.attributes.death ?? {};
  return { success: death.success ?? 0, failure: death.failure ?? 0 };
}

export function isDead(actor) {
  return !!actor?.statuses?.has(CONFIG.specialStatusEffects.DEFEATED ?? "dead");
}

/**
 * Effets dont l'icône se montre, avec la règle du cœur pour les icônes du token
 * (canvas/placeables/token.mjs:1869-1871) : `showIcon` ALWAYS, ou CONDITIONAL et temporaire.
 * ⚠️ V14 : `Actor#temporaryEffects` ne suffit plus — un état sans durée (Empoisonné, À terre) n'est plus
 * « temporaire » (`ActiveEffect#isTemporary` = durée ou `expiry`, documents/active-effect.mjs:225).
 */
export function iconEffectsOf(actor) {
  const SHOW = CONST.ACTIVE_EFFECT_SHOW_ICON;
  return (actor?.appliedEffects ?? []).filter(e => e.img
    && ((e.showIcon === SHOW.ALWAYS) || ((e.showIcon === SHOW.CONDITIONAL) && e.isTemporary)));
}

/** Image du portrait : celle de l'acteur (art de personnage) ou du token, selon le réglage. */
export function portraitImage(actor, token, prefer = "actor") {
  const tokenImg = token?.texture?.src ?? actor?.prototypeToken?.texture?.src;
  const actorImg = actor?.img;
  const isDefault = !actorImg || actorImg === CONST.DEFAULT_TOKEN || actorImg.includes("mystery-man");
  if ( prefer === "token" ) return tokenImg || actorImg;
  return isDefault ? (tokenImg || actorImg) : actorImg;
}

/** Politique d'affichage des PV pour ce client : exacte si l'on voit la fiche, sinon celle du monde. */
export function healthPolicyFor(actor, worldPolicy) {
  if ( game.user.isGM ) return "exact";
  if ( actor?.testUserPermission(game.user, "OBSERVER") ) return "exact";
  return worldPolicy;
}

/** Couleur de camp d'après la disposition du token (« secret » vu comme hostile par les joueurs). */
export function sideOf(token) {
  const D = CONST.TOKEN_DISPOSITIONS;
  switch ( token?.disposition ) {
    case D.FRIENDLY: return "friendly";
    case D.NEUTRAL: return "neutral";
    case D.SECRET: return game.user.isGM ? "secret" : "hostile";
    case D.HOSTILE: return "hostile";
    default: return "friendly";
  }
}

/**
 * §58 (issue #8) : son joué chez toute la table après un ajustement des PV depuis la Barre. Sons du cœur Foundry
 * (public/sounds/), comme ceux du moteur (son core/action-feedback.mjs) : un coup, une note claire pour le soin, une plus
 * sourde pour les PV temporaires.
 */
const HP_SOUNDS = {
  damage: "sounds/combat/epic-turn-1hit.ogg",
  heal: "sounds/doors/magic/unlock.ogg",
  temp: "sounds/doors/magic/lock.ogg"
};

/**
 * §58 (issue #8) : dégâts, soin ou PV temporaires, à la main, par l'API de dnd5e — jamais en écrivant les PV. Un nombre passé à
 * `applyDamage` est appliqué brut (`options.ignore ??= true` : ni résistance ni immunité, documents/actor/actor.mjs:790-793) ;
 * les PV temporaires partent en premier, le soin s'arrête au maximum (actor.mjs:798) ; `dnd5e.preApplyDamage` passe (actor.mjs:818),
 * le moteur y lit 0 PV, la mort et les échecs de jets contre la mort. PV temporaires : `applyTempHP` ne garde que le plus haut
 * (actor.mjs:1061). Le chiffre flottant sur le token est dessiné par dnd5e chez chaque client (`onUpdateHP`,
 * data/actor/templates/attributes.mjs:698) ; le son est diffusé ici. Le propriétaire de l'acteur seulement.
 * @returns {Promise<boolean>} vrai si les PV ont changé.
 */
export async function adjustHP(actor, { kind, value }={}) {
  const hp = actor?.system?.attributes?.hp;
  if ( !hp || !actor.isOwner || !(value > 0) ) return false;
  const before = [hp.value, hp.temp];
  if ( kind === "damage" ) await actor.applyDamage(value);
  else if ( kind === "heal" ) await actor.applyDamage(-value);
  else if ( kind === "temp" ) await actor.applyTempHP(value);
  else return false;
  const after = actor.system.attributes.hp;
  const changed = (after.value !== before[0]) || (after.temp !== before[1]);
  if ( changed ) foundry.audio.AudioHelper.play({ src: HP_SOUNDS[kind], volume: 0.8, loop: false }, true)?.catch?.(() => {});
  return changed;
}
