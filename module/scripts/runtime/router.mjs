/**
 * Routeur de hooks : un seul écouteur Foundry par hook, les fonctionnalités s'y inscrivent dans
 * l'ordre de leur enregistrement. Une erreur dans l'une n'empêche pas les suivantes.
 */
import { log } from "../shared.mjs";

const routes = new Map();

/**
 * @param {string} hook     Nom du hook Foundry.
 * @param {string} name     Nom de la fonctionnalité (journaux, inspection).
 * @param {Function} fn
 */
export function route(hook, name, fn) {
  let list = routes.get(hook);
  if ( !list ) {
    list = [];
    routes.set(hook, list);
    Hooks.on(hook, (...args) => {
      for ( const r of list ) {
        try { r.fn(...args); }
        catch(err) { log.error(`${hook} → ${r.name}`, err); }
      }
    });
  }
  list.push({ name, fn });
}

/** Qui écoute quoi, dans l'ordre. */
export function listRoutes() {
  return Object.fromEntries([...routes].map(([hook, list]) => [hook, list.map(r => r.name)]));
}
