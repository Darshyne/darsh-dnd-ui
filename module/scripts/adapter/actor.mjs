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

/**
 * Un chemin à motif (`token_cultist*.png`) : pas une image, une famille d'images. Le serveur le résout par `minimatch` sur le nom
 * du fichier (dist/files/local.mjs, `getFiles` avec `wildcard`). Le `?` d'une adresse web (`…/alara.Token.webp?1769616851745`,
 * The Forge, Tokenizer) est un paramètre, pas un motif : il ne compte pas.
 */
function isWildcard(src) {
  if ( !src ) return false;
  const path = /^https?:\/\//i.test(src) ? src.split("?")[0] : src;
  return /[*?]/.test(path);
}

/**
 * §66 (issue #12) : image du token réellement posé. Un prototype à image au hasard (`randomImg`, chemin à motif) ne garde que le
 * motif ; l'image tirée n'existe que sur le token posé (`Actor#getTokenDocument`, client/documents/actor.mjs:342-349). Ordre : le
 * token donné, celui d'un acteur non lié (`Actor#token`, actor.mjs:177), puis — prototype au hasard seulement — un token de
 * l'acteur sur la scène affichée, le contrôlé d'abord. Jamais un motif : null, et l'appelant prend l'image de l'acteur.
 */
function tokenImageOf(actor, token) {
  const proto = actor?.prototypeToken;
  const protoSrc = proto?.texture?.src ?? "";
  let placed = token ?? actor?.token ?? null;
  // `randomImg` coché sur un chemin sans motif (un PJ du Tokenizer) : l'image du prototype reste bonne, seul le token posé est préféré.
  if ( !placed && actor && (proto?.randomImg || isWildcard(protoSrc)) ) {
    placed = canvas.tokens?.controlled.find(t => t.actor === actor)?.document
      ?? actor.getActiveTokens?.(false, true)?.[0] ?? null;
  }
  const src = placed?.texture?.src || protoSrc;
  return (src && !isWildcard(src)) ? src : null;
}

/** Image du portrait : celle de l'acteur (art de personnage) ou du token, selon le réglage. */
export function portraitImage(actor, token, prefer = "actor") {
  const tokenImg = tokenImageOf(actor, token);
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
