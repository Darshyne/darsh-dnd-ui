/**
 * Socle de tests DAS — COUCHES. Fichier COPIÉ tel quel depuis le dépôt du moteur (`tools/contract/das-layers.test.mjs`) :
 * ne pas le modifier ici. Dans le moteur, `node tools/contract/sync.mjs` le recopie dans tous les modules ; les règles
 * propres à un module (elles diffèrent : voir `prive/ARCHITECTURE.md` §1 de chacun) vont dans `tests/das-tests.json`,
 * section `"layers"`. Une règle que le réglage ne déclare pas est sautée.
 *
 * Les couches tiennent par leurs imports et par ce que leur code nomme, pas par convention. Un « dossier » est le premier
 * dossier sous `module/scripts/` (`runtime/diagnostic/x.mjs` est dans `runtime`) ; `"."` désigne les fichiers posés à la
 * racine de `module/scripts/` (point d'entrée, `shared.mjs`…).
 *
 * Réglage, `tests/das-tests.json` :
 *   "layers": {
 *     "imports": { "core": [".", "adapter", "runtime", "ui"], "runtime": ["ui"] },   // dossier → dossiers qu'il n'importe jamais
 *     "pure": { "folders": ["core"], "globals": ["PIXI", "navigator."], "ignoreTemplates": false },
 *         // dossiers purs : aucun global de Foundry (game, canvas, Hooks, CONFIG, foundry, ui.) ni ceux de "globals" en plus
 *         // ("nom." = seulement l'accès « nom.x » / « nom[x] »), et aucun import autre que relatif ; "ignoreTemplates" : le texte
 *         // entre accents graves (une macro générée, exécutée dans le jeu) n'est pas lu
 *     "router": "runtime/router.mjs",              // seul fichier où `Hooks.on(` est permis
 *     "names": [{ "name": "dnd5e-combat", "only": ["adapter/engine.mjs"], "why": "seul l'adaptateur parle au moteur" }],
 *     "forbid": [{ "name": "ecritures", "pattern": "\\bactor\\.update\\(", "in": ["ui/"], "strings": false, "why": "…" }],
 *         // motif interdit dans les fichiers dont le chemin commence par une entrée de "in" (défaut : tous)
 *     "except": { "imports:core/x.mjs → runtime/y.mjs": "raison", "pure:core/x.mjs:game": "raison",
 *                 "router:ui/x.mjs": "raison", "names:dnd5e-combat:ui/x.mjs": "raison", "forbid:ecritures:ui/x.mjs": "raison" }
 *   }
 */
import { describe, it, expect, vi } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

const ROOT = join(import.meta.dirname, "..");
// Ces tests lisent tout le code du module : sur le moteur (~510 fichiers), dans la passe complète où les autres fichiers de test
// occupent tous les cœurs, plusieurs secondes. Même délai que le chargement du module (tests/load.test.mjs du moteur).
vi.setConfig({ testTimeout: 60000 });
const SCRIPTS = join(ROOT, "module/scripts");
const configFile = join(ROOT, "tests/das-tests.json");
const CONFIG = existsSync(configFile) ? JSON.parse(readFileSync(configFile, "utf8")) : {};
const SETTINGS = CONFIG.layers ?? {};
const EXCEPT = SETTINGS.except ?? {};
const used = new Set();
const excepted = key => { if ( key in EXCEPT ) { used.add(key); return true; } return false; };

const posix = p => p.split(sep).join("/");
const filesUnder = dir => existsSync(dir) ? readdirSync(dir).sort().flatMap(name => {
  const full = join(dir, name);
  return statSync(full).isDirectory() ? filesUnder(full) : (name.endsWith(".mjs") ? [full] : []);
}) : [];
const lineOf = (text, index) => text.slice(0, index).split("\n").length;

/**
 * Le code sans commentaires (remplacés par des espaces : positions et lignes restent justes). Avec `strings: false`, le
 * contenu des chaînes est blanchi aussi (les guillemets restent ; le texte d'un `${…}` d'un gabarit reste du code).
 * Les expressions régulières littérales sont reconnues (un `"` ou un `//` dedans n'ouvre rien).
 */
function clean(src, { strings = true } = {}) {
  let out = "";
  let i = 0;
  const blank = s => s.replace(/[^\n]/g, " ");
  const keep = s => strings ? s : blank(s);
  const regexAllowed = () => {
    // Le dernier caractère significatif avant le `/` (lu à rebours : un `replace(/\s+$/)` sur tout le texte serait quadratique).
    let k = out.length - 1;
    while ( (k >= 0) && /\s/.test(out[k]) ) k--;
    if ( k < 0 ) return true;
    if ( "(,=:[!&|?{};+-*%<>~^".includes(out[k]) ) return true;
    return /\b(return|typeof|case|in|of|new|delete|void|throw|else|yield|await)$/.test(out.slice(Math.max(0, k - 9), k + 1));
  };
  const stack = [];   // pour chaque `${` ouvert dans un gabarit : la profondeur d'accolades à l'intérieur
  while ( i < src.length ) {
    const c = src[i];
    const next = src[i + 1];
    if ( (c === "/") && (next === "*") ) {
      const end = src.indexOf("*/", i + 2);
      const stop = end < 0 ? src.length : end + 2;
      out += blank(src.slice(i, stop)); i = stop;
    }
    else if ( (c === "/") && (next === "/") ) {
      const end = src.indexOf("\n", i);
      const stop = end < 0 ? src.length : end;
      out += blank(src.slice(i, stop)); i = stop;
    }
    else if ( (c === "/") && regexAllowed() ) {
      let j = i + 1;
      let inClass = false;
      while ( (j < src.length) && (src[j] !== "\n") ) {
        if ( src[j] === "\\" ) { j += 2; continue; }
        if ( src[j] === "[" ) inClass = true;
        else if ( src[j] === "]" ) inClass = false;
        else if ( (src[j] === "/") && !inClass ) break;
        j++;
      }
      out += src.slice(i, Math.min(j + 1, src.length)); i = j + 1;
    }
    else if ( (c === "\"") || (c === "'") ) {
      let j = i + 1;
      while ( (j < src.length) && (src[j] !== c) && (src[j] !== "\n") ) j += (src[j] === "\\") ? 2 : 1;
      const closed = src[j] === c;
      out += c + keep(src.slice(i + 1, j)) + (closed ? c : ""); i = closed ? j + 1 : j;
    }
    else if ( (c === "`") || ((c === "}") && stack.length && (stack.at(-1) === 0)) ) {
      // Début d'un gabarit, ou retour dans le gabarit à la fin d'un `${…}`.
      if ( c === "}" ) stack.pop();
      out += c;
      let j = i + 1;
      while ( (j < src.length) && (src[j] !== "`") && !((src[j] === "$") && (src[j + 1] === "{")) ) j += (src[j] === "\\") ? 2 : 1;
      out += keep(src.slice(i + 1, j));
      if ( src[j] === "`" ) { out += "`"; i = j + 1; }
      else if ( j < src.length ) { out += "${"; stack.push(0); i = j + 2; }
      else i = j;
    }
    else {
      if ( stack.length ) {
        if ( c === "{" ) stack[stack.length - 1]++;
        else if ( c === "}" ) stack[stack.length - 1]--;
      }
      out += c; i++;
    }
  }
  return out;
}

const FILES = filesUnder(SCRIPTS).map(full => {
  const source = readFileSync(full, "utf8");
  const path = posix(relative(SCRIPTS, full));
  return { full, path, folder: path.includes("/") ? path.split("/")[0] : ".", code: clean(source), bare: clean(source, { strings: false }) };
});
const inFolder = (f, entries) => entries.some(e => (e === ".") ? (f.folder === ".") : ((f.path === e) || f.path.startsWith(e.endsWith("/") ? e : `${e}/`)));
const rule = (declared, title, fn) => declared ? it(title, fn) : it.skip(`${title} (sauté : non déclaré dans tests/das-tests.json)`, fn);

/** Les imports d'un fichier : `{ spec, index }` (statiques, effets de bord, dynamiques à chemin écrit). */
const importsOf = f => [
  ...f.code.matchAll(/(?:^|[;}])\s*(?:import|export)\b[^;"'`]*?\bfrom\s*["']([^"']+)["']/gm),
  ...f.code.matchAll(/(?:^|[;}])\s*import\s*["']([^"']+)["']/gm),
  ...f.code.matchAll(/(?<![\w$.])import\(\s*["']([^"']+)["']\s*\)/g)
].map(m => ({ spec: m[1], index: m.index + m[0].lastIndexOf(m[1]) }));

describe("couches du module", () => {
  rule(SETTINGS.imports, "aucun dossier n'importe un dossier qui lui est interdit", () => {
    const problems = [];
    for ( const f of FILES ) {
      const forbidden = SETTINGS.imports[f.folder] ?? [];
      if ( !forbidden.length ) continue;
      for ( const { spec, index } of importsOf(f) ) {
        if ( !spec.startsWith(".") ) continue;
        const target = posix(relative(SCRIPTS, resolve(dirname(f.full), spec)));
        if ( target.startsWith("..") ) continue;
        const folder = target.includes("/") ? target.split("/")[0] : ".";
        if ( !forbidden.includes(folder) ) continue;
        const key = `imports:${f.path} → ${target}`;
        if ( excepted(key) ) continue;
        problems.push(`module/scripts/${f.path}:${lineOf(f.code, index)} — ${f.folder === "." ? "la racine" : `${f.folder}/`} importe ${target}`
          + ` (${folder === "." ? "racine" : `${folder}/`} lui est interdit) → passer par une couche permise (exception : "${key}")`);
      }
    }
    expect(problems, "imports entre couches interdits").toEqual([]);
  });

  rule(SETTINGS.pure, "les dossiers purs ne nomment aucun global de Foundry et n'importent que du relatif", () => {
    const pure = SETTINGS.pure;
    const names = ["game", "canvas", "Hooks", "CONFIG", "foundry", "ui.", ...(pure.globals ?? [])];
    const patterns = names.map(n => n.endsWith(".")
      ? { name: n.slice(0, -1), re: new RegExp(`(?<![\\w$.])${n.slice(0, -1)}\\s*(?:\\?\\.|[.[])`, "g") }
      // Le nom seul, mais pas une clé d'objet (`{ foundry: version }`) ni une propriété (`x.game`).
      : { name: n, re: new RegExp(`(?<![\\w$.])${n}(?![\\w$]|\\s*:(?!:))`, "g") });
    const problems = [];
    for ( const f of FILES.filter(f => inFolder(f, pure.folders ?? [])) ) {
      const text = pure.ignoreTemplates ? f.bare.replace(/`[\s\S]*?`/g, m => m.replace(/[^\n]/g, " ")) : f.bare;
      for ( const { name, re } of patterns ) for ( const m of text.matchAll(re) ) {
        const key = `pure:${f.path}:${name}`;
        if ( excepted(key) ) continue;
        problems.push(`module/scripts/${f.path}:${lineOf(text, m.index)} — « ${name} » dans un dossier pur → passer la valeur en argument depuis adapter/ ou runtime/ (exception : "${key}")`);
      }
      for ( const { spec, index } of importsOf(f) ) {
        if ( spec.startsWith(".") ) continue;
        const key = `pure:${f.path}:${spec}`;
        if ( excepted(key) ) continue;
        problems.push(`module/scripts/${f.path}:${lineOf(f.code, index)} — import non relatif « ${spec} » dans un dossier pur → l'importer hors du dossier pur (exception : "${key}")`);
      }
    }
    expect(problems, "dossiers purs qui touchent à Foundry").toEqual([]);
  });

  rule(SETTINGS.router, "Hooks.on n'apparaît que dans le routeur", () => {
    const problems = [];
    for ( const f of FILES.filter(f => f.path !== SETTINGS.router) ) {
      for ( const m of f.bare.matchAll(/(?<![\w$.])Hooks\s*\.\s*on\s*\(/g) ) {
        const key = `router:${f.path}`;
        if ( excepted(key) ) continue;
        problems.push(`module/scripts/${f.path}:${lineOf(f.bare, m.index)} — Hooks.on hors de ${SETTINGS.router} → inscrire l'écouteur auprès du routeur (exception : "${key}")`);
      }
    }
    expect(problems, "écouteurs posés hors du routeur").toEqual([]);
  });

  rule(SETTINGS.names?.length, "un nom réservé n'apparaît que dans ses fichiers (ex. : seul l'adaptateur nomme le moteur)", () => {
    const problems = [];
    for ( const { name, only = [], why = "" } of SETTINGS.names ) {
      for ( const f of FILES.filter(f => !only.includes(f.path)) ) {
        const index = f.code.indexOf(name);
        if ( index < 0 ) continue;
        const key = `names:${name}:${f.path}`;
        if ( excepted(key) ) continue;
        problems.push(`module/scripts/${f.path}:${lineOf(f.code, index)} — nomme « ${name} », réservé à ${only.join(", ")}${why ? ` (${why})` : ""} → passer par ${only[0]} (exception : "${key}")`);
      }
    }
    expect(problems, "noms réservés employés ailleurs").toEqual([]);
  });

  rule(SETTINGS.forbid?.length, "aucun motif interdit (règles « forbid » du module)", () => {
    const problems = [];
    for ( const { name, pattern, in: where, strings = true, why = "" } of SETTINGS.forbid ) {
      const re = new RegExp(pattern, "g");
      for ( const f of FILES.filter(f => !where || inFolder(f, where)) ) {
        const text = strings ? f.code : f.bare;
        for ( const m of text.matchAll(re) ) {
          const key = `forbid:${name}:${f.path}`;
          if ( excepted(key) ) continue;
          problems.push(`module/scripts/${f.path}:${lineOf(text, m.index)} — « ${m[0].trim()} » interdit (${name}${why ? ` : ${why}` : ""}) (exception : "${key}")`);
        }
      }
    }
    expect(problems, "motifs interdits").toEqual([]);
  });

  it("chaque exception de la section layers sert encore", () => {
    const stale = Object.keys(EXCEPT).filter(k => !used.has(k));
    expect(stale, "exceptions qui ne servent plus → les retirer de tests/das-tests.json (layers.except)").toEqual([]);
  });
});
