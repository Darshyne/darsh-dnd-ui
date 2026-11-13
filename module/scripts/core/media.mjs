/**
 * Images de token qui sont des vidéos (2026-11-13, journal §64) : une texture de token peut être un `.webm` (DAS · Animations 0.15.0
 * met un asset animé de JB2A sur les invocations ; un MJ peut en poser un lui-même). Une balise `<img>` ne lit pas une vidéo : elle
 * s'affiche cassée. Pur : la liste des extensions vient du cœur (`CONST.VIDEO_FILE_EXTENSIONS`, common/constants.mjs:1654), passée
 * par l'adaptateur.
 */

/**
 * Le chemin désigne-t-il une vidéo ? Même règle que le cœur (`VideoHelper.hasVideoExtension`,
 * client/helpers/media/video-helper.mjs:100) : l'extension, suivie ou non d'une requête `?…`, sans tenir compte de la casse.
 * @param {string} src
 * @param {string[]} extensions   ex. ["m4v", "mp4", "ogv", "webm"]
 */
export function isVideoSrc(src, extensions) {
  if ( !src || (typeof src !== "string") || !extensions?.length ) return false;
  const path = src.split(/[?#]/)[0].toLowerCase();
  return extensions.some(ext => path.endsWith(`.${String(ext).toLowerCase()}`));
}

/**
 * Ce qu'une balise `<img>` doit montrer pour `src` : l'image elle-même ; pour une vidéo, sa vignette (première image, déjà
 * calculée) si elle existe, sinon l'image de repli (le portrait de l'acteur), sinon rien.
 * @param {object} args
 * @param {string} args.src
 * @param {string[]} args.extensions
 * @param {string|null} [args.thumb]      vignette déjà calculée pour cette vidéo
 * @param {string|null} [args.fallback]   image fixe de repli
 * @returns {{ src: string|null, video: boolean }}  `video` : il faudra calculer la vignette (si `thumb` manquait)
 */
export function stillFor({ src, extensions, thumb = null, fallback = null }) {
  if ( !isVideoSrc(src, extensions) ) return { src: src || fallback || null, video: false };
  if ( thumb ) return { src: thumb, video: false };
  const still = isVideoSrc(fallback, extensions) ? null : (fallback || null);
  return { src: still, video: true };
}
