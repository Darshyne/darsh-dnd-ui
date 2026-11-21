import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Les raccourcis s'enregistrent au hook `init`, avant le chargement des traductions (le cœur appelle `init`, puis
 * `game.i18n.initialize()`). Un nom mis en forme à ce moment-là reste la clé brute, et « Configurer les contrôles » la traduit
 * ensuite sans ses variables : chaque nom enregistré doit donc être une clé dont le texte n'attend aucune variable.
 */
const LANG = join(import.meta.dirname, "../module/lang");
const flat = (node, prefix = "") => Object.entries(node).flatMap(([k, v]) =>
  (typeof v === "string") ? [[`${prefix}${k}`, v]] : flat(v, `${prefix}${k}.`));
const langs = Object.fromEntries(readdirSync(LANG).filter(f => f.endsWith(".json"))
  .map(f => [f.replace(".json", ""), new Map(flat(JSON.parse(readFileSync(join(LANG, f), "utf8"))))]));

describe("raccourcis clavier : noms dans « Configurer les contrôles »", () => {
  const registered = [];

  beforeAll(async () => {
    globalThis.foundry = {
      utils: { debounce: fn => fn },
      applications: { api: { ApplicationV2: class {}, HandlebarsApplicationMixin: Base => Base } },
      helpers: { interaction: { KeyboardManager: { MODIFIER_KEYS: { SHIFT: "Shift" } } } }
    };
    globalThis.CONST = { KEYBINDING_PRECEDENCE: { PRIORITY: 0 } };
    // Au hook init : aucune traduction chargée, le cœur rend la clé telle quelle.
    globalThis.game = {
      i18n: { localize: key => key, format: key => key },
      keybindings: { register: (namespace, action, data) => registered.push({ action, ...data }) }
    };
    const { registerKeys } = await import("../module/scripts/runtime/keys.mjs");
    registerKeys(() => null);
  });
  afterAll(() => {
    for ( const k of ["foundry", "CONST", "game"] ) delete globalThis[k];
  });

  it("les douze cases de l'onglet Personnalisé sont enregistrées", () => {
    expect(registered.filter(r => r.action.startsWith("customSlot"))).toHaveLength(12);
  });

  it.each(Object.keys(langs))("%s : aucun nom ni aide n'attend de variable", lang => {
    const texts = langs[lang];
    const en = langs.en;
    const broken = registered.flatMap(r => [r.name, r.hint])
      .map(key => [key, texts.get(key) ?? en.get(key)])
      .filter(([, text]) => (text === undefined) || /\{[^}]+\}/.test(text));
    expect(broken).toEqual([]);
  });

  it("chaque case a son propre nom, avec son numéro", () => {
    const names = registered.filter(r => r.action.startsWith("customSlot")).map(r => langs.en.get(r.name));
    expect(new Set(names).size).toBe(12);
    names.forEach((name, i) => expect(name).toMatch(new RegExp(`\\b${i + 1}$`)));
  });
});
