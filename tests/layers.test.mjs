/**
 * Couches par les imports (SPEC §8.2) :
 * core/ n'importe que core/ et ne touche jamais game, canvas, Hooks, CONFIG, ui, foundry ;
 * adapter/ n'importe ni apps/ ni runtime/ ; apps/ n'importe pas runtime/.
 * Aucun import des fichiers du moteur de combat. Aucun Hooks.on hors du routeur.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = join(import.meta.dirname, "..", "module", "scripts");

function files(dir) {
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : p.endsWith(".mjs") ? [p] : [];
  });
}

const all = files(root).map(p => ({
  path: relative(root, p).split(sep).join("/"),
  text: readFileSync(p, "utf8")
}));
const imports = f => [...f.text.matchAll(/from\s+"([^"]+)"/g)].map(m => m[1]);
const layer = f => f.path.includes("/") ? f.path.split("/")[0] : "root";

describe("couches", () => {
  it("core/ est pur", () => {
    for ( const f of all.filter(f => layer(f) === "core") ) {
      for ( const i of imports(f) ) expect(i, f.path).toMatch(/^\.\/[^/]+\.mjs$/);
      const code = f.text.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
      expect(code, f.path).not.toMatch(/\b(game|canvas|Hooks|CONFIG|foundry)\b|\bui\./);
    }
  });

  it("adapter/ n'importe ni apps/ ni runtime/", () => {
    for ( const f of all.filter(f => layer(f) === "adapter") ) {
      for ( const i of imports(f) ) expect(i, f.path).not.toMatch(/\/(apps|runtime)\//);
    }
  });

  it("apps/ n'importe pas runtime/", () => {
    for ( const f of all.filter(f => layer(f) === "apps") ) {
      for ( const i of imports(f) ) expect(i, f.path).not.toMatch(/\/runtime\//);
    }
  });

  it("aucun import des fichiers du moteur", () => {
    for ( const f of all ) {
      for ( const i of imports(f) ) expect(i, f.path).not.toMatch(/dnd5e-combat/);
    }
  });

  it("Hooks.on seulement dans le routeur", () => {
    for ( const f of all.filter(f => f.path !== "runtime/router.mjs") ) {
      expect(f.text, f.path).not.toMatch(/Hooks\.on\(/);
    }
  });
});
