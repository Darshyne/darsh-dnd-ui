/**
 * Où vit la disposition de la Barre d'un acteur (SPEC §5.6, « disposition par forme »).
 *
 * Un acteur transformé (Forme sauvage, métamorphose) est un acteur **nouveau à chaque transformation**,
 * qui recopie les flags de l'acteur d'origine (dnd5e 6, documents/actor/actor.mjs:2846-3106 : `flags: o.flags`,
 * `flags.dnd5e.originalActor`, `isPolymorphed`). Sa disposition est donc rangée **sur l'acteur d'origine**,
 * sous une clé propre à la forme (`flags["darsh-dnd-ui"].forms.<clé>`) : on la retrouve à la transformation
 * suivante dans la même forme, et le druide garde la sienne. La disposition recopiée sur l'acteur transformé
 * (celle du druide) est ignorée.
 */
import { formKey } from "../core/layout.mjs";
import { MODULE_ID } from "../shared.mjs";

/**
 * @returns {{host: Actor, key: string|null, form: string|null}}
 *   host : l'acteur qui porte la disposition ; key : la clé de forme (null : acteur ordinaire).
 */
export function layoutHost(actor) {
  if ( !actor?.isPolymorphed ) return { host: actor, key: null, form: null };
  const original = game.actors.get(actor.getFlag("dnd5e", "originalActor"));
  if ( !original ) return { host: actor, key: null, form: null };
  // Objets neufs (ids neufs) à chaque transformation, vus en jeu — la clé changeait d'une fois à l'autre :
  // l'action « Reprendre sa forme » et les actions de base du moteur (Foncer, Esquiver…), et la « Temporary
  // Class » que dnd5e crée pour une forme de PNJ. Les classes décrivent le personnage, pas la forme.
  // Hors de l'empreinte : elle ne garde que les objets venus de la créature source (ids conservés).
  const posted = i => i.getFlag?.("dnd5e-combat", "revertForm") || i.getFlag?.("dnd5e-combat", "basicAction")
    || ["class", "subclass"].includes(i.type);
  const ids = actor.items.filter(i => !posted(i)).map(i => i.id);
  const key = formKey(ids, original.items.map(i => i.id));
  return key ? { host: original, key, form: actor.name } : { host: actor, key: null, form: null };
}

export function readLayout({ host, key }) {
  return key ? host?.getFlag(MODULE_ID, `forms.${key}`) : host?.getFlag(MODULE_ID, "layout");
}

export function writeLayout({ host, key }, layout) {
  return key ? host.setFlag(MODULE_ID, `forms.${key}`, layout) : host.setFlag(MODULE_ID, "layout", layout);
}
