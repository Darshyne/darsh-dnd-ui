import { describe, it, expect } from "vitest";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

// 0.25.2 : une coquille dans un fichier que les tests n'importent pas (apps/bar.mjs) empêchait tout le module de se charger en jeu.
// Chaque script du module doit au moins se lire sans erreur de syntaxe.
const ROOT = "module/scripts";
const files = dir => readdirSync(dir).flatMap(name => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? files(path) : (name.endsWith(".mjs") ? [path] : []);
});

describe("syntaxe des scripts du module", () => {
  it.each(files(ROOT))("%s", file => {
    const r = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    expect(r.status, r.stderr).toBe(0);
  });
});
