/**
 * Garde des traductions : `en.json` et `fr.json` ont exactement les mêmes clés, chaque clé citée en dur dans les
 * scripts existe dans les deux, et aucune clé n'est le préfixe d'une autre (Foundry range les clés pointées en objets
 * imbriqués : « A.B » et « A.B.C » ne peuvent pas coexister).
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const NS = "DDU";
const moduleDir = join(import.meta.dirname, "..", "module");
const manifest = JSON.parse(readFileSync(join(moduleDir, "module.json"), "utf8"));

/** Clés pointées d'un fichier de langue, qu'il soit imbriqué ou à plat. */
function flatten(object, prefix = "", out = {}) {
  for ( const [key, value] of Object.entries(object) ) {
    const path = prefix ? `${prefix}.${key}` : key;
    if ( value && (typeof value === "object") ) flatten(value, path, out);
    else out[path] = value;
  }
  return out;
}

const langs = Object.fromEntries(manifest.languages.map(l => [l.lang,
  flatten(JSON.parse(readFileSync(join(moduleDir, l.path), "utf8")))]));
const en = langs.en;
const fr = langs.fr;

function files(dir, ext) {
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p, ext) : ext.some(e => p.endsWith(e)) ? [p] : [];
  });
}

/** Groupes de premier niveau sous l'espace du module (`Bar`, `Frieze`…) : `loc("Bar.x")` vise `DDU.Bar.x`. */
const groups = new Set(Object.keys(en).map(k => k.split(".")[1]));

/** Clés citées dans le code, littérales (`full`) ou construites (`prefix`, la partie fixe avant `${`). */
function usedKeys() {
  const full = new Map();
  const prefixes = new Map();
  for ( const p of files(join(moduleDir, "scripts"), [".mjs", ".js", ".hbs"]) ) {
    const where = relative(moduleDir, p).split(sep).join("/");
    const code = readFileSync(p, "utf8").replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, "");
    for ( const [, s] of code.matchAll(/["'`]([A-Za-z0-9_]+\.[A-Za-z0-9_.]*(?:\$\{)?)/g) ) {
      const head = s.split(".")[0];
      const key = head === NS ? s : groups.has(head) ? `${NS}.${s}` : null;
      if ( !key ) continue;
      if ( key.endsWith("${") ) prefixes.set(key.slice(0, -2), where);
      else if ( !key.endsWith(".") ) full.set(key, where);
    }
  }
  return { full, prefixes };
}

describe("traductions", () => {
  it("en et fr ont les mêmes clés", () => {
    expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort());
  });

  it("aucune valeur vide, mêmes {variables} dans les deux langues", () => {
    const vars = s => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
    for ( const key of Object.keys(en) ) {
      expect(String(en[key]).trim(), key).not.toBe("");
      expect(String(fr[key]).trim(), key).not.toBe("");
      expect(vars(fr[key]), key).toEqual(vars(en[key]));
    }
  });

  it("aucune clé n'est le préfixe d'une autre", () => {
    const keys = Object.keys(en).sort();
    for ( const a of keys ) {
      for ( const b of keys ) if ( b.startsWith(`${a}.`) ) expect.fail(`${a} est le préfixe de ${b}`);
    }
  });

  it("chaque clé citée dans les scripts existe en anglais et en français", () => {
    const { full, prefixes } = usedKeys();
    expect(full.size).toBeGreaterThan(10);
    for ( const [key, where] of full ) {
      expect(en, `${key} (${where})`).toHaveProperty([key]);
      expect(fr, `${key} (${where})`).toHaveProperty([key]);
    }
    for ( const [prefix, where] of prefixes ) {
      expect(Object.keys(en).some(k => k.startsWith(prefix)), `${prefix}… (${where})`).toBe(true);
    }
  });
});
