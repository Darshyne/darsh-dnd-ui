import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { TABS } from "../module/scripts/core/settings-tabs.mjs";

/** Les réglages visibles déclarés (config: true), relevés dans le code : `name: "DDU.Settings.<clé>.Name"` ou `DDU.Settings.${key}`. */
function visibleKeys() {
  const src = readFileSync(new URL("../module/scripts/settings.mjs", import.meta.url), "utf8");
  const shared = readFileSync(new URL("../module/scripts/shared.mjs", import.meta.url), "utf8");
  const scale = JSON.parse(shared.match(/SCALE_KEYS = Object\.freeze\((\[[^\]]*\])\)/)[1]);
  const direct = [...src.matchAll(/register\(MODULE_ID, "(\w+)", \{[^}]*?config: true/gs)].map(m => m[1]);
  const helpers = [...src.matchAll(/^\s*(?:client|world|reg)\("(\w+)"/gm)].map(m => m[1]);
  return [...new Set([...direct, ...scale, ...helpers])];
}

describe("fenêtre de réglages", () => {
  it("chaque réglage visible est rangé une fois, et rien d'autre", () => {
    const placed = TABS.flatMap(t => t.keys);
    expect(new Set(placed).size).toBe(placed.length);
    expect([...placed].sort()).toEqual(visibleKeys().sort());
  });
  it("chaque outil a un id ; l'éditeur de couleurs est ouvert à tous", () => {
    const tools = TABS.flatMap(t => t.tools ?? []);
    expect(tools.map(t => t.id)).toEqual(["theme"]);
    expect(tools[0].everyone).toBe(true);
  });
});
