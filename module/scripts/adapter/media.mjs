/**
 * Vignettes des tokens vidéo (voir core/media.mjs). Une vidéo n'entre jamais dans une balise `<img>` : on y met une image fixe,
 * la première image de la vidéo calculée une fois par le cœur — comme son propre suivi de combat
 * (`CombatTracker#_getCombatantThumbnail`, client/applications/sidebar/tabs/combat-tracker.mjs:148) — par
 * `game.video.createThumbnail` (client/helpers/media/video-helper.mjs:190), qui la garde dans `game.video.thumbs`.
 * Pas de balise `<video>` : vingt combattants feraient vingt décodeurs vidéo pour des cartes de 60 px.
 */
import { stillFor, isVideoSrc } from "../core/media.mjs";

const SIZE = 200;
/** @type {Map<string, Promise<string|null>>} vignettes en cours de calcul, une seule fois par vidéo */
const pending = new Map();

function extensions() {
  return Object.keys(CONST.VIDEO_FILE_EXTENSIONS ?? {});
}

export function isVideo(src) {
  return isVideoSrc(src, extensions());
}

function cachedThumb(src) {
  return game.video?.thumbs?.get(src) ?? null;
}

/** Calcule (une fois) la vignette d'une vidéo ; null si le cœur n'y arrive pas (pas de canevas, fichier absent). */
export function thumbnailOf(src) {
  const done = cachedThumb(src);
  if ( done ) return Promise.resolve(done);
  if ( !pending.has(src) ) {
    pending.set(src, Promise.resolve()
      .then(() => game.video.createThumbnail(src, { width: SIZE, height: SIZE }))
      .catch(err => { console.warn(`darsh-dnd-ui | thumbnail failed for ${src}`, err); return null; })
      .finally(() => pending.delete(src)));
  }
  return pending.get(src);
}

/**
 * Source fixe tout de suite (pour un gabarit HTML) : l'image, la vignette déjà calculée ou l'image de repli. Lance le calcul de la
 * vignette s'il manque ; `onReady(thumb)` est appelé quand elle arrive.
 * @param {string} src
 * @param {string|null} fallback
 * @param {(thumb: string) => void} [onReady]
 */
export function stillSrc(src, fallback = null, onReady = null) {
  const r = stillFor({ src, extensions: extensions(), thumb: isVideo(src) ? cachedThumb(src) : null, fallback });
  if ( r.video ) thumbnailOf(src).then(t => { if ( t ) onReady?.(t); });
  return r.src ?? "";
}

/**
 * Pose dans une balise `<img>` l'image fixe de `src` ; pour une vidéo, l'image de repli d'abord, puis la vignette dès qu'elle est
 * prête — si la balise attend toujours cette vidéo (`data-video`).
 * @param {HTMLImageElement} img
 * @param {string} src
 * @param {string|null} fallback
 */
export function setStill(img, src, fallback = null) {
  if ( isVideo(src) ) img.dataset.video = src;
  else delete img.dataset.video;
  const still = stillSrc(src, fallback, thumb => {
    if ( img.dataset.video === src ) img.src = thumb;
  });
  if ( img.getAttribute("src") !== still ) {
    if ( still ) img.src = still;
    else img.removeAttribute("src");
  }
}
