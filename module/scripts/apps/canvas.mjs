/**
 * Plateau : tracé du chemin adouci, déplacement des tokens adouci, caméra qui suit son token.
 *
 * Rien n'est patché : on passe par les points d'extension que le cœur prévoit — la classe de règle
 * des tokens (`CONFIG.Token.rulerClass`, une sous-classe de celle du système) et les options
 * d'animation par défaut de chaque action de déplacement (`CONFIG.Token.movement.actions[*]
 * .getAnimationOptions`, client/game.mjs:825). Purement visuel et local à chaque client : aucun
 * document n'est écrit, le moteur de combat (qui lit `_source`) n'en voit rien.
 */
import { setting } from "../shared.mjs";
import { segmentPlan } from "../core/motion.mjs";
import { settled, smoothDamp2D, viewAhead } from "../core/camera.mjs";

/* -------------------------------------------- */
/*  Tracé du chemin                             */
/* -------------------------------------------- */

const TEXTURE_SIZE = 128;
let softTexture = null;

/**
 * Pastille blanche aux bords fondus, teintée ensuite par la couleur de la case (vert / jaune / rouge
 * de dnd5e). Une seule petite texture pour toute la partie : le coût de dessin reste celui du cœur,
 * un polygone par case.
 */
function cellTexture() {
  if ( softTexture?.valid ) return softTexture;
  const c = document.createElement("canvas");
  c.width = c.height = TEXTURE_SIZE;
  const ctx = c.getContext("2d");
  ctx.filter = "blur(6px)";
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(9, 9, TEXTURE_SIZE - 18, TEXTURE_SIZE - 18, 24);
  ctx.fill();
  softTexture = PIXI.Texture.from(c);
  return softTexture;
}

/**
 * Habille le style de case que rend la règle du système (couleur selon la vitesse, dnd5e
 * module/canvas/ruler.mjs:74) : même couleur, pastille fondue à la place de l'aplat.
 */
function soften(style, offset) {
  if ( !setting("softPath") || !(style.alpha > 0) || (style.texture && (style.texture !== PIXI.Texture.WHITE)) ) {
    return style;
  }
  const vertices = canvas.grid.getVertices(offset);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for ( const { x, y } of vertices ) {
    if ( x < minX ) minX = x;
    if ( x > maxX ) maxX = x;
    if ( y < minY ) minY = y;
    if ( y > maxY ) maxY = y;
  }
  const s = TEXTURE_SIZE;
  return {
    ...style,
    alpha: style.alpha * 0.85,
    texture: cellTexture(),
    matrix: new PIXI.Matrix((maxX - minX) / s, 0, 0, (maxY - minY) / s, minX, minY)
  };
}

/** À l'étape `setup` : le système a posé sa classe de règle à son `init` (dnd5e.mjs:86). */
export function installRuler() {
  const Base = CONFIG.Token.rulerClass;
  if ( !Base ) return;
  CONFIG.Token.rulerClass = class DarshTokenRuler extends Base {
    /**
     * Hors combat, ni chemin ni règle : chemin, tirets et étiquettes suivent cette visibilité
     * (client/canvas/placeables/tokens/ruler.mjs:181). L'outil « Règle » de mesure est une autre classe.
     * @override — client/canvas/placeables/tokens/base-ruler.mjs:79
     */
    get isVisible() {
      return super.isVisible && (setting("rulerOutOfCombat") || inCombat());
    }

    /** @override — client/canvas/placeables/tokens/ruler.mjs:767 */
    _getGridHighlightStyle(waypoint, offset) {
      return soften(super._getGridHighlightStyle(waypoint, offset), offset);
    }
  };
}

/**
 * Un combat lancé qui a au moins un combattant sur la scène affichée. Un combat lancé mais vide, ou sans
 * scène et sans combattant ici, ne compte pas : le suivi de combat n'en montre rien (cas trouvé dans `dnd-6`).
 */
function inCombat() {
  const id = canvas.scene?.id;
  return game.combats.some(c => c.started && c.combatants.some(cb => (cb.sceneId ?? cb.token?.parent?.id) === id));
}

/** Redessine les règles affichées (changement de réglage, début ou fin de combat). */
export function refreshRulers() {
  if ( !canvas.ready ) return;
  for ( const token of canvas.tokens.placeables ) token.renderFlags.set({ refreshRuler: true, refreshState: true });
}

/* -------------------------------------------- */
/*  Déplacement des tokens                      */
/* -------------------------------------------- */

/** Durée de la montée en vitesse et du freinage (ms). */
const RAMP = 260;

/** Plan par déplacement : clé = l'objet `document.movement` de l'opération (gelé, un par mise à jour). */
const plans = new WeakMap();

/**
 * Durée d'un tronçon à vitesse constante, comme le cœur la calcule
 * (client/canvas/placeables/token.mjs:2232, `#getMovementAnimationDuration`).
 */
function linearDuration(from, to, speed) {
  const size = canvas.dimensions.size;
  const dz = ((from.elevation ?? 0) - (to.elevation ?? 0)) * canvas.dimensions.distancePixels;
  const dist = Math.hypot(from.x - to.x, from.y - to.y, dz) / size;
  const resize = Math.hypot((from.width ?? 0) - (to.width ?? 0), (from.height ?? 0) - (to.height ?? 0),
    (from.depth ?? 0) - (to.depth ?? 0)) * 0.5;
  return Math.max(dist, resize) / speed * 1000;
}

/**
 * Les tronçons tels que le cœur les anime : chaque point franchi, sauf les intermédiaires non
 * explicites (client/canvas/placeables/token.mjs:3698). Les arrêts ajoutés pour les régions qui
 * écoutent l'entrée/sortie d'animation ne sont pas reproduits : dans ce cas, pas d'adoucissement.
 */
function buildPlan(document, movement, original) {
  const object = document.object;
  if ( !object ) return null;
  const animated = document.parent?.regions?.some(r => !r.hidden && r.behaviors.some(b => !b.disabled
    && (b.hasEvent(CONST.REGION_EVENTS.TOKEN_ANIMATE_IN) || b.hasEvent(CONST.REGION_EVENTS.TOKEN_ANIMATE_OUT))));
  if ( animated ) return null;
  const forced = movement.updateOptions?.animation?.movementSpeed;
  const lengths = [];
  let from = movement.origin;
  for ( const waypoint of movement.passed.waypoints ) {
    if ( waypoint.intermediate && !waypoint.explicit ) continue;
    const base = original[waypoint.action]?.(document) ?? {};
    if ( base.duration !== undefined ) return null;   // action sans animation (téléportation…)
    let speed = (forced ?? base.movementSpeed ?? CONFIG.Token.movement.defaultSpeed) * (base.speedMultiplier ?? 1);
    if ( waypoint.terrain instanceof foundry.data.TerrainData ) speed /= Math.min(waypoint.terrain.difficulty, 10);
    if ( !(speed > 0) || !Number.isFinite(speed) ) return null;
    lengths.push(linearDuration(from, waypoint, speed));
    from = waypoint;
  }
  if ( !lengths.length ) return null;
  // Suite d'un déplacement encore en cours : pas de nouveau départ arrêté. D'autres tronçons à venir : pas de freinage.
  const accel = !object.animationContexts?.has(object.movementAnimationName);
  const decel = movement.state !== "pending";
  return { steps: segmentPlan(lengths, RAMP, { accel, decel }), next: 0 };
}

/**
 * À l'`init`, après celui du système (dnd5e pose les siennes à son `init`, dnd5e.mjs:278) : le cœur gèle
 * ces objets avant `setup` (client/game.mjs:812, `#initializeMovementActions`).
 *
 * Enveloppe les options d'animation par défaut de chaque action de déplacement. Le cœur les demande
 * une fois par tronçon, dans l'ordre du chemin (client/canvas/placeables/token.mjs:2124) : on y ajoute
 * la durée et la courbe du tronçon. Les options données explicitement par l'appelant gardent la main.
 */
export function installMotion() {
  const original = {};
  for ( const [action, config] of Object.entries(CONFIG.Token.movement.actions) ) {
    // Pas encore de fonction : celle que le cœur poserait (client/game.mjs:825), sur le multiplicateur déclaré.
    const { speedMultiplier = 1 } = config;
    const base = config.getAnimationOptions ?? (() => ({ speedMultiplier }));
    if ( typeof base !== "function" ) continue;
    original[action] = base;
    config.getAnimationOptions = function(document, ...rest) {
      const options = base.call(this, document, ...rest);
      try {
        if ( !setting("smoothMovement") || (options?.duration !== undefined) || !canvas.ready ) return options;
        const movement = document?.movement;
        if ( !movement?.passed?.waypoints?.length || (movement.state === "planned") ) return options;
        let plan = plans.get(movement);
        if ( plan === undefined ) {
          plan = buildPlan(document, movement, original);
          plans.set(movement, plan);
        }
        const step = plan?.steps[plan.next++];
        if ( !step ) return options;
        return { ...options, duration: step.duration, easing: step.easing };
      } catch(err) {
        console.error("darsh-dnd-ui | déplacement adouci", err);
        return options;
      }
    };
  }
}

/* -------------------------------------------- */
/*  Caméra                                      */
/* -------------------------------------------- */

/** Temps de réponse de la caméra (s) : elle part et freine en douceur. */
const CAMERA_SMOOTH_TIME = 0.45;
/** Vitesse maximale de la caméra, en cases par seconde : loin du token, elle met le temps qu'il faut. */
const CAMERA_MAX_CELLS_PER_SECOND = 9;
/** Écart (px du monde) entre la vue et la dernière position posée au-delà duquel on considère que le joueur a bougé la vue. */
const CAMERA_USER_PAN = 2;

/** Le suivi en cours : un seul à la fois, réutilisé quand le token repart (la vitesse est gardée, pas d'à-coup). */
let follow = null;

function stopFollow() {
  if ( !follow ) return;
  canvas.app?.ticker?.remove(follow.tick);
  follow = null;
}

/** L'arrivée d'un déplacement : le dernier point encore à parcourir (une marche du moteur passe case par case), sinon sa destination. */
function goalOf(document, movement) {
  const last = movement.pending?.waypoints?.at(-1) ?? movement.destination;
  return document.getCenterPoint(last);
}

/**
 * À chaque image. Deux modes :
 * - `follow` : la vue rejoint le centre AFFICHÉ du token (sa position animée, pas sa destination), par un ressort amorti à
 *   vitesse plafonnée (core/camera.mjs) ;
 * - `hold` : la vue est plus près de l'arrivée que le token — elle attend (en freinant si elle bougeait), le token vient
 *   vers elle ; dès qu'il est au moins aussi près de l'arrivée qu'elle, elle le suit (elle avance avec lui, sans reculer).
 * Le suivi cesse quand c'est fini, quand le joueur déplace la vue lui-même, ou quand le token disparaît.
 */
function followTick() {
  const f = follow;
  if ( !f ) return;
  const object = f.document.object;
  if ( !canvas.ready || !object || object.destroyed || (f.document.parent !== canvas.scene) ) return stopFollow();
  const pivot = canvas.stage.pivot;
  if ( Math.hypot(pivot.x - f.position.x, pivot.y - f.position.y) > CAMERA_USER_PAN ) return stopFollow();
  const moving = (f.document.movement?.state === "pending") || (performance.now() - f.lastMove < 400);
  const center = object.center;
  // Le token a rattrapé la vue (ou s'est arrêté) : elle le suit.
  if ( (f.mode === "hold") && (!moving || !viewAhead(f.position, center, f.goal)) ) f.mode = "follow";
  const target = (f.mode === "hold") ? f.position : center;
  const dt = Math.min(canvas.app.ticker.deltaMS / 1000, 0.1);
  const maxSpeed = canvas.grid.size * CAMERA_MAX_CELLS_PER_SECOND;
  const step = smoothDamp2D(f.position, target, f.velocity, CAMERA_SMOOTH_TIME, maxSpeed, dt);
  f.velocity = step.velocity;
  if ( Math.hypot(step.position.x - f.position.x, step.position.y - f.position.y) > 0.01 ) {
    canvas.pan({ x: step.position.x, y: step.position.y });
    // `pan` arrondit et borne la vue : on repart de ce qu'il a réellement posé.
    f.position = { x: canvas.stage.pivot.x, y: canvas.stage.pivot.y };
  }
  if ( (f.mode === "follow") && !moving && settled(f.position, center, f.velocity, { distance: 2 }) ) stopFollow();
}

/**
 * Suit le token qui se déplace (voir `followTick`).
 * Joueur : ses propres tokens, quel que soit celui qui les déplace. MJ : le token qu'il contrôle et
 * déplace lui-même.
 * @param {TokenDocument} document
 * @param {object} movement   Le déplacement (hook `moveToken`).
 * @param {User} user         Qui l'a lancé.
 */
export function followToken(document, movement, user) {
  if ( !setting("cameraFollow") || !canvas.ready || (document.parent !== canvas.scene) ) return;
  const object = document.object;
  if ( !object?.visible ) return;
  const mine = game.user.isGM ? (object.controlled && (user?.id === game.user.id)) : document.isOwner;
  if ( !mine ) return;
  if ( game.user.isGM && (canvas.tokens.controlled.length > 1) ) return;
  const pivot = { x: canvas.stage.pivot.x, y: canvas.stage.pivot.y };
  const goal = goalOf(document, movement);
  if ( follow && (follow.document === document) ) {
    follow.lastMove = performance.now();
    follow.position = pivot;
    // Nouvelle arrivée (un autre clic) : on refait le choix, depuis où sont la vue et le token maintenant.
    if ( (goal.x !== follow.goal.x) || (goal.y !== follow.goal.y) ) {
      follow.goal = goal;
      follow.mode = viewAhead(pivot, object.center, goal) ? "hold" : "follow";
    }
    return;
  }
  stopFollow();
  follow = { document, goal, mode: viewAhead(pivot, object.center, goal) ? "hold" : "follow",
    position: pivot, velocity: { x: 0, y: 0 }, lastMove: performance.now(), tick: followTick };
  canvas.app.ticker.add(followTick);
}

/**
 * Chez le client qui lance le déplacement : le cœur recentre lui-même la vue, d'un panoramique rapide, sur un token contrôlé
 * qui bouge hors de l'écran (client/canvas/placeables/token.mjs:4027-4030, `panCanvas`). Quand notre caméra suit ce token,
 * on coupe ce recentrage par l'option prévue (`pan: false`, transmise aux autres clients avec la mise à jour).
 * @param {TokenDocument} document
 * @param {object} changes
 * @param {object} options    Options de la mise à jour (modifiables ici).
 */
export function quietCorePan(document, changes, options) {
  if ( !setting("cameraFollow") || !["x", "y"].some(k => k in changes) ) return;
  if ( options.pan !== undefined ) return;
  const object = document.object;
  if ( !object?.controlled ) return;
  if ( game.user.isGM && (canvas.tokens.controlled.length > 1) ) return;
  options.pan = false;
}

/** Arrêter le suivi (changement de scène, plateau redessiné). */
export function stopCameraFollow() {
  stopFollow();
}
