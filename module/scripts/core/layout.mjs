/**
 * Disposition de la Barre, pure (testée par Vitest). Stockée dans un flag d'acteur
 * (`flags["darsh-dnd-ui"].layout`, SPEC §5.6) ; chaque fonction rend une nouvelle disposition.
 *
 * Une case contient une référence relative à l'acteur : "Item.<id>", "Item.<id>.Activity.<id>" ou
 * "Macro.<id>" (monde). Les conteneurs sont des listes à trous, remplies ligne par ligne : la place i est
 * en (i % colonnes, ⌊i / colonnes⌋). Réduire un conteneur ne perd rien : les cases au-delà sont gardées,
 * seulement masquées.
 */

/** 2 : les aptitudes passives qui portent une activité ont quitté la vue par défaut (0.12.0, `withdrawRefs`). */
export const VERSION = 2;

/** Conteneurs de la vue par défaut, de gauche à droite (capture : Commun, Classe, Objets). */
export const CONTAINERS = ["common", "class", "items"];

/** Largeurs par défaut en colonnes (capture : ≈ 7 / 5 / 2). */
export const DEFAULT_WIDTHS = { common: 7, class: 5, items: 2 };

export const MIN_ROWS = 1;
export const MAX_ROWS = 4;

/**
 * Onglets qui sont aussi des conteneurs à part entière (demande de l'utilisateur, 2026-09-27) : remplis au départ
 * avec ce qui s'y range, puis réorganisables et épurables comme le reste. Clés sans point (`tab_common`) : Foundry
 * développerait une clé pointée en objet à l'écriture du flag.
 */
export const TABS = ["common", "class", "items", "passives"];
export const tabContainer = tab => `tab_${tab}`;
export const isTabContainer = container => typeof container === "string" && container.startsWith("tab_");

export function emptyLayout() {
  return {
    v: VERSION,
    rows: 2,
    locked: false,
    widths: { ...DEFAULT_WIDTHS },
    cells: {
      common: [], class: [], items: [], custom: [],
      ...Object.fromEntries(TABS.map(t => [tabContainer(t), []]))
    },
    known: [],
    tabKnown: Object.fromEntries(TABS.map(t => [tabContainer(t), []])),
    weapons: { sets: [[null, null], [null, null]], active: 0 }
  };
}

/** Complète une disposition lue (ancienne, partielle ou absente). */
export function normalize(raw) {
  const base = emptyLayout();
  if ( !raw || typeof raw !== "object" ) return base;
  const out = {
    ...base,
    ...raw,
    widths: { ...base.widths, ...(raw.widths ?? {}) },
    cells: { ...base.cells, ...(raw.cells ?? {}) },
    weapons: {
      active: raw.weapons?.active === 1 ? 1 : 0,
      sets: [0, 1].map(s => [0, 1].map(h => raw.weapons?.sets?.[s]?.[h] ?? null))
    },
    v: Number(raw.v) || 1,
    known: Array.isArray(raw.known) ? [...raw.known] : [],
    tabKnown: Object.fromEntries(TABS.map(t => {
      const k = tabContainer(t);
      return [k, Array.isArray(raw.tabKnown?.[k]) ? [...raw.tabKnown[k]] : []];
    }))
  };
  out.rows = clamp(Number(out.rows) || 2, MIN_ROWS, MAX_ROWS);
  for ( const c of CONTAINERS ) out.widths[c] = Math.max(1, Math.round(Number(out.widths[c]) || 1));
  for ( const k of Object.keys(out.cells) ) out.cells[k] = Array.isArray(out.cells[k]) ? [...out.cells[k]] : [];
  return out;
}

/** Colonnes d'un conteneur (Personnalisé et les onglets prennent toute la largeur). */
export function columnsOf(layout, container) {
  if ( container === "custom" || isTabContainer(container) ) return totalColumns(layout);
  return layout.widths[container] ?? 1;
}

/**
 * Glisser d'un conteneur à l'autre : déplacement (ou échange) dans la vue par défaut et à l'intérieur d'un même
 * conteneur ; copie sinon (d'un onglet vers la vue par défaut ou Personnalisé, l'icône reste dans son onglet).
 */
export function isMove(from, to) {
  if ( from === to ) return true;
  return CONTAINERS.includes(from) && CONTAINERS.includes(to);
}

/**
 * Remplissage d'un onglet : ce qui s'y range et n'y a jamais été placé va dans la première place libre (l'onglet
 * s'allonge au besoin). Retiré à la main, un objet ne revient pas (`tabKnown`).
 * @param {string[]} refs   Ce qui se range dans l'onglet, dans l'ordre voulu.
 */
export function populateTab(layout, tab, refs) {
  const key = tabContainer(tab);
  const known = new Set(layout.tabKnown?.[key] ?? []);
  const present = new Set((layout.cells[key] ?? []).filter(Boolean));
  const fresh = refs.filter(r => !known.has(r) && !present.has(r));
  if ( !fresh.length ) return { layout, changed: false };
  const out = clone(layout);
  const list = out.cells[key] ??= [];
  out.tabKnown ??= {};
  const mark = out.tabKnown[key] ??= [];
  let i = 0;
  for ( const ref of fresh ) {
    while ( list[i] ) i++;
    list[i] = ref;
    mark.push(ref);
  }
  for ( let j = 0; j < list.length; j++ ) list[j] ??= null;
  return { layout: out, changed: true };
}

export function totalColumns(layout) {
  return CONTAINERS.reduce((n, c) => n + layout.widths[c], 0);
}

export function capacity(layout, container) {
  return columnsOf(layout, container) * layout.rows;
}

/** Toutes les références présentes dans la vue par défaut. */
export function placedRefs(layout) {
  return new Set(CONTAINERS.flatMap(c => layout.cells[c]).filter(Boolean));
}

/** Pose une référence à une place (écrase ce qui s'y trouvait). */
export function place(layout, container, index, ref) {
  const out = clone(layout);
  const list = out.cells[container] ??= [];
  while ( list.length <= index ) list.push(null);
  list[index] = ref;
  return out;
}

export function remove(layout, container, index) {
  const out = clone(layout);
  if ( out.cells[container]?.[index] !== undefined ) out.cells[container][index] = null;
  return out;
}

/** Déplace une case vers une autre ; si la destination est occupée, les deux s'échangent. */
export function move(layout, from, to) {
  if ( (from.container === to.container) && (from.index === to.index) ) return layout;
  const out = clone(layout);
  const a = out.cells[from.container] ??= [];
  const b = out.cells[to.container] ??= [];
  const moving = a[from.index] ?? null;
  const there = b[to.index] ?? null;
  while ( b.length <= to.index ) b.push(null);
  b[to.index] = moving;
  a[from.index] = there;
  return out;
}

/**
 * Remplissage automatique (SPEC §5.6) : chaque entrée jamais placée va dans la première place libre de
 * son conteneur, sans jamais déplacer ce que le joueur a posé. Une entrée placée est retenue (`known`) :
 * retirée à la main, elle ne revient pas.
 * @param {{ref: string, container: string}[]} entries
 * @returns {{layout: object, changed: boolean}}
 */
export function populate(layout, entries) {
  let out = layout;
  let changed = false;
  const known = new Set(layout.known);
  const placed = placedRefs(layout);
  for ( const { ref, container } of entries ) {
    if ( known.has(ref) || placed.has(ref) || !CONTAINERS.includes(container) ) continue;
    const list = out.cells[container] ?? [];
    const cap = capacity(out, container);
    let index = -1;
    for ( let i = 0; i < cap; i++ ) if ( !list[i] ) { index = i; break; }
    if ( index < 0 ) continue;                    // plein : on réessaiera quand il y aura de la place
    out = place(out, container, index, ref);
    out.known.push(ref);
    known.add(ref);
    placed.add(ref);
    changed = true;
  }
  return { layout: out, changed };
}

/**
 * Oublie les références qui n'existent plus (objet supprimé, activité retirée).
 * @param {Set<string>} valid
 */
export function cleanup(layout, valid) {
  let changed = false;
  const out = clone(layout);
  for ( const k of Object.keys(out.cells) ) {
    out.cells[k] = out.cells[k].map(ref => {
      if ( ref && !valid.has(ref) && !ref.startsWith("Macro.") ) { changed = true; return null; }
      return ref;
    });
  }
  const known = out.known.filter(ref => valid.has(ref));
  if ( known.length !== out.known.length ) changed = true;
  out.known = known;
  for ( const [k, list] of Object.entries(out.tabKnown ?? {}) ) {
    const kept = list.filter(ref => valid.has(ref));
    if ( kept.length !== list.length ) { out.tabKnown[k] = kept; changed = true; }
  }
  for ( const set of out.weapons.sets ) {
    for ( let h = 0; h < 2; h++ ) if ( set[h] && !valid.has(set[h]) ) { set[h] = null; changed = true; }
  }
  return { layout: out, changed };
}

/**
 * Passage à la version 2 : retire des conteneurs remplis automatiquement (vue par défaut, onglets Commun, Classe,
 * Objets) les références données — Personnalisé et l'onglet Passifs gardent tout. Elles restent connues : le
 * remplissage ne les remet pas.
 * @param {Set<string>} refs
 */
export function withdrawRefs(layout, refs) {
  const out = clone(layout);
  const containers = [...CONTAINERS, ...["common", "class", "items"].map(tabContainer)];
  for ( const k of containers ) {
    out.cells[k] = (out.cells[k] ?? []).map(ref => (ref && refs.has(ref) ? null : ref));
  }
  out.v = VERSION;
  return out;
}

/** Tire la barre rouge entre deux conteneurs voisins : l'un gagne ce que l'autre perd (1 colonne au moins). */
export function resize(layout, left, right, delta) {
  const a = layout.widths[left] + delta;
  const b = layout.widths[right] - delta;
  if ( a < 1 || b < 1 || !delta ) return layout;
  const out = clone(layout);
  out.widths[left] = a;
  out.widths[right] = b;
  return out;
}

export function setRows(layout, rows) {
  const n = clamp(rows, MIN_ROWS, MAX_ROWS);
  if ( n === layout.rows ) return layout;
  return { ...clone(layout), rows: n };
}

/** Jeux d'armes : 2 jeux × (main principale, main secondaire). */
export function setWeapon(layout, set, hand, ref) {
  const out = clone(layout);
  // Une même arme n'est que dans une main d'un jeu à la fois.
  for ( const s of out.weapons.sets ) for ( let h = 0; h < 2; h++ ) if ( ref && s[h] === ref ) s[h] = null;
  out.weapons.sets[set][hand] = ref;
  return out;
}

export function setActiveWeapons(layout, set) {
  const out = clone(layout);
  out.weapons.active = set === 1 ? 1 : 0;
  return out;
}

/**
 * Premier remplissage des jeux d'armes : armes équipées dans le jeu 1, première arme à distance restante
 * dans le jeu 2 (SPEC §5.7). Ne fait rien si un jeu est déjà rempli.
 * @param {{ref: string, equipped: boolean, ranged: boolean}[]} weapons
 */
export function seedWeapons(layout, weapons) {
  if ( layout.weapons.sets.flat().some(Boolean) || !weapons.length ) return { layout, changed: false };
  const out = clone(layout);
  const equipped = weapons.filter(w => w.equipped).slice(0, 2);
  equipped.forEach((w, i) => { out.weapons.sets[0][i] = w.ref; });
  const ranged = weapons.find(w => w.ranged && !equipped.includes(w));
  if ( ranged ) out.weapons.sets[1][0] = ranged.ref;
  return { layout: out, changed: true };
}

/**
 * Clé stable d'une forme (Forme sauvage, métamorphose) : l'empreinte des objets que la forme apporte, absents
 * de l'acteur d'origine. dnd5e recopie les objets de la créature source avec leurs ids (documents/actor/actor.mjs,
 * `transformInto` : `items: sourceData.items`) : la même forme redonne la même clé, transformation après
 * transformation, alors que l'acteur transformé, lui, est recréé à chaque fois.
 * @param {string[]} shapedIds     Ids des objets de l'acteur transformé (hors objets posés à chaque fois).
 * @param {string[]} originalIds   Ids des objets de l'acteur d'origine.
 * @returns {string|null}          null si la forme n'apporte aucun objet.
 */
export function formKey(shapedIds, originalIds) {
  const own = new Set(originalIds);
  const ids = [...new Set(shapedIds)].filter(id => !own.has(id)).sort();
  if ( !ids.length ) return null;
  let h = 5381;
  for ( const ch of ids.join(",") ) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0;
  return `f${h.toString(36)}`;
}

function clone(layout) {
  return typeof structuredClone === "function" ? structuredClone(layout) : JSON.parse(JSON.stringify(layout));
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}
