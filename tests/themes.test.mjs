import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GROUPS, PRESETS, PRESET_IDS, TOKENS, TOKEN_KEYS, activeTheme, cleanColors, diffColors, exportTheme, fullColors,
  importTheme, isColor, joinColor, parseColor, splitColor } from "../module/scripts/core/themes.mjs";

const moduleDir = join(import.meta.dirname, "..", "module");
const css = readFileSync(join(moduleDir, "styles", "darsh-dnd-ui.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const lang = code => JSON.parse(readFileSync(join(moduleDir, "lang", `${code}.json`), "utf8")).DDU.Theme;
const same = (a, b) => JSON.stringify(parseColor(a)) === JSON.stringify(parseColor(b));

/** Les variables déclarées dans les blocs `:root { … }` du CSS. */
const rootVars = new Map();
for ( const [, body] of css.matchAll(/:root\s*\{([^}]*)\}/g) ) {
  for ( const [, name, value] of body.matchAll(/--ddu-([a-z0-9-]+)\s*:\s*([^;]+);/g) ) rootVars.set(name, value.trim());
}
/** Variables qui ne sont pas des couleurs (tailles, polices, fondu, posées par le code). */
const NOT_COLORS = new Set(["scale", "fade-opacity", "frame-width", "radius-card", "font-title", "cell", "portrait-round",
  "portrait-party-w", "portrait-party-h", "portrait-frieze-w", "portrait-frieze-h", "panel"]);

describe("le CSS : toutes les couleurs passent par un thème", () => {
  it("aucune couleur écrite en dur hors des déclarations --ddu-*", () => {
    const body = css.split("\n").filter(l => !/^\s*--ddu-/.test(l)).join("\n");
    expect(body.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g) ?? []).toEqual([]);
  });
  it("chaque couleur de :root est une couleur du thème, avec la même valeur par défaut", () => {
    for ( const [name, value] of rootVars ) {
      if ( NOT_COLORS.has(name) ) continue;
      const token = TOKENS.find(t => t.key === name);
      expect(token, `--ddu-${name}`).toBeTruthy();
      expect(same(token.default, value), `--ddu-${name}: ${value} ≠ ${token.default}`).toBe(true);
    }
  });
  it("chaque couleur du thème est déclarée dans :root", () => {
    for ( const t of TOKENS ) expect(rootVars.has(t.key), `--ddu-${t.key}`).toBe(true);
  });
  it("chaque variable de couleur utilisée existe", () => {
    for ( const [, name] of css.matchAll(/var\(--ddu-([a-z0-9-]+)/g) ) {
      if ( NOT_COLORS.has(name) || ["veil", "player", "rows", "cols", "fade-duration", "fade-delay", "spin-delay", "grid-rows", "grid-height"].includes(name) ) continue;
      expect(TOKEN_KEYS, `var(--ddu-${name})`).toContain(name);
    }
  });
});

describe("la liste des couleurs", () => {
  it("clés uniques, groupes connus, valeurs par défaut valides", () => {
    expect(new Set(TOKEN_KEYS).size).toBe(TOKEN_KEYS.length);
    for ( const t of TOKENS ) {
      expect(GROUPS, t.key).toContain(t.group);
      expect(isColor(t.default), t.key).toBe(true);
    }
    for ( const g of GROUPS ) expect(TOKENS.some(t => (t.group === g) && t.main), g).toBe(true);
  });
  it.each(["en", "fr"])("libellés en %s : chaque couleur, groupe et thème livré", code => {
    const t = lang(code);
    for ( const k of TOKEN_KEYS ) expect(t.Token[k], k).toBeTruthy();
    for ( const g of GROUPS ) expect(t.Group[g], g).toBeTruthy();
    for ( const p of PRESET_IDS ) expect(t.Preset[p], p).toBeTruthy();
  });
});

describe("thèmes livrés", () => {
  it("BG3 ne change rien ; les autres n'emploient que des clés connues et des couleurs valides", () => {
    expect(PRESETS.bg3).toEqual({});
    for ( const [id, colors] of Object.entries(PRESETS) ) {
      const { rejected } = cleanColors(colors);
      expect(rejected, id).toEqual([]);
    }
  });
  it("aucun nom de produit dans les noms des thèmes", () => {
    for ( const code of ["en", "fr"] ) {
      for ( const name of Object.values(lang(code).Preset) ) expect(name).not.toMatch(/ravenloft|player'?s handbook|manuel des joueurs|\bphb\b|wizards/i);
    }
  });

  /** Contraste WCAG entre deux couleurs posées l'une sur l'autre (la translucide sur la seconde, opaque). */
  const luminance = ([r, g, b]) => {
    const c = [r, g, b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return (0.2126 * c[0]) + (0.7152 * c[1]) + (0.0722 * c[2]);
  };
  const over = (top, bottom) => { const [r, g, b, a] = parseColor(top); const [R, G, B] = parseColor(bottom);
    return [r * a + R * (1 - a), g * a + G * (1 - a), b * a + B * (1 - a)]; };
  const contrast = (fg, bg) => { const [l1, l2] = [luminance(fg), luminance(bg)].sort((x, y) => y - x); return (l1 + 0.05) / (l2 + 0.05); };
  for ( const id of PRESET_IDS ) {
    it(`${id} : texte lisible sur les fonds (contraste ≥ 4,5)`, () => {
      const c = fullColors(PRESETS[id]);
      // Fonds translucides : vus sur une scène sombre (la plupart des cartes) — le pire cas pour un thème sombre est rare.
      const scene = "#202020";
      for ( const bg of ["bg", "panel-top", "panel-bottom", "grid"] ) {
        const back = over(c[bg], scene);
        expect(contrast(parseColor(c.text), back), `${id} text / ${bg}`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});

describe("couleurs", () => {
  it("accepte hex et rgb(a), refuse le reste (rien d'autre n'entre dans le style)", () => {
    for ( const v of ["#000", "#c9a45c", "#c9a45c80", "rgb(1, 2, 3)", "rgba(18, 12, 10, 0.88)", "rgba(0,0,0,1)"] ) expect(isColor(v), v).toBe(true);
    for ( const v of ["red", "var(--x)", "#12", "rgba(300, 0, 0, 1)", "#000; background: url(x)", "url(x)", "", null, 3] ) {
      expect(isColor(v), String(v)).toBe(false);
    }
  });
  it("teinte + opacité : aller-retour", () => {
    expect(splitColor("rgba(18, 12, 10, 0.88)")).toEqual({ hex: "#120c0a", alpha: 88 });
    expect(splitColor("#c9a45c")).toEqual({ hex: "#c9a45c", alpha: 100 });
    expect(joinColor("#120c0a", 88)).toBe("rgba(18, 12, 10, 0.88)");
    expect(joinColor("#c9a45c", 100)).toBe("#c9a45c");
    for ( const t of TOKENS ) {
      const { hex, alpha } = splitColor(t.default);
      expect(same(joinColor(hex, alpha), t.default), t.key).toBe(true);
    }
  });
  it("on n'enregistre que ce qui diffère des valeurs par défaut", () => {
    expect(diffColors({ gold: "#c9a45c", text: "#000000", inconnu: "#fff" })).toEqual({ text: "#000000" });
  });
});

describe("export / import", () => {
  it("aller-retour", () => {
    const data = exportTheme({ name: "  Nuit  ", colors: fullColors({ gold: "#ff0000" }) });
    expect(data).toEqual({ format: "darsh-dnd-ui-theme", version: 1, name: "Nuit", colors: { gold: "#ff0000" } });
    expect(importTheme(JSON.parse(JSON.stringify(data)))).toEqual({ name: "Nuit", colors: { gold: "#ff0000" }, rejected: [] });
  });
  it("garde le bon, écarte le reste ; refuse un fichier qui n'est pas un thème", () => {
    const r = importTheme({ format: "darsh-dnd-ui-theme", version: 1, name: "x", colors: { gold: "#fff", text: "url(x)", nope: "#000" } });
    expect(r.colors).toEqual({ gold: "#fff" });
    expect(r.rejected.sort()).toEqual(["nope", "text"]);
    expect(() => importTheme({ colors: {} })).toThrow();
    expect(() => importTheme({ format: "darsh-dnd-ui-theme", version: 2, colors: {} })).toThrow();
    expect(() => importTheme(null)).toThrow();
  });
});

describe("thème en vigueur", () => {
  const library = [{ id: "a", name: "Mien", colors: { gold: "#111111" } }];
  const worldLibrary = [{ id: "b", name: "Table", colors: { gold: "#222222" } }];
  it("par défaut : BG3", () => expect(activeTheme({})).toEqual({ id: "bg3", colors: {} }));
  it("« suivre la table » : le thème de la table, livré ou partagé", () => {
    expect(activeTheme({ choice: "", worldChoice: "gothic" }).id).toBe("gothic");
    expect(activeTheme({ choice: "", worldChoice: "custom:b", worldLibrary }).colors).toEqual({ gold: "#222222" });
  });
  it("un choix personnel l'emporte : livré, personnel, de la table", () => {
    expect(activeTheme({ choice: "parchment", worldChoice: "gothic" }).id).toBe("parchment");
    expect(activeTheme({ choice: "custom:a", worldChoice: "gothic", library }).colors).toEqual({ gold: "#111111" });
    expect(activeTheme({ choice: "custom:world:b", worldChoice: "gothic", library, worldLibrary }).colors).toEqual({ gold: "#222222" });
  });
  it("un choix disparu retombe sur la table, puis sur BG3", () => {
    expect(activeTheme({ choice: "custom:zz", worldChoice: "gothic", library }).id).toBe("gothic");
    expect(activeTheme({ choice: "custom:zz", worldChoice: "custom:zz" })).toEqual({ id: "bg3", colors: {} });
  });
});
