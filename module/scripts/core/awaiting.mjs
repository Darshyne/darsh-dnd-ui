/**
 * Issue #35 (moteur §381) : qui la table attend — un sablier sur le portrait du Groupe et sur la case de la Frise de la créature dont la
 * fenêtre de réaction, de choix ou de jet est ouverte. Le moteur publie la liste (`api.ui.awaiting()`) et dit, pour ce client, ce qu'il
 * en montre (`shown`) : l'interface ne montre que ce que le moteur montre sur le token (« token ») — jamais une décision secrète du MJ
 * pour un monstre, ni rien quand le joueur a masqué le sablier chez lui.
 *
 * Pur : aucune dépendance à Foundry.
 */

const lastId = uuid => (typeof uuid === "string" ? uuid.split(".").pop() : null);

/**
 * Les créatures attendues, par id de token et par id d'acteur, avec le nom de qui doit répondre.
 * @param {Array<{token?: string|null, actor?: string|null, userName?: string, shown?: string}>} list
 * @returns {{tokens: Map<string, string[]>, actors: Map<string, string[]>}}
 */
export function awaitedKeys(list) {
  const tokens = new Map();
  const actors = new Map();
  const add = (map, key, name) => {
    if ( !key ) return;
    const names = map.get(key) ?? [];
    if ( name && !names.includes(name) ) names.push(name);
    map.set(key, names);
  };
  for ( const entry of Array.isArray(list) ? list : [] ) {
    if ( entry?.shown !== "token" ) continue;
    add(tokens, lastId(entry.token), entry.userName ?? "");
    // L'acteur d'un token non lié porte l'uuid du token : seul un acteur du monde (`Actor.<id>`) se reconnaît par son id.
    if ( typeof entry.actor === "string" && /^Actor\.[^.]+$/.test(entry.actor) ) add(actors, lastId(entry.actor), entry.userName ?? "");
  }
  return { tokens, actors };
}

/**
 * Cette créature est-elle attendue ? Rend les noms de qui doit répondre (peut-être vide), ou null.
 * @param {{tokens: Map, actors: Map}} keys
 * @param {{tokenId?: string|null, actorId?: string|null}} ids
 * @returns {string[]|null}
 */
export function awaitedNames(keys, { tokenId=null, actorId=null }={}) {
  const names = (tokenId && keys?.tokens?.get(tokenId)) ?? (actorId && keys?.actors?.get(actorId)) ?? null;
  return names ? [...names] : null;
}
