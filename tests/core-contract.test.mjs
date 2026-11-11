/**
 * Contrat avec DAS · Core (`dnd5e-combat`) — fichier COPIÉ tel quel depuis le dépôt du moteur
 * (`tools/contract/core-contract.test.mjs`) : ne pas le modifier ici, le recopier quand il change là-bas.
 *
 * Ce module appelle l'API publique du moteur et écoute ses hooks. Ce test lit `module/scripts/` et vérifie que chaque
 * chose demandée au moteur existe dans son contrat, `docs/reference/surface.json` (généré là-bas depuis le code) :
 *   - chaque chemin d'API (`….api.ui.budget`, `engine()?.climb?.state`…) ;
 *   - chaque hook `dnd5e-combat.<nom>` écouté (un hook émis par le moteur, ou un moment) ;
 *   - chaque réglage du moteur lu ou écrit (`game.settings.get("dnd5e-combat", "clé")`).
 * Un renommage ou un retrait dans le moteur fait donc échouer le test du voisin, avant la partie.
 *
 * Où est le moteur : la variable `DAS_CORE` (un dossier), sinon le dépôt voisin `../Foundry dnd5e moteur de combat`, sinon
 * `core/`. Introuvable sur un poste : le test est sauté ; en CI (`CI=true`), il échoue — le workflow récupère le moteur.
 *
 * Ce que le relevé sait suivre : l'accès direct (`game.modules.get(ID).api.x.y`), le module gardé dans une variable
 * (`const mod = game.modules.get(ID); mod.api.x`), une fonction d'accès (`function engine() { … return ….api; }`, puis
 * `engine()?.x`, ou `engine.content()?.x` après `import * as engine from "./adapter/engine.mjs"`), une variable locale qui reçoit
 * l'API ou un groupe (`const api = engine()?.combat; api.addEvent`).
 * `CONTRACT_LIST=1 npx vitest run tests/core-contract.test.mjs` affiche ce qu'il a relevé.
 *
 * Réglages propres au module, facultatifs, dans `tests/core-contract.json` :
 *   { "roots": ["monAcces\\(\\)"],                            // expressions (regex) qui rendent l'API du moteur
 *     "dynamic": [{ "pattern": "\\bread\\(\"([A-Za-z]+)\"", "prefix": "ui." }],   // lectures par nom : `read("budget")`
 *     "allow": ["ui.ancienNom", "dnd5e-combat.vieuxHook", "setting:vieuxReglage"] }   // exceptions voulues, à justifier dans le commit
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const CORE_ID = "dnd5e-combat";
const ROOT = join(import.meta.dirname, "..");
const SCRIPTS = join(ROOT, "module/scripts");

const corePath = [process.env.DAS_CORE, join(ROOT, "../Foundry dnd5e moteur de combat"), join(ROOT, "core")]
  .filter(Boolean).find(dir => existsSync(join(dir, "docs/reference/surface.json")));
const surface = corePath ? JSON.parse(readFileSync(join(corePath, "docs/reference/surface.json"), "utf8")) : null;
const configPath = join(ROOT, "tests/core-contract.json");
const config = existsSync(configPath) ? JSON.parse(readFileSync(configPath, "utf8")) : {};
const allowed = new Set(config.allow ?? []);

function filesUnder(dir) {
  return readdirSync(dir).sort().flatMap(name => {
    const full = join(dir, name);
    if ( statSync(full).isDirectory() ) return filesUnder(full);
    return name.endsWith(".mjs") ? [full] : [];
  });
}

/** Le code sans ses commentaires (un nom cité dans un commentaire n'est pas un appel), longueur et lignes conservées. */
function code(text) {
  return text.replace(/\/\*[\s\S]*?\*\/|(^|[^:"'`\\])\/\/[^\n]*/g, (found, lead="") => lead + found.slice(lead.length).replace(/[^\n]/g, " "));
}

const NAME = "[A-Za-z_$][A-Za-z0-9_$]*";
const TAIL = "\\s*(?:\\?\\?\\s*null\\s*)?;";
const chainPattern = "((?:\\s*\\??\\.\\s*[A-Za-z_$][A-Za-z0-9_$]*)+)";
const escaped = name => name.replace(/\$/g, "\\$");
const segments = chain => chain.split(".").map(part => part.replace(/[\s?]/g, "")).filter(Boolean);
const lineOf = (text, index) => text.slice(0, index).split("\n").length;

const sources = existsSync(SCRIPTS)
  ? filesUnder(SCRIPTS).map(file => ({ file: relative(ROOT, file).split("\\").join("/"), text: code(readFileSync(file, "utf8")) }))
  : [];

/** Les constantes qui valent l'identifiant du moteur quelque part dans le module (`ENGINE_ID`, `CORE_ID`, `ID`…). */
const coreConstants = new Set(sources.flatMap(({ text }) => [...text.matchAll(new RegExp(`const\\s+([A-Z][A-Z0-9_]*)\\s*=\\s*"${CORE_ID}"`, "g"))].map(found => found[1])));

/** Dans ce fichier, les écritures de l'identifiant du moteur : le littéral, et les constantes qui n'y valent pas autre chose. */
function idsIn(text) {
  const names = [...coreConstants].filter(name => !new RegExp(`const\\s+${name}\\s*=\\s*"(?!${CORE_ID}")`).test(text));
  return { names, pattern: [`"${CORE_ID}"`, `'${CORE_ID}'`, ...names].join("|") };
}

/** La fin du bloc qui contient `index` : une variable locale ne vaut que jusque-là. */
function blockEnd(text, index) {
  let depth = 0;
  for ( let i = index; i < text.length; i++ ) {
    if ( text[i] === "{" ) depth += 1;
    else if ( (text[i] === "}") && (--depth < 0) ) return i;
  }
  return text.length;
}

const directRoot = text => ({ source: `modules\\.get\\(\\s*(?:${idsIn(text).pattern})\\s*\\)\\s*\\??\\.\\s*api`, prefix: [] });
const callOf = name => `(?<![.\\w$])${escaped(name)}\\(\\s*\\)`;
/** Ce fichier connaît-il cette fonction d'accès : il la déclare, ou il l'importe ? */
const knows = (text, name) => new RegExp(`(?:function\\s+${escaped(name)}\\s*\\(|const\\s+${escaped(name)}\\s*=|import\\s*\\{[^}]*\\b${escaped(name)}\\b[^}]*\\})`).test(text);
const baseName = path => path.split("/").pop();
/** Les imports en espace de noms d'un fichier : `import * as engine from "./adapter/engine.mjs"` → `{ name: "engine", file: "engine.mjs" }`. */
const namespaces = text => [...text.matchAll(new RegExp(`import\\s*\\*\\s*as\\s+(${NAME})\\s+from\\s*["']([^"']+)["']`, "g"))]
  .map(found => ({ name: found[1], file: baseName(found[2]) }));
/**
 * Les façons d'appeler, dans ce fichier, les fonctions d'accès connues : par leur nom (déclarées ou importées ici), ou par
 * l'espace de noms du fichier qui les déclare (`engine.content()` après `import * as engine from "./adapter/engine.mjs"`).
 */
function accessorRoots(text, known) {
  const spaces = namespaces(text);
  return known.flatMap(accessor => [
    ...(knows(text, accessor.name) ? [{ source: callOf(accessor.name), prefix: accessor.prefix }] : []),
    ...spaces.filter(space => space.file === baseName(accessor.file))
      .map(space => ({ source: `(?<![.\\w$])${escaped(space.name)}\\s*\\.\\s*${escaped(accessor.name)}\\(\\s*\\)`, prefix: accessor.prefix }))
  ]);
}

/**
 * Les fonctions d'accès du module : `{ name, prefix, file }` — `function engine() { return game.modules.get(ENGINE_ID)?.api ?? null; }`,
 * sa forme en plusieurs lignes (courte : elle lit le module du moteur et rend son `.api` tel quel), et celles qui en
 * dérivent (`const content = () => engine()?.content;`).
 */
function accessors() {
  const found = [];
  const add = (name, prefix, file) => { if ( !found.some(known => known.name === name) ) found.push({ name, prefix, file }); };
  for ( const { text, file } of sources ) {
    const getsCore = new RegExp(`modules\\.get\\(\\s*(?:${idsIn(text).pattern})\\s*\\)`);
    for ( const match of text.matchAll(new RegExp(`(?:function\\s+(${NAME})\\s*\\([^)]*\\)|const\\s+(${NAME})\\s*=\\s*\\([^)]*\\)\\s*=>)\\s*\\{`, "g")) ) {
      const from = match.index + match[0].length;
      const body = text.slice(from, blockEnd(text, from));
      // Elle doit RENDRE l'API elle-même (`return mod.api ?? null;`, `return on ? (mod.api ?? null) : null;`), pas un objet à elle.
      if ( (body.length <= 400) && getsCore.test(body) && /return[^;{]*\.api\s*(?:\?\?\s*null\s*)?\)?\s*(?::\s*null\s*)?;/.test(body) ) add(match[1] ?? match[2], [], file);
    }
  }
  for ( let pass = 0; pass < 3; pass++ ) {
    for ( const { text, file } of sources ) {
      const roots = [directRoot(text), ...accessorRoots(text, found)];
      for ( const root of roots ) {
        const body = `(?:game\\.)?${root.source}${chainPattern}?`;
        const forms = [`function\\s+(${NAME})\\s*\\([^)]*\\)\\s*\\{\\s*return\\s+${body}${TAIL}\\s*\\}`, `const\\s+(${NAME})\\s*=\\s*\\(\\s*\\)\\s*=>\\s*${body}${TAIL}`];
        for ( const form of forms ) for ( const match of text.matchAll(new RegExp(form, "g")) ) add(match[1], [...root.prefix, ...segments(match[2] ?? "")], file);
      }
    }
  }
  return found;
}

/** Les chemins d'API demandés au moteur : `[{ path, file, line }]`. */
function apiUses() {
  const uses = [];
  const shared = accessors();
  for ( const { file, text } of sources ) {
    // Un nom d'API cité dans une chaîne (un message de journal) n'est pas un appel.
    const quoted = index => {
      const line = text.slice(text.lastIndexOf("\n", index) + 1, index);
      return ((line.split("\"").length % 2) === 0) || ((line.split("`").length % 2) === 0);
    };
    const note = (path, index) => { if ( path.length && !quoted(index) ) uses.push({ path, file, line: lineOf(text, index) }); };
    const ids = idsIn(text).pattern;
    // Le module du moteur gardé dans une variable de ce fichier : `const mod = game.modules.get(ENGINE_ID);` puis `mod.api.x`.
    const holders = [...text.matchAll(new RegExp(`(?:const|let)\\s+(${NAME})\\s*=\\s*game\\.modules\\.get\\(\\s*(?:${ids})\\s*\\)\\s*;`, "g"))]
      .map(found => ({ source: `(?<![.\\w$])${escaped(found[1])}\\s*\\??\\.\\s*api`, prefix: [] }));
    const roots = [directRoot(text), ...holders, ...(config.roots ?? []).map(source => ({ source, prefix: [] })),
      ...accessorRoots(text, shared)];
    for ( const root of roots ) {
      for ( const found of text.matchAll(new RegExp(`${root.source}${chainPattern}`, "g")) ) note([...root.prefix, ...segments(found[1])], found.index);
      // Une variable locale qui reçoit l'API ou un groupe : `const api = engineApi()?.combat;` — suivie jusqu'à la fin de son bloc.
      for ( const found of text.matchAll(new RegExp(`(?:const|let)\\s+(${NAME})\\s*=\\s*(?:game\\.)?${root.source}${chainPattern}?${TAIL}`, "g")) ) {
        const prefix = [...root.prefix, ...segments(found[2] ?? "")];
        const from = found.index + found[0].length;
        const scope = text.slice(from, blockEnd(text, from));
        for ( const use of scope.matchAll(new RegExp(`(?<![.\\w$])${escaped(found[1])}${chainPattern}`, "g")) ) note([...prefix, ...segments(use[1])], from + use.index);
      }
    }
    for ( const { pattern, prefix="" } of config.dynamic ?? [] ) {
      for ( const found of text.matchAll(new RegExp(pattern, "g")) ) note(segments(`${prefix}${found[1]}`), found.index);
    }
  }
  return uses;
}

/** Où un chemin quitte le contrat : null s'il y est (un chemin exact, un groupe, ou la suite d'une valeur rendue). */
function divergence(path, paths) {
  for ( let n = 1; n <= path.length; n++ ) {
    const prefix = path.slice(0, n).join(".");
    if ( paths.has(prefix) ) return null;   // une fonction ou une valeur du contrat : ce qui suit est à elle (`.bind`, un champ)
    if ( ![...paths].some(known => known.startsWith(`${prefix}.`)) ) return prefix;
  }
  return null;
}

/** Les noms `dnd5e-combat.<nom>` écrits sur une ligne qui écoute, émet ou nomme un hook. */
function hookUses() {
  const uses = [];
  for ( const { file, text } of sources ) {
    const forms = [`"${CORE_ID}\\.([A-Za-z0-9]+)"`, `'${CORE_ID}\\.([A-Za-z0-9]+)'`, `\`${CORE_ID}\\.([A-Za-z0-9]+)\``,
      ...idsIn(text).names.map(name => `\`\\$\\{${name}\\}\\.([A-Za-z0-9]+)\``)];
    const lines = text.split("\n");
    for ( const form of forms ) {
      for ( const found of text.matchAll(new RegExp(form, "g")) ) {
        const line = lineOf(text, found.index);
        // Le même préfixe sert aux requêtes entre clients, aux drapeaux et aux classes CSS : seule une ligne de hook compte.
        if ( !/Hooks\.(on|once|off|call|callAll)\(|_HOOK\b/.test(lines[line - 1]) ) continue;
        uses.push({ name: found[1], file, line });
      }
    }
  }
  return uses;
}

function settingUses() {
  const uses = [];
  for ( const { file, text } of sources ) {
    for ( const found of text.matchAll(new RegExp(`settings\\.(?:get|set)\\(\\s*(?:${idsIn(text).pattern})\\s*,\\s*"([A-Za-z0-9]+)"`, "g")) )
      uses.push({ name: found[1], file, line: lineOf(text, found.index) });
  }
  return uses;
}

const where = use => `${use.file}:${use.line}`;

describe.skipIf(!surface && !process.env.CI)("contrat avec DAS · Core (dnd5e-combat)", () => {
  it("le contrat du moteur est lisible (docs/reference/surface.json)", () => {
    expect(surface, "moteur introuvable : DAS_CORE, ../Foundry dnd5e moteur de combat ou core/").toBeTruthy();
    expect(surface.api.length).toBeGreaterThan(50);
  });

  it("chaque chemin d'API appelé existe dans le moteur", () => {
    const paths = new Set(surface.api);
    const broken = apiUses().map(use => ({ use, at: divergence(use.path, paths) }))
      .filter(({ at }) => at && !allowed.has(at))
      .map(({ use, at }) => `api.${at} (${where(use)})`);
    expect([...new Set(broken)], "absents de docs/reference/surface.json du moteur").toEqual([]);
  });

  it("chaque hook du moteur écouté ou nommé existe (hook émis ou moment)", () => {
    const known = new Set([...surface.hooks.map(name => name.slice(CORE_ID.length + 1)), ...(surface.moments ?? [])]);
    const broken = hookUses().filter(use => !known.has(use.name) && !allowed.has(`${CORE_ID}.${use.name}`))
      .map(use => `${CORE_ID}.${use.name} (${where(use)})`);
    expect([...new Set(broken)], "hooks que le moteur n'émet pas").toEqual([]);
  });

  it("chaque réglage du moteur lu ou écrit existe", () => {
    const known = new Set(surface.settings);
    const broken = settingUses().filter(use => !known.has(use.name) && !allowed.has(`setting:${use.name}`))
      .map(use => `${use.name} (${where(use)})`);
    expect([...new Set(broken)], "réglages absents du moteur").toEqual([]);
  });

  it("le relevé voit bien des appels (sinon le test ne garde rien)", () => {
    const seen = {
      api: [...new Set(apiUses().map(use => use.path.join(".")))].sort(),
      hooks: [...new Set(hookUses().map(use => use.name))].sort(),
      settings: [...new Set(settingUses().map(use => use.name))].sort()
    };
    if ( process.env.CONTRACT_LIST ) console.info(JSON.stringify(seen, null, 1));
    expect(seen.api.length + seen.hooks.length, "aucun appel au moteur trouvé dans module/scripts").toBeGreaterThan(0);
  });
});
